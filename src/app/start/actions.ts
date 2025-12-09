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
  const redFlagsChecked = formData.get("redFlags"); // Checkbox => 'sensitive_topics' ou null
  const birthDateRaw = formData.get("birthDate") as string;
  const birthCity = formData.get("birthCity") as string;

  // Transformation de red_flags (checkbox => string ou null)
  const redFlags = redFlagsChecked === 'sensitive_topics' ? 'sensitive_topics' : null;

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
    // 2. CRÉATION DU USER AUTH (avec Admin API)
    // ====================================
    console.log("➡️ Création compte Auth pour:", email);

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Pas de confirmation email pour simplifier le MVP
      user_metadata: {
        full_name: `${firstName} ${lastName}`.trim()
      }
    });

    if (authError) {
      console.error("❌ Erreur création Auth:", authError.message);
      redirect(`/start?error=${encodeURIComponent(authError.message)}`);
    }

    const userId = authData.user?.id;
    if (!userId) {
      console.error("❌ Pas d'ID utilisateur retourné");
      redirect('/start?error=Erreur technique création compte');
    }

    console.log("✅ User Auth créé:", userId);

    // ====================================
    // 3. CRÉATION DU PROFIL (table profiles)
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
      // Rollback: Supprimer le user Auth créé
      await supabaseAdmin.auth.admin.deleteUser(userId);
      redirect(`/start?error=Erreur création profil: ${profileError.message}`);
    }

    console.log("✅ Profil créé avec succès");

    // ====================================
    // 4. INITIALISATION DES SESSIONS (ères)
    // ====================================
    console.log("➡️ Initialisation sessions pour user_id:", userId);

    await initializeUserSessions(supabaseAdmin, userId, birthDateRaw);

    console.log("✅ Sessions initialisées");

    // ====================================
    // 5. REDIRECTION VERS LEMON SQUEEZY
    // ====================================
    console.log("➡️ Redirection vers Lemon Squeezy Checkout...");

    const checkoutUrl = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL;

    if (!checkoutUrl) {
      console.error("❌ URL Lemonsqueezy non configurée");
      // Fallback: Rediriger vers une page de succès temporaire
      redirect('/start/success');
    }

    // Construction de l'URL avec custom data (user_id pour le webhook)
    const checkoutWithParams = `${checkoutUrl}?checkout[email]=${encodeURIComponent(email)}&checkout[custom][user_id]=${userId}`;

    console.log("🔗 URL Checkout:", checkoutWithParams);

    redirect(checkoutWithParams);

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
