# Guide Configuration LemonSqueezy - My Mozaica

> **Date**: 2025-12-12
> **Version**: 1.0

Ce guide explique pas a pas comment configurer les produits LemonSqueezy pour My Mozaica.

---

## Apercu des produits a creer

| # | Nom produit | Prix | Type | Custom Data |
|---|-------------|------|------|-------------|
| 1 | Pack Numerique | 49 EUR | Pack initial | `pack_type=pack1` |
| 2 | Pack Livre | 68 EUR | Pack initial | `pack_type=pack2` |
| 3 | Livre Supplementaire (1er) | 23 EUR | Addon | `addon_type=first_book` |
| 4 | Livre Supplementaire | 15 EUR | Addon | `addon_type=extra_book` |

---

## Etape 1 : Acceder au Dashboard

1. Va sur https://app.lemonsqueezy.com/
2. Connecte-toi a ton compte
3. Selectionne ton Store "My Mozaica"

---

## Etape 2 : Creer le Produit "Pack Numerique" (49 EUR)

### 2.1 Creer le produit

1. Menu lateral > **Products** > **+ New product**
2. Remplis les champs :

| Champ | Valeur |
|-------|--------|
| **Name** | `My Mozaica - Pack Numerique` |
| **Description** | `Votre biographie personnalisee au format PDF. Acces illimite a l'interview IA et generation de votre livre numerique.` |
| **Price** | `49.00` EUR |
| **Tax category** | Digital goods / E-books |

3. Clique **Save product**

### 2.2 Configurer le Variant

