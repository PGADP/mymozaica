'use client'

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signupWithProfile } from './actions';
import { SubmitButton } from '@/components/ui/SubmitButton';

function StartPageContent() {
  const [step, setStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Recuperer le pack et l'erreur depuis l'URL
  const selectedPack = searchParams.get('pack') || 'pack1'; // Default to pack1

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      setErrorMessage(decodeURIComponent(error));
    }
  }, [searchParams]);

  const nextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  // Titres et descriptions dynamiques par étape
  const stepContent = {
    1: {
      title: "Qui êtes-vous ?",
      description: "Ces détails aideront l'IA à contextualiser votre vie."
    },
    2: {
      title: "Parlez-nous de vous",
      description: "Donnez-nous le contexte pour personnaliser votre expérience."
    },
    3: {
      title: "Sécurisez votre récit",
      description: "Créez vos identifiants pour sauvegarder votre progression."
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl border border-white overflow-hidden flex flex-col md:flex-row">

        {/* Colonne Gauche (Design) */}
        <div className="bg-[#2C3E50] text-white p-8 md:w-1/3 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-serif font-bold mb-6">
              M
            </div>
            <h2 className="font-serif text-2xl font-bold leading-tight mb-2">
              {stepContent[step as keyof typeof stepContent].title}
            </h2>
            <p className="text-white/60 text-sm">
              {stepContent[step as keyof typeof stepContent].description}
            </p>
          </div>

          {/* Indicateur de progression (3 étapes) */}
          <div className="flex gap-2 mt-8 relative z-10">
            <div className={`h-1.5 rounded-full flex-1 transition-colors ${step >= 1 ? 'bg-[#E76F51]' : 'bg-white/20'}`} />
            <div className={`h-1.5 rounded-full flex-1 transition-colors ${step >= 2 ? 'bg-[#E76F51]' : 'bg-white/20'}`} />
            <div className={`h-1.5 rounded-full flex-1 transition-colors ${step >= 3 ? 'bg-[#E76F51]' : 'bg-white/20'}`} />
          </div>
        </div>

        {/* Colonne Droite (Formulaire) */}
        <div className="p-8 md:w-2/3">
          <form action={signupWithProfile}>
            {/* Hidden field pour le pack selectionne */}
            <input type="hidden" name="pack" value={selectedPack} />

            {/* ============================================ */}
            {/* ETAPE 1 : IDENTITE */}
            {/* ============================================ */}
            <div className={step === 1 ? 'block space-y-5' : 'hidden'}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[#47627D]">
                    Prénom *
                  </label>
                  <input
                    name="firstName"
                    required
                    className="w-full p-3 bg-[#FDF6E3]/30 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none text-[#2C3E50]"
                    placeholder="Jean"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[#47627D]">
                    Nom *
                  </label>
                  <input
                    name="lastName"
                    required
                    className="w-full p-3 bg-[#FDF6E3]/30 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none text-[#2C3E50]"
                    placeholder="Dupont"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#47627D]">
                  Date de naissance *
                </label>
                <input
                  type="date"
                  name="birthDate"
                  required
                  className="w-full p-3 bg-[#FDF6E3]/30 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none text-[#2C3E50]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#47627D]">
                  Ville de naissance *
                </label>
                <input
                  name="birthCity"
                  required
                  className="w-full p-3 bg-[#FDF6E3]/30 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none text-[#2C3E50]"
                  placeholder="Ex: Lyon, France"
                />
              </div>

              <button
                type="button"
                onClick={nextStep}
                className="w-full py-3.5 bg-[#2C3E50] text-white font-bold rounded-xl hover:bg-[#1A252F] transition-all"
              >
                Continuer
              </button>
            </div>

            {/* ============================================ */}
            {/* ÉTAPE 2 : BIO + RED FLAGS */}
            {/* ============================================ */}
            <div className={step === 2 ? 'block space-y-5' : 'hidden'}>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#47627D]">
                  Contexte de vie (optionnel)
                </label>
                <p className="text-xs text-[#47627D]/70 mb-2">
                  Partagez des éléments clés de votre parcours (famille, lieux, événements marquants...).
                </p>
                <textarea
                  name="bio"
                  rows={4}
                  className="w-full p-3 bg-[#FDF6E3]/30 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none text-[#2C3E50] text-sm resize-none"
                  placeholder="Ex: Famille nombreuse, expatriation à l'étranger, reconversion professionnelle..."
                ></textarea>
              </div>

              <div className="bg-[#FDF6E3] p-4 rounded-xl border border-[#E9C46A]">
                <div className="space-y-1">
                  <label htmlFor="redFlags" className="text-sm font-medium text-[#2C3E50]">
                    Sujets sensibles (optionnel)
                  </label>
                  <p className="text-xs text-[#47627D]/80 mb-2">
                    Si votre parcours comporte des sujets délicats (deuils, traumatismes, difficultés familiales...),
                    mentionnez-les ici. L'IA adaptera son ton pour être plus bienveillante.
                  </p>
                  <textarea
                    id="redFlags"
                    name="redFlags"
                    rows={3}
                    className="w-full p-3 bg-white rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#E76F51] outline-none text-[#2C3E50] text-sm resize-none"
                    placeholder="Ex: Perte d'un proche en 2015, divorce difficile, maladie grave..."
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={prevStep}
                  className="w-1/3 py-3 text-[#47627D] font-medium rounded-xl hover:bg-[#FDF6E3] transition-all"
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 py-3.5 bg-[#2C3E50] text-white font-bold rounded-xl hover:bg-[#1A252F] transition-all"
                >
                  Continuer
                </button>
              </div>
            </div>

            {/* ============================================ */}
            {/* ÉTAPE 3 : AUTH (EMAIL + PASSWORD) */}
            {/* ============================================ */}
            <div className={step === 3 ? 'block space-y-5' : 'hidden'}>
              {/* Message d'erreur */}
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                  <p className="text-sm font-medium">{errorMessage}</p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#47627D]">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full p-3 bg-[#FDF6E3]/30 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#E76F51] outline-none text-[#2C3E50]"
                  placeholder="votre@email.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#47627D]">
                  Mot de passe *
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  className="w-full p-3 bg-[#FDF6E3]/30 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#E76F51] outline-none text-[#2C3E50]"
                  placeholder="8 caractères minimum"
                />
                <p className="text-xs text-[#47627D]/60 mt-1">
                  Minimum 8 caractères
                </p>
              </div>

              <div className="bg-[#FDF6E3] p-3 rounded-lg">
                <p className="text-xs text-[#47627D]/80">
                  En créant votre compte, vous acceptez nos{' '}
                  <a href="/terms" className="text-[#2A9D8F] underline">conditions d'utilisation</a>
                  {' '}et notre{' '}
                  <a href="/privacy" className="text-[#2A9D8F] underline">politique de confidentialité</a>.
                </p>
              </div>

              {/* BOUTON SUBMIT INTELLIGENT */}
              <SubmitButton className="w-full py-4 bg-[#E76F51] text-white font-bold rounded-xl hover:bg-[#D65D40] transition-all shadow-lg hover:shadow-xl">
                Créer mon compte
              </SubmitButton>

              <button
                type="button"
                onClick={prevStep}
                className="w-full text-sm text-[#47627D] hover:underline mt-2"
              >
                Retour
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

// Wrapper avec Suspense pour Next.js 15
export default function StartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center">
        <div className="text-[#2C3E50]">Chargement...</div>
      </div>
    }>
      <StartPageContent />
    </Suspense>
  );
}
