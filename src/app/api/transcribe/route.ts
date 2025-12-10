import { createClient } from "@/utils/supabase/server";
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const supabase = await createClient();

  // 1. SÉCURITÉ
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    // 2. RÉCUPÉRER LE CONTEXTE WHISPER DE L'UTILISATEUR
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, whisper_context')
      .eq('id', user.id)
      .single();

    const userName = profile?.first_name || "l'utilisateur";
    const whisperContext = profile?.whisper_context || '';

    // Construire le prompt Whisper personnalisé
    const whisperPrompt = whisperContext
      ? `Contexte : ${userName}. Noms fréquents : ${whisperContext}`
      : `Contexte : ${userName}.`;

    // 3. RÉCUPÉRER LE FICHIER AUDIO
    const formData = await req.formData();
    const audioFile = formData.get('file') as File;

    if (!audioFile) {
      return NextResponse.json({ error: "Aucun fichier audio fourni" }, { status: 400 });
    }

    console.log("🎤 Fichier audio reçu:", audioFile.name, audioFile.type, audioFile.size, "bytes");

    // 4. CONVERSION EN BUFFER POUR OPENAI
    const buffer = await audioFile.arrayBuffer();

    // 5. Créer un File object pour OpenAI
    const file = new File([buffer], audioFile.name || 'audio.webm', { type: audioFile.type });

    console.log("📤 Envoi à OpenAI Whisper avec contexte:", whisperPrompt.substring(0, 50) + "...");

    // 6. APPEL À OPENAI WHISPER AVEC PROMPT PERSONNALISÉ
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'fr',
      prompt: whisperPrompt, // 👈 Contexte personnalisé
    });

    console.log("✅ Transcription reçue:", transcription.text);

    // 6. RÉPONSE
    return NextResponse.json({
      text: transcription.text || '',
      success: true
    });

  } catch (error) {
    console.error("❌ Erreur de transcription:", error);
    return NextResponse.json({
      error: "Erreur lors de la transcription audio",
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}
