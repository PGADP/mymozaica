import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { Mistral } from '@mistralai/mistralai';
import { randomUUID } from 'crypto';

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

/**
 * AGENT WRITER CHAPITRE
 * Appelé pour CHAQUE chapitre séquentiellement
 * Rédige le chapitre en suivant le brief de l'Architecte
 * Input: brief + chapitres précédents
 * Output: Chapitre rédigé en HTML
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

    console.log(`\n✍️ WRITER CHAPITRE ${chapterOrder}: Début de la rédaction`);

    // 3. RÉCUPÉRER LE BRIEF DE L'ARCHITECTE
    const { data: bookStructure } = await supabase
      .from('book_structure')
      .select('global_plan, chapter_briefs')
      .eq('user_id', user.id)
      .single();

    if (!bookStructure || !bookStructure.chapter_briefs) {
      return NextResponse.json({
        error: "Brief introuvable. L'Architecte chapitre doit être appelé d'abord."
      }, { status: 400 });
    }

    const brief = bookStructure.chapter_briefs.find((b: any) => b.chapter_order === chapterOrder)?.brief;

    if (!brief) {
      return NextResponse.json({ error: `Brief du chapitre ${chapterOrder} non trouvé` }, { status: 404 });
    }

    const globalPlan = bookStructure.global_plan;
    console.log(`📋 Brief récupéré: "${brief.title}"`);

    // 4. RÉCUPÉRER LES CHAPITRES PRÉCÉDENTS (pour continuité stylistique)
    const { data: previousChapters } = await supabase
      .from('book_chapters')
      .select('chapter_order, title, content')
      .eq('user_id', user.id)
      .lt('chapter_order', chapterOrder)
      .order('chapter_order', { ascending: true });

    const lastChapter = previousChapters?.[previousChapters.length - 1];
    console.log(`📚 ${previousChapters?.length || 0} chapitres précédents à considérer`);

    // 5. PROMPT WRITER CHAPITRE
    const writerChapterPrompt = `
Tu es un biographe littéraire professionnel spécialisé dans l'écriture de récits autobiographiques.

PLAN GLOBAL DU LIVRE :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Arc narratif : ${globalPlan.arc_narratif}
Ton général : ${globalPlan.tone_general}
Thèmes majeurs : ${globalPlan.themes_majeurs.join(', ')}

CHAPITRE PRÉCÉDENT (pour continuité stylistique) :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${lastChapter ? `
Chapitre ${lastChapter.chapter_order}: "${lastChapter.title}"

Derniers paragraphes (pour assurer la transition) :
${lastChapter.content.slice(-800)}
` : '(Pas de chapitre précédent, c\'est le premier chapitre du livre)'}

BRIEF DE L'ARCHITECTE POUR CE CHAPITRE :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Titre : "${brief.title}"
Âge : ${brief.age_range.start}-${brief.age_range.end} ans

INSTRUCTIONS NARRATIVES :
${brief.narrative_instructions}

TRANSITION D'ENTRÉE :
${brief.transition_in || 'Transition naturelle depuis le chapitre précédent'}

TRANSITION DE SORTIE :
${brief.transition_out || 'Transition naturelle vers le chapitre suivant'}

NOTES DE STYLE :
${brief.style_notes}

TON ÉMOTIONNEL :
${brief.emotional_tone}

FAITS OBLIGATOIRES À INTÉGRER (${brief.facts_to_integrate?.length || 0} faits) :
${brief.facts_to_integrate?.map((f: any, i: number) => `
${i + 1}. [${f.type}] ${f.value}
   Contexte : ${f.context}
   Comment l'intégrer : ${f.integration_suggestion}
`).join('\n') || 'Aucun fait spécifique'}

STRUCTURE SUGGÉRÉE :
- Organisation : ${brief.structure_suggestion?.organization || 'chronologique'}
- Nombre de paragraphes : ${brief.structure_suggestion?.paragraph_count || '4-6'}
- Points de focus : ${brief.structure_suggestion?.focus_points?.join(', ') || 'N/A'}

LONGUEUR CIBLE : ${brief.target_length || '600-800 mots'}

TA MISSION :
Rédige le chapitre ${chapterOrder} en RESPECTANT SCRUPULEUSEMENT le brief ci-dessus.

RÈGLES STRICTES DE RÉDACTION :

1. **CONTINUITÉ NARRATIVE** :
   - Si c'est le 1er chapitre : Commence de manière engageante
   - Si ce n'est PAS le 1er : Reprends EXACTEMENT le fil narratif du chapitre précédent
   - Utilise la transition_in suggérée par l'Architecte
   - Termine avec la transition_out pour préparer le chapitre suivant

2. **STYLE COHÉRENT** :
   - 1ère personne ("Je", "J'étais", "Je me souviens")
   - Conserve le même STYLE que les chapitres précédents (phrases, rythme, ton)
   - Respecte le ton émotionnel spécifié

3. **FAITS OBLIGATOIRES** :
   - TOUS les faits listés DOIVENT apparaître dans le texte
   - Intègre-les naturellement selon les suggestions de l'Architecte
   - Respecte EXACTEMENT les noms, lieux, dates donnés

4. **QUALITÉ LITTÉRAIRE** :
   - Phrases variées (courtes pour l'impact, longues pour la description)
   - Détails sensoriels quand pertinent (sons, odeurs, sensations)
   - Dialogues intérieurs ou citations directes si approprié
   - Évite les clichés et les formulations génériques

5. **STRUCTURE** :
   - Respecte l'organisation suggérée (chronologique/thématique/émotionnelle)
   - Transitions fluides entre paragraphes
   - Chaque paragraphe développe un point précis

INTERDICTIONS STRICTES :
❌ Ne JAMAIS inventer des faits (personnes, lieux, événements non mentionnés)
❌ Ne JAMAIS modifier les noms, prénoms, lieux donnés
❌ Ne JAMAIS ignorer un fait du brief
❌ Ne JAMAIS rompre la continuité avec le chapitre précédent

FORMAT DE SORTIE JSON :
{
  "content": "<p>HTML formaté avec balises <strong>, <em> si nécessaire</p>",
  "word_count": nombre_de_mots,
  "facts_integrated_count": nombre_de_faits_intégrés
}

IMPORTANT :
- Le contenu doit être en HTML avec balises <p> pour chaque paragraphe
- Utilise <strong> pour emphases importantes, <em> pour nuances
- Compte bien tous les mots et faits pour le JSON de sortie

MAINTENANT, RÉDIGE LE CHAPITRE ${chapterOrder}.
`;

    // 6. APPEL MISTRAL LARGE
    console.log("📤 Envoi à Mistral Large pour rédaction du chapitre...");

    const response = await mistral.chat.complete({
      model: 'mistral-large-latest',
      messages: [{ role: 'user', content: writerChapterPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.4, // Un peu créatif pour la rédaction
    });

    const rawContent = response.choices?.[0].message.content;
    console.log("📥 Chapitre reçu (150 premiers caractères):", String(rawContent).substring(0, 150));

    let chapter;
    try {
      let clean = String(rawContent || "{}").trim();
      if (clean.startsWith("```json")) clean = clean.substring(7);
      if (clean.startsWith("```")) clean = clean.substring(3);
      if (clean.endsWith("```")) clean = clean.substring(0, clean.length - 3);
      chapter = JSON.parse(clean.trim());
    } catch (e) {
      console.error("❌ Erreur parsing JSON:", rawContent);
      return NextResponse.json({ error: "Erreur de parsing du chapitre" }, { status: 500 });
    }

    console.log(`✅ Chapitre rédigé: ${chapter.word_count} mots, ${chapter.facts_integrated_count} faits intégrés`);

    // 7. SAUVEGARDER LE CHAPITRE
    const { error: insertError } = await supabase
      .from('book_chapters')
      .insert({
        id: randomUUID(),
        user_id: user.id,
        chapter_order: chapterOrder,
        title: brief.title,
        content: chapter.content
      });

    if (insertError) {
      console.error("❌ Erreur sauvegarde chapitre:", insertError);
      return NextResponse.json({ error: "Erreur sauvegarde" }, { status: 500 });
    }

    console.log(`💾 Chapitre ${chapterOrder} sauvegardé dans book_chapters`);

    return NextResponse.json({
      success: true,
      chapter_order: chapterOrder,
      chapter: {
        title: brief.title,
        content: chapter.content,
        word_count: chapter.word_count,
        facts_integrated_count: chapter.facts_integrated_count
      }
    });

  } catch (error) {
    console.error('❌ Erreur Writer Chapitre:', error);
    return NextResponse.json(
      { error: 'Erreur rédaction chapitre', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
