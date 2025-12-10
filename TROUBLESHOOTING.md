# 🔧 Guide de Dépannage - My Mozaica

## Problème : "duplicate key value violates unique constraint profiles_pkey"

### Symptômes
- L'inscription échoue avec l'erreur "Une erreur inattenante est survenue"
- Les logs serveur montrent : `duplicate key value violates unique constraint "profiles_pkey"`
- Le user Auth est créé mais pas le profil

### Cause
Un **utilisateur orphelin** existe dans la base de données :
- Soit un `auth.users` existe sans profil correspondant
- Soit un `profiles` existe avec un ID qui entre en conflit

Cela arrive généralement quand :
1. Une inscription précédente a échoué à mi-chemin
2. Vous avez supprimé manuellement un profil sans supprimer le user auth
3. Un UUID a été réutilisé (très rare)

---

## 🚀 Solutions (3 méthodes)

### **Méthode 1 : Utiliser l'API de diagnostic (Recommandé)**

1. **Ouvrez votre navigateur** et allez sur :
   ```
   http://localhost:3000/api/debug/check-user?email=VOTRE_EMAIL@example.com
   ```

2. **Analysez le résultat JSON** :
   ```json
   {
     "results": {
       "auth_user": { ... },           // Utilisateur dans auth.users
       "profile_by_email": { ... },    // Profil trouvé par email
       "profile_by_id": { ... }        // Profil trouvé par ID de l'auth user
     },
     "diagnostics": {
       "has_orphaned_auth_user": true,  // ← User auth sans profil
       "has_orphaned_profile": false    // ← Profil sans user auth
     }
   }
   ```

3. **Selon le diagnostic** :
   - Si `has_orphaned_auth_user: true` → Passez à la Méthode 2
   - Si `has_orphaned_profile: true` → Contact support (rare)

---

### **Méthode 2 : Nettoyage SQL dans Supabase Dashboard**

1. **Allez dans Supabase Dashboard** :
   - Ouvrez votre projet : https://supabase.com/dashboard/project/xmqgmmagwwgiphmlbxus
   - Cliquez sur **SQL Editor** dans le menu de gauche

2. **Exécutez ce script de diagnostic** :
   ```sql
   -- Voir tous les users auth
   SELECT id, email, created_at, email_confirmed_at
   FROM auth.users
   ORDER BY created_at DESC
   LIMIT 10;

   -- Voir tous les profils
   SELECT id, email, first_name, last_name, created_at
   FROM public.profiles
   ORDER BY created_at DESC
   LIMIT 10;

   -- Identifier les orphelins (auth sans profil)
   SELECT au.id, au.email, au.created_at
   FROM auth.users au
   LEFT JOIN public.profiles p ON au.id = p.id
   WHERE p.id IS NULL;
   ```

3. **Si vous trouvez des orphelins, supprimez-les** :
   ```sql
   -- Supprimer un email spécifique (REMPLACEZ L'EMAIL)
   DELETE FROM auth.users
   WHERE email = 'votre-email@example.com';
   ```

   Ou pour supprimer **tous les orphelins** :
   ```sql
   DELETE FROM auth.users
   WHERE id IN (
     SELECT au.id
     FROM auth.users au
     LEFT JOIN public.profiles p ON au.id = p.id
     WHERE p.id IS NULL
   );
   ```

4. **Vérifiez le nettoyage** :
   ```sql
   SELECT
     (SELECT COUNT(*) FROM auth.users) as total_auth_users,
     (SELECT COUNT(*) FROM public.profiles) as total_profiles;
   ```

5. **Réessayez l'inscription** sur http://localhost:3000/start

---

### **Méthode 3 : Reset complet (Dev uniquement)**

⚠️ **ATTENTION** : Cela supprime TOUS les utilisateurs !

```sql
-- Supprimer toutes les données utilisateurs
DELETE FROM auth.users;
DELETE FROM public.profiles;
DELETE FROM public.chat_sessions;
DELETE FROM public.chat_messages;

-- Vérification
SELECT
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles;
```

---

## 🛡️ Prévention

Le code a été amélioré pour **auto-nettoyer** les orphelins :

### Dans `src/app/start/actions.ts`

1. **Vérification avant création** :
   ```typescript
   // Vérifie si l'email existe dans profiles
   const { data: existingProfile } = await supabaseAdmin
     .from('profiles')
     .select('id, email')
     .eq('email', email)
     .maybeSingle();

   if (existingProfile) {
     redirect('/start?error=Email déjà utilisé');
   }
   ```

