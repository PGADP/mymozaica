import { NextRequest, NextResponse } from 'next/server';

/**
 * AGENT ANALYST
 * Persona : Extracteur silencieux en arrière-plan
 * Rôle : Analyser les conversations et extraire les données structurées
 * Modèle : Mistral Small (extraction rapide et économique)
 */

export async function POST(req: NextRequest) {
  try {
    const { conversationId } = await req.json();

    // TODO: Implémenter la logique de l'Analyst
    // 1. Récupérer la dernière conversation depuis Supabase
    // 2. Appeler Mistral Small pour extraire :
    //    - Dates (année, mois, jour si précis)
    //    - Lieux
    //    - Personnes mentionnées
    //    - Événements clés
    //    - Émotions
    // 3. Sauvegarder dans la table `extracted_data`
    // 4. Créer/mettre à jour les entrées de la timeline

    return NextResponse.json({
      role: 'analyst',
      status: 'processing',
      conversationId,
    });
  } catch (error) {
    console.error('Erreur Analyst:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse' },
      { status: 500 }
    );
  }
}
