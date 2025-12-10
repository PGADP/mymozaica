import { createClient } from "@/utils/supabase/server";
import { Mistral } from '@mistralai/mistralai';
import { NextResponse } from 'next/server';

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function POST(req: Request) {
  const supabase = await createClient();
  
  // 1. SÉCURITÉ
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { sessionId, userMessage } = await req.json();

  // 2. CONTEXTE (Session + Era + Profil + RedFlags)
  const { data: session } = await supabase
    .from('chat_sessions')
    .select(`
      *,
      eras (label, description, start_age, end_age),
      profiles:user_id (first_name, bio, red_flags)
    `)
    .eq('id', sessionId)
    .single();

  if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  // 3. HISTORIQUE
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  const messagesCount = history?.length || 0;
  const isGettingLong = messagesCount > 15;
  const isStart = userMessage === "START_SESSION_HIDDEN_PROMPT" || messagesCount === 0;
  const isRegenerate = userMessage === "REGENERATE_QUESTION_SAME_THEME";

  // 4. PRÉPARATION DU PROMPT
  const profile = session.profiles || {};
  const userName = profile.first_name || "l'auteur";
  const topicLabel = session.eras.label;
  const topicIntent = session.eras.description;
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
  const systemPrompt = `
    Tu es un biographe professionnel interviewant ${userName}.
    Sujet en cours : "${topicLabel}" (${session.eras.start_age}-${session.eras.end_age || "aujourd'hui"} ans)
    Objectif narratif : "${topicIntent}"

    CONTEXTE BIOGRAPHIQUE CONNU : "${profile.bio || "Néant"}"

    HISTORIQUE COMPLET DU SUJET :
    "${previousAnswers || "(Début de l'entretien)"}"

    TA MISSION :
    Analyse la dernière réponse pour déterminer la prochaine étape.

    ${hasSameTopic ? `
    ⚠️ ALERTE RÉPÉTITION : Les 2 dernières questions portaient sur le même sujet.
    → OBLIGATION : Pose une question sur UN ASPECT TOTALEMENT DIFFÉRENT de cette période de vie.
    → Ne reviens PAS sur ce qui vient d'être discuté.
    ` : ""}

    1. **Critères de fin** :
       - Si les points clés sont couverts avec détails factuels OU si l'utilisateur tourne en rond.
       - DÉCIDE DE FINIR (is_finished: true).

    2. **Si réponse vide/courte** :
       - Pose une question factuelle (Qui ? Où ? Quand ?).
       - Exemple : "Tu mentionnes ce lieu - qui était avec toi ?"

    3. **Si réponse factuelle mais surface** :
       - Creuse les événements précis, conséquences, dialogues.
       - Focus sur le "Comment" et "Pourquoi".

    4. **Règle anti-répétition** :
       - Si un sujet a reçu 2+ questions consécutives, PASSE À AUTRE CHOSE.
       - Privilégie : relations, lieux de vie, activités, moments marquants différents.

    INTERDICTIONS STRICTES :
    - NE pose JAMAIS de questions génériques ("raconte une anecdote").
    - NE pose JAMAIS de questions sur : [${redFlags.join(', ')}].
    - RESPECTE scrupuleusement les noms/lieux donnés.

    RÈGLES DE FORMULATION :
    - Une seule question par tour, claire et directe.
    - Reprends EXACTEMENT les faits de la dernière réponse.
    - ${isGettingLong ? "⚠️ Le sujet s'étire. Pose une question de conclusion." : "Explore en profondeur."}
    - ${isStart ? "C'est le début. Pose une question d'ouverture simple sur le début de cette période." : ""}
    - ${isRegenerate ? "⚠️ L'utilisateur veut une question différente. Pose une question sur UN AUTRE ASPECT du même thème, sans répéter la question précédente." : ""}

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
        fetch(`${baseUrl}/api/agents/analyst`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        }).catch(err => console.error("❌ Erreur appel Analyste:", err));

        console.log("🔍 Analyste déclenché en arrière-plan pour session", sessionId);
      }
    } else {
        await supabase.from('chat_sessions').update({ status: 'completed' }).eq('id', sessionId);
    }

    return NextResponse.json({ reply: aiQuestion, isFinished: result.is_finished });

  } catch (error) {
    console.error("Erreur API:", error);
    return NextResponse.json({ error: "Erreur IA" }, { status: 500 });
  }
}