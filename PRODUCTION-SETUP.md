# 🚀 Configuration Production - My Mozaica

Ce guide vous aide à configurer l'application pour un déploiement direct en production sur **https://mymozaica.com**.

---

## ⚠️ IMPORTANT : Pas de phase de test local

Vous avez choisi de **déployer directement en production** sans phase de test avec ngrok.
Cela signifie que **tous les tests se feront sur https://mymozaica.com**.

---

## 📋 Checklist de Configuration

### ✅ 1. Configuration Supabase Authentication

Les URLs de callback doivent pointer vers votre domaine de production.

#### 1.1 Aller dans Supabase Dashboard

1. Ouvrez : https://supabase.com/dashboard/project/xmqgmmagwwgiphmlbxus
2. Menu de gauche : **Authentication** → **URL Configuration**

#### 1.2 Configurer les URLs

| Paramètre | Valeur Production |
|-----------|-------------------|
| **Site URL** | `https://mymozaica.com` |
| **Redirect URLs** | `https://mymozaica.com/**` |

**Redirect URLs à ajouter** (une par ligne) :
```
https://mymozaica.com/auth/callback
https://mymozaica.com/auth/verify-email
https://mymozaica.com/dashboard
https://mymozaica.com/start/success
```

#### 1.3 Configurer les Email Templates

1. Menu : **Authentication** → **Email Templates**
2. Sélectionnez : **Confirm signup**
3. Vérifiez que le lien contient : `{{ .SiteURL }}/auth/callback?code={{ .TokenHash }}`
4. Si ce n'est pas le cas, modifiez le template :

```html
<h2>Confirmez votre inscription</h2>
<p>Cliquez sur le lien ci-dessous pour confirmer votre email :</p>
<p><a href="{{ .SiteURL }}/auth/callback?code={{ .TokenHash }}">Confirmer mon email</a></p>
```

5. **Sauvegardez** le template

---

### ✅ 2. Variables d'Environnement (.env.local vs Production)

#### 2.1 Fichier `.env.local` (Développement local)

Votre fichier actuel :
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xmqgmmagwwgiphmlbxus.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Lemon Squeezy
NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL=https://mymosaica.lemonsqueezy.com/buy/202736dc-19de-4c74-8e21-acafe65ba9b4
LEMONSQUEEZY_API_KEY=eyJ0eXA...
LEMONSQUEEZY_WEBHOOK_SECRET=85478562147896321478965254
LEMONSQUEEZY_STORE_ID=254268

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # ⚠️ À CHANGER pour production
```

#### 2.2 Variables à configurer dans Vercel (Production)

⚠️ **CHANGEMENT IMPORTANT** : La variable `NEXT_PUBLIC_SITE_URL` doit être différente en production !

**Dans Vercel Dashboard** → Votre projet → **Settings** → **Environment Variables** :

| Variable | Valeur Production | Environnement |
|----------|-------------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xmqgmmagwwgiphmlbxus.supabase.co` | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (le complet) | Production |
| `NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL` | `https://mymosaica.lemonsqueezy.com/buy/202736dc-19de-4c74-8e21-acafe65ba9b4` | Production |
| `LEMONSQUEEZY_API_KEY` | `eyJ0eXAiOiJKV1QiLCJhbGc...` (le complet) | Production |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | `85478562147896321478965254` | Production |
| `LEMONSQUEEZY_STORE_ID` | `254268` | Production |
| `MISTRAL_API_KEY` | `AsQUdAayxO9tTa69gyaeKGZA1OZFA7Nm` | Production |
| `OPENAI_API_KEY` | `sk-proj-...` (le complet) | Production |
| **`NEXT_PUBLIC_SITE_URL`** | **`https://mymozaica.com`** | **Production** |

⚠️ **CRITIQUE** : Ne mettez **JAMAIS** `http://localhost:3000` en production !

---

### ✅ 3. Configuration Lemon Squeezy

#### 3.1 Mode Test vs Production

**Votre choix** : Déploiement direct en production

**Options** :
- 🟡 **Test Mode** (recommandé pour débuter) : Pas de vrais paiements, cartes test uniquement
- 🔴 **Live Mode** : Vrais paiements, vraies cartes bancaires

