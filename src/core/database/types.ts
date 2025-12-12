/**
 * DATABASE TYPES
 * Types générés depuis Supabase (à regénérer avec supabase gen types)
 */

// ============================================
// TYPES POUR LULU PRINT API
// ============================================

export type PackType = 'pack1' | 'pack2';
export type OrderType = 'pack1_pdf' | 'pack2_book' | 'additional_book';
export type OrderStatus = 'pending' | 'paid' | 'pending_address' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded' | 'error';
export type PrintJobStatus = 'created' | 'validating' | 'validated' | 'rejected' | 'in_production' | 'shipped' | 'delivered' | 'cancelled' | 'error';
export type ShippingLevel = 'MAIL' | 'PRIORITY_MAIL' | 'GROUND' | 'EXPEDITED' | 'EXPRESS';
export type PdfType = 'interior' | 'cover' | 'preview';

export interface Database {
  public: {
    Tables: {
      // Table des conversations
      conversations: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Table des messages
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: 'user' | 'assistant';
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: 'user' | 'assistant';
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: 'user' | 'assistant';
          content?: string;
          created_at?: string;
        };
      };

      // Table des données extraites
      extracted_data: {
        Row: {
          id: string;
          conversation_id: string;
          data_type: 'date' | 'location' | 'person' | 'event' | 'emotion';
          value: string;
          metadata: Record<string, any>;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          data_type: 'date' | 'location' | 'person' | 'event' | 'emotion';
          value: string;
          metadata?: Record<string, any>;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          data_type?: 'date' | 'location' | 'person' | 'event' | 'emotion';
          value?: string;
          metadata?: Record<string, any>;
          created_at?: string;
        };
      };