1. Dans la page du produit, va dans l'onglet **Variants**
2. Clique sur le variant par defaut (ou cree-en un)
3. Note le **Variant ID** (visible dans l'URL : `/variants/XXXXXX`)

### 2.3 Configurer la redirection

1. Onglet **Confirmation** (ou **After purchase**)
2. **Redirect URL** :
   ```
   https://mymozaica.com/start/success
   ```
3. Sauvegarde

### 2.4 URL de Checkout a utiliser dans le code

```
https://mymozaica.lemonsqueezy.com/checkout/buy/VARIANT_ID?checkout[custom][pack_type]=pack1&checkout[custom][user_id]={USER_ID}
```

Remplace :
- `VARIANT_ID` par l'ID du variant note a l'etape 2.2
- `{USER_ID}` sera remplace dynamiquement par le code

---

## Etape 3 : Creer le Produit "Pack Livre" (68 EUR)

### 3.1 Creer le produit

1. **Products** > **+ New product**
2. Remplis :

| Champ | Valeur |
|-------|--------|
| **Name** | `My Mozaica - Pack Livre` |
| **Description** | `Votre biographie complete : PDF + 1 livre imprime de qualite livre en France metropolitaine (livraison incluse).` |
| **Price** | `68.00` EUR |
| **Tax category** | Physical goods / Books |

3. **Save product**

### 3.2 Configurer le Variant

1. Note le **Variant ID**

### 3.3 Configurer la redirection

1. **Redirect URL** :
   ```
   https://mymozaica.com/start/success
   ```

### 3.4 URL de Checkout

```
https://mymozaica.lemonsqueezy.com/checkout/buy/VARIANT_ID?checkout[custom][pack_type]=pack2&checkout[custom][user_id]={USER_ID}
```

---

## Etape 4 : Creer "Livre Supplementaire - Premier" (23 EUR)

> Pour les utilisateurs Pack 1 qui veulent leur premier livre imprime

### 4.1 Creer le produit

| Champ | Valeur |
|-------|--------|
| **Name** | `My Mozaica - Premier Livre Imprime` |
| **Description** | `Recevez votre biographie en livre imprime de qualite. Livraison France metropolitaine incluse.` |
| **Price** | `23.00` EUR |
| **Tax category** | Physical goods / Books |

### 4.2 Configurer la redirection

```
https://mymozaica.com/dashboard/order-book/success
```

### 4.3 URL de Checkout

```
https://mymozaica.lemonsqueezy.com/checkout/buy/VARIANT_ID?checkout[custom][addon_type]=first_book&checkout[custom][user_id]={USER_ID}
```

---

## Etape 5 : Creer "Livre Supplementaire" (15 EUR)

> Pour les utilisateurs qui veulent des exemplaires additionnels

### 5.1 Creer le produit

| Champ | Valeur |
|-------|--------|
| **Name** | `My Mozaica - Livre Supplementaire` |
| **Description** | `Exemplaire supplementaire de votre biographie. Livraison a la meme adresse que votre commande precedente.` |
| **Price** | `15.00` EUR |
| **Tax category** | Physical goods / Books |

### 5.2 Configurer la redirection

```
https://mymozaica.com/dashboard/order-book/success
```

### 5.3 URL de Checkout

```
https://mymozaica.lemonsqueezy.com/checkout/buy/VARIANT_ID?checkout[custom][addon_type]=extra_book&checkout[custom][user_id]={USER_ID}
```

---

## Etape 6 : Configurer le Webhook

### 6.1 Creer le webhook

1. Menu lateral > **Settings** > **Webhooks**
2. **+ Add endpoint**
3. Remplis :

| Champ | Valeur |
|-------|--------|
| **Callback URL** | `https://mymozaica.com/api/webhooks/lemonsqueezy` |
| **Events** | Coche `order_created` |
| **Signing secret** | Genere automatiquement - **COPIE-LE !** |

4. **Save webhook**

### 6.2 Mettre a jour .env.local

Ajoute le signing secret :

```env
LEMONSQUEEZY_WEBHOOK_SECRET=ton_signing_secret_copie
```

---

## Etape 7 : Variables d'environnement finales

Ajoute dans `.env.local` et dans Vercel :

```env
# LemonSqueezy Checkout URLs
NEXT_PUBLIC_LEMONSQUEEZY_PACK1_URL=https://mymozaica.lemonsqueezy.com/checkout/buy/VARIANT_ID_PACK1
NEXT_PUBLIC_LEMONSQUEEZY_PACK2_URL=https://mymozaica.lemonsqueezy.com/checkout/buy/VARIANT_ID_PACK2
NEXT_PUBLIC_LEMONSQUEEZY_ADDON_FIRST_URL=https://mymozaica.lemonsqueezy.com/checkout/buy/VARIANT_ID_FIRST
NEXT_PUBLIC_LEMONSQUEEZY_ADDON_EXTRA_URL=https://mymozaica.lemonsqueezy.com/checkout/buy/VARIANT_ID_EXTRA

# LemonSqueezy Webhook
LEMONSQUEEZY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

Remplace `VARIANT_ID_XXX` par les vrais IDs notes lors de la creation.

---

## Etape 8 : Tester en mode Test

### 8.1 Activer le mode Test

1. En haut du dashboard LemonSqueezy, bascule sur **Test mode** (toggle)
2. Tous les produits ont une version Test separee

### 8.2 Cartes de test

Utilise ces cartes pour tester :

| Carte | Resultat |
|-------|----------|
| `4242 4242 4242 4242` | Paiement reussi |
| `4000 0000 0000 0002` | Carte refusee |
| `4000 0000 0000 9995` | Fonds insuffisants |

- **Date** : N'importe quelle date future (ex: 12/34)
- **CVC** : N'importe quels 3 chiffres (ex: 123)

### 8.3 Verifier le webhook

1. Fais un achat test
2. Va dans **Settings** > **Webhooks** > Clique sur ton webhook
3. Verifie l'onglet **Logs** pour voir si le webhook a ete envoye

---

## Resume : Custom Data par produit

| Produit | custom_data a passer |
|---------|---------------------|
| Pack 1 (49EUR) | `checkout[custom][pack_type]=pack1` |
| Pack 2 (68EUR) | `checkout[custom][pack_type]=pack2` |
| 1er Livre (23EUR) | `checkout[custom][addon_type]=first_book` |
| Livre Supp (15EUR) | `checkout[custom][addon_type]=extra_book` |

**Toujours ajouter** : `checkout[custom][user_id]={USER_ID}`

---

## Comment ca marche dans le code

### Generation de l'URL de checkout

```typescript
// Exemple dans un composant React
const checkoutUrl = `${process.env.NEXT_PUBLIC_LEMONSQUEEZY_PACK1_URL}?checkout[custom][pack_type]=pack1&checkout[custom][user_id]=${user.id}`;

<a href={checkoutUrl} target="_blank">Acheter Pack Numerique</a>
```

### Reception du webhook

Le webhook LemonSqueezy envoie les `custom_data` :

```json
{
  "meta": {
    "custom_data": {
      "pack_type": "pack1",
      "user_id": "uuid-de-l-utilisateur"
    }
  },
  "data": {
    "attributes": {
      "status": "paid",
      "total": 4900
    }
  }
}
```

Notre webhook (`/api/webhooks/lemonsqueezy/route.ts`) :
1. Verifie la signature
2. Extrait `pack_type` ou `addon_type`
3. Met a jour le profil utilisateur
4. Cree l'enregistrement `orders`

---

## Checklist finale

- [ ] Produit Pack 1 (49EUR) cree avec `pack_type=pack1`
- [ ] Produit Pack 2 (68EUR) cree avec `pack_type=pack2`
- [ ] Produit 1er Livre (23EUR) cree avec `addon_type=first_book`
- [ ] Produit Livre Supp (15EUR) cree avec `addon_type=extra_book`
- [ ] Webhook configure avec URL `/api/webhooks/lemonsqueezy`
- [ ] Signing secret copie dans `LEMONSQUEEZY_WEBHOOK_SECRET`
- [ ] URLs de checkout dans les variables d'environnement
- [ ] Test en mode Test effectue
- [ ] Webhook logs verifies

---

## Support

- [Documentation LemonSqueezy](https://docs.lemonsqueezy.com/)
- [Webhooks LemonSqueezy](https://docs.lemonsqueezy.com/guides/developer-guide/webhooks)
- [Mode Test](https://docs.lemonsqueezy.com/guides/developer-guide/testing)
