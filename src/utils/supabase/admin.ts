import { createClient } from '@supabase/supabase-js';

/**
 * Crée un client Supabase Admin avec le SERVICE_ROLE_KEY
 *
 * ⚠️ ATTENTION : Ce client BYPASS toutes les politiques RLS (Row Level Security).
 * À utiliser UNIQUEMENT côté serveur pour :
 * - Création de comptes utilisateurs (signup flow)
 * - Webhooks (mise à jour billing_status)
 * - Opérations d'initialisation (création des sessions)
 *
 * ❌ NE JAMAIS utiliser côté client
 * ❌ NE JAMAIS exposer SERVICE_ROLE_KEY au frontend
 *
 * @returns Client Supabase avec droits administrateur
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
