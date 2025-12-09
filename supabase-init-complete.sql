-- ========================================
-- SCHÉMA COMPLET MY MOZAÏCA V1
-- ========================================
-- À exécuter dans l'éditeur SQL de Supabase
-- Ce fichier crée TOUTES les tables nécessaires

-- ========================================
-- 1. TABLE PROFILES (Extension de auth.users)
-- ========================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  birth_date DATE,
  birth_city TEXT,
  bio TEXT,
  red_flags TEXT, -- Indicateur de sujets sensibles mentionnés
  billing_status TEXT DEFAULT 'free' CHECK (billing_status IN ('free', 'pending', 'paid', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_profiles_billing_status ON public.profiles(billing_status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ========================================
-- 2. TABLE ERAS (Périodes de vie)
-- ========================================

CREATE TABLE IF NOT EXISTS public.eras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  start_age INTEGER NOT NULL,
  end_age INTEGER, -- NULL pour la dernière ère
  "order" INTEGER NOT NULL UNIQUE,
  description TEXT
);

-- Données des ères (à exécuter une seule fois)
INSERT INTO public.eras (label, start_age, end_age, "order", description)
VALUES
  ('Petite enfance', 0, 5, 1, 'Les premiers souvenirs et l''éveil au monde'),
  ('Enfance', 5, 12, 2, 'L''école primaire et les premières amitiés'),
  ('Adolescence', 12, 18, 3, 'Le collège, le lycée et la construction de l''identité'),
  ('Jeune adulte', 18, 30, 4, 'Les études supérieures, premiers emplois et premières expériences'),
  ('Adulte', 30, 45, 5, 'La consolidation professionnelle et personnelle'),
  ('Maturité', 45, 60, 6, 'L''accomplissement et la transmission'),
  ('Senior', 60, 75, 7, 'La retraite active et les nouveaux projets'),
  ('Grand âge', 75, NULL, 8, 'La sagesse et le regard sur une vie accomplie')
ON CONFLICT ("order") DO NOTHING; -- Évite les duplicatas si réexécuté

-- Pas de RLS sur eras (données publiques de référence)

-- ========================================
-- 3. TABLE CHAT_SESSIONS (Sessions par ère)
-- ========================================

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  era_id UUID NOT NULL REFERENCES public.eras(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'available', 'in_progress', 'completed')),
  topic_density INTEGER DEFAULT 0, -- Nombre de sujets abordés
  current_summary TEXT, -- Résumé de la progression
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, era_id) -- Un utilisateur ne peut avoir qu'une session par ère
);

-- Index
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_era_id ON public.chat_sessions(era_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON public.chat_sessions(status);

-- RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON public.chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- ========================================
-- 4. TABLE MESSAGES (Historique des conversations)
-- ========================================

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from their sessions"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their sessions"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- ========================================
-- 5. TABLE USER_FACTS (Faits extraits)
-- ========================================

CREATE TABLE IF NOT EXISTS public.user_facts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  era_id UUID REFERENCES public.eras(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('date', 'location', 'person', 'event', 'emotion', 'other')),
  value TEXT NOT NULL,
  context TEXT, -- Contexte d'extraction
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_facts_user_id ON public.user_facts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_facts_session_id ON public.user_facts(session_id);
CREATE INDEX IF NOT EXISTS idx_user_facts_category ON public.user_facts(category);

-- RLS
ALTER TABLE public.user_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own facts"
  ON public.user_facts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own facts"
  ON public.user_facts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ========================================
-- 6. FONCTIONS UTILITAIRES
-- ========================================

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur chat_sessions
DROP TRIGGER IF EXISTS set_updated_at ON public.chat_sessions;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ========================================
-- 7. COMMENTAIRES (Documentation)
-- ========================================

COMMENT ON TABLE public.profiles IS 'Profils utilisateurs (extension de auth.users)';
COMMENT ON COLUMN public.profiles.billing_status IS 'Statut de paiement: free, pending, paid, cancelled';
COMMENT ON COLUMN public.profiles.red_flags IS 'Indicateur de sujets sensibles mentionnés par l''utilisateur';

COMMENT ON TABLE public.eras IS 'Périodes de vie prédéfinies (8 ères de 0 à 75+ ans)';
COMMENT ON TABLE public.chat_sessions IS 'Sessions de conversation par ère pour chaque utilisateur';
COMMENT ON TABLE public.messages IS 'Historique complet des messages (user, assistant, system)';
COMMENT ON TABLE public.user_facts IS 'Faits extraits des conversations (dates, lieux, personnes, événements)';

-- ========================================
-- FIN DU SCRIPT
-- ========================================

-- Vérification : Compter les enregistrements
SELECT
  'profiles' as table_name, COUNT(*) as count FROM public.profiles
UNION ALL
SELECT 'eras', COUNT(*) FROM public.eras
UNION ALL
SELECT 'chat_sessions', COUNT(*) FROM public.chat_sessions
UNION ALL
SELECT 'messages', COUNT(*) FROM public.messages
UNION ALL
SELECT 'user_facts', COUNT(*) FROM public.user_facts
ORDER BY table_name;
