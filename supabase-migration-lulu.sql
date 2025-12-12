-- ============================================
-- MIGRATION: Lulu Print API Integration
-- Date: 2025-12-12
-- Description: Tables pour commandes de livres physiques via Lulu
-- ============================================

-- ============================================
-- 1. SHIPPING ADDRESSES TABLE
-- Une adresse de livraison par utilisateur
-- ============================================
CREATE TABLE IF NOT EXISTS shipping_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Champs adresse (requis par Lulu API)
  name VARCHAR(255) NOT NULL,
  street1 VARCHAR(255) NOT NULL,
  street2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state_code VARCHAR(10),
  country_code CHAR(2) NOT NULL DEFAULT 'FR',
  postcode VARCHAR(20) NOT NULL,
  phone_number VARCHAR(20) NOT NULL, -- Obligatoire pour les transporteurs

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Une seule adresse par utilisateur
  CONSTRAINT unique_user_shipping_address UNIQUE (user_id)
);

-- Index pour recherche par user_id
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_user_id ON shipping_addresses(user_id);

-- ============================================
-- 2. ORDERS TABLE
-- Commandes (PDF et/ou livres physiques)
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Identifiants
  order_number VARCHAR(50) UNIQUE NOT NULL,

  -- Type de commande
  order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('pack1_pdf', 'pack2_book', 'additional_book')),

  -- Référence LemonSqueezy
  lemonsqueezy_order_id VARCHAR(100),
  lemonsqueezy_product_id VARCHAR(100),

  -- Montants (en centimes EUR)
  amount_paid INTEGER NOT NULL,
  currency CHAR(3) DEFAULT 'EUR',

  -- Statut
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
    'pending',           -- En attente de paiement
    'paid',              -- Payé
    'pending_address',   -- En attente d'adresse (pour livres)
    'processing',        -- En cours de traitement
    'shipped',           -- Expédié
    'delivered',         -- Livré
    'completed',         -- Terminé (PDF téléchargé)
    'cancelled',         -- Annulé
    'refunded',          -- Remboursé
    'error'              -- Erreur
  )),

  -- Pour les livres physiques
  quantity INTEGER DEFAULT 1,
  shipping_address_id UUID REFERENCES shipping_addresses(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE
);

-- Index pour recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ============================================
-- 3. PRINT JOBS TABLE
-- Jobs d'impression Lulu
-- ============================================
CREATE TABLE IF NOT EXISTS print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Référence Lulu
  lulu_print_job_id VARCHAR(100) UNIQUE,
  external_id VARCHAR(100), -- Notre référence envoyée à Lulu

  -- Configuration produit Lulu
  pod_package_id VARCHAR(27) NOT NULL, -- SKU Lulu (ex: 0583X0827BWSTDPB060UW444MXX)
  quantity INTEGER DEFAULT 1,

  -- URLs des PDFs (signées, valides 48h)
  interior_pdf_url TEXT,
  cover_pdf_url TEXT,

  -- Livraison
  shipping_level VARCHAR(20) DEFAULT 'MAIL' CHECK (shipping_level IN (
    'MAIL',          -- Standard
    'PRIORITY_MAIL', -- Prioritaire
    'GROUND',        -- Terrestre
    'EXPEDITED',     -- Express 2 jours
    'EXPRESS'        -- Express 1 jour
  )),

  -- Coûts (en centimes EUR, fournis par Lulu)
  print_cost_cents INTEGER,
  shipping_cost_cents INTEGER,
  fulfillment_fee_cents INTEGER DEFAULT 75, -- 0.75 EUR
  total_cost_cents INTEGER,

  -- Statut Lulu
  status VARCHAR(30) DEFAULT 'created' CHECK (status IN (
    'created',        -- Créé
    'validating',     -- En validation
    'validated',      -- Validé
    'rejected',       -- Rejeté (erreur fichier)
    'in_production',  -- En production
    'shipped',        -- Expédié
    'delivered',      -- Livré (si tracké)
    'cancelled',      -- Annulé
    'error'           -- Erreur
  )),
  status_message TEXT,

  -- Tracking
  tracking_id VARCHAR(100),
  tracking_url TEXT,
  carrier_name VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  validated_at TIMESTAMP WITH TIME ZONE,
  production_started_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE
);

