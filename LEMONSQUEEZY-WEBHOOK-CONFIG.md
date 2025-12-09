# Configuration Webhook Lemon Squeezy

Ce document explique comment configurer le webhook Lemon Squeezy pour mettre à jour automatiquement le `billing_status` des utilisateurs après paiement.

---

## 1. URL du Webhook

Dans le dashboard Lemon Squeezy, configurez l'URL suivante :

**Production (Domaine principal)** :
```
https://mymozaica.com/api/webhooks/lemonsqueezy
```

⚠️ **IMPORTANT** : Utilisez directement le domaine de production **mymozaica.com**, pas de développement local avec ngrok.

---

## 2. Événements à Écouter

Cochez les événements suivants dans le dashboard Lemon Squeezy :

### Événements Principaux

- ✅ **`order_created`** (OBLIGATOIRE)
  - Déclenché lorsqu'un paiement unique est complété
  - Met à jour `billing_status='paid'` dans la table `profiles`

### Événements Optionnels

- ⚠️ **`subscription_cancelled`**
  - Déclenché si l'utilisateur annule son abonnement (si applicable)
  - Met à jour `billing_status='cancelled'`

- 📋 **`subscription_updated`**
  - Utile pour gérer des changements de plan (futur)

---

## 3. Signature Secret

Le webhook utilise une signature HMAC SHA-256 pour vérifier l'authenticité des requêtes.

### Variable d'Environnement

Assurez-vous que cette variable est configurée dans `.env.local` (et Vercel) :

```bash
LEMONSQUEEZY_WEBHOOK_SECRET=85478562147896321478965254
```

### Comment Récupérer le Secret

1. Accédez au dashboard Lemon Squeezy
2. Allez dans **Settings → Webhooks**
3. Créez ou éditez un webhook
4. Copiez le **Signing Secret** fourni

---

## 4. Custom Data (User ID)

Pour lier un paiement à un utilisateur, nous passons le `user_id` dans les custom data.

### Depuis le Code (src/app/start/actions.ts)

```typescript
const checkoutWithParams = `${checkoutUrl}?checkout[email]=${encodeURIComponent(email)}&checkout[custom][user_id]=${userId}`;

redirect(checkoutWithParams);
```

### Format dans le Payload Webhook

```json
{
  "meta": {
    "event_name": "order_created",
    "custom_data": {
      "user_id": "abcd1234-5678-90ef-ghij-klmnopqrstuv"
    }
  },
  "data": {
    "id": "123456",
    "attributes": {
      "user_email": "user@example.com",
      "total": 2900
    }
  }
}
```

---

## 5. Implémentation Webhook (route.ts)

Le fichier [src/app/api/webhooks/lemonsqueezy/route.ts](src/app/api/webhooks/lemonsqueezy/route.ts) gère automatiquement :

### Vérifications de Sécurité

1. ✅ **Signature HMAC** : Vérifie que la requête provient bien de Lemon Squeezy
2. ✅ **Timing Safe Equal** : Protection contre les timing attacks
3. ✅ **Admin Client** : Utilise `createAdminClient()` pour contourner RLS

### Logique Métier

```typescript
if (eventName === 'order_created') {
  const userId = body.meta?.custom_data?.user_id;

  await supabaseAdmin
    .from('profiles')
    .update({
      billing_status: 'paid',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}
```

### Gestion des Erreurs

- **401 Unauthorized** : Signature invalide
- **400 Bad Request** : `user_id` manquant dans custom data
- **500 Internal Server Error** : Erreur Supabase ou autre

---

## 6. Tests Webhook

### Test en Production

⚠️ **Déploiement Direct** : Tous les tests se font directement en production sur **https://mymozaica.com/**

1. Assurez-vous que l'application est déployée sur Vercel avec le domaine personnalisé configuré

2. Configurez le webhook dans Lemon Squeezy avec l'URL : `https://mymozaica.com/api/webhooks/lemonsqueezy`

3. Testez avec une carte test en **Test Mode** :
   - Carte : `4242 4242 4242 4242`
   - Expiry : `12/34`
   - CVC : `123`

4. Vérifiez les logs dans Vercel Dashboard → Functions → Logs

### Vérification des Logs

Logs côté Next.js (terminal) :

```
📥 Webhook reçu: order_created
✅ Paiement réussi pour user_id: abcd1234-5678-90ef-ghij-klmnopqrstuv
✅ Profil mis à jour: abcd1234-5678-90ef-ghij-klmnopqrstuv -> billing_status=paid
```

Logs côté Lemon Squeezy (dashboard) :

- Status: `200 OK`
- Response: `{"success": true, "userId": "..."}`

---

## 7. Production (Vercel)

### Variables d'Environnement

Assurez-vous que ces variables sont configurées dans Vercel :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xmqgmmagwwgiphmlbxus.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
LEMONSQUEEZY_WEBHOOK_SECRET=85478562147896321478965254
```

### URL Webhook Finale

```
https://mymozaica.com/api/webhooks/lemonsqueezy
```

### Configuration Lemon Squeezy

1. Dashboard Lemon Squeezy → **Settings → Webhooks**
2. Cliquez sur **Add Webhook**
3. **URL** : `https://mymozaica.com/api/webhooks/lemonsqueezy`
4. **Events** : Cochez `order_created` et `subscription_cancelled`
5. **Secret** : Copiez le secret généré et ajoutez-le dans Vercel
6. Sauvegardez

---

## 8. Troubleshooting

### Problème : Signature Invalide (401)

**Cause** : Le secret webhook ne correspond pas

**Solution** :
- Vérifiez que `LEMONSQUEEZY_WEBHOOK_SECRET` est bien configuré
- Copiez le secret depuis Lemon Squeezy → Webhooks → Signing Secret
- Redéployez sur Vercel après modification

### Problème : user_id Manquant (400)

**Cause** : Les custom data ne sont pas passées correctement

**Solution** :
- Vérifiez le format de l'URL de checkout :
  ```typescript
  ?checkout[custom][user_id]=${userId}
  ```
- Testez avec un nouveau paiement

### Problème : Profil Non Mis à Jour

**Cause** : Erreur Supabase ou user_id inexistant

**Solution** :
- Vérifiez les logs Next.js (Vercel ou terminal)
- Vérifiez que l'utilisateur existe bien dans la table `profiles`
- Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` est configuré

---

## 9. Sécurité

✅ **Vérification HMAC** : Toutes les requêtes sont vérifiées avec `crypto.timingSafeEqual()`

✅ **Admin Client** : Le webhook utilise le service role key (non exposé au client)

✅ **Logs** : Tous les événements sont loggés (succès et erreurs)

⚠️ **JAMAIS exposer le webhook secret côté client**

---

## 10. Checklist de Déploiement

Avant de passer en production :

- [ ] URL webhook configurée dans Lemon Squeezy
- [ ] Événement `order_created` coché
- [ ] Secret webhook copié dans Vercel (`LEMONSQUEEZY_WEBHOOK_SECRET`)
- [ ] Test réel avec un paiement
- [ ] Vérification du statut dans la table `profiles` (billing_status='paid')
- [ ] Logs vérifiés (200 OK dans Lemon Squeezy)

---

## Support

En cas de problème, consultez :

- **Logs Vercel** : Dashboard Vercel → Logs → Functions
- **Logs Lemon Squeezy** : Dashboard → Webhooks → Recent Deliveries
- **Table Supabase** : SQL Editor → `SELECT * FROM profiles WHERE billing_status='paid'`

---

**Date de dernière mise à jour** : 2025-12-09
