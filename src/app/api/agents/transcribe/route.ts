import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "fr",
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error("Whisper Error:", error);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}