      // Table des événements de la timeline
      timeline_events: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          title: string;
          description: string;
          location: string | null;
          people: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          title: string;
          description: string;
          location?: string | null;
          people?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          title?: string;
          description?: string;
          location?: string | null;
          people?: string[] | null;
          created_at?: string;
        };
      };

      // Table de la structure du livre
      book_structure: {
        Row: {
          id: string;
          user_id: string;
          structure: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          structure: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          structure?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Table des chapitres du livre
      book_chapters: {
        Row: {
          id: string;
          book_structure_id: string;
          chapter_number: number;
          title: string;
          content: string;
          status: 'draft' | 'written' | 'reviewed' | 'final';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          book_structure_id: string;
          chapter_number: number;
          title: string;
          content: string;
          status?: 'draft' | 'written' | 'reviewed' | 'final';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          book_structure_id?: string;
          chapter_number?: number;
          title?: string;
          content?: string;
          status?: 'draft' | 'written' | 'reviewed' | 'final';
          created_at?: string;
          updated_at?: string;
        };
      };

      // ============================================
      // TABLES LULU PRINT API
      // ============================================

      // Table des adresses de livraison
      shipping_addresses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          street1: string;
          street2: string | null;
          city: string;
          state_code: string | null;
          country_code: string;
          postcode: string;
          phone_number: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          street1: string;
          street2?: string | null;
          city: string;
          state_code?: string | null;
          country_code?: string;
          postcode: string;
          phone_number: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          street1?: string;
          street2?: string | null;
          city?: string;
          state_code?: string | null;
          country_code?: string;
          postcode?: string;
          phone_number?: string;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Table des commandes
      orders: {
        Row: {
          id: string;
          user_id: string;
          order_number: string;
          order_type: OrderType;
          lemonsqueezy_order_id: string | null;
          lemonsqueezy_product_id: string | null;
          amount_paid: number;
          currency: string;
          status: OrderStatus;
          quantity: number;
          shipping_address_id: string | null;
          created_at: string;
          updated_at: string;
          paid_at: string | null;
          shipped_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          order_number: string;
          order_type: OrderType;
          lemonsqueezy_order_id?: string | null;
          lemonsqueezy_product_id?: string | null;
          amount_paid: number;
          currency?: string;
          status?: OrderStatus;
          quantity?: number;
          shipping_address_id?: string | null;
          created_at?: string;
          updated_at?: string;
          paid_at?: string | null;
          shipped_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          order_number?: string;
          order_type?: OrderType;
          lemonsqueezy_order_id?: string | null;
          lemonsqueezy_product_id?: string | null;
          amount_paid?: number;
          currency?: string;
          status?: OrderStatus;
          quantity?: number;
          shipping_address_id?: string | null;
          created_at?: string;
          updated_at?: string;
          paid_at?: string | null;
          shipped_at?: string | null;
        };
      };

      // Table des jobs d'impression Lulu
      print_jobs: {
        Row: {
          id: string;
          order_id: string | null;
          user_id: string;
          lulu_print_job_id: string | null;
          external_id: string | null;
          pod_package_id: string;
          quantity: number;
          interior_pdf_url: string | null;
          cover_pdf_url: string | null;
          shipping_level: ShippingLevel;
          print_cost_cents: number | null;
          shipping_cost_cents: number | null;
          fulfillment_fee_cents: number;
          total_cost_cents: number | null;
          status: PrintJobStatus;
          status_message: string | null;
          tracking_id: string | null;
          tracking_url: string | null;
          carrier_name: string | null;
          created_at: string;
          updated_at: string;
          validated_at: string | null;
          production_started_at: string | null;
          shipped_at: string | null;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          user_id: string;
          lulu_print_job_id?: string | null;
          external_id?: string | null;
          pod_package_id: string;
          quantity?: number;
          interior_pdf_url?: string | null;
          cover_pdf_url?: string | null;
          shipping_level?: ShippingLevel;
          print_cost_cents?: number | null;
          shipping_cost_cents?: number | null;
          fulfillment_fee_cents?: number;
          total_cost_cents?: number | null;
          status?: PrintJobStatus;
          status_message?: string | null;
          tracking_id?: string | null;
          tracking_url?: string | null;
          carrier_name?: string | null;
          created_at?: string;
          updated_at?: string;
          validated_at?: string | null;
          production_started_at?: string | null;
          shipped_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string | null;
          user_id?: string;
          lulu_print_job_id?: string | null;
          external_id?: string | null;
          pod_package_id?: string;
          quantity?: number;
          interior_pdf_url?: string | null;
          cover_pdf_url?: string | null;
          shipping_level?: ShippingLevel;
          print_cost_cents?: number | null;
          shipping_cost_cents?: number | null;
          fulfillment_fee_cents?: number;
          total_cost_cents?: number | null;
          status?: PrintJobStatus;
          status_message?: string | null;
          tracking_id?: string | null;
          tracking_url?: string | null;
          carrier_name?: string | null;
          created_at?: string;
          updated_at?: string;
          validated_at?: string | null;
          production_started_at?: string | null;
          shipped_at?: string | null;
        };
      };

      // Table des PDFs générés
      generated_pdfs: {
        Row: {
          id: string;
          user_id: string;
          pdf_type: PdfType;
          storage_bucket: string;
          storage_path: string;
          file_size_bytes: number | null;
          page_count: number | null;
          spine_width_mm: number | null;
          lulu_validation_id: string | null;
          validation_status: 'pending' | 'validating' | 'validated' | 'error' | null;
          validation_errors: Record<string, unknown> | null;
          created_at: string;
          validated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          pdf_type: PdfType;
          storage_bucket?: string;
          storage_path: string;
          file_size_bytes?: number | null;
          page_count?: number | null;
          spine_width_mm?: number | null;
          lulu_validation_id?: string | null;
          validation_status?: 'pending' | 'validating' | 'validated' | 'error' | null;
          validation_errors?: Record<string, unknown> | null;
          created_at?: string;
          validated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          pdf_type?: PdfType;
          storage_bucket?: string;
          storage_path?: string;
          file_size_bytes?: number | null;
          page_count?: number | null;
          spine_width_mm?: number | null;
          lulu_validation_id?: string | null;
          validation_status?: 'pending' | 'validating' | 'validated' | 'error' | null;
          validation_errors?: Record<string, unknown> | null;
          created_at?: string;
          validated_at?: string | null;
        };
      };
    };
  };
}

// ============================================
// INTERFACES UTILITAIRES LULU
// ============================================

export interface ShippingAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state_code?: string;
  country_code: string;
  postcode: string;
  phone_number: string;
}

export interface LuluLineItem {
  pod_package_id: string;
  quantity: number;
  interior: { source_url: string };
  cover: { source_url: string };
}

export interface LuluPrintJobRequest {
  external_id: string;
  line_items: LuluLineItem[];
  shipping_address: ShippingAddress;
  shipping_level: ShippingLevel;
  contact_email: string;
  production_delay?: number;
}

export interface LuluCostCalculation {
  total_cost_excl_tax: number;
  total_cost_incl_tax: number;
  total_tax: number;
  shipping_cost: {
    total_cost_excl_tax: number;
    total_cost_incl_tax: number;
  };
  currency: string;
}
