/**
 * LULU PRINT API SERVICE
 * Service singleton pour gérer les commandes d'impression via Lulu
 *
 * Documentation API : https://api.lulu.com/docs/
 *
 * Fonctionnalités :
 * - Authentification OAuth (client_credentials)
 * - Calcul des coûts d'impression et livraison
 * - Création et suivi des print jobs
 * - Validation des PDFs
 */

import {
  ShippingAddress,
  ShippingLevel,
  LuluLineItem,
  LuluPrintJobRequest,
  LuluCostCalculation,
} from '@/core/database/types';

// ============================================
// TYPES LULU API
// ============================================

interface LuluAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface LuluPrintJobResponse {
  id: number;
  external_id: string;
  status: {
    name: string;
    message?: string;
  };
  line_items: Array<{
    id: number;
    external_id?: string;
    title?: string;
    quantity: number;
    costs: {
      total_cost_excl_tax: string;
      total_cost_incl_tax: string;
      tax_rate: string;
    };
  }>;
  shipping_address: ShippingAddress;
  shipping_level: string;
  costs: {
    total_cost_excl_tax: string;
    total_cost_incl_tax: string;
    total_tax: string;
    currency: string;
    shipping_cost: {
      total_cost_excl_tax: string;
      total_cost_incl_tax: string;
    };
  };
  tracking?: {
    tracking_id: string;
    tracking_urls: string[];
    carrier_name: string;
  };
  created: string;
  estimated_ship_date?: string;
}

interface LuluShippingOption {
  level: ShippingLevel;
  total_cost_excl_tax: string;
  total_cost_incl_tax: string;
  currency: string;
}

interface LuluCostResponse {
  currency: string;
  total_cost_excl_tax: string;
  total_cost_incl_tax: string;
  total_tax: string;
  shipping_cost: {
    total_cost_excl_tax: string;
    total_cost_incl_tax: string;
  };
  line_item_costs: Array<{
    quantity: number;
    total_cost_excl_tax: string;
    total_cost_incl_tax: string;
  }>;
}

// ============================================
// CONSTANTES
// ============================================

// SKU Lulu pour A5 N&B Souple Mate - Papier Cream
// Format: 0583X0827 (A5) + BW (N&B) + STD + PB (souple) + 060UC444 (60# cream) + M (mate) + XX
export const LULU_POD_PACKAGE_ID = '0583X0827BWSTDPB060UC444MXX';

// Minimum de pages requis par Lulu
export const LULU_MIN_PAGES = 32;

// Calcul largeur du dos (en pouces)
export function calculateSpineWidth(pageCount: number): number {
  return (pageCount / 444) + 0.06;
}

// Conversion pouces en mm
export function inchesToMm(inches: number): number {
  return inches * 25.4;
}

// ============================================
// SERVICE LULU
// ============================================

class LuluService {
  private static instance: LuluService;

  private clientKey: string;
  private clientSecret: string;
  private apiUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  private constructor() {
    this.clientKey = process.env.LULU_CLIENT_KEY || '';
    this.clientSecret = process.env.LULU_CLIENT_SECRET || '';

    // Utiliser sandbox par défaut en développement
    const useSandbox = process.env.NODE_ENV !== 'production' || process.env.LULU_USE_SANDBOX === 'true';
    this.apiUrl = useSandbox
      ? (process.env.LULU_SANDBOX_URL || 'https://api.sandbox.lulu.com')
      : (process.env.LULU_API_URL || 'https://api.lulu.com');

    if (!this.clientKey || !this.clientSecret) {
      console.warn('⚠️ LULU_CLIENT_KEY ou LULU_CLIENT_SECRET non configurés');
    }
  }

  /**
   * Obtenir l'instance singleton du service
   */
  public static getInstance(): LuluService {
    if (!LuluService.instance) {
      LuluService.instance = new LuluService();
    }
    return LuluService.instance;
  }

  /**
   * Authentification OAuth (client_credentials)
   */
  private async authenticate(): Promise<string> {
    // Vérifier si le token est encore valide (avec marge de 5 minutes)
    if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
      return this.accessToken;
    }

