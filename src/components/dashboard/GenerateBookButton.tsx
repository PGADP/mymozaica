'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Book, Loader2, Sparkles } from 'lucide-react';

export function GenerateBookButton() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<'architect' | 'writer' | null>(null);

  const handleGenerateBook = async () => {
    setIsGenerating(true);

    try {
      // ÉTAPE 1: ARCHITECTE (réorganisation chronologique)
      setCurrentStep('architect');
      console.log("🏗️ Appel de l'Architecte...");

      const architectResponse = await fetch('/api/agents/architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!architectResponse.ok) {
        const errorData = await architectResponse.json();
        throw new Error(errorData.error || "Erreur lors de l'analyse architecturale");
      }

      const architectResult = await architectResponse.json();
      console.log("✅ Architecte terminé:", architectResult);

      // ÉTAPE 2: WRITER (génération des chapitres)
      setCurrentStep('writer');
      console.log("✍️ Appel du Writer...");

      const writerResponse = await fetch('/api/agents/writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!writerResponse.ok) {
        const errorData = await writerResponse.json();
        throw new Error(errorData.error || "Erreur lors de la génération du livre");
      }

      const writerResult = await writerResponse.json();
      console.log("✅ Writer terminé:", writerResult);

      // REDIRECTION vers l'éditeur
      router.push('/book/edit');

    } catch (error) {
      console.error("❌ Erreur génération du livre:", error);
      alert(error instanceof Error ? error.message : "Erreur lors de la génération du livre");
      setIsGenerating(false);
      setCurrentStep(null);
    }
  };

  return (
    <button
      onClick={handleGenerateBook}
      disabled={isGenerating}
      className="mt-6 w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-[#E76F51] to-[#D65D40] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
    >
      {isGenerating ? (
        <>
          <Loader2 size={20} className="animate-spin" />
          <span>
            {currentStep === 'architect' && "L'architecte réorganise votre histoire..."}
            {currentStep === 'writer' && "Le biographe rédige vos chapitres..."}
          </span>
        </>
      ) : (
        <>
          <Sparkles size={20} />
          <span>Générer mon livre</span>
        </>
      )}
    </button>
  );
}
