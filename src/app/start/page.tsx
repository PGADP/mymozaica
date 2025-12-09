'use client'

import { useState } from 'react';
import { signupWithProfile } from './actions';
import { SubmitButton } from '@/components/ui/SubmitButton'; // Import du bouton

export default function StartPage() {
  const [step, setStep] = useState(1);
  // Plus besoin de 'loading' state manuel ici

  const nextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(step + 1);
  };

  return (
    <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl border border-white overflow-hidden flex flex-col md:flex-row">
        
        {/* Colonne Gauche (Design) */}
        <div className="bg-[#2C3E50] text-white p-8 md:w-1/3 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-serif font-bold mb-6">M</div>
            <h2 className="font-serif text-2xl font-bold leading-tight mb-2">
              {step === 1 ? "Qui êtes-vous ?" : "Sécurisez votre récit"}
            </h2>
            <p className="text-white/60 text-sm">
              {step === 1 ? "Ces détails aideront l'IA à contextualiser votre vie." : "Créez vos identifiants pour sauvegarder votre progression."}
            </p>
          </div>
          <div className="flex gap-2 mt-8 relative z-10">
            <div className={`h-1.5 rounded-full flex-1 transition-colors ${step >= 1 ? 'bg-[#E76F51]' : 'bg-white/20'}`} />
            <div className={`h-1.5 rounded-full flex-1 transition-colors ${step >= 2 ? 'bg-[#E76F51]' : 'bg-white/20'}`} />
          </div>
        </div>

        {/* Colonne Droite (Form) */}
        <div className="p-8 md:w-2/3">
          <form action={signupWithProfile}>
            
            {/* ÉTAPE 1 */}
            <div className={step === 1 ? 'block space-y-5' : 'hidden'}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[#47627D]">Prénom</label>
                  <input name="firstName" required className="w-full p-3 bg-[#FDF6E3]/30 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none text-[#2C3E50]" placeholder="Prénom" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[#47627D]">Nom</label>
                  <input name="lastName" required className="w-full p-3 bg-[#FDF6E3]/30 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none text-[#2C3E50]" placeholder="Nom" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#47627D]">Date de naissance</label>
                <input type="date" name="birthDate" required className="w-full p-3 bg-[#FDF6E3]/30 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none text-[#2C3E50]" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#47627D]">Ville de naissance</label>
                <input name="birthCity" required className="w-full p-3 bg-[#FDF6E3]/30 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none text-[#2C3E50]" placeholder="Ex: Lyon, France" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#47627D] flex justify-between">
                  <span>Contexte de vie (Bio)</span>
                </label>
                <textarea 
                  name="bio" 
                  rows={3} 
                  className="w-full p-3 bg-[#FDF6E3]/30 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2A9D8F] outline-none text-[#2C3E50] text-sm"
                  placeholder="Ex: Famille nombreuse, expatriation, événement marquant..."
                ></textarea>
              </div>
              <button 
                type="button" 
                onClick={nextStep}
                className="w-full py-3.5 bg-[#2C3E50] text-white font-bold rounded-xl hover:bg-[#1A252F] transition-all"
              >
                Continuer
              </button>
            </div>

            {/* ÉTAPE 2 */}
            <div className={step === 2 ? 'block space-y-5' : 'hidden'}>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#47627D]">Email</label>
                <input type="email" name="email" required className="w-full p-3 bg-[#FDF6E3]/30 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#E76F51] outline-none text-[#2C3E50]" placeholder="votre@email.com" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#47627D]">Mot de passe</label>
                <input type="password" name="password" required className="w-full p-3 bg-[#FDF6E3]/30 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#E76F51] outline-none text-[#2C3E50]" placeholder="8 caractères min." />
              </div>

              {/* BOUTON INTELLIGENT */}
              <SubmitButton className="w-full py-4 bg-[#E76F51] text-white font-bold rounded-xl hover:bg-[#D65D40] transition-all shadow-lg">
                Créer mon compte
              </SubmitButton>
              
              <button 
                type="button"
                onClick={() => setStep(1)}
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