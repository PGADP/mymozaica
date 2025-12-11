import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { withApiProtection, logApiUsage, getUserApiStats, MAX_BOOK_GENERATIONS } from "@/lib/api-protection";

/**
 * ORCHESTRATEUR SÉQUENTIEL
 * Point d'entrée unique pour générer le livre complet
 *
 * FLOW :
 * 1. Appelle Architecte Global (crée le plan)
 * 2. Pour chaque chapitre séquentiellement :
 *    a. Appelle Architecte Chapitre (crée le brief)
 *    b. Appelle Writer Chapitre (rédige le contenu)
 * 3. Retourne le résultat final
 *
 * PROTECTION :
 * - Limite de 3 générations max par utilisateur (lifetime)
 * - Rate limiting : 1/min, 2/heure, 3/jour
 * - Vérifie que billing_status = 'paid'
 */

export async function POST(req: NextRequest) {
  console.log("🚀 ORCHESTRATEUR: Début de la génération séquentielle du livre");

  const supabase = await createClient();

  // Récupérer les cookies pour les transmettre aux appels internes
  const cookieHeader = req.headers.get('cookie') || '';

  // Récupérer le body (peut être vide ou contenir testMode)
  let testMode = false;
  try {
    const body = await req.json();
    testMode = body?.testMode === true;
  } catch {
    // Body vide, pas de test mode
  }

  try {
    // 1. SÉCURITÉ - Vérification utilisateur
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. PROTECTION API - Vérifier les limites
    console.log("🛡️ Vérification des limites API...");
    const protection = await withApiProtection(user.id, 'writer');

    if (!protection.allowed) {
      console.warn(`⚠️ Accès refusé pour ${user.id}: ${protection.error}`);

      // Récupérer les stats pour le message d'erreur
      const stats = await getUserApiStats(user.id);

      return NextResponse.json({
        error: protection.error,
        stats: {
          bookGenerationsUsed: stats.bookGenerations,
          bookGenerationsMax: MAX_BOOK_GENERATIONS,
          bookGenerationsRemaining: stats.bookGenerationsRemaining
        }
      }, { status: protection.status || 429 });
    }

    console.log(`📖 Génération du livre pour user ${user.id} ${testMode ? '(MODE TEST)' : ''}`);

    // ═══════════════════════════════════════════════════════════
    // ÉTAPE 1 : ARCHITECTE GLOBAL (Plan général du livre)
    // ═══════════════════════════════════════════════════════════

    console.log("\n🏗️ ÉTAPE 1/3 : Appel de l'Architecte Global...");

    let globalPlan;
    let totalChapters = 0;

    // Vérifier si un plan existe déjà
    const { data: existingStructure } = await supabase
      .from('book_structure')
      .select('global_plan, generation_status, total_chapters')
      .eq('user_id', user.id)
      .single();

    if (existingStructure?.global_plan && existingStructure.generation_status !== 'error') {
      console.log("✅ Plan global déjà existant, réutilisation");
      globalPlan = existingStructure.global_plan;
      totalChapters = existingStructure.total_chapters;
    } else {
      // Appeler l'Architecte Global avec transmission des cookies d'auth
      const architectResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/agents/architect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader
        },
        body: JSON.stringify({ testMode })
      });

      if (!architectResponse.ok) {
        const errorData = await architectResponse.json();
        console.error("❌ Erreur Architecte Global:", errorData);
        return NextResponse.json({
          error: "Erreur lors de la création du plan global",
          details: errorData
        }, { status: 500 });
      }

      const architectData = await architectResponse.json();
      globalPlan = architectData.global_plan;
      totalChapters = architectData.total_chapters;

      console.log(`✅ Plan global créé: ${totalChapters} chapitres planifiés`);
    }

    if (!globalPlan || !globalPlan.chapters_outline || globalPlan.chapters_outline.length === 0) {
      return NextResponse.json({
        error: "Le plan global est invalide ou vide"
      }, { status: 500 });
    }

    // Mettre à jour le statut à "in_progress"
    await supabase
      .from('book_structure')
      .update({ generation_status: 'in_progress' })
      .eq('user_id', user.id);

    // ═══════════════════════════════════════════════════════════
    // ÉTAPE 2 : GÉNÉRATION SÉQUENTIELLE CHAPITRE PAR CHAPITRE
    // ═══════════════════════════════════════════════════════════

    console.log(`\n✍️ ÉTAPE 2/3 : Génération séquentielle de ${totalChapters} chapitres...`);

    // Supprimer les anciens chapitres (si régénération)
    await supabase
      .from('book_chapters')
      .delete()
      .eq('user_id', user.id);

    console.log("🗑️ Anciens chapitres supprimés (si existants)");

    const generatedChapters = [];

    for (let i = 0; i < totalChapters; i++) {
      const chapterOrder = i + 1;
      const chapterOutline = globalPlan.chapters_outline[i];

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📝 Chapitre ${chapterOrder}/${totalChapters}: "${chapterOutline.title_suggestion}"`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // Mettre à jour le current_chapter dans book_structure
      await supabase
        .from('book_structure')
        .update({ current_chapter: chapterOrder })
        .eq('user_id', user.id);

      // ───────────────────────────────────────────────────────
      // 2a. ARCHITECTE CHAPITRE (Crée le brief détaillé)
      // ───────────────────────────────────────────────────────

      console.log(`   🏗️ Appel Architecte Chapitre ${chapterOrder}...`);

      const architectChapterResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/agents/architect/chapter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader
        },
        body: JSON.stringify({ chapterOrder })
      });

      if (!architectChapterResponse.ok) {
        const errorData = await architectChapterResponse.json();
        console.error(`❌ Erreur Architecte Chapitre ${chapterOrder}:`, errorData);

        // Marquer comme erreur et arrêter
        await supabase
          .from('book_structure')
          .update({ generation_status: 'error' })
          .eq('user_id', user.id);

        return NextResponse.json({
          error: `Erreur lors de la création du brief du chapitre ${chapterOrder}`,
          details: errorData
        }, { status: 500 });
      }

      const architectChapterData = await architectChapterResponse.json();
      const brief = architectChapterData.brief;

      console.log(`   ✅ Brief créé: ${brief.facts_to_integrate?.length || 0} faits à intégrer`);

      // ───────────────────────────────────────────────────────
      // 2b. WRITER CHAPITRE (Rédige le contenu)
      // ───────────────────────────────────────────────────────

      console.log(`   ✍️ Appel Writer Chapitre ${chapterOrder}...`);

      const writerChapterResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/agents/writer/chapter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader
        },
        body: JSON.stringify({ chapterOrder })
      });

      if (!writerChapterResponse.ok) {
        const errorData = await writerChapterResponse.json();
        console.error(`❌ Erreur Writer Chapitre ${chapterOrder}:`, errorData);

        // Marquer comme erreur et arrêter
        await supabase
          .from('book_structure')
          .update({ generation_status: 'error' })
          .eq('user_id', user.id);

        return NextResponse.json({
          error: `Erreur lors de la rédaction du chapitre ${chapterOrder}`,
          details: errorData
        }, { status: 500 });
      }

      const writerChapterData = await writerChapterResponse.json();
      const chapter = writerChapterData.chapter;

      console.log(`   ✅ Chapitre rédigé: ${chapter.word_count} mots`);
      console.log(`   💾 Chapitre ${chapterOrder} sauvegardé`);

      generatedChapters.push({
        order: chapterOrder,
        title: chapter.title,
        word_count: chapter.word_count,
        facts_integrated: chapter.facts_integrated_count
      });
    }

    // ═══════════════════════════════════════════════════════════
    // ÉTAPE 3 : FINALISATION
    // ═══════════════════════════════════════════════════════════

    console.log("\n✅ ÉTAPE 3/3 : Finalisation...");

    // Marquer la génération comme terminée
    await supabase
      .from('book_structure')
      .update({
        generation_status: 'completed',
        current_chapter: totalChapters
      })
      .eq('user_id', user.id);

    console.log(`\n🎉 GÉNÉRATION TERMINÉE: ${generatedChapters.length} chapitres créés avec succès`);

    // Calculer les stats finales
    const totalWords = generatedChapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0);
    const totalFacts = generatedChapters.reduce((sum, ch) => sum + (ch.facts_integrated || 0), 0);

    // 📊 Logger le succès de la génération
    await logApiUsage(user.id, 'writer', true, totalWords);
    console.log("📊 Usage API loggé avec succès");

    // Récupérer les stats mises à jour
    const updatedStats = await getUserApiStats(user.id);

    return NextResponse.json({
      success: true,
      message: "Livre généré avec succès",
      stats: {
        chapters_count: generatedChapters.length,
        total_words: totalWords,
        total_facts_integrated: totalFacts,
        anachronisms_fixed: globalPlan.anachronisms_detected?.length || 0
      },
      chapters: generatedChapters,
      usage: {
        bookGenerationsUsed: updatedStats.bookGenerations,
        bookGenerationsRemaining: updatedStats.bookGenerationsRemaining,
        bookGenerationsMax: MAX_BOOK_GENERATIONS
      }
    });

  } catch (error) {
    console.error('❌ ERREUR ORCHESTRATEUR:', error);

    // Marquer comme erreur dans la DB
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('book_structure')
          .update({ generation_status: 'error' })
          .eq('user_id', user.id);
      }
    } catch (e) {
      // Ignore les erreurs de marquage
    }

    return NextResponse.json(
      {
        error: 'Erreur lors de la génération du livre',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
