/**
 * DATABASE TYPES
 * Types générés depuis Supabase (à regénérer avec supabase gen types)
 */

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
    };
  };
}
