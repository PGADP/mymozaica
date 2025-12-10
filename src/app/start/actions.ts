'use server'

import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";

/**
 * Action principale d'inscription avec profil complet
 *
 * Flux:
 * 1. Créer le user Auth avec admin.createUser()
 * 2. Créer le profil dans la table profiles (avec billing_status='free')
 * 3. Calculer l'âge et initialiser les chat_sessions (ères)
 * 4. Rediriger vers Lemon Squeezy Checkout
 *
 * ⚠️ Utilise createAdminClient pour bypasser RLS
 */
export async function signupWithProfile(formData: FormData) {
  console.log("🚀 Démarrage inscription avec Admin Client...");

  const supabaseAdmin = createAdminClient();

  // ====================================
  // 1. EXTRACTION DES DONNÉES DU FORMULAIRE
  // ====================================
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const bio = formData.get("bio") as string || null; // Optionnel
  const redFlagsText = formData.get("redFlags") as string || null; // Textarea
  const birthDateRaw = formData.get("birthDate") as string;
  const birthCity = formData.get("birthCity") as string;

  // red_flags est maintenant un texte libre (textarea), pas une checkbox
  const redFlags = redFlagsText && redFlagsText.trim().length > 0 ? redFlagsText.trim() : null;

  console.log("📋 Données extraites:", {
    email,
    firstName,
    lastName,
    birthDate: birthDateRaw,
    birthCity,
    hasRedFlags: !!redFlags
  });

  try {
    // ====================================
    // 2. VÉRIFICATION : Email existe déjà dans profiles ?
    // ====================================
    console.log("🔍 Vérification existence email dans profiles:", email);

    const { data: existingProfile, error: checkProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, created_at')
      .eq('email', email)
      .maybeSingle();

    console.log("📊 Résultat vérification profil:", {
      found: !!existingProfile,
      data: existingProfile,
      error: checkProfileError
    });

    if (existingProfile) {
      console.error("❌ Email déjà utilisé (profil existe):", existingProfile);
      redirect(`/start?error=${encodeURIComponent('Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email.')}`);
    }

    // Vérifier aussi dans auth.users
    console.log("🔍 Vérification existence email dans auth.users:", email);

    const { data: existingAuthUser, error: authListError } = await supabaseAdmin.auth.admin.listUsers();

    console.log("📊 Total auth users:", existingAuthUser?.users?.length || 0);

    if (authListError) {
      console.error("❌ Erreur listUsers:", authListError);
    }

    const authUserExists = existingAuthUser?.users?.find(u => u.email === email);

    console.log("📊 Auth user trouvé pour cet email:", {
      found: !!authUserExists,
      id: authUserExists?.id,
      email: authUserExists?.email
    });

    if (authUserExists) {
      console.error("⚠️ Email existe dans auth.users, nettoyage...");

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUserExists.id);

      if (deleteError) {
        console.error("❌ Erreur suppression auth user:", deleteError);
      } else {
        console.log("✅ Utilisateur orphelin supprimé:", authUserExists.id);
      }
    }

    // ====================================
    // 3. CRÉATION DU USER AUTH (avec Admin API)
    // ====================================
    console.log("➡️ Création compte Auth pour:", email);

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Envoyer email de confirmation
      user_metadata: {
        full_name: `${firstName} ${lastName}`.trim()
      }
    });

    if (authError) {
      console.error("❌ Erreur création Auth:", authError.message);

      // Gestion d'erreurs spécifiques
      let userFriendlyMessage = authError.message;

      if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
        userFriendlyMessage = 'Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email.';
      } else if (authError.message.includes('password')) {
        userFriendlyMessage = 'Le mot de passe ne respecte pas les critères requis (minimum 8 caractères).';
      } else if (authError.message.includes('email')) {
        userFriendlyMessage = 'L\'adresse email n\'est pas valide.';
      }

      redirect(`/start?error=${encodeURIComponent(userFriendlyMessage)}`);
    }

    const userId = authData.user?.id;
    if (!userId) {
      console.error("❌ Pas d'ID utilisateur retourné");
      redirect('/start?error=Erreur technique création compte');
    }

    console.log("✅ User Auth créé:", userId);

    // ====================================
    // 4. VÉRIFICATION FINALE : Le profil existe-t-il avec cet ID ?
    // ====================================
    console.log("🔍 Vérification finale: profil avec ID:", userId);

    const { data: existingProfileById, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (checkError) {
      console.error("❌ Erreur lors de la vérification du profil:", checkError);
    }

    if (existingProfileById) {
      console.error("❌ Un profil existe déjà avec cet ID:", existingProfileById);
      console.log("🧹 Tentative de suppression du profil orphelin...");

      // Supprimer le profil orphelin
      const { error: deleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (deleteError) {
        console.error("❌ Impossible de supprimer le profil orphelin:", deleteError);
        // Supprimer au moins l'auth user qu'on vient de créer
        await supabaseAdmin.auth.admin.deleteUser(userId);
        redirect(`/start?error=${encodeURIComponent('Conflit de données. Veuillez réessayer.')}`);
      }

      console.log("✅ Profil orphelin supprimé, création d'un nouveau...");
    }

    // ====================================
    // 5. CRÉATION DU PROFIL (table profiles)
    // ====================================
    console.log("➡️ Création profil pour user_id:", userId);

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
        birth_date: birthDateRaw,
        birth_city: birthCity,
        bio: bio,
        red_flags: redFlags,
        billing_status: 'free' // Par défaut, avant paiement
      });

    if (profileError) {
      console.error("❌ Erreur création profil:", profileError.message);
      console.error("❌ Détails complets:", JSON.stringify(profileError, null, 2));

      // Rollback: Supprimer le user Auth créé
      await supabaseAdmin.auth.admin.deleteUser(userId);

      // Message d'erreur plus détaillé
      let errorMessage = 'Erreur création profil';
      if (profileError.message.includes('duplicate key')) {
        errorMessage = 'Conflit de données détecté. Utilisez l\'API de diagnostic: /api/debug/check-user?email=' + encodeURIComponent(email);
      } else {
        errorMessage = profileError.message;
      }

      redirect(`/start?error=${encodeURIComponent(errorMessage)}`);
    }

    console.log("✅ Profil créé avec succès");

    // ====================================
    // 6. INITIALISATION DES SESSIONS (ères)
    // ====================================
    console.log("➡️ Initialisation sessions pour user_id:", userId);

    await initializeUserSessions(supabaseAdmin, userId, birthDateRaw);

    console.log("✅ Sessions initialisées");

    // ====================================
    // 7. REDIRECTION VERS PAGE DE VÉRIFICATION EMAIL
    // ====================================
    console.log("➡️ Redirection vers page de vérification email...");

    // L'utilisateur doit confirmer son email avant de payer
    // La redirection vers Lemonsqueezy se fera APRÈS confirmation email
    redirect('/auth/verify-email');

  } catch (error) {
    console.error("❌ Erreur critique lors de l'inscription:", error);
    redirect('/start?error=Une erreur inattendue est survenue');
  }
}

