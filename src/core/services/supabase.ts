/**
 * SUPABASE SERVICE
 * Service pour les opérations de base de données
 */

import { createClient } from '@supabase/supabase-js';

class SupabaseService {
  private static instance: SupabaseService;
  private client;

  private constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('⚠️ Variables Supabase non configurées');
    }

    this.client = createClient(supabaseUrl, supabaseAnonKey);
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  /**
   * Récupérer le client Supabase
   */
  public getClient() {
    return this.client;
  }

  // TODO: Ajouter les méthodes métier spécifiques
  // - saveConversation()
  // - getConversationHistory()
  // - saveExtractedData()
  // - getTimelineEvents()
  // - saveBookStructure()
  // - etc.
}

export default SupabaseService;
