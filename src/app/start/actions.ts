'use server'

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function signupWithProfile(formData: FormData) {
  console.log("🚀 Démarrage inscription..."); // Log de debug

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const bio = formData.get("bio") as string;
  const redFlags = formData.get("redFlags") as string;
  const birthDateRaw = formData.get("birthDate") as string;
  const birthCity = formData.get("birthCity") as string;

  // 1. Création Auth
  console.log("➡️ Création compte Supabase Auth pour:", email);
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: `${firstName} ${lastName}`.trim() },
      emailRedirectTo: `${origin}/api/auth/callback`
    }
  });

  if (authError) {
    console.error("❌ Erreur Auth:", authError.message);
    // On redirige vers la même page avec l'erreur en URL pour l'afficher
    redirect(`/start?error=${encodeURIComponent(authError.message)}`);
  }

  const userId = authData.user?.id;
  if (!userId) {
    console.error("❌ Pas d'ID utilisateur retourné");
    redirect('/start?error=Erreur technique création compte');
  }

  // 2. Profil
  console.log("➡️ Mise à jour profil pour ID:", userId);
  
  // On tente d'abord l'UPDATE (si le trigger a marché)
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`.trim(),
      birth_date: birthDateRaw,
      birth_city: birthCity,
      bio: bio,
      red_flags: redFlags
    })
    .eq('id', userId);

  // Si l'update ne renvoie rien ou échoue, on tente l'INSERT manuel (sécurité)
  if (updateError) {
    console.log("⚠️ Update échoué, tentative d'INSERT manuel...");
    const { error: insertError } = await supabase.from('profiles').insert({
      id: userId,
      email: email,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`.trim(),
      birth_date: birthDateRaw,
      birth_city: birthCity,
      bio: bio,
      red_flags: redFlags
    });
    
    if (insertError) console.error("❌ Erreur Insert Profil:", insertError.message);
  }

  // 3. Sessions
  console.log("➡️ Initialisation sessions...");
  await initializeUserSessions(supabase, userId, birthDateRaw);

  console.log("✅ Succès ! Redirection vers paiement...");

  // Redirection vers le checkout Lemonsqueezy avec les données utilisateur
  const checkoutUrl = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL;

  if (!checkoutUrl) {
    console.error("❌ URL Lemonsqueezy non configurée");
    redirect('/auth/verify'); // Fallback si pas configuré
  }

  // Ajout des paramètres à l'URL Lemonsqueezy (email + user_id en custom data)
  const checkoutWithParams = `${checkoutUrl}?checkout[email]=${encodeURIComponent(email)}&checkout[custom][user_id]=${userId}`;

  redirect(checkoutWithParams);
}

// Helper (inchangé)
async function initializeUserSessions(supabase: any, userId: string, birthDateRaw: string) {
  const birthDate = new Date(birthDateRaw);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

  // On crée les ères en dur si la BDD est vide ou pour éviter une requête
  // (Ou on les récupère depuis la BDD comme avant)
  const { data: eras } = await supabase.from('eras').select('*');
  
  if (eras && eras.length > 0) {
    const sessions = eras.map((era: any) => {
      let status = 'locked';
      const endAge = era.end_age || 100;
      
      if (age >= endAge) status = 'available';
      else if (age >= era.start_age && age < endAge) status = 'in_progress';

      return {
        user_id: userId,
        era_id: era.id,
        status: status,
        current_summary: `Début du chapitre : ${era.label}`
      };
    });
    
    const { error } = await supabase.from('chat_sessions').upsert(sessions, { onConflict: 'user_id, era_id' });
    if (error) console.error("❌ Erreur Sessions:", error.message);
  }
}