2. **Auto-nettoyage des orphelins auth** :
   ```typescript
   // Vérifie dans auth.users et supprime si orphelin
   const authUserExists = existingAuthUser?.users?.find(u => u.email === email);

   if (authUserExists) {
     await supabaseAdmin.auth.admin.deleteUser(authUserExists.id);
   }
   ```

3. **Vérification finale avant insertion du profil** :
   ```typescript
   // Vérifie si un profil existe déjà avec l'UUID généré
   const { data: existingProfileById } = await supabaseAdmin
     .from('profiles')
     .select('id, email')
     .eq('id', userId)
     .maybeSingle();

   if (existingProfileById) {
     await supabaseAdmin.from('profiles').delete().eq('id', userId);
   }
   ```

4. **Rollback en cas d'erreur** :
   ```typescript
   if (profileError) {
     // Supprimer le user auth créé
     await supabaseAdmin.auth.admin.deleteUser(userId);
     redirect('/start?error=...');
   }
   ```

---

## 📊 Vérification de l'état de la base

### Via SQL Editor

```sql
-- Vue d'ensemble complète
SELECT
  'auth.users' as source,
  au.id,
  au.email,
  au.created_at,
  CASE WHEN p.id IS NULL THEN '⚠️ ORPHELIN' ELSE '✅ OK' END as status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id

UNION ALL

SELECT
  'public.profiles' as source,
  p.id,
  p.email,
  p.created_at,
  CASE WHEN au.id IS NULL THEN '⚠️ ORPHELIN' ELSE '✅ OK' END as status
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id

ORDER BY created_at DESC;
```

### Via API de Diagnostic

Ouvrez dans votre navigateur :
```
http://localhost:3000/api/debug/check-user?email=VOTRE_EMAIL
```

---

## ❓ Questions Fréquentes

### Pourquoi je ne vois pas la table `auth.users` dans Supabase ?

La table `auth.users` est dans le **schéma `auth`**, pas dans le schéma `public`.
Elle n'apparaît donc pas dans l'interface "Table Editor".

**Solution** : Utilisez le **SQL Editor** avec :
```sql
SELECT * FROM auth.users;
```

### La suppression du profil supprime-t-elle le user auth ?

**NON** ! La relation est unidirectionnelle :
- Supprimer `auth.users` → supprime automatiquement `profiles` (CASCADE)
- Supprimer `profiles` → **ne supprime PAS** `auth.users`

C'est pourquoi des orphelins peuvent se créer.

### Puis-je utiliser le même email après suppression ?

**OUI**, une fois que vous avez supprimé à la fois :
1. L'entrée dans `auth.users`
2. L'entrée dans `profiles` (si elle existe)

Vous pouvez réutiliser cet email pour une nouvelle inscription.

---

## 🔍 Logs de Débogage

Lors de l'inscription, vérifiez les logs serveur (console Node.js) :

```
🚀 Démarrage inscription avec Admin Client...
📋 Données extraites: { email: '...', firstName: '...', ... }
🔍 Vérification existence email dans profiles: xxx@example.com
🔍 Vérification existence email dans auth.users: xxx@example.com
🧹 Tentative de nettoyage automatique... (si orphelin détecté)
✅ Utilisateur orphelin supprimé
➡️ Création compte Auth pour: xxx@example.com
✅ User Auth créé: 7a0cf1b3-468b-4ce8-b19a-36f3421f1a57
🔍 Vérification finale: profil avec ID: 7a0cf1b3-468b-4ce8-b19a-36f3421f1a57
➡️ Création profil pour user_id: 7a0cf1b3-468b-4ce8-b19a-36f3421f1a57
✅ Profil créé avec succès
➡️ Initialisation sessions pour user_id: ...
✅ Sessions initialisées
➡️ Redirection vers page de vérification email...
```

Si vous voyez une erreur, notez l'étape exacte où elle se produit.

---

## 📞 Support

Si aucune solution ne fonctionne :

1. **Partagez les logs complets** (console serveur + navigateur)
2. **Partagez le résultat de l'API de diagnostic**
3. **Partagez le résultat du SQL de diagnostic**

Contact : support@mymozaica.com

---

## 📚 Fichiers Utiles

- **Script SQL complet** : `CLEANUP-DATABASE.sql`
- **Code signup** : `src/app/start/actions.ts`
- **API diagnostic** : `src/app/api/debug/check-user/route.ts`
- **Configuration Supabase** : `src/utils/supabase/admin.ts`
