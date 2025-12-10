# ✅ Checklist de Déploiement Production - My Mozaica

## 🎯 Objectif
Déployer l'application directement sur **https://mymozaica.com** sans phase de test local (ngrok).

---

## 📋 ÉTAPE 1 : Configuration Supabase (15 min)

### 1.1 URLs de Callback

- [ ] **Ouvrir** : https://supabase.com/dashboard/project/xmqgmmagwwgiphmlbxus/auth/url-configuration
- [ ] **Site URL** : Remplacer par `https://mymozaica.com`
- [ ] **Redirect URLs** : Ajouter (une par ligne) :
  ```
  https://mymozaica.com/**
  https://mymozaica.com/auth/callback
  https://mymozaica.com/auth/verify-email
  https://mymozaica.com/dashboard
  https://mymozaica.com/start/success
  ```
- [ ] **Sauvegarder** les changements

### 1.2 Email Templates

- [ ] **Ouvrir** : https://supabase.com/dashboard/project/xmqgmmagwwgiphmlbxus/auth/templates
- [ ] Sélectionner : **Confirm signup**
- [ ] **Vérifier** que le lien contient : `{{ .SiteURL }}/auth/callback?code={{ .TokenHash }}`
- [ ] Si différent, remplacer par :
  ```html
  <h2>Confirmez votre inscription à My Mozaïca</h2>
  <p>Bienvenue ! Cliquez sur le lien ci-dessous pour confirmer votre email :</p>
  <p><a href="{{ .SiteURL }}/auth/callback?code={{ .TokenHash }}" style="background-color: #2A9D8F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Confirmer mon email</a></p>
  <p>Ou copiez ce lien dans votre navigateur :</p>
  <p>{{ .SiteURL }}/auth/callback?code={{ .TokenHash }}</p>
  <p>Ce lien expire dans 24 heures.</p>
  ```
- [ ] **Sauvegarder** le template

### 1.3 Vérification Base de Données

- [ ] **Ouvrir** : https://supabase.com/dashboard/project/xmqgmmagwwgiphmlbxus/editor
- [ ] **SQL Editor** → New query
- [ ] Exécuter :
  ```sql
  SELECT
    (SELECT COUNT(*) FROM auth.users) as total_auth_users,
    (SELECT COUNT(*) FROM public.profiles) as total_profiles,
    (SELECT COUNT(*) FROM public.eras) as total_eras;
  ```
- [ ] **Résultats attendus** :
  - `total_auth_users` : 0 (base vierge)
  - `total_profiles` : 0 (base vierge)
  - `total_eras` : 6 (les 6 ères de vie)

**⚠️ Si `total_eras` = 0** : Les ères n'ont pas été créées !
- [ ] Exécuter le script : `migrations/insert_eras.sql`

---

## 📋 ÉTAPE 2 : Configuration Vercel (20 min)

### 2.1 Créer le projet Vercel (si pas déjà fait)

- [ ] Aller sur : https://vercel.com/new
- [ ] Importer le repo GitHub de My Mozaïca
- [ ] **Framework Preset** : Next.js
- [ ] **Root Directory** : `./` (racine)
- [ ] Ne pas ajouter les variables d'environnement maintenant (étape suivante)

### 2.2 Configurer les Variables d'Environnement

- [ ] **Dashboard Vercel** → Votre projet → **Settings** → **Environment Variables**
- [ ] **Ajouter** les variables suivantes **une par une** :

#### Variables Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://xmqgmmagwwgiphmlbxus.supabase.co` (Production)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcWdtbWFnd3dnaXBobWxieHVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMDY2NTEsImV4cCI6MjA4MDY4MjY1MX0.LWTTqg8uMdF954xzNWtwGx4moVGvTJe97-L1eSomGf4` (Production)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcWdtbWFnd3dnaXBobWxieHVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTEwNjY1MSwiZXhwIjoyMDgwNjgyNjUxfQ.wrjVVML3y6AwCDJtrlwQsmI9GIYmMcbPEE8Os19eyL0` (Production)

#### Variables Lemon Squeezy
- [ ] `NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL` = `https://mymosaica.lemonsqueezy.com/buy/202736dc-19de-4c74-8e21-acafe65ba9b4` (Production)
- [ ] `LEMONSQUEEZY_API_KEY` = `eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...` (copier depuis `.env.local`) (Production)
- [ ] `LEMONSQUEEZY_WEBHOOK_SECRET` = `85478562147896321478965254` (Production)
- [ ] `LEMONSQUEEZY_STORE_ID` = `254268` (Production)

#### Variables AI
- [ ] `MISTRAL_API_KEY` = `AsQUdAayxO9tTa69gyaeKGZA1OZFA7Nm` (Production)
- [ ] `OPENAI_API_KEY` = `sk-proj-1PgJKD6LY7YDbfELiKJOEw08...` (copier depuis `.env.local`) (Production)

#### Variable Site (⚠️ CRITIQUE)
- [ ] **`NEXT_PUBLIC_SITE_URL`** = **`https://mymozaica.com`** (Production)

