import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { Mistral } from '@mistralai/mistralai';

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

/**
 * AGENT ANALYST
 * Appelé en arrière-plan après chaque échange
 * Extrait : Faits, Lieux, Noms, Dates
 * Met à jour : current_summary, topic_density
 */

export async function POST(req: NextRequest) {
  console.log("🚨 ANALYSTE: Route appelée ! Début de l'endpoint");

  const supabase = await createClient();

  try {
    const { sessionId } = await req.json();

    console.log("🔍 Analyste: Démarrage de l'analyse pour session", sessionId);

    // 1. RÉCUPÉRER LA SESSION ET LES MESSAGES
    const { data: session } = await supabase
      .from('chat_sessions')
      .select(`
        *,
        eras (label, description, start_age, end_age)
      `)
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
    }

    // 2. RÉCUPÉRER LES DERNIERS MESSAGES (uniquement utilisateur, pas système)
    const { data: messages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(5); // Analyser les 5 dernières réponses utilisateur

    if (!messages || messages.length === 0) {
      return NextResponse.json({ message: "Aucun message à analyser" });
    }

    const conversationText = messages.reverse().map(m => m.content).join('\n\n');

    // 3. PROMPT ANALYSTE - EXTRACTION DE FAITS (VERSION OPTIMISÉE)
    const extractionPrompt = `
Tu es un analyste biographique expert spécialisé dans l'extraction structurée de données factuelles.

CONTEXTE DE L'ANALYSE :
Ère : "${session.eras.label}" (${session.eras.start_age}-${session.eras.end_age} ans)
Description : ${session.eras.description}

TEXTE À ANALYSER (5 dernières réponses utilisateur) :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${conversationText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TA MISSION :
Extrais et catégorise TOUS les faits vérifiables mentionnés dans le texte.

TYPES DE FAITS À EXTRAIRE :

1. **PERSONNES** (type: "personne")
   - Noms complets et prénoms
   - Relations (mère, père, ami, collègue, professeur, etc.)
   - Rôle dans la vie de l'auteur
   Exemple : { "type": "personne", "value": "Marie Dupont", "context": "Mère, professeur de français" }

2. **LIEUX** (type: "lieu")
   - Villes, quartiers, pays
   - Adresses précises si mentionnées
   - Lieux significatifs (écoles, maisons, entreprises)
   Exemple : { "type": "lieu", "value": "Lycée Victor Hugo, Paris 16e", "context": "Établissement scolaire" }

3. **DATES & PÉRIODES** (type: "date")
   - Années précises (1985, 2010)
   - Âges mentionnés ("à 7 ans", "vers 15 ans")
   - Durées ("pendant 3 ans", "de 2005 à 2008")
   Exemple : { "type": "date", "value": "Été 1992", "context": "Premier voyage en Italie" }

4. **ÉVÉNEMENTS MAJEURS** (type: "evenement")
   - Déménagements, voyages
   - Changements de vie (départ du foyer, nouveau travail)
   - Moments marquants (accident, rencontre importante)
   Exemple : { "type": "evenement", "value": "Déménagement à Lyon", "context": "Quitter la maison familiale à 17 ans" }

5. **ACTIVITÉS & OCCUPATIONS** (type: "activite")
   - Hobbies, sports, passions
   - Études, formations
   - Emplois, métiers
   Exemple : { "type": "activite", "value": "Piano classique", "context": "Pratique hebdomadaire au conservatoire, 8-14 ans" }

6. **OBJETS & POSSESSIONS SIGNIFICATIFS** (type: "objet")
   - Objets marquants (vélo, voiture, instrument)
   - Possessions importantes
   Exemple : { "type": "objet", "value": "Vélo rouge Peugeot", "context": "Cadeau de Tonton Nené, volé en 2019" }

7. **ÉMOTIONS & RESSENTIS** (type: "emotion")
   - États émotionnels mentionnés explicitement
   - Sentiments associés à des événements
   Exemple : { "type": "emotion", "value": "Sentiment de solitude", "context": "Première année en studio à Nîmes, loin de la famille" }

8. **RELATIONS & DYNAMIQUES** (type: "relation")
   - Nature des relations (conflictuelle, fusionnelle, distante)
   - Évolution des relations
   Exemple : { "type": "relation", "value": "Relation compliquée avec le père", "context": "Pression pour choisir des études scientifiques" }

RÈGLES STRICTES D'EXTRACTION :

✅ À FAIRE :
- Extrais CHAQUE fait mentionné, même mineur
- Conserve l'orthographe EXACTE des noms propres
- Note l'âge ou la période si mentionnée
- Capture le contexte émotionnel quand présent
- Sépare les faits multiples (1 fait = 1 entrée JSON)
- Sois EXHAUSTIF : ne saute aucun détail

❌ À NE PAS FAIRE :
- N'invente RIEN qui n'est pas dans le texte
- Ne généralise pas ("il aimait le sport" → extrais le sport précis)
- Ne fusionne pas plusieurs faits en un seul
- N'ajoute pas d'interprétation personnelle

QUALITÉ DE L'EXTRACTION :
Ton objectif est d'extraire 100% des faits mentionnés pour permettre une reconstruction narrative complète.
Un bon travail d'extraction doit contenir :
- 5-15 faits pour une réponse riche
- 2-5 faits pour une réponse courte
- 0 fait si vraiment aucune information factuelle

FORMAT DE SORTIE JSON :
{
  "facts": [
    {
      "type": "personne|lieu|date|evenement|activite|objet|emotion|relation",
      "value": "Valeur exacte extraite du texte",
      "context": "Contexte précis (quoi, quand, pourquoi, lien avec l'auteur)"
    }
  ],
  "summary": "Synthèse narrative en 2-3 phrases de ce qui a été raconté",
  "density_score": 0.0 à 1.0,
  "extraction_notes": "Notes sur la qualité de l'extraction (optionnel)"
}

CALCUL DU DENSITY_SCORE (0-1) :
- 0.0-0.2 : Réponses très vagues, presque aucun fait concret
- 0.3-0.4 : Quelques faits généraux, peu de noms/dates
- 0.5-0.6 : Faits présents, mais manque de précision
- 0.7-0.8 : Riche en détails (noms complets, lieux précis, dates)
- 0.9-1.0 : Extrêmement détaillé, anecdotes complètes avec contexte émotionnel

EXEMPLE DE BONNE EXTRACTION :

Texte : "J'habitais avenue Jean Jaurès à Nîmes dans un studio de 16m². Jordan Giner me conduisait à l'IUT avec sa Peugeot 206 grise. Je mangeais au Crous pour 3€."

Extraction attendue :
{
  "facts": [
    { "type": "lieu", "value": "Avenue Jean Jaurès, Nîmes", "context": "Adresse du studio étudiant, première année IUT" },
    { "type": "lieu", "value": "Studio 16m²", "context": "Logement étudiant exigu, première année d'autonomie" },
    { "type": "personne", "value": "Jordan Giner", "context": "Ami de l'IUT, covoiturage quotidien" },
    { "type": "objet", "value": "Peugeot 206 grise", "context": "Voiture de Jordan, utilisée pour aller à l'IUT" },
    { "type": "lieu", "value": "IUT Nîmes", "context": "Lieu d'études, sciences et génie des matériaux" },
    { "type": "lieu", "value": "Crous", "context": "Cafétéria étudiante, repas quotidiens" },
    { "type": "activite", "value": "Repas au Crous", "context": "Routine alimentaire, repas à 3€" }
  ],
  "summary": "Première année d'études à Nîmes dans un petit studio. Covoiturage quotidien avec Jordan pour aller à l'IUT. Budget étudiant serré avec repas au Crous.",
  "density_score": 0.8
}

MAINTENANT, EXTRAIS LES FAITS DU TEXTE CI-DESSUS.
`;

    // 4. APPEL MISTRAL
    console.log("📤 Envoi à Mistral pour extraction...");

    const response = await mistral.chat.complete({
      model: 'mistral-small-latest', // Plus économique pour l'extraction
      messages: [{ role: 'user', content: extractionPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.1, // Très bas pour rester factuel
    });

    const rawContent = response.choices?.[0].message.content;
    console.log("📥 Réponse brute Mistral reçue (100 premiers caractères):", String(rawContent).substring(0, 100));

    let extracted;

    try {
      let clean = String(rawContent || "{}").trim();
      if (clean.startsWith("```json")) clean = clean.substring(7);
      if (clean.startsWith("```")) clean = clean.substring(3);
      if (clean.endsWith("```")) clean = clean.substring(0, clean.length - 3);
      extracted = JSON.parse(clean.trim());
    } catch (e) {
      console.error("❌ Erreur parsing JSON Analyste:", rawContent);
      extracted = { facts: [], summary: "", density_score: 0 };
    }

    console.log("✅ Extraction réussie:", extracted.facts.length, "faits trouvés");

    // 5. SAUVEGARDER LES FAITS DANS LA TABLE user_facts
    if (extracted.facts && extracted.facts.length > 0) {
      const factsToInsert = extracted.facts.map((fact: any) => ({
        user_id: session.user_id,
        session_id: sessionId,
        era_id: session.era_id,
        fact_type: fact.type || 'autre',
        fact_value: fact.value || '',
        fact_context: fact.context || '',
      }));

      const { error: factsError } = await supabase
        .from('user_facts')
        .insert(factsToInsert);

      if (factsError) {
        console.error("❌ Erreur insertion facts:", factsError);
      } else {
        console.log("💾 Sauvegarde de", factsToInsert.length, "faits dans user_facts");
      }
    }

    // 6. METTRE À JOUR LE RÉSUMÉ ET LA DENSITÉ
    const currentSummary = session.current_summary || '';
    const newSummary = currentSummary
      ? `${currentSummary}\n${extracted.summary || ''}`
      : extracted.summary || 'Début du chapitre';

    // Moyenne de densité (mix ancien + nouveau)
    const oldDensity = session.topic_density || 0;
    const newDensity = extracted.density_score || 0;
    const avgDensity = messages.length > 5 ? (oldDensity * 0.7 + newDensity * 0.3) : newDensity;

    const { error: updateError } = await supabase
      .from('chat_sessions')
      .update({
        current_summary: newSummary,
        topic_density: Math.min(1, avgDensity), // Cap à 1
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error("❌ Erreur mise à jour session:", updateError);
    } else {
      console.log("📝 Mise à jour résumé et densité:", avgDensity.toFixed(2));
    }

    // 7. METTRE À JOUR LE WHISPER_CONTEXT AVEC LES NOUVEAUX NOMS
    const personnes = extracted.facts
      .filter((f: any) => f.type === 'personne')
      .map((f: any) => f.value);

    const lieux = extracted.facts
      .filter((f: any) => f.type === 'lieu')
      .map((f: any) => f.value);

    if (personnes.length > 0 || lieux.length > 0) {
      // Récupérer le whisper_context actuel
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('whisper_context')
        .eq('id', session.user_id)
        .single();

      const currentContext = currentProfile?.whisper_context || '';

      // Combiner avec les nouveaux noms (sans doublons)
      const existingNames = currentContext.split(',').map(n => n.trim()).filter(Boolean);
      const newNames = [...personnes, ...lieux];
      const allNames = [...new Set([...existingNames, ...newNames])];

      // Limiter à 200 caractères (limite Whisper)
      let updatedContext = allNames.join(', ');
      if (updatedContext.length > 200) {
        // Garder seulement les plus récents
        updatedContext = allNames.slice(-10).join(', ');
      }

      // Mettre à jour le profil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ whisper_context: updatedContext })
        .eq('id', session.user_id);

      if (profileError) {
        console.error("❌ Erreur mise à jour whisper_context:", profileError);
      } else {
        console.log("🎤 Whisper context mis à jour:", updatedContext);
      }
    }

    return NextResponse.json({
      success: true,
      facts_count: extracted.facts.length,
      density: avgDensity,
      summary_updated: true,
    });

  } catch (error) {
    console.error('❌ Erreur Analyst:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
