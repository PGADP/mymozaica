-- Migration: Créer la table book_chapters pour les chapitres générés
-- Date: 2025-12-10
-- Phase C: Factory (Architecte + Writer)

-- Table pour stocker les chapitres générés par l'agent Writer
CREATE TABLE book_chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  era_id UUID REFERENCES eras(id) ON DELETE SET NULL,
  chapter_order INT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- HTML généré par TipTap
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contrainte: un seul chapitre par ordre pour un utilisateur
  UNIQUE(user_id, chapter_order)
);

-- Index pour performance
CREATE INDEX idx_book_chapters_user ON book_chapters(user_id);
CREATE INDEX idx_book_chapters_order ON book_chapters(user_id, chapter_order);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_book_chapters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER set_book_chapters_updated_at
  BEFORE UPDATE ON book_chapters
  FOR EACH ROW
  EXECUTE FUNCTION update_book_chapters_updated_at();

-- Row Level Security (RLS)
ALTER TABLE book_chapters ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leurs propres chapitres
CREATE POLICY "Users can view their own chapters"
  ON book_chapters FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent insérer leurs propres chapitres
CREATE POLICY "Users can insert their own chapters"
  ON book_chapters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent mettre à jour leurs propres chapitres
CREATE POLICY "Users can update their own chapters"
  ON book_chapters FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent supprimer leurs propres chapitres
CREATE POLICY "Users can delete their own chapters"
  ON book_chapters FOR DELETE
  USING (auth.uid() = user_id);

-- Commentaire sur la table
COMMENT ON TABLE book_chapters IS 'Stocke les chapitres du livre générés par l''agent Writer à partir du plan de l''Architecte';

-- Commentaire sur les colonnes
COMMENT ON COLUMN book_chapters.content IS 'Contenu HTML du chapitre (éditable via TipTap)';
COMMENT ON COLUMN book_chapters.chapter_order IS 'Ordre du chapitre dans le livre (1, 2, 3, ...)';
