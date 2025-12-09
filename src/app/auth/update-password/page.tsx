'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePassword } from './actions';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setError(null);

    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    // Validation côté client
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    const result = await updatePassword(formData);

    if (result?.success) {
      setSuccess(true);
      // Redirection après 2 secondes
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } else {
      setError(result?.error || 'Une erreur est survenue');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex flex-col items-center justify-center p-4 font-sans text-[#2C3E50]">
        <div className="w-full max-w-md bg-white p-10 rounded-[2rem] shadow-2xl shadow-[#2C3E50]/5 border border-white">
          {/* Icône de succès */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#2A9D8F] bg-opacity-10 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-[#2A9D8F]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-serif font-bold text-[#2C3E50] mb-3">
              Mot de passe modifié
            </h2>

            <p className="text-[#47627D] leading-relaxed">
              Votre mot de passe a été mis à jour avec succès.
              <br />
              Redirection en cours...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF6E3] flex flex-col items-center justify-center p-4 font-sans text-[#2C3E50]">
      <div className="w-full max-w-md bg-white p-10 rounded-[2rem] shadow-2xl shadow-[#2C3E50]/5 border border-white">
        {/* En-tête */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#E76F51] rounded-2xl rotate-3 mx-auto mb-6 flex items-center justify-center text-white font-serif font-bold text-3xl shadow-lg shadow-[#E76F51]/20">
            M
          </div>
          <h2 className="text-3xl font-serif font-bold text-[#2C3E50] mb-2">
            Nouveau mot de passe
          </h2>
          <p className="text-[#47627D] leading-relaxed">
            Choisissez un nouveau mot de passe sécurisé pour votre compte.
          </p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Formulaire */}
        <form action={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-bold uppercase text-[#47627D] tracking-wider mb-2 ml-1"
            >
              Nouveau mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="block w-full rounded-xl border-2 border-[#FDF6E3] bg-[#FDF6E3]/50 py-4 px-5 text-[#2C3E50] placeholder:text-[#47627D]/40 focus:border-[#2A9D8F] focus:bg-white focus:ring-0 outline-none transition-all font-medium"
              placeholder="••••••••"
            />
            <p className="mt-2 ml-1 text-xs text-[#47627D]/60">
              Minimum 8 caractères
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-bold uppercase text-[#47627D] tracking-wider mb-2 ml-1"
            >
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="block w-full rounded-xl border-2 border-[#FDF6E3] bg-[#FDF6E3]/50 py-4 px-5 text-[#2C3E50] placeholder:text-[#47627D]/40 focus:border-[#2A9D8F] focus:bg-white focus:ring-0 outline-none transition-all font-medium"
              placeholder="••••••••"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="group relative w-full flex justify-center py-4 px-4 rounded-xl bg-[#E76F51] text-white font-bold text-lg shadow-lg hover:bg-[#D65D40] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
            >
              Mettre à jour le mot de passe
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
