-- Migration: Ajout de la gestion du statut de paiement
-- Date: 2025-12-08
-- Description: Ajoute la colonne billing_status à la table profiles pour gérer l'accès payant

-- Ajout de la colonne billing_status
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'free' CHECK (billing_status IN ('free', 'pending', 'paid', 'cancelled'));

-- Ajout d'un index pour optimiser les requêtes de filtrage par statut
CREATE INDEX IF NOT EXISTS idx_profiles_billing_status ON profiles(billing_status);

-- Commentaire sur la colonne
COMMENT ON COLUMN profiles.billing_status IS 'Statut de paiement de l''utilisateur: free (défaut), pending (en attente), paid (payé), cancelled (annulé)';

-- Option alternative: Ajouter une colonne booléenne simple si préféré
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_access BOOLEAN DEFAULT false;

-- Mettre à jour les utilisateurs existants (optionnel - à adapter selon besoin)
-- UPDATE profiles SET billing_status = 'free' WHERE billing_status IS NULL;