-- Index
CREATE INDEX IF NOT EXISTS idx_print_jobs_order_id ON print_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_user_id ON print_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_lulu_id ON print_jobs(lulu_print_job_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);

-- ============================================
-- 4. GENERATED PDFS TABLE
-- PDFs générés pour impression
-- ============================================
CREATE TABLE IF NOT EXISTS generated_pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Type de PDF
  pdf_type VARCHAR(20) NOT NULL CHECK (pdf_type IN ('interior', 'cover', 'preview')),

  -- Stockage Supabase
  storage_bucket VARCHAR(50) DEFAULT 'book-pdfs',
  storage_path TEXT NOT NULL,

  -- Métadonnées
  file_size_bytes INTEGER,
  page_count INTEGER,           -- Pour interior
  spine_width_mm DECIMAL(5,2),  -- Pour cover

  -- Validation Lulu (optionnel)
  lulu_validation_id VARCHAR(100),
  validation_status VARCHAR(20) CHECK (validation_status IN ('pending', 'validating', 'validated', 'error')),
  validation_errors JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  validated_at TIMESTAMP WITH TIME ZONE
);

-- Index
CREATE INDEX IF NOT EXISTS idx_generated_pdfs_user_id ON generated_pdfs(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_pdfs_type ON generated_pdfs(pdf_type);

-- ============================================
-- 5. MODIFICATIONS TABLE PROFILES
-- Ajout colonnes pour gestion des packs
-- ============================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS pack_type VARCHAR(20) CHECK (pack_type IN ('pack1', 'pack2'));

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS books_included INTEGER DEFAULT 0;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS additional_books_ordered INTEGER DEFAULT 0;

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS sur les nouvelles tables
ALTER TABLE shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_pdfs ENABLE ROW LEVEL SECURITY;

-- Policies shipping_addresses
CREATE POLICY "Users can view their own shipping addresses"
  ON shipping_addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shipping addresses"
  ON shipping_addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shipping addresses"
  ON shipping_addresses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shipping addresses"
  ON shipping_addresses FOR DELETE
  USING (auth.uid() = user_id);

-- Policies orders
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Les updates se font via service_role (webhook)
CREATE POLICY "Service role can update orders"
  ON orders FOR UPDATE
  USING (true);

-- Policies print_jobs
CREATE POLICY "Users can view their own print jobs"
  ON print_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Insert/Update via service_role uniquement
CREATE POLICY "Service role can manage print jobs"
  ON print_jobs FOR ALL
  USING (true);

-- Policies generated_pdfs
CREATE POLICY "Users can view their own generated pdfs"
  ON generated_pdfs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generated pdfs"
  ON generated_pdfs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 7. FONCTIONS UTILITAIRES
-- ============================================

-- Fonction pour générer un numéro de commande unique
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER := 0;
BEGIN
  LOOP
    -- Format: MOZAICA-YYYYMMDD-XXXX (ex: MOZAICA-20251212-A1B2)
    new_number := 'MOZAICA-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                  UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));

    -- Vérifier unicité
    EXIT WHEN NOT EXISTS (SELECT 1 FROM orders WHERE order_number = new_number);

    counter := counter + 1;
    IF counter > 10 THEN
      RAISE EXCEPTION 'Could not generate unique order number';
    END IF;
  END LOOP;

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger aux tables
CREATE TRIGGER update_shipping_addresses_updated_at
  BEFORE UPDATE ON shipping_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_print_jobs_updated_at
  BEFORE UPDATE ON print_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================

-- Commentaire pour vérification
COMMENT ON TABLE shipping_addresses IS 'Adresses de livraison pour commandes Lulu';
COMMENT ON TABLE orders IS 'Commandes de livres (PDF et physiques)';
COMMENT ON TABLE print_jobs IS 'Jobs d''impression Lulu';
COMMENT ON TABLE generated_pdfs IS 'PDFs générés pour impression Lulu';
