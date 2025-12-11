'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bug, Loader2, Sparkles } from 'lucide-react';

/**
 * BOUTON DE TEST - À SUPPRIMER EN PRODUCTION
 * Permet de générer le livre et accéder à la page de lecture
 * sans avoir complété toutes les ères
 */
export function TestModeButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'generating' | 'done'>('idle');

  const handleTestGenerate = async () => {
    setIsLoading(true);
    setStatus('generating');

    try {
      // Appel de l'orchestrateur séquentiel pour générer le livre
      console.log("🚀 [TEST MODE] Lancement de la génération du livre...");

      const response = await fetch('/api/agents/writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testMode: true })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la génération");
      }

      const result = await response.json();
      console.log("✅ [TEST MODE] Livre généré:", result);

      setStatus('done');

      // Redirection vers la page de lecture
      router.push('/dashboard/book');

    } catch (error) {
      console.error("❌ [TEST MODE] Erreur:", error);
      alert(error instanceof Error ? error.message : "Erreur lors de la génération");
      setStatus('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewBook = () => {
    router.push('/dashboard/book');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {/* Bouton voir le livre directement */}
      <button
        onClick={handleViewBook}
        className="flex items-center gap-2 px-4 py-2 bg-[#2A9D8F] hover:bg-[#238276] text-white text-sm font-medium rounded-lg shadow-lg transition-all hover:scale-105"
      >
        <Bug size={16} />
        <span>Voir le livre</span>
      </button>

      {/* Bouton générer le livre */}
      <button
        onClick={handleTestGenerate}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg shadow-lg transition-all hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Génération...</span>
          </>
        ) : (
          <>
            <Sparkles size={16} />
            <span>Générer le livre (Test)</span>
          </>
        )}
      </button>
    </div>
  );
}
