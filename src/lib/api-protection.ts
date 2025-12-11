/**
 * API Protection - Système de sécurité pour limiter l'usage des APIs IA
 *
 * Protections mises en place :
 * 1. Limite de génération du livre (3 max par utilisateur)
 * 2. Rate limiting par utilisateur (requêtes par minute/heure)
 * 3. Vérification du billing_status (doit être 'paid')
 * 4. Logging de toutes les requêtes pour audit
 */

import { createClient } from '@supabase/supabase-js';

// Types
export interface UsageRecord {
  user_id: string;
  api_endpoint: string;
  tokens_used?: number;
  cost_estimate?: number;
  created_at: string;
}

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
}

export interface ProtectionResult {
  allowed: boolean;
  reason?: string;
  remainingRequests?: number;
}

// Configuration des limites par endpoint
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Génération du livre - très limité (coûteux)
  'writer': {
    maxRequestsPerMinute: 1,
    maxRequestsPerHour: 2,
    maxRequestsPerDay: 3, // MAX 3 générations par jour
  },
  'architect': {
    maxRequestsPerMinute: 1,
    maxRequestsPerHour: 3,
    maxRequestsPerDay: 5,
  },
  // Interview - plus permissif mais limité
  'interviewer': {
    maxRequestsPerMinute: 10,
    maxRequestsPerHour: 100,
    maxRequestsPerDay: 500,
  },
  // Analyst - appelé en background, limité
  'analyst': {
    maxRequestsPerMinute: 15,
    maxRequestsPerHour: 150,
    maxRequestsPerDay: 750,
  },
  // Default pour endpoints non listés
  'default': {
    maxRequestsPerMinute: 5,
    maxRequestsPerHour: 50,
    maxRequestsPerDay: 200,
  },
};

// Limite absolue de générations de livres par utilisateur (lifetime)
export const MAX_BOOK_GENERATIONS = 3;

// Client Supabase Admin
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Vérifie si l'utilisateur a le droit d'utiliser l'API
 */
export async function checkApiAccess(
  userId: string,
  endpoint: string
): Promise<ProtectionResult> {
  const supabase = getSupabaseAdmin();

  // 1. Vérifier le billing_status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('billing_status')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return { allowed: false, reason: 'Profil utilisateur introuvable' };
  }

  if (profile.billing_status !== 'paid') {
    return { allowed: false, reason: 'Abonnement requis pour utiliser cette fonctionnalité' };
  }

  // 2. Pour la génération du livre, vérifier la limite lifetime
  if (endpoint === 'writer') {
    const lifetimeCheck = await checkLifetimeBookGenerations(userId);
    if (!lifetimeCheck.allowed) {
      return lifetimeCheck;
    }
  }

  // 3. Vérifier le rate limiting
  const rateLimitCheck = await checkRateLimit(userId, endpoint);
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck;
  }

  return { allowed: true };
}

/**
 * Vérifie le nombre total de générations de livres (lifetime)
 */