    const authUrl = `${this.apiUrl}/auth/realms/glasstree/protocol/openid-connect/token`;

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientKey,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Lulu auth failed: ${response.status} - ${error}`);
    }

    const data: LuluAuthResponse = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);

    return this.accessToken;
  }

  /**
   * Requête authentifiée vers l'API Lulu
   */
  private async apiRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: Record<string, unknown>
  ): Promise<T> {
    const token = await this.authenticate();

    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Lulu API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Calculer le coût d'impression et de livraison
   */
  public async calculateCost(
    pageCount: number,
    quantity: number,
    shippingAddress: ShippingAddress,
    shippingLevel: ShippingLevel = 'MAIL'
  ): Promise<LuluCostCalculation> {
    // Validation du minimum de pages
    if (pageCount < LULU_MIN_PAGES) {
      throw new Error(`Le livre doit avoir au minimum ${LULU_MIN_PAGES} pages (actuellement: ${pageCount})`);
    }

    const requestBody = {
      line_items: [{
        page_count: pageCount,
        pod_package_id: LULU_POD_PACKAGE_ID,
        quantity: quantity,
      }],
      shipping_address: {
        city: shippingAddress.city,
        country_code: shippingAddress.country_code,
        postcode: shippingAddress.postcode,
        state_code: shippingAddress.state_code,
      },
      shipping_option: shippingLevel,
    };

    const response = await this.apiRequest<LuluCostResponse>(
      '/print-job-cost-calculations/',
      'POST',
      requestBody
    );

    return {
      total_cost_excl_tax: parseFloat(response.total_cost_excl_tax),
      total_cost_incl_tax: parseFloat(response.total_cost_incl_tax),
      total_tax: parseFloat(response.total_tax),
      shipping_cost: {
        total_cost_excl_tax: parseFloat(response.shipping_cost.total_cost_excl_tax),
        total_cost_incl_tax: parseFloat(response.shipping_cost.total_cost_incl_tax),
      },
      currency: response.currency,
    };
  }

  /**
   * Obtenir toutes les options de livraison disponibles
   */
  public async getShippingOptions(
    pageCount: number,
    quantity: number,
    shippingAddress: ShippingAddress
  ): Promise<LuluShippingOption[]> {
    if (pageCount < LULU_MIN_PAGES) {
      throw new Error(`Le livre doit avoir au minimum ${LULU_MIN_PAGES} pages (actuellement: ${pageCount})`);
    }

    const requestBody = {
      line_items: [{
        page_count: pageCount,
        pod_package_id: LULU_POD_PACKAGE_ID,
        quantity: quantity,
      }],
      shipping_address: {
        city: shippingAddress.city,
        country_code: shippingAddress.country_code,
        postcode: shippingAddress.postcode,
        state_code: shippingAddress.state_code,
      },
    };

    const response = await this.apiRequest<{ shipping_options: LuluShippingOption[] }>(
      '/print-shipping-options/',
      'POST',
      requestBody
    );

    return response.shipping_options;
  }

  /**
   * Créer un print job (commande d'impression)
   */
  public async createPrintJob(
    request: LuluPrintJobRequest
  ): Promise<LuluPrintJobResponse> {
    const requestBody = {
      external_id: request.external_id,
      contact_email: request.contact_email,
      production_delay: request.production_delay || 120, // 2 heures par défaut (pour tests)
      shipping_level: request.shipping_level,
      shipping_address: {
        name: request.shipping_address.name,
        street1: request.shipping_address.street1,
        street2: request.shipping_address.street2 || '',
        city: request.shipping_address.city,
        state_code: request.shipping_address.state_code || '',
        country_code: request.shipping_address.country_code,
        postcode: request.shipping_address.postcode,
        phone_number: request.shipping_address.phone_number,
      },
      line_items: request.line_items.map(item => ({
        pod_package_id: item.pod_package_id,
        quantity: item.quantity,
        printable_normalization: {
          interior: {
            source_url: item.interior.source_url,
          },
          cover: {
            source_url: item.cover.source_url,
          },
        },
      })),
    };

    return this.apiRequest<LuluPrintJobResponse>(
      '/print-jobs/',
      'POST',
      requestBody
    );
  }

  /**
   * Récupérer le statut d'un print job
   */
  public async getPrintJob(printJobId: string | number): Promise<LuluPrintJobResponse> {
    return this.apiRequest<LuluPrintJobResponse>(`/print-jobs/${printJobId}/`);
  }

  /**
   * Annuler un print job (possible seulement avant production)
   */
  public async cancelPrintJob(printJobId: string | number): Promise<void> {
    await this.apiRequest(`/print-jobs/${printJobId}/`, 'DELETE');
  }

  /**
   * Vérifier si l'API est configurée et accessible
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.authenticate();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Vérifier si on utilise l'environnement sandbox
   */
  public isSandbox(): boolean {
    return this.apiUrl.includes('sandbox');
  }
}

export default LuluService;
