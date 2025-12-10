-- Migration: Créer la table book_structure pour le plan de l'Architecte
-- Date: 2025-12-10
-- Phase C: Factory (Architecte + Writer)

-- Table pour stocker le plan du livre généré par l'agent Architecte
CREATE TABLE book_structure (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  structure JSONB NOT NULL, -- Plan complet avec chapitres réorganisés chronologiquement
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Un seul plan par utilisateur
  UNIQUE(user_id)
);

-- Index pour performance
CREATE INDEX idx_book_structure_user ON book_structure(user_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_book_structure_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER set_book_structure_updated_at
  BEFORE UPDATE ON book_structure
  FOR EACH ROW
  EXECUTE FUNCTION update_book_structure_updated_at();

-- Row Level Security (RLS)
ALTER TABLE book_structure ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leur propre structure
CREATE POLICY "Users can view their own book structure"
  ON book_structure FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent insérer leur propre structure
CREATE POLICY "Users can insert their own book structure"
  ON book_structure FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent mettre à jour leur propre structure
CREATE POLICY "Users can update their own book structure"
  ON book_structure FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent supprimer leur propre structure
CREATE POLICY "Users can delete their own book structure"
  ON book_structure FOR DELETE
  USING (auth.uid() = user_id);

-- Commentaire sur la table
COMMENT ON TABLE book_structure IS 'Stocke le plan du livre généré par l''agent Architecte (réorganisation chronologique, détection anachronismes)';

-- Commentaire sur la colonne structure
COMMENT ON COLUMN book_structure.structure IS 'Plan JSON contenant: chapters (avec facts réorganisés chronologiquement), anachronisms_fixed, stats (quality_score, total_facts)';