async function checkLifetimeBookGenerations(userId: string): Promise<ProtectionResult> {
  const supabase = getSupabaseAdmin();

  try {
    const { count, error } = await supabase
      .from('api_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('api_endpoint', 'writer')
      .eq('success', true);

    // Si la table n'existe pas, on laisse passer (mode dégradé)
    if (error) {
      console.warn('⚠️ Table api_usage non disponible, mode dégradé activé:', error.message);
      return { allowed: true, remainingRequests: MAX_BOOK_GENERATIONS };
    }

    const usedGenerations = count || 0;
    const remaining = MAX_BOOK_GENERATIONS - usedGenerations;

    if (remaining <= 0) {
      return {
        allowed: false,
        reason: `Limite de ${MAX_BOOK_GENERATIONS} générations de livre atteinte. Contactez le support pour en obtenir plus.`,
        remainingRequests: 0,
      };
    }

    return { allowed: true, remainingRequests: remaining };
  } catch (e) {
    console.warn('⚠️ Erreur checkLifetimeBookGenerations, mode dégradé:', e);
    return { allowed: true, remainingRequests: MAX_BOOK_GENERATIONS };
  }
}

/**
 * Vérifie le rate limiting (minute/heure/jour)
 */
async function checkRateLimit(userId: string, endpoint: string): Promise<ProtectionResult> {
  const supabase = getSupabaseAdmin();
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS['default'];

  try {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Vérifier les requêtes par minute
    const { count: countMinute, error: errorMinute } = await supabase
      .from('api_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('api_endpoint', endpoint)
      .gte('created_at', oneMinuteAgo.toISOString());

    // Si la table n'existe pas, mode dégradé
    if (errorMinute) {
      console.warn('⚠️ Table api_usage non disponible pour rate limiting:', errorMinute.message);
      return { allowed: true, remainingRequests: config.maxRequestsPerDay };
    }

    if ((countMinute || 0) >= config.maxRequestsPerMinute) {
      return {
        allowed: false,
        reason: `Trop de requêtes. Attendez une minute avant de réessayer.`,
        remainingRequests: 0,
      };
    }

    // Vérifier les requêtes par heure
    const { count: countHour } = await supabase
      .from('api_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('api_endpoint', endpoint)
      .gte('created_at', oneHourAgo.toISOString());

    if ((countHour || 0) >= config.maxRequestsPerHour) {
      return {
        allowed: false,
        reason: `Limite horaire atteinte. Réessayez dans une heure.`,
        remainingRequests: 0,
      };
    }

    // Vérifier les requêtes par jour
    const { count: countDay } = await supabase
      .from('api_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('api_endpoint', endpoint)
      .gte('created_at', oneDayAgo.toISOString());

    if ((countDay || 0) >= config.maxRequestsPerDay) {
      return {
        allowed: false,
        reason: `Limite journalière atteinte. Réessayez demain.`,
        remainingRequests: 0,
      };
    }

    return {
      allowed: true,
      remainingRequests: config.maxRequestsPerDay - (countDay || 0),
    };
  } catch (e) {
    console.warn('⚠️ Erreur checkRateLimit, mode dégradé:', e);
    return { allowed: true, remainingRequests: config.maxRequestsPerDay };
  }
}

/**
 * Enregistre une utilisation d'API
 * Non-bloquant si la table n'existe pas
 */
export async function logApiUsage(
  userId: string,
  endpoint: string,
  success: boolean,
  tokensUsed?: number,
  costEstimate?: number,
  errorMessage?: string
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from('api_usage').insert({
      user_id: userId,
      api_endpoint: endpoint,
      success,
      tokens_used: tokensUsed,
      cost_estimate: costEstimate,
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    });

    if (error) {
      // Ne pas bloquer si la table n'existe pas
      console.warn('⚠️ Impossible de logger usage API (table manquante?):', error.message);
    }
  } catch (e) {
    console.warn('⚠️ Erreur logApiUsage (non-bloquant):', e);
  }
}

/**
 * Récupère les statistiques d'usage d'un utilisateur
 */
export async function getUserApiStats(userId: string): Promise<{
  bookGenerations: number;
  bookGenerationsRemaining: number;
  todayRequests: number;
  totalRequests: number;
}> {
  const supabase = getSupabaseAdmin();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Générations de livres
  const { count: bookGenerations } = await supabase
    .from('api_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('api_endpoint', 'writer')
    .eq('success', true);

  // Requêtes aujourd'hui
  const { count: todayRequests } = await supabase
    .from('api_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneDayAgo.toISOString());

  // Total requêtes
  const { count: totalRequests } = await supabase
    .from('api_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return {
    bookGenerations: bookGenerations || 0,
    bookGenerationsRemaining: MAX_BOOK_GENERATIONS - (bookGenerations || 0),
    todayRequests: todayRequests || 0,
    totalRequests: totalRequests || 0,
  };
}

/**
 * Middleware de protection pour les routes API
 * À utiliser en début de chaque route API IA
 */
export async function withApiProtection(
  userId: string | null,
  endpoint: string
): Promise<{ allowed: boolean; error?: string; status?: number }> {
  if (!userId) {
    return { allowed: false, error: 'Non autorisé', status: 401 };
  }

  const check = await checkApiAccess(userId, endpoint);

  if (!check.allowed) {
    // Log la tentative bloquée
    await logApiUsage(userId, endpoint, false, undefined, undefined, check.reason);

    return {
      allowed: false,
      error: check.reason || 'Accès refusé',
      status: 429, // Too Many Requests
    };
  }

  return { allowed: true };
}
