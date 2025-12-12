# Explication Complete : Integration Lulu Print API

> Ce document explique en detail le fonctionnement de l'integration Lulu pour l'impression et la livraison de livres physiques.

---

## Table des matieres

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture globale](#2-architecture-globale)
3. [Flux utilisateur complet](#3-flux-utilisateur-complet)
4. [Base de donnees](#4-base-de-donnees)
5. [Services Backend](#5-services-backend)
6. [Routes API](#6-routes-api)
7. [Webhooks](#7-webhooks)
8. [Interface utilisateur](#8-interface-utilisateur)
9. [Securite](#9-securite)
10. [Diagrammes de flux](#10-diagrammes-de-flux)

---

## 1. Vue d'ensemble

### Qu'est-ce que Lulu ?

Lulu est un service d'impression a la demande (Print-on-Demand). Ils impriment et expedient des livres physiques sans que vous ayez besoin de gerer de stock.

### Comment ca marche ?

```
Votre App → API Lulu → Imprimerie Lulu → Transporteur → Client
```

1. Vous envoyez les PDFs (interieur + couverture) a Lulu via leur API
2. Lulu valide les fichiers et calcule les couts
3. Lulu imprime le livre dans leur usine
4. Lulu expedie directement au client final
5. Vous recevez des notifications de statut via webhook

### Les deux packs My Mozaica

| Pack | Prix | Contenu |
|------|------|---------|
| **Pack 1** | 49 EUR | PDF numerique uniquement |
| **Pack 2** | 68 EUR | PDF + 1 livre physique inclus |

**Livres supplementaires** :
- Premier livre (pour Pack 1) : +23 EUR
- Livres suivants (meme adresse) : +15 EUR

---

## 2. Architecture globale

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  /dashboard/book         │  Visualisation du livre              │
│  /dashboard/order-book   │  Commande livre physique             │
│  ShippingAddressForm     │  Formulaire adresse                  │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API ROUTES (Next.js)                      │
├─────────────────────────────────────────────────────────────────┤
│  /api/orders/generate-print-pdfs  │  Genere les PDFs            │
│  /api/orders/shipping-cost        │  Calcule frais de port      │
│  /api/orders/create-print-job     │  Cree commande Lulu         │
│  /api/webhooks/lulu               │  Recoit statuts Lulu        │
│  /api/webhooks/lemonsqueezy       │  Recoit paiements           │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVICES (Singletons)                     │
├─────────────────────────────────────────────────────────────────┤
│  LuluService          │  Communication API Lulu                 │
│  PdfGeneratorService  │  Generation PDFs avec Puppeteer         │
│  EmailService         │  Envoi emails via Resend                │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVICES EXTERNES                         │
├─────────────────────────────────────────────────────────────────┤
│  Supabase      │  Base de donnees + Storage + Auth              │
│  Lulu API      │  Impression + Livraison                        │
│  LemonSqueezy  │  Paiements                                     │
│  Resend        │  Emails transactionnels                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Flux utilisateur complet

### Scenario : Utilisateur achete Pack 2 (68 EUR)

```
ETAPE 1 : PAIEMENT
─────────────────────────────────────────────────────────────────
User clique "Acheter Pack 2"
    │
    ▼
Redirection vers LemonSqueezy checkout
(URL contient: ?checkout[custom][pack_type]=pack2&checkout[custom][user_id]=xxx)
    │
    ▼
User paie 68 EUR
    │
    ▼
LemonSqueezy envoie webhook POST /api/webhooks/lemonsqueezy
    │
    ▼
Notre webhook:
  1. Verifie la signature HMAC
  2. Extrait pack_type="pack2" et user_id
  3. Cree un enregistrement dans table `orders` (status="pending_address")
  4. Met a jour `profiles` (pack_type="pack2", books_included=1)
  5. Envoie email de confirmation
```

```
ETAPE 2 : SAISIE ADRESSE
─────────────────────────────────────────────────────────────────
User va sur /dashboard/order-book
    │
    ▼
Page detecte une commande en status="pending_address"
    │
    ▼
User remplit le formulaire ShippingAddressForm:
  - Nom complet
  - Adresse (rue, ville, code postal, pays)
  - Telephone (OBLIGATOIRE pour transporteur)
    │
    ▼
POST vers Supabase → table `shipping_addresses`
    │
    ▼
Calcul automatique des frais de port via POST /api/orders/shipping-cost
    │
    ▼
Affichage du recapitulatif avec le cout total
```

```
ETAPE 3 : GENERATION DES PDFs
─────────────────────────────────────────────────────────────────
User clique "Confirmer la commande"
    │
    ▼
POST /api/orders/generate-print-pdfs
    │
    ▼
PdfGeneratorService:
  1. Lance navigateur Chromium (@sparticuz/chromium)
  2. Charge le HTML du livre (chapitres depuis book_chapters)
  3. Genere PDF interieur (A5 avec bleed 3mm)
  4. Genere PDF couverture (spread: dos + devant + arriere)
  5. Upload les 2 PDFs vers Supabase Storage (bucket prive)
  6. Genere des URLs signees valides 48h
    │
    ▼
Retourne les URLs signees au frontend
```

```
ETAPE 4 : CREATION COMMANDE LULU
─────────────────────────────────────────────────────────────────
POST /api/orders/create-print-job
    │
    ▼
LuluService.createPrintJob():
  1. S'authentifie aupres de Lulu (OAuth client_credentials)
  2. Envoie la requete avec:
     - URLs des PDFs (interieur + couverture)
     - Adresse de livraison
     - Niveau de livraison (MAIL, PRIORITY, EXPRESS...)
     - SKU du produit (0583X0827BWSTDPB060UW444MXX)
  3. Lulu retourne un print_job_id
    │
    ▼
Notre API:
  1. Enregistre dans table `print_jobs`
  2. Met a jour `orders` (status="processing")
  3. Envoie email "Livre en production"
```

```
ETAPE 5 : PRODUCTION ET LIVRAISON (cote Lulu)
─────────────────────────────────────────────────────────────────
Lulu recoit la commande
    │
    ▼
Lulu valide les PDFs (format, resolution, marges)
    │ Si erreur → webhook avec status="REJECTED"
    ▼
Lulu imprime le livre (2-5 jours ouvres)
    │
    ▼
Lulu expedie au client
    │
    ▼
Lulu envoie webhook POST /api/webhooks/lulu
  avec status="SHIPPED" et numero de suivi
```

```
ETAPE 6 : RECEPTION WEBHOOK LULU
─────────────────────────────────────────────────────────────────
POST /api/webhooks/lulu recoit:
{
  "event_type": "PRINT_JOB_STATUS_CHANGED",
  "data": {
    "id": "12345",
    "status": { "name": "SHIPPED" },
    "tracking": {
      "tracking_id": "1Z999AA10123456784",
      "tracking_urls": ["https://..."],
      "carrier_name": "UPS"
    }
  }
}
    │
    ▼
Notre webhook:
  1. Trouve le print_job correspondant
  2. Met a jour le statut (print_jobs.status = "shipped")
  3. Enregistre le numero de suivi
  4. Met a jour orders.status = "shipped"
  5. Envoie email avec lien de suivi au client
```

---

## 4. Base de donnees

### Schema des tables

```sql
┌─────────────────────────────────────────────────────────────────┐
│                         profiles                                 │
├─────────────────────────────────────────────────────────────────┤
│ id                    UUID PRIMARY KEY                          │
│ email                 VARCHAR                                   │
│ full_name             VARCHAR                                   │
│ billing_status        VARCHAR (free/pending/paid/cancelled)     │
│ pack_type             VARCHAR (pack1/pack2)         ← NOUVEAU   │
│ books_included        INTEGER DEFAULT 0             ← NOUVEAU   │
│ additional_books_ordered INTEGER DEFAULT 0          ← NOUVEAU   │
└─────────────────────────────────────────────────────────────────┘
          │
          │ 1:1
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    shipping_addresses                            │
├─────────────────────────────────────────────────────────────────┤
│ id                    UUID PRIMARY KEY                          │
│ user_id               UUID REFERENCES profiles (UNIQUE)         │
│ name                  VARCHAR NOT NULL                          │
│ street1               VARCHAR NOT NULL                          │
│ street2               VARCHAR                                   │
│ city                  VARCHAR NOT NULL                          │
│ state_code            VARCHAR (pour US/CA)                      │
│ country_code          CHAR(2) DEFAULT 'FR'                      │
│ postcode              VARCHAR NOT NULL                          │
│ phone_number          VARCHAR NOT NULL                          │
│ created_at            TIMESTAMP                                 │
│ updated_at            TIMESTAMP                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          orders                                  │
├─────────────────────────────────────────────────────────────────┤
│ id                    UUID PRIMARY KEY                          │
│ user_id               UUID REFERENCES profiles                  │
│ order_number          VARCHAR UNIQUE (ex: MOZAICA-20251212-A1B2)│
│ order_type            VARCHAR (pack1_pdf/pack2_book/additional) │
│ lemonsqueezy_order_id VARCHAR                                   │
│ amount_paid           INTEGER (centimes EUR)                    │
│ currency              CHAR(3) DEFAULT 'EUR'                     │
│ status                VARCHAR (voir liste ci-dessous)           │
│ quantity              INTEGER DEFAULT 1                         │
│ shipping_address_id   UUID REFERENCES shipping_addresses        │
│ created_at            TIMESTAMP                                 │
│ paid_at               TIMESTAMP                                 │
│ shipped_at            TIMESTAMP                                 │
└─────────────────────────────────────────────────────────────────┘
          │
          │ 1:N
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        print_jobs                                │
├─────────────────────────────────────────────────────────────────┤
│ id                    UUID PRIMARY KEY                          │
│ order_id              UUID REFERENCES orders                    │
│ user_id               UUID REFERENCES profiles                  │
│ lulu_print_job_id     VARCHAR UNIQUE (ID Lulu)                  │
│ external_id           VARCHAR (notre reference)                 │
│ pod_package_id        VARCHAR (SKU Lulu)                        │
│ quantity              INTEGER                                   │
│ interior_pdf_url      TEXT (URL signee)                         │
│ cover_pdf_url         TEXT (URL signee)                         │
│ shipping_level        VARCHAR (MAIL/PRIORITY/EXPRESS...)        │
│ print_cost_cents      INTEGER                                   │
│ shipping_cost_cents   INTEGER                                   │
│ total_cost_cents      INTEGER                                   │
│ status                VARCHAR (voir liste ci-dessous)           │
│ status_message        TEXT                                      │
│ tracking_id           VARCHAR                                   │
│ tracking_url          TEXT                                      │
│ carrier_name          VARCHAR                                   │
│ created_at            TIMESTAMP                                 │
│ shipped_at            TIMESTAMP                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       generated_pdfs                             │
├─────────────────────────────────────────────────────────────────┤
│ id                    UUID PRIMARY KEY                          │
│ user_id               UUID REFERENCES profiles                  │
│ pdf_type              VARCHAR (interior/cover/preview)          │
│ storage_bucket        VARCHAR DEFAULT 'book-pdfs'               │
│ storage_path          TEXT (chemin dans le bucket)              │
│ file_size_bytes       INTEGER                                   │
│ page_count            INTEGER (pour interior)                   │
│ spine_width_mm        DECIMAL (pour cover)                      │
│ created_at            TIMESTAMP                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Statuts possibles

**orders.status** :
```
pending          → En attente de paiement
paid             → Paye (pour PDF seul)
pending_address  → En attente d'adresse (pour livres)
processing       → En cours de traitement chez Lulu
shipped          → Expedie
delivered        → Livre
completed        → Termine
cancelled        → Annule
error            → Erreur
```

**print_jobs.status** :
```
created          → Cree localement
validating       → Lulu valide les PDFs
validated        → PDFs valides
rejected         → PDFs refuses (erreur fichier)
in_production    → En cours d'impression
shipped          → Expedie
delivered        → Livre
cancelled        → Annule
error            → Erreur
```

---

## 5. Services Backend

### 5.1 LuluService (`src/core/services/lulu.ts`)

Service singleton qui gere toute la communication avec l'API Lulu.

```typescript
// Obtenir l'instance
const lulu = LuluService.getInstance();

// Methodes disponibles :
await lulu.calculateCost(pageCount, quantity, address, shippingLevel);
await lulu.getShippingOptions(pageCount, quantity, address);
await lulu.createPrintJob(request);
await lulu.getPrintJob(printJobId);
await lulu.cancelPrintJob(printJobId);
await lulu.healthCheck();
lulu.isSandbox();
```

**Authentification OAuth** :
```
POST /auth/realms/glasstree/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
client_id={LULU_CLIENT_KEY}
client_secret={LULU_CLIENT_SECRET}
```

Le token est cache et renouvele automatiquement avant expiration.

### 5.2 PdfGeneratorService (`src/core/services/pdf-generator.ts`)

Genere des PDFs print-ready avec Puppeteer et @sparticuz/chromium.

```typescript
const pdfGenerator = PdfGeneratorService.getInstance();

// Generer les deux PDFs
const { interior, cover } = await pdfGenerator.generatePrintPdfs(
  userId,
  chapters,  // Array de {chapter_number, title, content}
  metadata   // {title, authorName, subtitle?, backCoverText?}
);
```

**Specifications PDF interieur** :
- Format : A5 (148mm x 210mm)
- Avec bleed : 154.5mm x 216.5mm (+3.175mm de chaque cote)
- Resolution : 300 DPI
- Minimum : 32 pages (exigence Lulu)

**Specifications PDF couverture** :
- Format : Spread (4eme de couv + dos + 1ere de couv)
- Largeur dos : calcule selon nombre de pages
- Formule : `spine_width = (pages / 444) + 0.06` pouces

### 5.3 EmailService (`src/core/services/email.ts`)

Envoie des emails transactionnels via Resend.

```typescript
const email = EmailService.getInstance();

// Emails disponibles :
await email.sendOrderConfirmation(data);   // Apres paiement
await email.sendPdfReady(data);            // PDF disponible
await email.sendProductionStarted(data);   // Livre en production
await email.sendShipped(data);             // Livre expedie (avec tracking)
```

---

## 6. Routes API

### POST /api/orders/generate-print-pdfs

**But** : Generer les PDFs interieur et couverture

**Authentification** : Cookie Supabase (utilisateur connecte)

**Body** :
```json
{
  "bookTitle": "Mon Livre de Vie",
  "authorName": "Jean Dupont",
  "subtitle": "Une histoire unique",
  "backCoverText": "Texte pour la 4eme de couverture..."
}
```

**Response** :
```json
{
  "success": true,
  "interior": {
    "storagePath": "user-id/interior-1234567890.pdf",
    "signedUrl": "https://...supabase.co/storage/v1/object/sign/book-pdfs/...",
    "pageCount": 48,
    "fileSizeBytes": 1234567
  },
  "cover": {
    "storagePath": "user-id/cover-1234567890.pdf",
    "signedUrl": "https://...",
    "fileSizeBytes": 234567,
    "spineWidthMm": 4.2
  }
}
```

### POST /api/orders/shipping-cost

**But** : Calculer les frais de livraison avant commande

**Body** :
```json
{
  "pageCount": 48,
  "quantity": 1,
  "shippingAddress": {
    "city": "Paris",
    "country_code": "FR",
    "postcode": "75001",
    "state_code": null
  },
  "shippingLevel": "MAIL",
  "getAllOptions": false
}
```

**Response** :
```json
{
  "success": true,
  "cost": {
    "total_cost_excl_tax": 8.50,
    "total_cost_incl_tax": 10.20,
    "total_tax": 1.70,
    "shipping_cost": {
      "total_cost_excl_tax": 3.50,
      "total_cost_incl_tax": 4.20
    },
    "currency": "EUR"
  },
  "isSandbox": true
}
```

### POST /api/orders/create-print-job

**But** : Creer la commande d'impression chez Lulu

**Body** :
```json
{
  "orderId": "uuid-de-la-commande",
  "interiorPdfUrl": "https://...signed-url...",
  "coverPdfUrl": "https://...signed-url...",
  "quantity": 1,
  "shippingLevel": "MAIL"
}
```

**Response** :
```json
{
  "success": true,
  "printJob": { /* objet print_job de la BDD */ },
  "luluPrintJobId": 12345,
  "status": "CREATED",
  "isSandbox": true
}
```

---

## 7. Webhooks

### Webhook LemonSqueezy (`/api/webhooks/lemonsqueezy`)

**Evenement** : `order_created`

**Quand** : Apres un paiement reussi

**Ce qu'il fait** :
1. Verifie la signature HMAC
2. Extrait `pack_type` et `user_id` du custom_data
3. Cree une entree dans `orders`
4. Met a jour `profiles` (billing_status, pack_type, books_included)
5. Envoie email de confirmation

**Custom data attendu dans l'URL checkout** :
```
?checkout[custom][user_id]=xxx
&checkout[custom][pack_type]=pack1|pack2
&checkout[custom][addon_type]=first_book|extra_book
```

### Webhook Lulu (`/api/webhooks/lulu`)

**Evenement** : `PRINT_JOB_STATUS_CHANGED`

**Quand** : A chaque changement de statut du print job

**Statuts possibles** :
- `CREATED` → Commande recue
- `UNPAID` → En attente de paiement (pas utilise avec notre flow)
- `PRODUCTION_READY` → Pret pour impression
- `IN_PRODUCTION` → En cours d'impression
- `SHIPPED` → Expedie (avec tracking)
- `REJECTED` → PDFs refuses
- `CANCELLED` → Annule
- `ERROR` → Erreur

**Ce qu'il fait** :
1. Verifie la signature HMAC (optionnel selon config)
2. Trouve le print_job par `lulu_print_job_id` ou `external_id`
3. Met a jour `print_jobs` (status, tracking, timestamps)
4. Met a jour `orders` si necessaire
5. Envoie email selon le statut

---

## 8. Interface utilisateur

### Page /dashboard/order-book

**Etapes** :

1. **Chargement** : Verifie s'il y a une commande `pending_address`
2. **Etape 1 - Adresse** : Affiche `ShippingAddressForm`
3. **Calcul** : Appelle `/api/orders/shipping-cost` apres validation adresse
4. **Etape 2 - Confirmation** : Affiche recapitulatif avec couts
5. **Traitement** : Au clic sur "Confirmer":
   - Appelle `/api/orders/generate-print-pdfs`
   - Puis `/api/orders/create-print-job`
   - Redirige vers `/dashboard/order-book/success`

### Composant ShippingAddressForm

**Champs** :
- Nom complet (obligatoire)
- Adresse ligne 1 (obligatoire)
- Adresse ligne 2 (optionnel)
- Code postal (obligatoire)
- Ville (obligatoire)
- Pays (select, obligatoire)
- Etat/Province (obligatoire pour US/CA)
- Telephone (obligatoire - transporteurs l'exigent)

---

## 9. Securite

### Authentification

- **API Routes** : Verifiees via cookie Supabase (`createServerClient`)
- **Webhooks** : Verifies via signature HMAC

### Stockage PDFs

- **Bucket** : `book-pdfs` (PRIVE)
- **Acces** : Uniquement via URLs signees (validite 48h)
- **RLS** : Utilisateur ne peut voir que ses propres fichiers

### Donnees sensibles

- `LULU_CLIENT_SECRET` : Jamais expose cote client
- `LEMONSQUEEZY_WEBHOOK_SECRET` : Verification signature
- `LULU_WEBHOOK_SECRET` : Verification signature (optionnel)

### Validations

- Minimum 32 pages (exigence Lulu)
- Telephone obligatoire (exigence transporteurs)
- billing_status = 'paid' requis pour acceder aux fonctionnalites

---

## 10. Diagrammes de flux

### Flux de paiement et creation commande

```
┌─────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│  User   │────▶│ LemonSqueezy │────▶│   Webhook   │────▶│ Supabase │
└─────────┘     └──────────────┘     └─────────────┘     └──────────┘
     │                                      │
     │ 1. Clique "Acheter"                  │ 3. Recoit order_created
     │                                      │
     ▼                                      ▼
┌─────────────────┐                 ┌─────────────────┐
│ Page checkout   │                 │ Cree order      │
│ LemonSqueezy    │                 │ Update profile  │
│ (custom_data)   │                 │ Envoie email    │
└─────────────────┘                 └─────────────────┘
     │
     │ 2. Paie
     ▼
┌─────────────────┐
│ Paiement OK     │
│ → webhook       │
└─────────────────┘
```

### Flux de commande livre physique

```
┌─────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│  User   │────▶│  order-book  │────▶│  API Routes │────▶│   Lulu   │
└─────────┘     └──────────────┘     └─────────────┘     └──────────┘
                      │                     │                  │
                      │ 1. Saisit adresse   │                  │
                      │                     │                  │
                      ▼                     │                  │
                ┌───────────┐               │                  │
                │ Calcul    │◀──────────────┘                  │
                │ shipping  │  2. shipping-cost                │
                └───────────┘                                  │
                      │                                        │
                      │ 3. Confirme                            │
                      ▼                                        │
                ┌───────────┐                                  │
                │ Genere    │  4. generate-print-pdfs          │
                │ PDFs      │  (Puppeteer → Supabase Storage)  │
                └───────────┘                                  │
                      │                                        │
                      │ 5. URLs signees                        │
                      ▼                                        │
                ┌───────────┐     ┌─────────────┐              │
                │ Cree      │────▶│ create-     │─────────────▶│
                │ print job │     │ print-job   │  6. API Lulu │
                └───────────┘     └─────────────┘              │
                                                               │
                                        ┌──────────────────────┘
                                        │ 7. Webhook status
                                        ▼
                                  ┌───────────┐
                                  │ Update    │
                                  │ status    │
                                  │ + email   │
                                  └───────────┘
```

### Flux des webhooks Lulu

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│    Lulu      │────▶│ /webhooks/lulu  │────▶│   Actions    │
└──────────────┘     └─────────────────┘     └──────────────┘
       │                     │                      │
       │ Status change       │ Verifie signature    │
       │                     │                      │
       ▼                     ▼                      ▼
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│ CREATED      │     │ Trouve          │     │ Rien         │
│ VALIDATED    │     │ print_job       │     │              │
│ IN_PRODUCTION│────▶│ par ID          │────▶│ Update BDD   │
│ SHIPPED      │     │                 │     │ + Email      │
│ REJECTED     │     │                 │     │              │
│ ERROR        │     │                 │     │              │
└──────────────┘     └─────────────────┘     └──────────────┘
```

---

## Resume

L'integration Lulu permet de :

1. **Vendre des packs** via LemonSqueezy (PDF et/ou livre)
2. **Collecter les adresses** de livraison
3. **Generer des PDFs print-ready** (A5 avec bleed)
4. **Commander l'impression** via l'API Lulu
5. **Suivre la production** via webhooks
6. **Notifier le client** a chaque etape par email

Le tout de maniere automatisee, sans intervention manuelle une fois configure.
