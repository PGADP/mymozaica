import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { Mistral } from '@mistralai/mistralai';

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

/**
 * AGENT ARCHITECTE GLOBAL
 * Appelé UNE SEULE FOIS quand toutes les ères sont complétées
 * Crée le PLAN GLOBAL du livre (pas de rédaction)
 * Output: Arc narratif, thèmes, structure des chapitres, transitions
 */

export async function POST(req: NextRequest) {
  console.log("🏗️ ARCHITECTE GLOBAL: Début de l'analyse globale");

  const supabase = await createClient();

  // Récupérer le body (peut être vide ou contenir testMode)
  let testMode = false;
  try {
    const body = await req.json();
    testMode = body?.testMode === true;
  } catch {
    // Body vide, pas de test mode
  }

  try {
    // 1. SÉCURITÉ
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. RÉCUPÉRER TOUTES LES SESSIONS
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select(`
        *,
        eras (label, description, start_age, end_age, order)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ error: "Aucune session trouvée" }, { status: 404 });
    }

    // 3. VÉRIFIER QUE TOUTES SONT COMPLÉTÉES (sauf en mode test)
    const completedSessions = sessions.filter(s => s.status === 'completed');

    if (!testMode && completedSessions.length !== sessions.length) {
      return NextResponse.json({
        error: "Toutes les ères doivent être complétées",
        completed: completedSessions.length,
        total: sessions.length
      }, { status: 400 });
    }

    // En mode test, on utilise les sessions avec du contenu (complétées ou in_progress avec summary)
    const sessionsToUse = testMode
      ? sessions.filter(s => s.status === 'completed' || (s.status === 'in_progress' && s.current_summary))
      : completedSessions;

    if (sessionsToUse.length === 0) {
      return NextResponse.json({
        error: "Aucune session avec du contenu trouvée. Complétez au moins une interview.",
        testMode
      }, { status: 400 });
    }

    console.log(`✅ ${sessionsToUse.length} sessions utilisables ${testMode ? '(MODE TEST)' : ''}`);

    // 4. RÉCUPÉRER TOUS LES FAITS POUR CHAQUE SESSION
    const sessionsData = await Promise.all(
      sessionsToUse.map(async (session: any) => {
        const { data: facts } = await supabase
          .from('user_facts')
          .select('*')
          .eq('session_id', session.id)
          .order('created_at', { ascending: true });

        return {
          session_id: session.id,
          era_id: session.era_id,
          era_label: session.eras.label,
          era_description: session.eras.description,
          start_age: session.eras.start_age,
          end_age: session.eras.end_age,
          era_order: session.eras.order,
          current_summary: session.current_summary || '',
          facts: facts || []
        };
      })
    );

    const totalFacts = sessionsData.reduce((sum, s) => sum + s.facts.length, 0);
    console.log(`📊 ${totalFacts} faits à analyser sur ${sessionsData.length} ères`);

    // 5. RÉCUPÉRER LE PROFIL POUR CONTEXTE
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', user.id)
      .single();

    const userName = profile?.first_name || "l'auteur";

    // 6. PROMPT ARCHITECTE GLOBAL (PLAN SEULEMENT, PAS DE RÉDACTION)
    const architectPrompt = `
Tu es l'architecte en chef d'un livre biographique pour ${userName}.

DONNÉES COMPLÈTES DE LA VIE :

${sessionsData.map(s => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÈRE ${s.era_order}: "${s.era_label}" (${s.start_age}-${s.end_age} ans)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Description : ${s.era_description}

Résumé de la session :
${s.current_summary}

Faits extraits (${s.facts.length} faits) :
${s.facts.map((f: any) => `  • [${f.fact_type}] ${f.fact_value} — ${f.fact_context}`).join('\n')}

`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: ${totalFacts} faits sur ${sessionsData.length} ères de vie
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TA MISSION :
Crée le PLAN GLOBAL du livre autobiographique. Tu ne rédiges RIEN, tu planifies.

ÉTAPES :

1. **ANALYSE CHRONOLOGIQUE** :
   - Identifie les événements datables (âges, années)
   - Détecte les ANACHRONISMES (faits dans la mauvaise ère)
   - Vérifie la cohérence temporelle globale

2. **ARC NARRATIF** :
   - Quel est le fil rouge de cette vie ?
   - Quelle transformation/évolution ?
   - Quel message global se dégage ?

3. **THÈMES MAJEURS** :
   - Quels sont les 3-5 thèmes récurrents ?
   - (Ex: autonomie, famille, passion, difficulté, résilience)

4. **STRUCTURE DES CHAPITRES** :
   - Définis les chapitres (peut être différent des ères originales)
   - Un chapitre = une période cohérente narrativement
   - Titre évocateur + plage d'âge + objectif narratif

5. **TRANSITIONS** :
   - Comment passer d'un chapitre au suivant ?
   - Quelles phrases/idées de transition ?

RÈGLES STRICTES :

✅ À FAIRE :
- Analyser la TOTALITÉ des faits
- Détecter TOUS les anachronismes
- Créer une structure narrative cohérente
- Proposer des titres de chapitres évocateurs
- Définir le ton général du livre

❌ NE PAS FAIRE :
- Ne RÉDIGE PAS les chapitres (c'est le rôle du Writer)
- N'invente PAS de nouveaux faits
- Ne change PAS les noms/lieux/dates donnés

FORMAT DE SORTIE JSON :
{
  "arc_narratif": "Description en 2-3 phrases du fil rouge de la vie",
  "themes_majeurs": ["thème 1", "thème 2", "thème 3"],
  "tone_general": "introspectif|nostalgique|optimiste|résilient|mélancolique",
  "chapters_outline": [
    {
      "order": 1,
      "title_suggestion": "Titre évocateur",
      "age_range": {"start": 0, "end": 5},
      "original_era_ids": ["uuid"],
      "narrative_goal": "Objectif narratif du chapitre",
      "key_themes": ["thème A", "thème B"],
      "facts_count": 12
    }
  ],
  "transitions_map": {
    "1_to_2": "Idée de transition du chapitre 1 vers 2",
    "2_to_3": "Idée de transition..."
  },
  "anachronisms_detected": [
    {
      "fact": "Description du fait",
      "current_era": "Enfance (5-12 ans)",
      "correct_era": "Adolescence (12-21 ans)",
      "reason": "Explication"
    }
  ],
  "quality_assessment": {
    "total_facts": ${totalFacts},
    "facts_distribution": "équilibrée|inégale",
    "chronological_coherence": 0.0-1.0,
    "narrative_potential": 0.0-1.0
  }
}

CALCUL DES SCORES :
- chronological_coherence : 1.0 si aucun anachronisme, décroît selon gravité
- narrative_potential : richesse des faits, densité émotionnelle, potentiel narratif

MAINTENANT, CRÉE LE PLAN GLOBAL DU LIVRE.
`;

    // 7. APPEL MISTRAL LARGE
    console.log("📤 Envoi à Mistral Large pour planification globale...");

    const response = await mistral.chat.complete({
      model: 'mistral-large-latest',
      messages: [{ role: 'user', content: architectPrompt }],
      responseFormat: { type: 'json_object' },
      temperature: 0.2, // Bas pour rester structuré
    });

    const rawContent = response.choices?.[0].message.content;
    console.log("📥 Plan global reçu (200 premiers caractères):", String(rawContent).substring(0, 200));

    let globalPlan;
    try {
      let clean = String(rawContent || "{}").trim();
      if (clean.startsWith("```json")) clean = clean.substring(7);
      if (clean.startsWith("```")) clean = clean.substring(3);
      if (clean.endsWith("```")) clean = clean.substring(0, clean.length - 3);
      globalPlan = JSON.parse(clean.trim());
    } catch (e) {
      console.error("❌ Erreur parsing JSON Architecte:", rawContent);
      return NextResponse.json({ error: "Erreur de parsing du plan" }, { status: 500 });
    }

    console.log("✅ Plan global créé:", globalPlan.chapters_outline?.length, "chapitres");
    console.log("📊 Anachronismes détectés:", globalPlan.anachronisms_detected?.length || 0);

    // 8. SAUVEGARDER LE PLAN GLOBAL
    const { error: structureError } = await supabase
      .from('book_structure')
      .upsert({
        user_id: user.id,
        global_plan: globalPlan,
        total_chapters: globalPlan.chapters_outline?.length || 0,
        generation_status: 'planning', // Phase de planification terminée
        current_chapter: 0
      }, {
        onConflict: 'user_id'
      });

    if (structureError) {
      console.error("❌ Erreur sauvegarde:", structureError);
      return NextResponse.json({ error: "Erreur de sauvegarde" }, { status: 500 });
    }

    console.log("💾 Plan global sauvegardé avec succès");

    return NextResponse.json({
      success: true,
      global_plan: globalPlan, // Inclure le plan complet pour l'orchestrateur
      total_chapters: globalPlan.chapters_outline?.length || 0,
      anachronisms_found: globalPlan.anachronisms_detected?.length || 0,
      arc_narratif: globalPlan.arc_narratif,
      themes: globalPlan.themes_majeurs,
      quality: globalPlan.quality_assessment
    });

  } catch (error) {
    console.error('❌ Erreur Architecte Global:', error);
    return NextResponse.json(
      { error: 'Erreur analyse globale', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