**Recommandation** : Commencez en **Test Mode** même en production, puis passez en Live quand tout fonctionne.

#### 3.2 Configuration du Webhook

1. **Dashboard Lemon Squeezy** : https://app.lemonsqueezy.com/
2. Menu : **Settings** → **Webhooks**
3. Cliquez : **Add Endpoint**
4. Configurez :

| Paramètre | Valeur |
|-----------|--------|
| **Callback URL** | `https://mymozaica.com/api/webhooks/lemonsqueezy` |
| **Signing Secret** | Copier le secret généré → Vercel Environment Variables |
| **Events** | `order_created`, `subscription_cancelled` |

5. **Sauvegardez**

⚠️ Si le secret généré est différent de `85478562147896321478965254`, mettez à jour dans Vercel !

#### 3.3 Configuration URLs de retour (Checkout Success/Cancel)

1. **Dashboard Lemon Squeezy** → Votre produit "My Mozaïca - Accès V1"
2. **Settings** → **Checkout**
3. Configurez :

| Paramètre | Valeur |
|-----------|--------|
| **Success URL** | `https://mymozaica.com/start/success` |
| **Cancel URL** | `https://mymozaica.com/start` |

---

### ✅ 4. Déploiement Vercel

#### 4.1 Premier déploiement

```bash
# Depuis votre terminal local
git add .
git commit -m "Configuration production"
git push origin main
```

Vercel déploiera automatiquement (si connecté).

#### 4.2 Configuration du domaine personnalisé

1. **Vercel Dashboard** → Votre projet → **Settings** → **Domains**
2. Ajoutez : `mymozaica.com`
3. Suivez les instructions pour configurer les DNS

**Configuration DNS chez votre registrar** :

| Type | Name | Value |
|------|------|-------|
| `A` | `@` | `76.76.21.21` (Vercel IP) |
| `CNAME` | `www` | `cname.vercel-dns.com` |

*Note : Les IPs Vercel peuvent changer, vérifiez la doc officielle.*

#### 4.3 Vérification du déploiement

Une fois déployé, vérifiez :

✅ `https://mymozaica.com` → Landing page
✅ `https://mymozaica.com/start` → Formulaire d'inscription
✅ `https://mymozaica.com/api/webhooks/lemonsqueezy` → 405 Method Not Allowed (normal, GET pas supporté)

---

### ✅ 5. Test du Flow Complet en Production

#### 5.1 Test d'inscription

1. Allez sur : `https://mymozaica.com/start`
2. Remplissez le formulaire avec **un nouvel email** (pas encore utilisé)
3. Soumettez
4. **Vérifiez** : Redirection vers `/auth/verify-email`

#### 5.2 Vérification email de confirmation

1. Ouvrez votre boîte email
2. Cliquez sur le lien de confirmation
3. **Vérifiez** : Redirection vers Lemon Squeezy checkout

**⚠️ Si le lien pointe vers `http://localhost:3000` :**
→ La configuration Supabase **Site URL** n'est pas bonne (voir étape 1.2)

#### 5.3 Test de paiement (Test Mode)

Si vous êtes en **Test Mode** Lemon Squeezy :

**Carte test** :
```
Numéro : 4242 4242 4242 4242
Expiration : 12/34
CVC : 123
```

1. Complétez le paiement
2. **Vérifiez** : Redirection vers `https://mymozaica.com/start/success`

#### 5.4 Vérification du webhook

1. **Supabase Dashboard** → Table Editor → `profiles`
2. Trouvez votre utilisateur
3. **Vérifiez** : `billing_status` = `'paid'`

**Si ce n'est pas le cas** :
- Vérifiez les logs Vercel : Dashboard → Functions → Logs
- Cherchez : `📥 Webhook reçu: order_created`
- Si aucun log : Le webhook n'a pas été appelé (vérifiez config Lemon Squeezy)

#### 5.5 Test d'accès au dashboard

1. Allez sur : `https://mymozaica.com/dashboard`
2. **Vérifiez** : Vous êtes connecté et voyez votre dashboard