/**
 * Helper: Initialise les chat_sessions pour un utilisateur
 * Calcule l'âge et crée une session par ère avec le bon statut
 *
 * @param supabaseAdmin - Client Admin Supabase
 * @param userId - ID de l'utilisateur
 * @param birthDateRaw - Date de naissance (format YYYY-MM-DD)
 */
async function initializeUserSessions(
  supabaseAdmin: any,
  userId: string,
  birthDateRaw: string
) {
  // Calcul de l'âge
  const birthDate = new Date(birthDateRaw);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();

  // Ajustement si l'anniversaire n'est pas encore passé cette année
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  console.log("👤 Âge calculé:", age, "ans");

  // Récupération des ères depuis la BDD
  const { data: eras, error: erasError } = await supabaseAdmin
    .from('eras')
    .select('*')
    .order('order', { ascending: true });

  if (erasError || !eras || eras.length === 0) {
    console.error("❌ Erreur récupération ères:", erasError?.message);
    throw new Error("Impossible de récupérer les ères");
  }

  console.log("📚 Ères récupérées:", eras.length);

  // Création des sessions avec statut calculé selon l'âge
  const sessions = eras.map((era: any) => {
    let status = 'locked'; // Par défaut, verrouillé
    const endAge = era.end_age || 150; // 150 pour la dernière ère (sans limite)

    // Logique de statut:
    // - locked: L'utilisateur n'a pas encore atteint cette ère
    // - in_progress: L'utilisateur est actuellement dans cette ère
    // - available: L'utilisateur a dépassé cette ère (peut la revoir)

    if (age >= era.start_age && age < endAge) {
      // L'utilisateur est dans cette tranche d'âge
      status = 'in_progress';
    } else if (age >= endAge) {
      // L'utilisateur a dépassé cette tranche d'âge
      status = 'available';
    }
    // Sinon, reste 'locked'

    return {
      user_id: userId,
      era_id: era.id,
      status: status,
      topic_density: 0, // Aucun sujet abordé pour le moment
      current_summary: `Prêt à commencer : ${era.label}`
    };
  });

  console.log("📝 Sessions à créer:", sessions.length);
  console.log("📊 Statuts:", {
    locked: sessions.filter((s: any) => s.status === 'locked').length,
    in_progress: sessions.filter((s: any) => s.status === 'in_progress').length,
    available: sessions.filter((s: any) => s.status === 'available').length,
  });

  // Insertion des sessions (upsert au cas où elles existeraient déjà)
  const { error: sessionsError } = await supabaseAdmin
    .from('chat_sessions')
    .upsert(sessions, { onConflict: 'user_id, era_id' });

  if (sessionsError) {
    console.error("❌ Erreur création sessions:", sessionsError.message);
    throw new Error("Impossible de créer les sessions");
  }

  console.log("✅ Sessions créées avec succès");
}
