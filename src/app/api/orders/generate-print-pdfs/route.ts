import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';
import PdfGeneratorService from '@/core/services/pdf-generator';
import { LULU_MIN_PAGES } from '@/core/services/lulu';

/**
 * POST /api/orders/generate-print-pdfs
 *
 * Génère les PDFs print-ready (intérieur + couverture) pour Lulu
 *
 * Body:
 * - bookTitle: string
 * - authorName: string
 * - subtitle?: string
 * - backCoverText?: string
 *
 * Retourne:
 * - interior: { storagePath, signedUrl, pageCount, fileSizeBytes }
 * - cover: { storagePath, signedUrl, pageCount, fileSizeBytes, spineWidthMm }
 */
export async function POST(req: NextRequest) {
  try {
    // Authentification
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    // Vérifier le billing_status
    const supabaseAdmin = createAdminClient();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('billing_status, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.billing_status !== 'paid') {
      return NextResponse.json(
        { error: 'Abonnement requis' },
        { status: 403 }
      );
    }

    // Récupérer les paramètres
    const body = await req.json();
    const {
      bookTitle = 'Ma Biographie',
      authorName = profile.full_name || 'Auteur',
      subtitle,
      backCoverText,
    } = body;

    // Récupérer les chapitres du livre
    const { data: bookStructure, error: structureError } = await supabaseAdmin
      .from('book_structure')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (structureError || !bookStructure) {
      return NextResponse.json(
        { error: 'Structure du livre non trouvee. Generez d abord votre livre.' },
        { status: 400 }
      );
    }

    const { data: chapters, error: chaptersError } = await supabaseAdmin
      .from('book_chapters')
      .select('chapter_number, title, content')
      .eq('book_structure_id', bookStructure.id)
      .order('chapter_number', { ascending: true });

    if (chaptersError || !chapters || chapters.length === 0) {
      return NextResponse.json(
        { error: 'Aucun chapitre trouve. Generez d abord votre livre.' },
        { status: 400 }
      );
    }

    // Estimer le nombre de pages (approximation : 1 chapitre = ~4-6 pages en moyenne)
    const estimatedPageCount = Math.max(4, chapters.length * 5);

    if (estimatedPageCount < LULU_MIN_PAGES) {
      return NextResponse.json(
        {
          error: `Le livre est trop court. Minimum ${LULU_MIN_PAGES} pages requises. Votre livre a environ ${estimatedPageCount} pages estimees. Ajoutez plus de contenu a vos chapitres.`,
        },
        { status: 400 }
      );
    }

    // Générer les PDFs
    const pdfGenerator = PdfGeneratorService.getInstance();

    const { interior, cover } = await pdfGenerator.generatePrintPdfs(
      user.id,
      chapters.map((c) => ({
        chapter_number: c.chapter_number,
        title: c.title,
        content: c.content,
      })),
      {
        title: bookTitle,
        authorName,
        subtitle,
        backCoverText,
      }
    );

    // Enregistrer les PDFs dans la table generated_pdfs
    await supabaseAdmin.from('generated_pdfs').insert([
      {
        user_id: user.id,
        pdf_type: 'interior',
        storage_path: interior.storagePath,
        file_size_bytes: interior.fileSizeBytes,
        page_count: interior.pageCount,
      },
      {
        user_id: user.id,
        pdf_type: 'cover',
        storage_path: cover.storagePath,
        file_size_bytes: cover.fileSizeBytes,
        spine_width_mm: cover.spineWidthMm,
      },
    ]);

    return NextResponse.json({
      success: true,
      interior: {
        storagePath: interior.storagePath,
        signedUrl: interior.signedUrl,
        pageCount: interior.pageCount,
        fileSizeBytes: interior.fileSizeBytes,
      },
      cover: {
        storagePath: cover.storagePath,
        signedUrl: cover.signedUrl,
        fileSizeBytes: cover.fileSizeBytes,
        spineWidthMm: cover.spineWidthMm,
      },
    });
  } catch (error) {
    console.error('Erreur generation PDFs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}
