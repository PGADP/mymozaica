import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { Mistral } from '@mistralai/mistralai';

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

/**
 * AGENT ARCHITECTE
 * Appelé quand toutes les ères sont complétées
 * Réorganise chronologiquement tous les faits
 * Détecte et corrige les anachronismes
 * Crée le plan du livre (book_structure)
 */

export async function POST(req: NextRequest) {
  console.log("🏗️ ARCHITECTE: Route appelée ! Début de l'analyse globale");

  const supabase = await createClient();

  try {
    // 1. SÉCURITÉ
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    console.log("📋 Architecte: Récupération des sessions pour user", user.id);

    // 2. RÉCUPÉRER TOUTES LES SESSIONS
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select(`
        *,
        eras (label, description, start_age, end_age)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ error: "Aucune session trouvée" }, { status: 404 });
    }

    // 3. VÉRIFIER QUE TOUTES LES SESSIONS SONT COMPLÉTÉES
    const completedSessions = sessions.filter(s => s.status === 'completed');
    if (completedSessions.length !== sessions.length) {
      return NextResponse.json({
        error: "Toutes les ères doivent être complétées avant de générer le livre",
        completed: completedSessions.length,
        total: sessions.length
      }, { status: 400 });
    }

    console.log(`✅ Toutes les ${sessions.length} sessions sont complétées`);

    // 4. RÉCUPÉRER TOUS LES FAITS ET MESSAGES POUR CHAQUE SESSION
    const sessionsData = await Promise.all(
      sessions.map(async (session: any) => {
        // Récupérer les faits
        const { data: facts } = await supabase
          .from('user_facts')
          .select('*')
          .eq('session_id', session.id)
          .order('created_at', { ascending: true });

        // Récupérer les messages utilisateur (pour contexte)
        const { data: messages } = await supabase
          .from('messages')
          .select('role, content')
          .eq('session_id', session.id)
          .eq('role', 'user')
          .order('created_at', { ascending: true });

        return {
          session_id: session.id,
          era_id: session.era_id,
          era_label: session.eras.label,
          era_description: session.eras.description,
          start_age: session.eras.start_age,
          end_age: session.eras.end_age,
          current_summary: session.current_summary || '',
          facts: facts || [],
          messages: messages || []
        };
      })
    );

    console.log(`📊 Données collectées: ${sessionsData.length} ères`);
    const totalFacts = sessionsData.reduce((sum, s) => sum + s.facts.length, 0);
    console.log(`📊 Total de faits à analyser: ${totalFacts}`);

    // 5. CONSTRUIRE LE PROMPT ARCHITECTE
    const architectPrompt = `
Tu es un architecte de livre biographique expert en analyse chronologique.

DONNÉES BRUTES (toutes les ères complétées) :

${sessionsData.map(s => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÈRE "${s.era_label}" (${s.start_age}-${s.end_age} ans)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Description de l'ère : ${s.era_description}

Résumé de la session :
${s.current_summary}

Faits extraits (${s.facts.length} faits) :
${s.facts.map((f: any) => `- [${f.fact_type}] ${f.fact_value} (Contexte: ${f.fact_context})`).join('\n')}

Extraits de réponses utilisateur (contexte narratif) :
${s.messages.slice(0, 5).map((m: any) => `"${m.content}"`).join('\n')}

`).join('\n')}

TA MISSION :
1. ANALYSE CHRONOLOGIQUE :
   - Identifie TOUS les événements datables (âge, année, période)
   - Détecte les ANACHRONISMES (ex: mention du collège à 5 ans, événements dans le mauvais ordre)
   - Note les incohérences temporelles

2. RÉORGANISATION :
   - Réorganise TOUS les faits par ordre chronologique strict
   - Groupe les événements par période logique
   - Crée des chapitres cohérents (pas forcément 1 chapitre = 1 ère originale)

3. CRÉATION DU PLAN :
   - Définis les chapitres du livre (titre évocateur, plage d'âge)
   - Attribue chaque fait au bon chapitre
   - Propose des transitions narratives entre chapitres

RÈGLES STRICTES :
- RESPECTE scrupuleusement les FAITS donnés (ne change JAMAIS un nom, lieu, ou date)
- Ne CRÉE PAS de nouveaux faits
- Signale CHAQUE anachronisme corrigé avec explication
- Préserve la richesse des détails
- Crée des chapitres narrativement cohérents (pas trop courts ni trop longs)

FORMAT DE SORTIE JSON STRICT :
{
  "chapters": [
    {
      "order": 1,
      "title": "Titre évocateur du chapitre",
      "age_range": {
        "start": 0,
        "end": 5
      },
      "original_era_ids": ["uuid-era-1"],
      "facts": [
        {
          "age": 0,
          "type": "date",
          "content": "Naissance à Paris",
          "source_era": "Enfance",
          "original_context": "Contexte original du fait"
        }
      ],
      "anachronisms_fixed": [
        {
          "fact": "Mention du collège",
          "from_era": "Enfance (0-5 ans)",
          "to_era": "Adolescence (13-17 ans)",
          "reason": "Le collège commence vers 11-12 ans, pas durant la petite enfance"
        }
      ],
      "narrative_intro": "Courte phrase d'introduction narrative pour ce chapitre"
    }
  ],
  "stats": {
    "total_facts": ${totalFacts},
    "anachronisms_found": 0,
    "chapters_created": 0,
    "quality_score": 0.85
  },
  "global_notes": "Notes générales sur la cohérence du récit"
}

IMPORTANT :
- quality_score (0-1) : Évalue la cohérence chronologique globale
- Si AUCUN anachronisme détecté, anachronisms_fixed = []
- Un chapitre peut couvrir plusieurs ères originales si logique
- Priorité : COHÉRENCE NARRATIVE > respect strict des ères initiales
`;

    // 6. APPEL MISTRAL LARGE
    console.log("📤 Envoi à Mistral Large pour analyse architecturale...");

    const response = await mistral.chat.complete({
      model: 'mistral-large-latest',
      messages: [{ role: 'user', content: architectPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.2, // Bas pour rester factuel
    });

    const rawContent = response.choices?.[0].message.content;
    console.log("📥 Réponse Architecte reçue (200 premiers caractères):", String(rawContent).substring(0, 200));

    let bookStructure;

    try {
      let clean = String(rawContent || "{}").trim();
      if (clean.startsWith("```json")) clean = clean.substring(7);
      if (clean.startsWith("```")) clean = clean.substring(3);
      if (clean.endsWith("```")) clean = clean.substring(0, clean.length - 3);
      bookStructure = JSON.parse(clean.trim());
    } catch (e) {
      console.error("❌ Erreur parsing JSON Architecte:", rawContent);
      return NextResponse.json({ error: "Erreur de parsing du plan" }, { status: 500 });
    }

    console.log("✅ Plan du livre créé:", bookStructure.chapters?.length, "chapitres");
    console.log("📊 Stats:", bookStructure.stats);

    // 7. SAUVEGARDER LE PLAN DANS book_structure (UPSERT)
    const { error: structureError } = await supabase
      .from('book_structure')
      .upsert({
        user_id: user.id,
        structure: bookStructure
      }, {
        onConflict: 'user_id' // Remplace le plan existant s'il y en a un
      });

    if (structureError) {
      console.error("❌ Erreur sauvegarde book_structure:", structureError);
      return NextResponse.json({ error: "Erreur de sauvegarde du plan" }, { status: 500 });
    }

    console.log("💾 Plan du livre sauvegardé avec succès");

    return NextResponse.json({
      success: true,
      chapters_count: bookStructure.chapters?.length || 0,
      anachronisms_found: bookStructure.stats?.anachronisms_found || 0,
      quality_score: bookStructure.stats?.quality_score || 0,
      message: "Plan du livre créé avec succès par l'Architecte"
    });

  } catch (error) {
    console.error('❌ Erreur Architecte:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse architecturale', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
