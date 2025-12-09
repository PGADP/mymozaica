# 🗺️ ROADMAP V1 - My Mozaïca

> **Objectif** : Stabiliser et finaliser le MVP pour le lancement de la V1.
> **Stack** : Next.js 15 + Supabase + Mistral Large + Lemon Squeezy
> **Design System** : Céramique (Cream #FDF6E3, Terracotta #E76F51, Emerald #2A9D8F)

---

## 📊 Vue d'ensemble des phases

| Phase | Statut | Progression |
|-------|--------|-------------|
| **Phase 1** : Assainissement | ✅ Terminée | 4/4 |
| **Phase 2** : Tunnel d'entrée | ✅ Terminée | 3/3 |
| **Phase 3** : Paiement & Webhooks | 🔄 En cours | 0/4 |
| **Phase 4** : Cœur du produit | ⏳ Pending | 0/4 |
| **Phase 5** : Déploiement & Tests | ⏳ Pending | 0/3 |

**Total** : 7/18 tâches complétées

---

## 🧹 PHASE 1 : ASSAINISSEMENT (CLEANUP)

**Objectif** : Nettoyer le code legacy et vérifier la configuration de base.

### 1.1 Configuration Git & Remote

- [x] **Vérifier le remote Git**
  - ✅ Remote configuré : https://github.com/PGADP/mymozaica.git
  - Statut : OK

- [x] **Push du code actuel**
  - ✅ Commit "feat: configuration MCP Supabase + ROADMAP V1 complet"
  - ✅ Push réussi vers origin/main

### 1.2 Nettoyage du code legacy

- [x] **Supprimer le dossier `src/app/onboarding`**
  - ✅ Déjà fait (supprimé lors du sprint précédent)
  - Vérification : Le dossier n'existe plus

- [x] **Vérifier `src/app/login/page.tsx`**
  - ✅ Correct : Sert uniquement à la connexion
  - ✅ Bouton "Créer ma fresque" redirige vers `/start`
  - ✅ Lien "Mot de passe oublié" ajouté

### 1.3 Configuration Build

- [x] **Vérifier `next.config.ts`**
  - ✅ `eslint.ignoreDuringBuilds: true` présent
  - ✅ `typescript.ignoreBuildErrors: true` présent
  - Statut : Configuration correcte

### 1.4 Vérification des dépendances

- [x] **Installer les dépendances manquantes**
  - ✅ `npm install` : 489 packages, 0 vulnerabilities
  - ✅ `npm run build` : Build réussi en 16.1s
  - ✅ 21 routes générées sans erreur

---

## 🚪 PHASE 2 : LE TUNNEL D'ENTRÉE (/start)

**Objectif** : Finaliser le parcours d'inscription avec création de compte + sessions.

### 2.1 Vérification Base de Données

- [x] **Table `profiles` - Colonnes obligatoires**
  - ✅ `billing_status` (text, default 'free') - Migration SQL créée
  - ✅ `red_flags` (text) - Présent
  - ✅ Fichier `supabase-init-complete.sql` créé (schéma complet)

- [x] **Tables `eras` et `chat_sessions`**
  - ✅ DDL complet dans `supabase-init-complete.sql`
  - ✅ 8 ères prédéfinies avec INSERT
  - ⚠️ **Action utilisateur requise** : Exécuter `supabase-init-complete.sql` dans le SQL Editor Supabase

### 2.2 Page `/start` - Wizard d'inscription

- [x] **Finaliser `src/app/start/page.tsx`**
  - ✅ Wizard 3 étapes complété :
    1. **Identité** : firstName, lastName, birthDate, birthCity
    2. **Bio + Red Flags** : bio (textarea), redFlags (checkbox avec message explicatif)
    3. **Auth** : email, password (min 8 caractères)
  - ✅ Design Céramique respecté (Cream, Terracotta, Emerald)
  - ✅ Indicateur de progression (3 barres)
  - ✅ Navigation prev/next entre les étapes

### 2.3 Action Server `/start/actions.ts`

- [x] **Refactorisation complète avec Admin Client**
  - ✅ Helper `createAdminClient()` créé dans `src/utils/supabase/admin.ts`
  - ✅ Utilise `supabaseAdmin.auth.admin.createUser()` (pas de confirmation email)
  - ✅ Création profil avec `billing_status='free'`
  - ✅ Gestion des `red_flags` (checkbox → string)
  - ✅ Calcul automatique de l'âge
  - ✅ Initialisation des `chat_sessions` (8 ères avec statuts calculés)
  - ✅ Rollback automatique en cas d'erreur (suppression user Auth)
  - ✅ Redirection vers Lemonsqueezy avec `checkout[custom][user_id]`
  - ✅ Logs détaillés pour debugging
    ```typescript
    import { createClient } from '@supabase/supabase-js';

    export function createAdminClient() {
      return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
    }
    ```

  - [ ] Dans `signupWithProfile()` :
    - Utiliser `createAdminClient()` pour toutes les opérations BDD
    - **Ordre des opérations** (transaction atomique simulée) :
      1. Créer user Auth (`supabase.auth.admin.createUser()`)
      2. Insérer dans `profiles` (avec `red_flags` et `billing_status='free'`)
      3. Calculer l'âge de l'utilisateur depuis `birthDate`
      4. Fetch des `eras` depuis Supabase
      5. Créer les `chat_sessions` pour chaque ère :
         - `status='locked'` si `age < era.start_age`
         - `status='available'` ou `status='in_progress'` si dans la tranche d'âge
      6. Rediriger vers Lemon Squeezy avec `checkout[custom][user_id]=${userId}`

  - [ ] **Gestion d'erreurs robuste**
    - Try/catch global
    - Rollback manuel si échec (supprimer user Auth créé)
    - Logs détaillés (`console.error` avec contexte)

### 2.4 Redirection vers Lemon Squeezy

- [ ] **Modifier la redirection finale dans `actions.ts`**
  - Actuel : Redirige vers `/auth/verify`
  - **Nouveau comportement** :
    ```typescript
    const checkoutUrl = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL;
    const checkoutWithParams = `${checkoutUrl}?checkout[email]=${encodeURIComponent(email)}&checkout[custom][user_id]=${userId}`;
    redirect(checkoutWithParams);
    ```

---

## 💳 PHASE 3 : PAIEMENT & WEBHOOKS

**Objectif** : Intégrer Lemon Squeezy en mode test et gérer les webhooks.

### 3.1 Configuration Lemon Squeezy

- [ ] **Créer le produit dans Lemon Squeezy Dashboard**
  - URL : https://app.lemonsqueezy.com/
  - Créer un produit "My Mozaïca - Accès V1"
  - Prix : À définir (ex: 29€ one-time payment)
  - Mode : **Test mode** activé
  - Copier l'URL du Checkout

- [ ] **Mettre à jour `.env.local`**
  - Variable : `NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL`
  - Remplacer par la vraie URL du produit (pas de placeholder)
  - Exemple : `https://mymozaica.lemonsqueezy.com/checkout/buy/12345678-1234-1234-1234-123456789012`

- [ ] **Ajouter les secrets Lemon Squeezy**
  - `LEMONSQUEEZY_API_KEY` : API Key depuis Settings → API
  - `LEMONSQUEEZY_WEBHOOK_SECRET` : Généré lors de la création du webhook
  - `LEMONSQUEEZY_STORE_ID` : ID du store (visible dans l'URL)

### 3.2 Webhook Handler

- [x] **Créer `src/app/api/webhooks/lemonsqueezy/route.ts`**
  - ✅ Déjà créé lors du sprint précédent
  - Fichier : `src/app/api/webhooks/lemonsqueezy/route.ts`

- [ ] **Vérifier l'implémentation du webhook**

  **Checklist de vérification :**

  - [ ] Vérification de signature HMAC (sécurité)
    ```typescript
    const signature = req.headers.get('x-signature');
    const isValid = verifySignature(rawBody, signature, webhookSecret);
    ```

  - [ ] Parsing de l'événement `order_created`
    ```typescript
    if (eventName === 'order_created') {
      const userId = body.meta?.custom_data?.user_id;
      // Update billing_status
    }
    ```

  - [ ] Update de `billing_status` avec Admin Client
    ```typescript
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin
      .from('profiles')
      .update({ billing_status: 'paid' })
      .eq('id', userId);
    ```

  - [ ] Logs détaillés (succès + erreurs)
  - [ ] Retour 200 OK (important pour Lemon Squeezy)

### 3.3 Configuration du Webhook dans Lemon Squeezy

- [ ] **Configurer l'URL du webhook**

  **En développement local (Ngrok) :**
  ```bash
  # Installer ngrok si nécessaire
  npm install -g ngrok

  # Lancer ngrok sur le port 3000
  ngrok http 3000

  # Copier l'URL HTTPS (ex: https://abc123.ngrok.io)
  ```

  - URL webhook : `https://abc123.ngrok.io/api/webhooks/lemonsqueezy`
  - Dans Lemon Squeezy Dashboard → Settings → Webhooks
  - Événements à écouter : `order_created`, `subscription_cancelled`
  - Copier le Signing Secret et le mettre dans `LEMONSQUEEZY_WEBHOOK_SECRET`

- [ ] **Tester le webhook avec une carte test**
  - Carte test : `4242 4242 4242 4242` (Stripe test cards fonctionnent aussi)
  - Vérifier les logs du webhook (`console.log` dans route.ts)
  - Vérifier que `billing_status` passe à `'paid'` dans Supabase

### 3.4 Page de succès après paiement

- [x] **Créer `src/app/start/success/page.tsx`**
  - ✅ Déjà créé lors du sprint précédent
  - Fichier : `src/app/start/success/page.tsx`

- [ ] **Configurer l'URL de retour dans Lemon Squeezy**
  - Dans le produit Lemon Squeezy → Settings → Checkout
  - Success URL : `https://votre-domaine.com/start/success`
  - Cancel URL : `https://votre-domaine.com/start` (retour au formulaire)

---

## 🎯 PHASE 4 : CŒUR DU PRODUIT (DASHBOARD & CHAT)

**Objectif** : Finaliser l'interface Dashboard avec la frise chronologique et le chat interviewer.

### 4.1 Dashboard - Logic & Auto-Init

- [ ] **Supprimer le bouton "Rafraîchir"**
  - Fichier : `src/app/dashboard/page.tsx`
  - Ligne à supprimer : Le bouton "Rafraîchir les sessions" (si présent)

- [ ] **Améliorer `ensureSessionsExist()`**
  - Fonction : `ensureSessionsExist()` dans `src/app/dashboard/page.tsx`
  - **Problème actuel** : Appelée manuellement, peut échouer silencieusement
  - **Solution** :
    - Toujours exécuter `ensureSessionsExist()` au chargement de la page
    - Si aucune session n'existe → Créer automatiquement avec Admin Client
    - Logs détaillés pour déboguer
    - Afficher un message "Initialisation de votre fresque..." pendant la création

- [ ] **Vérifier la logique de calcul de statut**
  ```typescript
  // Dans ensureSessionsExist()
  const age = calculateAge(profile.birth_date);

  eras.forEach(era => {
    let status = 'locked';
    if (age >= era.end_age) {
      status = 'completed'; // ou 'available' si pas encore fait
    } else if (age >= era.start_age && age < era.end_age) {
      status = 'in_progress'; // L'ère actuelle de l'utilisateur
    }
    // status = 'locked' pour les ères futures
  });
  ```

### 4.2 Dashboard UI - Frise Chronologique Gamifiée

- [ ] **Implémenter la frise sticky en haut**
  - Fichier : `src/app/dashboard/page.tsx` ou nouveau composant `src/components/Timeline.tsx`
  - Design : Scroll horizontal avec gros médaillons

  **Spécifications UI :**

  - [ ] Container `sticky top-0` avec `overflow-x-auto`
  - [ ] Médaillons ronds (w-20 h-20 ou plus grand)
  - [ ] États visuels :
    - **Locked** : Gris, opacité 50%, icône cadenas
    - **Available** : Terracotta (#E76F51), pulsation subtile
    - **In Progress** : Emerald (#2A9D8F), border épais
    - **Completed** : Teal, icône checkmark
  - [ ] Hover : Scale + tooltip avec label de l'ère
  - [ ] Clic : Scroll vers la carte correspondante ou redirection vers `/dashboard/interview/[sessionId]`

  **Exemple de structure :**
  ```tsx
  <div className="sticky top-0 z-10 bg-cream py-4 overflow-x-auto">
    <div className="flex gap-4 px-6">
      {eras.map(era => (
        <button
          key={era.id}
          className={`w-20 h-20 rounded-full flex items-center justify-center
            ${statusStyle[era.status]} // locked/available/in_progress/completed
            hover:scale-110 transition-transform`}
        >
          {era.icon}
        </button>
      ))}
    </div>
  </div>
  ```

- [ ] **Améliorer les cartes des sessions en dessous**
  - Grid layout responsive (1 col mobile, 2 cols tablet, 3 cols desktop)
  - Chaque carte : Photo d'illustration + Label ère + Bouton CTA
  - CTA adapté au statut :
    - Locked : "Débloquer en grandissant" (disabled)
    - Available : "Commencer" (Terracotta)
    - In Progress : "Continuer" (Emerald)
    - Completed : "Revoir" (Teal secondaire)

### 4.3 Agent Interviewer - Prompt & Parsing

- [ ] **Corriger `src/app/api/agents/interviewer/route.ts`**
  - Fichier : `src/app/api/agents/interviewer/route.ts`
  - **Problèmes actuels** :
    - Prompt système trop générique
    - Parsing JSON fragile (regex complexes)
    - `red_flags` non injectés

  **Actions à faire :**

  - [ ] **Mettre à jour le prompt système (V1 - Chirurgical/Factuel)**
    ```typescript
    const systemPrompt = `Tu es un interviewer biographique expert, spécialisé dans l'extraction de faits précis.

    Période actuelle : ${era.label} (${era.start_age}-${era.end_age} ans)

    RÈGLES ABSOLUES :
    1. Pose UNE SEULE question courte et ciblée à la fois.
    2. Cherche des FAITS : dates, lieux, noms, événements concrets.
    3. Si l'utilisateur mentionne un sujet sensible, montre de l'empathie mais reste factuel.
    4. Ne JAMAIS inventer ou supposer des informations.
    5. Quand tu as suffisamment d'informations pour cette période, propose de passer à la suivante.

    ${profile.red_flags ? `⚠️ SENSIBILITÉ : L'utilisateur a mentionné des sujets délicats. Sois bienveillant.` : ''}

    FORMAT DE RÉPONSE (JSON) :
    {
      "message": "Ta question ici",
      "thinking": "Ton raisonnement interne (optionnel)",
      "extracted_facts": [
        {"type": "date", "value": "1990-05-12", "context": "Date de naissance"},
        {"type": "location", "value": "Paris", "context": "Ville de naissance"}
      ]
    }`;
    ```

  - [ ] **Parsing JSON sécurisé**
    ```typescript
    // Au lieu de regex complexes
    const responseText = result.choices[0].message.content;

    // Trouver le début et la fin du JSON
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      // Fallback si pas de JSON
      return { message: responseText, extracted_facts: [] };
    }

    const jsonString = responseText.substring(jsonStart, jsonEnd);
    const parsed = JSON.parse(jsonString);
    ```

  - [ ] **Injecter les `red_flags` dans le prompt**
    - Fetch du profil depuis Supabase
    - Ajouter conditionnel dans le prompt système (voir ci-dessus)

  - [ ] **Sauvegarder les `extracted_facts` dans `user_facts`**
    ```typescript
    if (parsed.extracted_facts?.length > 0) {
      const factsToInsert = parsed.extracted_facts.map(fact => ({
        user_id: session.user_id,
        session_id: sessionId,
        era_id: session.era_id,
        category: fact.type, // 'date', 'location', 'person', 'event'
        value: fact.value,
        context: fact.context
      }));

      await supabase.from('user_facts').insert(factsToInsert);
    }
    ```

### 4.4 Audio - Transcription Whisper

- [ ] **Tester l'enregistrement audio**
  - Composant : `src/components/AudioRecorder.tsx` (si existe)
  - Vérifier que le micro s'active correctement
  - Enregistrer 5 secondes de test

- [ ] **Tester l'API `/api/transcribe`**
  - Fichier : `src/app/api/transcribe/route.ts`
  - Endpoint : `POST /api/transcribe` avec FormData contenant le fichier audio
  - Modèle : OpenAI Whisper (`whisper-1`)
  - Vérifier que la transcription est correcte (français)
  - Gérer les erreurs (fichier trop gros, format invalide, etc.)

- [ ] **Intégrer audio → texte → chat**
  - Flux : User parle → AudioRecorder enregistre → POST /api/transcribe → Texte inséré dans le chat → Envoyé à l'interviewer
  - Afficher un loader pendant la transcription
  - Feedback visuel (onde sonore, durée enregistrée)

---

## 🚀 PHASE 5 : DÉPLOIEMENT & TESTS

**Objectif** : Déployer sur Vercel et valider le parcours complet end-to-end.

### 5.1 Configuration Vercel

- [ ] **Créer le projet Vercel**
  - URL : https://vercel.com/
  - Importer depuis GitHub : `mymozaica` repository
  - Framework : Next.js
  - Root directory : `./`

- [ ] **Ajouter toutes les variables d'environnement**
  - Dans Vercel Dashboard → Settings → Environment Variables
  - Copier TOUTES les variables de `.env.local` :
    ```
    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY
    SUPABASE_SERVICE_ROLE_KEY
    MISTRAL_API_KEY
    OPENAI_API_KEY
    NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL
    LEMONSQUEEZY_API_KEY
    LEMONSQUEEZY_WEBHOOK_SECRET
    LEMONSQUEEZY_STORE_ID
    NEXT_PUBLIC_SITE_URL (mettre l'URL Vercel)
    ```

- [ ] **Configurer le webhook Lemon Squeezy pour la production**
  - URL webhook production : `https://votre-app.vercel.app/api/webhooks/lemonsqueezy`
  - Remplacer l'URL Ngrok par l'URL Vercel dans Lemon Squeezy Dashboard
  - Tester avec une vraie commande test

### 5.2 Reset BDD pour test final

- [ ] **Créer un script de reset SQL**
  - Fichier : `reset-database.sql`
  - Contenu :
    ```sql
    -- ⚠️ ATTENTION : Supprime TOUTES les données utilisateurs
    -- À utiliser UNIQUEMENT avant le test final en environnement de test

    TRUNCATE TABLE user_facts CASCADE;
    TRUNCATE TABLE messages CASCADE;
    TRUNCATE TABLE chat_sessions CASCADE;
    TRUNCATE TABLE profiles CASCADE;

    -- Ne pas toucher à 'eras' (données de référence)

    -- Optionnel : Supprimer aussi les users Auth
    -- DELETE FROM auth.users;
    ```

- [ ] **Exécuter le reset dans Supabase SQL Editor**
  - Dashboard Supabase → SQL Editor
  - Coller le contenu de `reset-database.sql`
  - Exécuter
  - Vérifier : `SELECT COUNT(*) FROM profiles;` → Doit retourner 0

### 5.3 Test End-to-End Manuel

- [ ] **Test du parcours complet**

  **Checklist de test (à faire sur l'URL de production Vercel) :**

  1. **Landing Page**
     - [ ] Aller sur `https://votre-app.vercel.app/`
     - [ ] Cliquer sur "Commencer" → Redirige vers `/start`

  2. **Inscription**
     - [ ] Remplir Étape 1 (Identité) : Jean Dupont, 12/05/1985, Paris
     - [ ] Remplir Étape 2 (Bio) : "Je suis né à Paris..." + Cocher "Sujets sensibles" si applicable
     - [ ] Remplir Étape 3 (Auth) : test@example.com + mot de passe fort
     - [ ] Soumettre → Doit rediriger vers Lemon Squeezy Checkout

  3. **Paiement**
     - [ ] Sur Lemon Squeezy : Carte test `4242 4242 4242 4242`, Expiry `12/34`, CVC `123`
     - [ ] Valider le paiement
     - [ ] Doit rediriger vers `/start/success`
     - [ ] Vérifier dans Supabase : `billing_status='paid'` pour cet utilisateur

  4. **Dashboard**
     - [ ] Cliquer sur "Accéder à mon Dashboard"
     - [ ] Vérifier que la frise chronologique s'affiche
     - [ ] Vérifier que l'ère "Petite enfance (0-5 ans)" est "available" ou "in_progress"
     - [ ] Vérifier que les ères futures (Adolescence, Adulte, etc.) sont "locked"
     - [ ] Vérifier qu'aucune erreur n'apparaît dans la console

  5. **Chat Interviewer**
     - [ ] Cliquer sur "Commencer" pour l'ère "Petite enfance"
     - [ ] La première question de l'interviewer doit s'afficher (ex: "Quels sont vos premiers souvenirs ?")
     - [ ] Répondre : "Je me souviens de ma maison à Paris, rue de la République."
     - [ ] L'interviewer doit répondre avec une nouvelle question ciblée
     - [ ] Vérifier dans Supabase : Table `messages` doit contenir les 2 messages (user + assistant)
     - [ ] Vérifier dans Supabase : Table `user_facts` doit contenir un fait extrait (ex: location="rue de la République")

  6. **Audio (si implémenté)**
     - [ ] Cliquer sur le bouton micro
     - [ ] Parler 5 secondes : "Je suis né en mai 1985"
     - [ ] Vérifier que la transcription apparaît dans le chat
     - [ ] Vérifier que l'interviewer répond à la transcription

- [ ] **Test des cas d'erreur**
  - [ ] Essayer de créer un compte avec un email déjà existant → Doit afficher une erreur
  - [ ] Essayer d'accéder au Dashboard sans être connecté → Doit rediriger vers `/login`
  - [ ] Essayer d'accéder au Dashboard sans avoir payé → Doit rediriger vers Lemon Squeezy

### 5.4 Monitoring & Logs

- [ ] **Configurer les logs Vercel**
  - Vercel Dashboard → Logs
  - Vérifier qu'aucune erreur 500 n'apparaît lors du test E2E

- [ ] **Configurer Sentry (optionnel mais recommandé)**
  - Installer Sentry : `npm install @sentry/nextjs`
  - Configurer `sentry.config.js`
  - Ajouter `SENTRY_DSN` dans les variables d'environnement Vercel

---

## 📝 NOTES & CONVENTIONS

### Conventions de commit
```
feat: nouvelle fonctionnalité
fix: correction de bug
refactor: refactoring sans changement de fonctionnalité
docs: documentation
style: formatage, missing semi colons, etc.
test: ajout de tests
chore: mise à jour des dépendances, config, etc.
```

### Variables d'environnement critiques
```bash
# ⚠️ À CONFIGURER ABSOLUMENT
NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL="https://mymozaica.lemonsqueezy.com/checkout/buy/PRODUCT_ID"
LEMONSQUEEZY_WEBHOOK_SECRET="whsec_xxxxx"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."

# ⚠️ À GARDER SECRET
MISTRAL_API_KEY
OPENAI_API_KEY
LEMONSQUEEZY_API_KEY
```

### Contacts & Ressources
- **Supabase Dashboard** : https://supabase.com/dashboard/project/xmqgmmagwwgiphmlbxus
- **Lemon Squeezy Dashboard** : https://app.lemonsqueezy.com/
- **Vercel Dashboard** : https://vercel.com/dashboard
- **Mistral Console** : https://console.mistral.ai/
- **OpenAI Console** : https://platform.openai.com/

---

## ✅ Critères de succès V1

La V1 est considérée comme prête si :

- [ ] Un utilisateur peut s'inscrire, payer, et accéder au Dashboard sans erreur
- [ ] Les sessions sont correctement initialisées selon l'âge
- [ ] L'interviewer pose des questions pertinentes et extrait des faits
- [ ] Les faits extraits sont sauvegardés dans `user_facts`
- [ ] Le webhook Lemon Squeezy met à jour `billing_status` correctement
- [ ] Aucune erreur 500 dans les logs Vercel
- [ ] Le design respecte la charte "Céramique"
- [ ] L'application est déployée et accessible en production

---

**Date de création** : 2025-12-09
**Dernière mise à jour** : 2025-12-09
**Objectif de livraison V1** : À définir
