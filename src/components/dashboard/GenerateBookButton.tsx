'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';

export function GenerateBookButton() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ step: string; current: number; total: number } | null>(null);

  const handleGenerateBook = async () => {
    setIsGenerating(true);
    setProgress({ step: 'Analyse de votre histoire...', current: 0, total: 0 });

    try {
      // Appel de l'orchestrateur séquentiel
      // Il fait tout : Architecte Global → (loop) Architecte Chapitre → Writer Chapitre
      console.log("🚀 Lancement de la génération du livre...");

      const response = await fetch('/api/agents/writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la génération du livre");
      }

      const result = await response.json();
      console.log("✅ Livre généré:", result);

      // Redirection vers l'éditeur
      router.push('/dashboard/book');

    } catch (error) {
      console.error("❌ Erreur génération du livre:", error);
      alert(error instanceof Error ? error.message : "Erreur lors de la génération du livre");
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  return (
    <button
      onClick={handleGenerateBook}
      disabled={isGenerating}
      className="bg-white text-[#E76F51] hover:bg-[#FDF6E3] py-4 px-10 rounded-xl shadow-2xl font-bold text-lg flex items-center gap-3 transition-all hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
    >
      {isGenerating ? (
        <>
          <Loader2 size={24} className="animate-spin" />
          <span>{progress?.step || 'Génération en cours...'}</span>
        </>
      ) : (
        <>
          <Sparkles size={24} />
          <span>Générer mon livre</span>
        </>
      )}
    </button>
  );
}