---

## 🔍 Troubleshooting Production

### Problème 1 : Email de confirmation pointe vers localhost

**Symptôme** : Le lien dans l'email est `http://localhost:3000/auth/callback?code=...`

**Cause** : La **Site URL** dans Supabase est mal configurée

**Solution** :
1. Supabase Dashboard → Authentication → URL Configuration
2. **Site URL** : `https://mymozaica.com` (pas localhost !)
3. Sauvegardez

### Problème 2 : Webhook Lemon Squeezy ne fonctionne pas

**Symptôme** : Après paiement, `billing_status` reste à `'free'`

**Diagnostic** :
1. Vercel Dashboard → Functions → Logs
2. Cherchez des logs autour de l'heure du paiement
3. Si aucun log → Webhook pas appelé

**Causes possibles** :
- URL webhook mal configurée dans Lemon Squeezy
- Signing Secret incorrect dans Vercel
- Webhook non activé (Events non cochés)

**Solution** :
1. Lemon Squeezy Dashboard → Settings → Webhooks
2. Vérifiez l'URL : `https://mymozaica.com/api/webhooks/lemonsqueezy`
3. Vérifiez les Events : `order_created` ✅
4. Testez avec le bouton "Send Test Webhook"

### Problème 3 : Erreur 500 après inscription

**Symptôme** : "Une erreur inattendue est survenue"

**Diagnostic** :
1. Vercel Dashboard → Deployments → Latest → View Function Logs
2. Cherchez l'erreur exacte

**Causes possibles** :
- `SUPABASE_SERVICE_ROLE_KEY` manquant/incorrect dans Vercel
- Problème de connexion à Supabase
- Erreur dans le code de création de profil

**Solution** :
1. Vérifiez que **TOUTES** les variables d'environnement sont dans Vercel
2. Redéployez : `git commit --allow-empty -m "Redeploy" && git push`

### Problème 4 : Duplicate key constraint (même en production)

**Symptôme** : "duplicate key value violates unique constraint profiles_pkey"

**Diagnostic** :
```bash
# Utilisez l'API de diagnostic EN PRODUCTION
https://mymozaica.com/api/debug/check-user?email=VOTRE_EMAIL
```

**Solution** : Suivez le guide [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## 📊 Checklist Finale Avant Mise en Production

### Configuration Supabase
- [ ] Site URL = `https://mymozaica.com`
- [ ] Redirect URLs contiennent `https://mymozaica.com/**`
- [ ] Email template "Confirm signup" utilise `{{ .SiteURL }}`

### Configuration Vercel
- [ ] Toutes les variables d'environnement sont configurées
- [ ] **`NEXT_PUBLIC_SITE_URL=https://mymozaica.com`** ⚠️ Critique !
- [ ] Domaine personnalisé `mymozaica.com` configuré et actif
- [ ] Déploiement réussi (statut vert)

### Configuration Lemon Squeezy
- [ ] Webhook URL = `https://mymozaica.com/api/webhooks/lemonsqueezy`
- [ ] Webhook Events = `order_created`, `subscription_cancelled`
- [ ] Webhook Secret copié dans Vercel
- [ ] Success URL = `https://mymozaica.com/start/success`
- [ ] Cancel URL = `https://mymozaica.com/start`

### Tests de Validation
- [ ] Inscription fonctionne (formulaire → verify email)
- [ ] Email de confirmation reçu avec lien vers mymozaica.com
- [ ] Clic sur email → Redirection vers Lemon Squeezy
- [ ] Paiement test → Redirection vers `/start/success`
- [ ] Webhook reçu (logs Vercel)
- [ ] `billing_status='paid'` dans Supabase
- [ ] Accès au dashboard fonctionne

---

## 📞 Support

Si un problème persiste après avoir suivi ce guide :

1. Vérifiez les logs Vercel (Functions)
2. Vérifiez les logs Supabase (Logs → API)
3. Utilisez l'API de diagnostic : `/api/debug/check-user?email=xxx`
4. Consultez [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

Contact : support@mymozaica.com

---

**Dernière mise à jour** : 2025-12-10
