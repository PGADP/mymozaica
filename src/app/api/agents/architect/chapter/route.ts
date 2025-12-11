import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { Mistral } from '@mistralai/mistralai';

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

/**
 * AGENT ARCHITECTE CHAPITRE
 * Appelé pour CHAQUE chapitre séquentiellement
 * Crée un brief détaillé pour le Writer
 * Input: plan global + chapitres précédents
 * Output: Brief avec instructions narratives, faits, transitions
 */

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  try {
    // 1. SÉCURITÉ
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. RÉCUPÉRER LES PARAMÈTRES
    const { chapterOrder } = await req.json();

    if (!chapterOrder || chapterOrder < 1) {
      return NextResponse.json({ error: "chapterOrder invalide" }, { status: 400 });
    }

    console.log(`\n📐 ARCHITECTE CHAPITRE ${chapterOrder}: Création du brief`);

    // 3. RÉCUPÉRER LE PLAN GLOBAL
    const { data: bookStructure } = await supabase
      .from('book_structure')
      .select('global_plan, chapter_briefs')
      .eq('user_id', user.id)
      .single();

    if (!bookStructure || !bookStructure.global_plan) {
      return NextResponse.json({
        error: "Plan global introuvable. L'Architecte global doit être appelé d'abord."
      }, { status: 400 });
    }

    const globalPlan = bookStructure.global_plan;
    const chapterOutline = globalPlan.chapters_outline.find((ch: any) => ch.order === chapterOrder);

    if (!chapterOutline) {
      return NextResponse.json({ error: `Chapitre ${chapterOrder} non trouvé dans le plan` }, { status: 404 });
    }

    console.log(`📖 Chapitre: "${chapterOutline.title_suggestion}" (${chapterOutline.age_range.start}-${chapterOutline.age_range.end} ans)`);

    // 4. RÉCUPÉRER LES FAITS DE CE CHAPITRE
    // D'abord, trouver les sessions correspondant aux ères du chapitre
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select('id, era_id')
      .eq('user_id', user.id)
      .in('era_id', chapterOutline.original_era_ids || []);

    const sessionIds = sessions?.map(s => s.id) || [];

    // Ensuite, récupérer les faits de ces sessions
    let facts: any[] = [];
    if (sessionIds.length > 0) {
      const { data: factsData } = await supabase
        .from('user_facts')
        .select('*')
        .in('session_id', sessionIds);
      facts = factsData || [];
    }

    console.log(`📊 ${facts.length} faits pour ce chapitre (${sessionIds.length} sessions)`);

    // 5. RÉCUPÉRER LES CHAPITRES PRÉCÉDENTS (pour continuité)
    const { data: previousChapters } = await supabase
      .from('book_chapters')
      .select('chapter_order, title, content')
      .eq('user_id', user.id)
      .lt('chapter_order', chapterOrder)
      .order('chapter_order', { ascending: true });

    const lastChapter = previousChapters?.[previousChapters.length - 1];
    console.log(`📚 ${previousChapters?.length || 0} chapitres précédents`);

    // 6. PROMPT ARCHITECTE CHAPITRE
    const architectChapterPrompt = `
Tu es l'architecte détaillé du chapitre ${chapterOrder} d'un livre biographique.

PLAN GLOBAL DU LIVRE :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Arc narratif : ${globalPlan.arc_narratif}

Thèmes majeurs : ${globalPlan.themes_majeurs.join(', ')}

Ton général : ${globalPlan.tone_general}

Tous les chapitres du livre :
${globalPlan.chapters_outline.map((ch: any) => `  ${ch.order}. "${ch.title_suggestion}" (${ch.age_range.start}-${ch.age_range.end} ans)`).join('\n')}

CHAPITRE PRÉCÉDENT (pour continuité) :
${lastChapter ? `
Chapitre ${lastChapter.chapter_order}: "${lastChapter.title}"

Derniers paragraphes :
${lastChapter.content.slice(-500)}
` : '(Pas de chapitre précédent, c\'est le premier)'}

CHAPITRE ${chapterOrder} À PLANIFIER :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Titre suggéré : "${chapterOutline.title_suggestion}"
Âge : ${chapterOutline.age_range.start}-${chapterOutline.age_range.end} ans
Objectif narratif : ${chapterOutline.narrative_goal}
Thèmes clés : ${chapterOutline.key_themes.join(', ')}

TRANSITION PRÉVUE DEPUIS LE CHAPITRE PRÉCÉDENT :
${globalPlan.transitions_map[`${chapterOrder - 1}_to_${chapterOrder}`] || 'Transition naturelle'}

TRANSITION VERS LE CHAPITRE SUIVANT :
${globalPlan.transitions_map[`${chapterOrder}_to_${chapterOrder + 1}`] || 'Transition à définir'}

FAITS À INTÉGRER (${facts?.length || 0} faits) :
${facts?.map((f: any) => `  • [${f.fact_type}] ${f.fact_value}
    Contexte : ${f.fact_context}`).join('\n\n') || 'Aucun fait spécifique'}

TA MISSION :
Crée un BRIEF DÉTAILLÉ pour le Writer qui va rédiger ce chapitre.

Le brief doit permettre au Writer de :
1. Comprendre exactement ce qu'il doit écrire
2. Assurer la continuité narrative avec le chapitre précédent
3. Intégrer TOUS les faits listés
4. Préparer la transition vers le chapitre suivant
5. Respecter le ton et les thèmes du livre

INSTRUCTIONS À INCLURE DANS LE BRIEF :

1. **TRANSITION D'ENTRÉE** :
   - Comment démarrer ce chapitre après le précédent ?
   - Quelle phrase ou idée de liaison ?

2. **STRUCTURE NARRATIVE** :
   - Comment organiser les faits ?
   - Quel ordre chronologique ou thématique ?
   - Combien de paragraphes ?

3. **TON & STYLE** :
   - Quel ton pour ce chapitre spécifique ?
   - Phrases courtes/longues ?
   - Introspectif ? Descriptif ? Émotionnel ?

4. **FAITS OBLIGATOIRES** :
   - Liste TOUS les faits à intégrer
   - Suggère comment les intégrer naturellement

5. **TRANSITION DE SORTIE** :
   - Comment finir ce chapitre ?
   - Quelle ouverture vers le suivant ?

RÈGLES :
- Ne RÉDIGE PAS le chapitre (c'est le rôle du Writer)
- Fournis des INSTRUCTIONS PRÉCISES
- Assure la CONTINUITÉ narrative
- Respecte le PLAN GLOBAL

FORMAT DE SORTIE JSON :
{
  "title": "${chapterOutline.title_suggestion}",
  "age_range": {"start": ${chapterOutline.age_range.start}, "end": ${chapterOutline.age_range.end}},
  "narrative_instructions": "Instructions détaillées pour le Writer en 3-5 phrases",
  "transition_in": "Phrase ou idée de transition depuis le chapitre précédent",
  "transition_out": "Phrase ou idée de transition vers le chapitre suivant",
  "structure_suggestion": {
    "paragraph_count": 4-6,
    "organization": "chronologique|thématique|émotionnelle",
    "focus_points": ["point 1", "point 2"]
  },
  "style_notes": "Notes de style spécifiques: ton, rythme, longueur des phrases",
  "facts_to_integrate": [
    {
      "fact_id": "uuid",
      "type": "personne|lieu|...",
      "value": "valeur",
      "context": "contexte",
      "integration_suggestion": "Comment intégrer ce fait dans le récit"
    }
  ],
  "target_length": "600-800 mots|800-1000 mots",
  "emotional_tone": "nostalgique|mélancolique|joyeux|introspectif"
}

MAINTENANT, CRÉE LE BRIEF POUR LE CHAPITRE ${chapterOrder}.
`;

    // 7. APPEL MISTRAL LARGE
    console.log("📤 Envoi à Mistral Large pour brief du chapitre...");

    const response = await mistral.chat.complete({
      model: 'mistral-large-latest',
      messages: [{ role: 'user', content: architectChapterPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.3, // Un peu plus créatif que l'Architecte global
    });

    const rawContent = response.choices?.[0].message.content;
    console.log("📥 Brief reçu (150 premiers caractères):", String(rawContent).substring(0, 150));

    let brief;
    try {
      let clean = String(rawContent || "{}").trim();
      if (clean.startsWith("```json")) clean = clean.substring(7);
      if (clean.startsWith("```")) clean = clean.substring(3);
      if (clean.endsWith("```")) clean = clean.substring(0, clean.length - 3);
      brief = JSON.parse(clean.trim());
    } catch (e) {
      console.error("❌ Erreur parsing JSON:", rawContent);
      return NextResponse.json({ error: "Erreur de parsing du brief" }, { status: 500 });
    }

    console.log("✅ Brief créé:", brief.facts_to_integrate?.length, "faits à intégrer");

    // 8. SAUVEGARDER LE BRIEF
    const existingBriefs = bookStructure.chapter_briefs || [];
    const updatedBriefs = [
      ...existingBriefs,
      {
        chapter_order: chapterOrder,
        brief: brief
      }
    ];

    const { error: updateError } = await supabase
      .from('book_structure')
      .update({
        chapter_briefs: updatedBriefs
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error("❌ Erreur sauvegarde brief:", updateError);
      return NextResponse.json({ error: "Erreur sauvegarde" }, { status: 500 });
    }

    console.log(`💾 Brief du chapitre ${chapterOrder} sauvegardé`);

    return NextResponse.json({
      success: true,
      chapter_order: chapterOrder,
      brief: brief
    });

  } catch (error) {
    console.error('❌ Erreur Architecte Chapitre:', error);
    return NextResponse.json(
      { error: 'Erreur création brief', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
