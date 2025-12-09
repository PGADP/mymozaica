-- SCHÉMA DE BASE DE DONNÉES MY MOZAÏCA V2
-- À exécuter dans l'éditeur SQL de Supabase

-- Table des conversations
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table des messages
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table des données extraites
CREATE TABLE extracted_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  data_type TEXT CHECK (data_type IN ('date', 'location', 'person', 'event', 'emotion')) NOT NULL,
  value TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table des événements de la timeline
CREATE TABLE timeline_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL, -- Format flexible (année, mois, jour)
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  people TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table de la structure du livre
CREATE TABLE book_structure (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  structure JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Table des chapitres du livre
CREATE TABLE book_chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_structure_id UUID REFERENCES book_structure(id) ON DELETE CASCADE NOT NULL,
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT CHECK (status IN ('draft', 'written', 'reviewed', 'final')) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes pour les performances
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_extracted_data_conversation_id ON extracted_data(conversation_id);
CREATE INDEX idx_timeline_events_user_id ON timeline_events(user_id);
CREATE INDEX idx_timeline_events_date ON timeline_events(date);
CREATE INDEX idx_book_chapters_structure_id ON book_chapters(book_structure_id);

-- Row Level Security (RLS)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_chapters ENABLE ROW LEVEL SECURITY;

-- Policies pour conversations
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies pour messages
CREATE POLICY "Users can view messages from their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Policies pour extracted_data
CREATE POLICY "Users can view extracted data from their conversations"
  ON extracted_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = extracted_data.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert extracted data"
  ON extracted_data FOR INSERT
  WITH CHECK (true); -- L'agent Analyst doit pouvoir insérer

-- Policies pour timeline_events
CREATE POLICY "Users can view their timeline events"
  ON timeline_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create timeline events"
  ON timeline_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their timeline events"
  ON timeline_events FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies pour book_structure
CREATE POLICY "Users can view their book structure"
  ON book_structure FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their book structure"
  ON book_structure FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their book structure"
  ON book_structure FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies pour book_chapters
CREATE POLICY "Users can view chapters of their book"
  ON book_chapters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM book_structure
      WHERE book_structure.id = book_chapters.book_structure_id
      AND book_structure.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage book chapters"
  ON book_chapters FOR ALL
  USING (true); -- Les agents Writer/Reviewer doivent pouvoir modifier

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_book_structure_updated_at
  BEFORE UPDATE ON book_structure
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_book_chapters_updated_at
  BEFORE UPDATE ON book_chapters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
