import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { Mistral } from '@mistralai/mistralai';

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

/**
 * AGENT WRITER
 * Appelé après l'Architecte
 * Lit le plan du livre (book_structure)
 * Génère les chapitres en HTML
 * Sauvegarde dans book_chapters
 */

export async function POST(req: NextRequest) {
  console.log("✍️ WRITER: Route appelée ! Début de la génération des chapitres");

  const supabase = await createClient();

  try {
    // 1. SÉCURITÉ
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    console.log("📖 Writer: Génération du livre pour user", user.id);

    // 2. RÉCUPÉRER LE PLAN DE L'ARCHITECTE
    const { data: bookStructureData } = await supabase
      .from('book_structure')
      .select('structure')
      .eq('user_id', user.id)
      .single();

    if (!bookStructureData || !bookStructureData.structure) {
      return NextResponse.json({
        error: "Le plan du livre n'existe pas. L'Architecte doit d'abord créer le plan.",
        hint: "Appelez /api/agents/architect avant le Writer"
      }, { status: 400 });
    }

    const plan = bookStructureData.structure;
    console.log(`📋 Plan récupéré: ${plan.chapters?.length || 0} chapitres à générer`);

    if (!plan.chapters || plan.chapters.length === 0) {
      return NextResponse.json({ error: "Le plan ne contient aucun chapitre" }, { status: 400 });
    }

    // 3. RÉCUPÉRER LE PROFIL UTILISATEUR (pour personnalisation)
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', user.id)
      .single();

    const userName = profile?.first_name || "l'auteur";

    // 4. SUPPRIMER LES ANCIENS CHAPITRES (si régénération)
    await supabase
      .from('book_chapters')
      .delete()
      .eq('user_id', user.id);

    console.log("🗑️ Anciens chapitres supprimés (si existants)");

    // 5. GÉNÉRER CHAQUE CHAPITRE
    const generatedChapters = [];

    for (let i = 0; i < plan.chapters.length; i++) {
      const chapterPlan = plan.chapters[i];

      console.log(`\n📝 Génération du chapitre ${i + 1}/${plan.chapters.length}: "${chapterPlan.title}"`);

      // Construire le prompt Writer pour ce chapitre
      const writerPrompt = `
Tu es un biographe littéraire professionnel. Tu dois rédiger un chapitre de livre autobiographique.

INFORMATIONS SUR L'AUTEUR :
Prénom : ${userName}

PLAN DU CHAPITRE :
Titre : "${chapterPlan.title}"
Période de vie : ${chapterPlan.age_range.start}-${chapterPlan.age_range.end} ans
Introduction narrative suggérée : "${chapterPlan.narrative_intro || 'Début du chapitre'}"

FAITS À INTÉGRER (par ordre chronologique) :
${chapterPlan.facts?.map((f: any, idx: number) => `
${idx + 1}. [À ${f.age} ans] ${f.content}
   Contexte original : ${f.original_context}
   Type : ${f.type}
`).join('\n') || 'Aucun fait spécifique'}

${chapterPlan.anachronisms_fixed?.length > 0 ? `
ANACHRONISMES CORRIGÉS PAR L'ARCHITECTE :
${chapterPlan.anachronisms_fixed.map((a: any) => `- ${a.fact} (déplacé de "${a.from_era}" vers "${a.to_era}") : ${a.reason}`).join('\n')}
` : ''}

TA MISSION :
Rédige un chapitre narratif de 500-800 mots qui raconte cette période de vie.

RÈGLES STRICTES :
1. **Style littéraire** : Fluide, engageant, personnel
2. **Narration** : 1ère personne ("Je me souviens...", "C'était...")
3. **Intégration des faits** : TOUS les faits listés doivent apparaître naturellement
4. **Exactitude** : Conserve EXACTEMENT les noms, lieux, dates donnés
5. **Structure** : 3-5 paragraphes cohérents avec transitions naturelles
6. **Chronologie** : Respecte l'ordre temporel des événements
7. **Authenticité** : Ton personnel et introspectif, pas de clichés biographiques
8. **Interdiction** : NE PAS inventer de détails non mentionnés dans les faits

STYLE D'ÉCRITURE :
- Phrases variées (courtes et longues)
- Utilise des détails sensoriels quand les faits le permettent
- Évite les formules creuses ("c'était une époque merveilleuse...")
- Préfère le concret à l'abstrait
- Transitions fluides entre événements

FORMAT DE SORTIE JSON STRICT :
{
  "content": "<p>Contenu HTML formaté avec balises <strong>, <em>, etc.</p><p>Deuxième paragraphe...</p>",
  "word_count": 750,
  "style_notes": "Brèves notes sur les choix narratifs effectués"
}

IMPORTANT :
- Le HTML doit être valide et propre
- Utilise <p> pour les paragraphes
- Utilise <strong> pour mettre en valeur (noms, lieux importants)
- Utilise <em> pour les pensées ou émotions
- PAS de <h1>, <h2> dans le contenu (le titre est géré séparément)
`;

      // Appel à Mistral Large pour générer le chapitre
      const response = await mistral.chat.complete({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: writerPrompt }],
        responseFormat: { type: 'json_object' },
        temperature: 0.4, // Un peu plus créatif que l'Architecte, mais contrôlé
      });

      const rawContent = response.choices?.[0].message.content;

      let chapterData;
      try {
        let clean = String(rawContent || "{}").trim();
        if (clean.startsWith("```json")) clean = clean.substring(7);
        if (clean.startsWith("```")) clean = clean.substring(3);
        if (clean.endsWith("```")) clean = clean.substring(0, clean.length - 3);
        chapterData = JSON.parse(clean.trim());
      } catch (e) {
        console.error("❌ Erreur parsing JSON Writer pour chapitre", i + 1, ":", rawContent);
        chapterData = {
          content: "<p>Erreur de génération du chapitre</p>",
          word_count: 0
        };
      }

      console.log(`✅ Chapitre généré: ${chapterData.word_count} mots`);

      // 6. SAUVEGARDER LE CHAPITRE
      const { error: insertError } = await supabase
        .from('book_chapters')
        .insert({
          user_id: user.id,
          era_id: chapterPlan.original_era_ids?.[0] || null, // Référence à la première ère originale
          chapter_order: chapterPlan.order,
          title: chapterPlan.title,
          content: chapterData.content
        });

      if (insertError) {
        console.error("❌ Erreur insertion chapitre:", insertError);
      } else {
        console.log(`💾 Chapitre ${chapterPlan.order} sauvegardé`);
        generatedChapters.push({
          order: chapterPlan.order,
          title: chapterPlan.title,
          word_count: chapterData.word_count
        });
      }
    }

    console.log(`\n🎉 Génération terminée: ${generatedChapters.length} chapitres créés`);

    return NextResponse.json({
      success: true,
      chapters_count: generatedChapters.length,
      chapters: generatedChapters,
      message: "Livre généré avec succès par le Writer"
    });

  } catch (error) {
    console.error('❌ Erreur Writer:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du livre', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
