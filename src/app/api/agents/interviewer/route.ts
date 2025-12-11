import { createClient } from "@/utils/supabase/server";
import { Mistral } from '@mistralai/mistralai';
import { NextResponse } from 'next/server';
import { withApiProtection, logApiUsage } from "@/lib/api-protection";

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function POST(req: Request) {
  const supabase = await createClient();

  // 1. SÉCURITÉ - Vérification utilisateur
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // 2. PROTECTION API - Rate limiting
  const protection = await withApiProtection(user.id, 'interviewer');
  if (!protection.allowed) {
    return NextResponse.json({ error: protection.error }, { status: protection.status || 429 });
  }

  const { sessionId, userMessage, bonusSystemPrompt } = await req.json();

  // 2. CONTEXTE (Session + Era + Profil + RedFlags + Suggested Topics)
  const { data: session, error: sessionError } = await supabase
    .from('chat_sessions')
    .select(`
      *,
      eras (label, description, start_age, end_age, suggested_topics),
      profiles:user_id (first_name, bio, red_flags)
    `)
    .eq('id', sessionId)
    .single();

  if (sessionError) {
    console.error("❌ Erreur récupération session:", sessionError.message);
  }

  if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  // Récupérer les sujets suggérés de l'ère (peut être null si colonne pas encore créée)
  const suggestedTopics = session.eras?.suggested_topics || [];
  console.log(`📋 Sujets suggérés chargés: ${suggestedTopics.length} pour ère "${session.eras?.label}"`);

  // Détecter si c'est une session bonus
  const isBonusSession = !!session.bonus_topic_id || !!bonusSystemPrompt;

  // 3. HISTORIQUE
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  const messagesCount = history?.length || 0;
  const isGettingLong = messagesCount > 15;

  // 3.5. COMPTEUR DE MOTS (pour limite de ~1h/ère = 10 000 mots)
  const MIN_WORDS_PER_ERA = 10000;
  const totalWords = history
    ?.filter((m: any) => m.role === 'user')
    .reduce((sum: number, msg: any) => sum + (msg.content?.split(/\s+/).length || 0), 0) || 0;
  const hasReachedMinWords = totalWords >= MIN_WORDS_PER_ERA;
  const progressPercent = Math.min(100, Math.round((totalWords / MIN_WORDS_PER_ERA) * 100));
  const isStart = userMessage === "START_SESSION_HIDDEN_PROMPT" || messagesCount === 0;
  const isRegenerate = userMessage === "REGENERATE_QUESTION_SAME_THEME";

  // 4. PRÉPARATION DU PROMPT
  const profile = session.profiles || {};
  const userName = profile.first_name || "l'auteur";
  const topicLabel = session.eras?.label || "Sujet bonus";
  const topicIntent = session.eras?.description || session.current_summary || "";
  const redFlags = profile.red_flags ? [profile.red_flags] : ["Aucun sujet sensible"];

  const previousAnswers = history
    ?.filter((m: any) => m.role !== 'system')
    .map((m: any) => `${m.role === 'user' ? 'AUTEUR' : 'BIOGRAPHE'}: ${m.content}`)
    .join('\n');

  // 4.5. DÉTECTION DE RÉPÉTITION
  // Analyser les 3 derniers échanges pour détecter si on insiste trop sur le même sujet
  const lastThreeMessages = history?.slice(-6) || []; // 6 messages = 3 échanges Q/R
  const lastTopics = lastThreeMessages
    .filter((m: any) => m.role === 'assistant')
    .map((m: any) => m.content.toLowerCase());

  // Détection simple : si les 2 dernières questions contiennent les mêmes mots-clés
  const hasSameTopic = lastTopics.length >= 2 &&
    lastTopics[lastTopics.length - 1].includes(lastTopics[lastTopics.length - 2].substring(0, 20));

  // 5. SYSTEM PROMPT (VERSION V1 - OPTIMISÉE FAITS)
  // Pour les sessions bonus, on utilise le prompt personnalisé
  const systemPrompt = isBonusSession && bonusSystemPrompt
    ? `${bonusSystemPrompt}

    CONTEXTE BIOGRAPHIQUE CONNU : "${profile.bio || "Néant"}"

    HISTORIQUE DE L'ENTRETIEN :
    "${previousAnswers || "(Début de l'entretien)"}"

    ${hasSameTopic ? `
    ⚠️ ALERTE RÉPÉTITION : Les 2 dernières questions portaient sur le même sujet.
    → OBLIGATION : Pose une question sur UN ASPECT TOTALEMENT DIFFÉRENT.
    → Ne reviens PAS sur ce qui vient d'être discuté.
    ` : ""}

    RÈGLES DE FORMULATION :
    - Une seule question par tour, claire et directe.
    - Reprends EXACTEMENT les faits de la dernière réponse.
    - ${isGettingLong ? "⚠️ Le sujet s'étire. Pose une question de conclusion." : "Explore en profondeur."}
    - ${isStart ? "C'est le début. Pose une question d'ouverture chaleureuse sur ce sujet." : ""}
    - ${isRegenerate ? "⚠️ L'utilisateur veut une question différente. Pose une question sur UN AUTRE ASPECT, sans répéter." : ""}

    FORMAT DE SORTIE JSON STRICT :
    {
      "is_finished": boolean,
      "question": string | null
    }
    `
    : `
    Tu es un biographe professionnel interviewant ${userName}.
    Sujet en cours : "${topicLabel}" (${session.eras?.start_age || 0}-${session.eras?.end_age || "aujourd'hui"} ans)
    Objectif narratif : "${topicIntent}"

    CONTEXTE BIOGRAPHIQUE CONNU : "${profile.bio || "Néant"}"

    ═══════════════════════════════════════════════════════════════
    📊 PROGRESSION DE L'ÈRE : ${totalWords} mots / ${MIN_WORDS_PER_ERA} minimum (${progressPercent}%)
    ${hasReachedMinWords
      ? "✅ Objectif de mots atteint - tu peux envisager de conclure SI les sujets importants sont couverts."
      : "⚠️ Continue d'explorer - objectif de mots non atteint, NE TERMINE PAS encore cette ère."}
    ═══════════════════════════════════════════════════════════════

    ${suggestedTopics.length > 0 ? `
    📋 SUJETS IMPORTANTS À EXPLORER POUR CETTE PÉRIODE :
    ${suggestedTopics.map((t: any, i: number) => `${i + 1}. **${t.sujet}** : ${t.description}`).join('\n    ')}

    → Assure-toi d'avoir couvert PLUSIEURS de ces thèmes avant de terminer.
    → Si un sujet n'a pas été abordé dans l'historique, pose une question dessus.
    ` : ""}

    HISTORIQUE COMPLET DU SUJET :
    "${previousAnswers || "(Début de l'entretien)"}"

    TA MISSION :
    Analyse la dernière réponse pour déterminer la prochaine étape.

    ${hasSameTopic ? `
    ⚠️ ALERTE RÉPÉTITION : Les 2 dernières questions portaient sur le même sujet.
    → OBLIGATION : Pose une question sur UN ASPECT TOTALEMENT DIFFÉRENT de cette période de vie.
    → Regarde les sujets suggérés ci-dessus pour trouver un nouveau thème.
    ` : ""}

    1. **Critères de fin** (TOUS doivent être remplis) :
       - Tu as collecté AU MOINS ${MIN_WORDS_PER_ERA} mots (actuellement ${totalWords})
       - ET tu as couvert AU MOINS 3-4 des sujets suggérés ci-dessus
       - OU l'utilisateur demande explicitement de passer à la suite
       - OU l'utilisateur indique clairement n'avoir aucun souvenir de cette période
       ${!hasReachedMinWords ? `
       ⛔ IMPORTANT : L'objectif de mots n'est PAS atteint. NE TERMINE PAS cette ère.` : ""}

    2. **Si réponse vide/courte** :
       - Pose une question factuelle (Qui ? Où ? Quand ?).
       - Exemple : "Tu mentionnes ce lieu - qui était avec toi ?"

    3. **Si réponse factuelle mais surface** :
       - Creuse les événements précis, conséquences, dialogues.
       - Focus sur le "Comment" et "Pourquoi".

    4. **Règle anti-répétition** :
       - Si un sujet a reçu 2+ questions consécutives, PASSE À AUTRE CHOSE.
       - Utilise la liste des sujets suggérés pour varier les thèmes.

    INTERDICTIONS STRICTES :
    - NE pose JAMAIS de questions génériques ("raconte une anecdote").
    - NE pose JAMAIS de questions sur : [${redFlags.join(', ')}].
    - RESPECTE scrupuleusement les noms/lieux donnés.
    - NE TERMINE PAS l'ère avant d'avoir atteint ${MIN_WORDS_PER_ERA} mots (sauf demande explicite).

    RÈGLES DE FORMULATION :
    - Une seule question par tour, claire et directe.
    - Ai une tonalité empathique et engageante et simple, comme un vrai biographe.
    - ${isGettingLong && hasReachedMinWords ? "Le sujet s'étire et l'objectif est atteint. Tu peux poser une question de conclusion." : "Continue d'explorer les sujets suggérés."}
    - ${isStart ? "C'est le début. Pose une question d'ouverture simple sur le contexte de naissance ou les figures parentales." : ""}
    - ${isRegenerate ? "⚠️ L'utilisateur veut une question différente. Choisis un AUTRE sujet dans la liste des sujets suggérés." : ""}

    FORMAT DE SORTIE JSON STRICT :
    {
      "is_finished": boolean,
      "question": string | null
    }
  `;

  try {
    // 6. APPEL MISTRAL
    const userPrompt = isStart
      ? "Commence l'entretien."
      : isRegenerate
        ? "Pose une question sur UN AUTRE ASPECT du même thème (vie durant cette période). Ne répète pas la question précédente."
        : `Réponse auteur : "${userMessage}"`;

    const chatResponse = await mistral.chat.complete({
      model: 'mistral-large-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      responseFormat: { type: 'json_object' },
      temperature: 0.2, // Très bas pour respecter la logique V1
    });

    const rawContent = chatResponse.choices?.[0].message.content;
    
    // 7. Parsing JSON (Nettoyage sécurisé)
    let result;
    try {
      // Conversion explicite en string pour garantir que .trim() existe
      let clean = String(rawContent || "{}").trim();
      
      // Nettoyage manuel des blocs de code Markdown (sans Regex)
      if (clean.startsWith("```json")) {
        clean = clean.substring(7); // Retire ```json
      } else if (clean.startsWith("```")) {
        clean = clean.substring(3); // Retire ```
      }
      
      if (clean.endsWith("```")) {
        clean = clean.substring(0, clean.length - 3); // Retire ``` final
      }
      
      result = JSON.parse(clean.trim());
    } catch (e) {
      console.error("Erreur parsing JSON", rawContent);
      // Fallback : on considère tout le texte comme la question
      result = { is_finished: false, question: rawContent };
    }

    const aiQuestion = result.question || "Je n'ai pas bien compris, pouvez-vous reformuler ?";

    // 8. SAUVEGARDE ET RÉPONSE
    if (!result.is_finished) {
      await supabase.from('messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: aiQuestion
      });

      // 9. DÉCLENCHER L'ANALYSTE EN ARRIÈRE-PLAN (fire & forget)
      // Déclencher dès la première réponse utilisateur (pas au démarrage)
      if (!isStart && !isRegenerate) {
        // Ne pas attendre la réponse pour ne pas bloquer l'utilisateur
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003';

        // Récupérer les cookies de la requête pour les transmettre à l'Analyste
        const cookieHeader = req.headers.get('cookie') || '';

        fetch(`${baseUrl}/api/agents/analyst`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader, // Transmettre les cookies d'auth
          },
          body: JSON.stringify({ sessionId }),
        }).catch(err => console.error("❌ Erreur appel Analyste:", err));

        console.log("🔍 Analyste déclenché en arrière-plan pour session", sessionId);
      }
    } else {
        await supabase.from('chat_sessions').update({ status: 'completed' }).eq('id', sessionId);
    }

    // Logger l'usage API (succès)
    await logApiUsage(user.id, 'interviewer', true);

    return NextResponse.json({ reply: aiQuestion, isFinished: result.is_finished });

  } catch (error) {
    console.error("Erreur API:", error);

    // Logger l'échec
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      await logApiUsage(currentUser.id, 'interviewer', false, undefined, undefined, String(error));
    }

    return NextResponse.json({ error: "Erreur IA" }, { status: 500 });
  }
}