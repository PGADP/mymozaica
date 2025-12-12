import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import LuluService from '@/core/services/lulu';
import { ShippingAddress, ShippingLevel } from '@/core/database/types';

/**
 * POST /api/orders/shipping-cost
 *
 * Calcule le coût de livraison via Lulu API
 *
 * Body:
 * - pageCount: number
 * - quantity: number
 * - shippingAddress: ShippingAddress
 * - shippingLevel?: ShippingLevel (default: 'MAIL')
 *
 * Retourne:
 * - cost: LuluCostCalculation
 * - shippingOptions?: array (si getAllOptions=true)
 */
export async function POST(req: NextRequest) {
  try {
    // Authentification
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    // Récupérer les paramètres
    const body = await req.json();
    const {
      pageCount,
      quantity = 1,
      shippingAddress,
      shippingLevel = 'MAIL' as ShippingLevel,
      getAllOptions = false,
    } = body;

    // Validation
    if (!pageCount || typeof pageCount !== 'number') {
      return NextResponse.json(
        { error: 'pageCount requis (nombre)' },
        { status: 400 }
      );
    }

    if (!shippingAddress || !shippingAddress.city || !shippingAddress.country_code || !shippingAddress.postcode) {
      return NextResponse.json(
        { error: 'shippingAddress incomplet (city, country_code, postcode requis)' },
        { status: 400 }
      );
    }

    const luluService = LuluService.getInstance();

    // Vérifier que Lulu est configuré
    const isHealthy = await luluService.healthCheck();
    if (!isHealthy) {
      return NextResponse.json(
        { error: 'Service Lulu indisponible. Verifiez la configuration.' },
        { status: 503 }
      );
    }

    // Calculer le coût
    const cost = await luluService.calculateCost(
      pageCount,
      quantity,
      shippingAddress as ShippingAddress,
      shippingLevel
    );

    // Optionnellement récupérer toutes les options de livraison
    let shippingOptions = null;
    if (getAllOptions) {
      shippingOptions = await luluService.getShippingOptions(
        pageCount,
        quantity,
        shippingAddress as ShippingAddress
      );
    }

    return NextResponse.json({
      success: true,
      cost,
      shippingOptions,
      isSandbox: luluService.isSandbox(),
    });
  } catch (error) {
    console.error('Erreur calcul shipping:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}
