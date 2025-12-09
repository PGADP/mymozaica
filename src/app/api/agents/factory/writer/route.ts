import { NextRequest, NextResponse } from 'next/server';

/**
 * AGENT WRITER
 * Persona : Écrivain biographique
 * Rôle : Rédiger les chapitres du livre avec style littéraire
 * Modèle : Mistral Large (génération créative)
 */

export async function POST(req: NextRequest) {
  try {
    const { chapterId, style } = await req.json();

    // TODO: Implémenter la logique du Writer
    // 1. Récupérer le plan du chapitre depuis `book_structure`
    // 2. Récupérer les événements/données associés
    // 3. Appeler Mistral Large avec un prompt de rédaction :
    //    - Style littéraire (romanesque, journalistique, poétique...)
    //    - Ton (émotionnel, factuel, nostalgique...)
    // 4. Générer le texte du chapitre
    // 5. Sauvegarder dans `book_chapters`

    return NextResponse.json({
      role: 'writer',
      status: 'chapter_written',
      chapterId,
    });
  } catch (error) {
    console.error('Erreur Writer:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la rédaction' },
      { status: 500 }
    );
  }
}