### 2.3 Configurer le Domaine Personnalisé

- [ ] **Dashboard Vercel** → Votre projet → **Settings** → **Domains**
- [ ] **Add Domain** : `mymozaica.com`
- [ ] **Suivre les instructions DNS** fournies par Vercel
- [ ] **Attendre** la propagation DNS (5-30 minutes)
- [ ] **Vérifier** : `https://mymozaica.com` accessible (peut afficher une erreur 404 au début, c'est normal)

### 2.4 Déployer

- [ ] **Depuis votre terminal local** :
  ```bash
  git add .
  git commit -m "Configuration production"
  git push origin main
  ```
- [ ] **Vercel Dashboard** → Deployments → Attendre que le statut passe à **Ready**
- [ ] **Ouvrir** : https://mymozaica.com
- [ ] **Vérifier** : La landing page s'affiche correctement

---

## 📋 ÉTAPE 3 : Configuration Lemon Squeezy (15 min)

### 3.1 Configurer le Webhook

- [ ] **Ouvrir** : https://app.lemonsqueezy.com/settings/webhooks
- [ ] **Cliquer** : "Create webhook" ou "Add endpoint"
- [ ] **Endpoint URL** : `https://mymozaica.com/api/webhooks/lemonsqueezy`
- [ ] **Signing secret** : Copier le secret généré
- [ ] **⚠️ IMPORTANT** : Si le secret est différent de `85478562147896321478965254` :
  - Aller dans Vercel → Settings → Environment Variables
  - Modifier `LEMONSQUEEZY_WEBHOOK_SECRET` avec le nouveau secret
  - Redéployer : `git commit --allow-empty -m "Update webhook secret" && git push`
- [ ] **Events** : Cocher `order_created` et `subscription_cancelled`
- [ ] **Sauvegarder** le webhook

### 3.2 Tester le Webhook

- [ ] **Dans le dashboard webhook** : Cliquer sur "Send test webhook"
- [ ] **Vérifier les logs Vercel** :
  - Dashboard → Deployments → Latest → View Function Logs
  - Chercher : `📥 Webhook reçu`
- [ ] Si erreur 401 (Unauthorized) : Le signing secret est incorrect

### 3.3 Configurer les URLs de Retour

- [ ] **Dashboard Lemon Squeezy** → Produits → "My Mozaïca - Accès V1"
- [ ] **Settings** → **Checkout settings**
- [ ] **Redirect on success** : `https://mymozaica.com/start/success`
- [ ] **Redirect on cancel** : `https://mymozaica.com/start`
- [ ] **Sauvegarder**

---

## 📋 ÉTAPE 4 : Tests de Validation (30 min)

### 4.1 Test d'Inscription

- [ ] **Ouvrir** : https://mymozaica.com/start
- [ ] **Remplir** le formulaire avec **un nouvel email** :
  - Prénom : Test
  - Nom : Production
  - Date de naissance : 01/01/1990
  - Ville de naissance : Paris
  - Email : **votre-email-test@example.com**
  - Mot de passe : **TestProd123!**
- [ ] **Soumettre** le formulaire
- [ ] **Vérifier** : Redirection vers `/auth/verify-email`

**✅ Succès** : Page "Vérifiez votre email" s'affiche

**❌ Erreur** : "Une erreur inattendue est survenue"
- Vérifier les logs Vercel
- Vérifier que `SUPABASE_SERVICE_ROLE_KEY` est bien configuré

### 4.2 Test de Confirmation Email

- [ ] **Ouvrir votre boîte email** (celle utilisée à l'étape 4.1)
- [ ] **Vérifier** : Email de confirmation reçu (peut prendre 1-2 minutes)
- [ ] **Vérifier le lien** : Doit pointer vers `https://mymozaica.com/auth/callback?code=...`

**❌ Si le lien pointe vers `http://localhost:3000`** :
- La configuration Supabase "Site URL" est incorrecte
- Retourner à l'ÉTAPE 1.1
- Corriger et réessayer l'inscription

- [ ] **Cliquer** sur le lien de confirmation
- [ ] **Vérifier** : Redirection vers Lemon Squeezy checkout

**✅ Succès** : Page Lemon Squeezy avec formulaire de paiement

**❌ Erreur** : Redirection vers `/login?error=auth-code-error`
- Le code de confirmation a expiré (24h) ou est invalide
- Réessayer l'inscription avec un nouvel email

### 4.3 Test de Paiement (Mode Test)

**⚠️ Assurez-vous d'être en Test Mode dans Lemon Squeezy !**

- [ ] **Sur la page Lemon Squeezy** :
  - Email : (pré-rempli)
  - Carte : `4242 4242 4242 4242`
  - Expiration : `12/34`
  - CVC : `123`
  - Code postal : `75001`
- [ ] **Cliquer** : "Pay now"
- [ ] **Vérifier** : Redirection vers `https://mymozaica.com/start/success`

**✅ Succès** : Page "Votre fresque est prête" s'affiche

**❌ Erreur** : Reste sur Lemon Squeezy ou erreur
- Vérifier la configuration "Redirect on success" (ÉTAPE 3.3)

### 4.4 Test du Webhook

- [ ] **Ouvrir Supabase** : https://supabase.com/dashboard/project/xmqgmmagwwgiphmlbxus/editor
- [ ] **Table Editor** → `profiles`
- [ ] **Chercher** votre utilisateur (email : votre-email-test@example.com)
- [ ] **Vérifier** : `billing_status` = `'paid'`

**✅ Succès** : Le billing_status est "paid"

**❌ Erreur** : Le billing_status est toujours "free"
- Le webhook n'a pas fonctionné
- Vérifier les logs Vercel :
  ```
  Dashboard → Deployments → Latest → View Function Logs
  Chercher : "📥 Webhook reçu: order_created"
  ```
- Si aucun log : Le webhook n'a pas été appelé
  - Vérifier l'URL webhook dans Lemon Squeezy (ÉTAPE 3.1)
  - Vérifier que les events `order_created` sont cochés
- Si log avec erreur :
  - Vérifier le `LEMONSQUEEZY_WEBHOOK_SECRET` dans Vercel

### 4.5 Test d'Accès au Dashboard

- [ ] **Ouvrir** : https://mymozaica.com/dashboard
- [ ] **Vérifier** : Vous êtes connecté automatiquement
- [ ] **Vérifier** : Le dashboard s'affiche avec votre nom
- [ ] **Vérifier** : La frise chronologique affiche les 6 ères

**✅ Succès** : Dashboard accessible et fonctionnel

**❌ Erreur** : Redirection vers `/login`
- Vous n'êtes pas connecté
- Essayer de vous connecter manuellement avec l'email/mot de passe

---

## 📋 ÉTAPE 5 : Nettoyage et Finalisation (5 min)

### 5.1 Supprimer les Données de Test

- [ ] **Supabase SQL Editor** :
  ```sql
  -- Supprimer l'utilisateur de test
  DELETE FROM auth.users WHERE email = 'votre-email-test@example.com';
  ```

### 5.2 Vérifier les Secrets

- [ ] **⚠️ IMPORTANT** : Ne jamais committer `.env.local` dans Git
- [ ] **Vérifier** `.gitignore` contient bien :
  ```
  .env*.local
  .env.production
  ```

### 5.3 Mode Production vs Test Mode

**Actuellement en Test Mode Lemon Squeezy** :
- ✅ Pas de vrais paiements
- ✅ Cartes test uniquement
- ✅ Idéal pour valider le flow

**Passer en Live Mode** (quand prêt) :
- [ ] Lemon Squeezy Dashboard → Toggle "Live Mode"
- [ ] ⚠️ Les paiements seront RÉELS
- [ ] Vérifier que tout fonctionne parfaitement en Test Mode avant !

---

## ✅ Checklist Finale de Validation

### Configuration
- [ ] Supabase Site URL = `https://mymozaica.com`
- [ ] Supabase Redirect URLs contiennent `https://mymozaica.com/**`
- [ ] Supabase Email Template utilise `{{ .SiteURL }}`
- [ ] Vercel : Toutes les variables d'environnement configurées
- [ ] Vercel : `NEXT_PUBLIC_SITE_URL=https://mymozaica.com` ⚠️
- [ ] Vercel : Domaine `mymozaica.com` actif
- [ ] Lemon Squeezy : Webhook configuré et testé
- [ ] Lemon Squeezy : Success/Cancel URLs configurées

### Tests
- [ ] ✅ Inscription fonctionne
- [ ] ✅ Email de confirmation reçu (lien vers mymozaica.com)
- [ ] ✅ Clic email → Redirection Lemon Squeezy
- [ ] ✅ Paiement test → Redirection `/start/success`
- [ ] ✅ Webhook reçu (logs Vercel)
- [ ] ✅ `billing_status='paid'` dans Supabase
- [ ] ✅ Dashboard accessible

---

## 🎉 Déploiement Terminé !

Votre application **My Mozaica** est maintenant en production sur **https://mymozaica.com** ! 🚀

### Prochaines étapes

1. **Tester avec plusieurs utilisateurs** (amis/famille)
2. **Surveiller les logs Vercel** pour détecter les erreurs
3. **Passer en Live Mode** Lemon Squeezy quand prêt
4. **Continuer le développement** : Phase 4 du ROADMAP (Dashboard & Chat)

---

## 📞 En cas de problème

1. **Logs Vercel** : https://vercel.com/dashboard → Deployments → Logs
2. **Logs Supabase** : https://supabase.com/dashboard/project/xmqgmmagwwgiphmlbxus/logs
3. **API Diagnostic** : https://mymozaica.com/api/debug/check-user?email=XXX
4. **Guide** : [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
5. **Config Production** : [PRODUCTION-SETUP.md](PRODUCTION-SETUP.md)

---

**Dernière mise à jour** : 2025-12-10
