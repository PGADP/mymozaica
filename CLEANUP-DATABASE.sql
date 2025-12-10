-- ============================================
-- SCRIPT DE NETTOYAGE BASE DE DONNÉES
-- ============================================
-- Ce script supprime tous les utilisateurs orphelins
-- et nettoie la base pour repartir sur de bonnes bases
--
-- ⚠️ ATTENTION : Ce script supprime des données !
-- Assurez-vous de vouloir vraiment nettoyer la base
--
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================

-- ============================================
-- ÉTAPE 1 : DIAGNOSTIC (lecture seule)
-- ============================================

-- Voir TOUS les utilisateurs dans auth.users
SELECT
  'auth.users' as table_name,
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- Voir TOUS les profils dans profiles
SELECT
  'public.profiles' as table_name,
  id,
  email,
  first_name,
  last_name,
  billing_status,
  created_at
FROM public.profiles
ORDER BY created_at DESC;

-- ============================================
-- ÉTAPE 2 : IDENTIFIER LES ORPHELINS
-- ============================================

-- Utilisateurs Auth SANS profil (orphelins auth)
SELECT
  'Orphelin Auth (auth sans profile)' as type,
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Profils SANS utilisateur Auth (orphelins profils)
-- (Ne devrait pas arriver grâce à la foreign key CASCADE)
SELECT
  'Orphelin Profil (profile sans auth)' as type,
  p.id,
  p.email,
  p.created_at
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.id IS NULL;

-- ============================================
-- ÉTAPE 3 : NETTOYAGE (DESTRUCTIF !)
-- ============================================

-- Option A : Supprimer UN email spécifique
-- Décommentez et remplacez l'email ci-dessous :

-- DELETE FROM auth.users
-- WHERE email = 'VOTRE_EMAIL_ICI@example.com';

-- Note : Le profil sera automatiquement supprimé grâce à ON DELETE CASCADE


-- Option B : Supprimer TOUS les utilisateurs orphelins (auth sans profil)
-- ⚠️ ATTENTION : Cela supprime tous les users auth qui n'ont pas de profil !
-- Décommentez uniquement si vous êtes SÛR :

-- DELETE FROM auth.users
-- WHERE id IN (
--   SELECT au.id
--   FROM auth.users au
--   LEFT JOIN public.profiles p ON au.id = p.id
--   WHERE p.id IS NULL
-- );


-- Option C : RESET COMPLET (supprime TOUT)
-- ⚠️⚠️⚠️ DANGER : Supprime tous les utilisateurs et profils !
-- Décommentez uniquement pour un reset complet en dev :

-- DELETE FROM auth.users;
-- DELETE FROM public.profiles;
-- DELETE FROM public.chat_sessions;
-- DELETE FROM public.chat_messages;

-- ============================================
-- ÉTAPE 4 : VÉRIFICATION POST-NETTOYAGE
-- ============================================

-- Compter ce qui reste
SELECT
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  (SELECT COUNT(*) FROM public.chat_sessions) as total_sessions;

-- ============================================
-- NOTES IMPORTANTES
-- ============================================

-- 1. La table auth.users est dans le schéma "auth" (pas "public")
--    C'est pourquoi vous ne la voyez pas dans l'interface Table Editor

-- 2. La foreign key entre profiles.id et auth.users.id est configurée
--    avec ON DELETE CASCADE, donc :
--    - Supprimer un auth.users supprime automatiquement son profile
--    - Mais l'inverse n'est PAS vrai (supprimer profile ne supprime pas auth)

-- 3. Si vous avez l'erreur "duplicate key constraint profiles_pkey",
--    cela signifie qu'un profil existe DÉJÀ avec l'UUID que Supabase Auth
--    vient de générer. C'est rare mais possible.

-- 4. Le code amélioré dans actions.ts détecte maintenant automatiquement
--    ces situations et nettoie les orphelins.

-- 5. Pour éviter ces problèmes à l'avenir :
--    - Toujours créer le user Auth AVANT le profil
--    - Toujours rollback (supprimer auth) si la création du profil échoue
--    - Utiliser l'API de diagnostic : /api/debug/check-user?email=xxx

-- ============================================
-- EXEMPLE D'UTILISATION
-- ============================================

/*
1. Exécutez d'abord l'ÉTAPE 1 (diagnostic) pour voir l'état actuel

2. Identifiez les orphelins avec l'ÉTAPE 2

3. Si vous avez des orphelins, choisissez une option dans ÉTAPE 3 :
   - Option A pour supprimer un email précis
   - Option B pour supprimer tous les orphelins
   - Option C pour un reset complet (dev uniquement)

4. Vérifiez avec l'ÉTAPE 4 que tout est propre

5. Réessayez votre inscription sur /start
*/
