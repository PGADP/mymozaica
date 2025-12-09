'use client'

import { useState } from 'react';
import Link from 'next/link';
import { requestPasswordReset } from '../actions';

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (formData: FormData) => {
    const result = await requestPasswordReset(formData);
    if (result?.success) {
      setIsSubmitted(true);
      setEmail(formData.get('email') as string);
    }
  };

  if (isSubmitted) {
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-serif font-bold text-[#2C3E50] mb-3">
              Email envoyé
            </h2>

            <p className="text-[#47627D] leading-relaxed">
              Un lien de réinitialisation a été envoyé à{' '}
              <span className="font-medium text-[#2C3E50]">{email}</span>.
              <br />
              Vérifiez votre boîte mail.
            </p>
          </div>

          <Link
            href="/login"
            className="block w-full text-center py-3 px-4 rounded-xl border-2 border-[#2A9D8F] text-[#2A9D8F] font-bold hover:bg-[#2A9D8F] hover:text-white transition-all duration-200"
          >
            Retour à la connexion
          </Link>
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
            Mot de passe oublié
          </h2>
          <p className="text-[#47627D] leading-relaxed">
            Entrez votre adresse email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        {/* Formulaire */}
        <form action={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-bold uppercase text-[#47627D] tracking-wider mb-2 ml-1"
            >
              Adresse Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="block w-full rounded-xl border-2 border-[#FDF6E3] bg-[#FDF6E3]/50 py-4 px-5 text-[#2C3E50] placeholder:text-[#47627D]/40 focus:border-[#2A9D8F] focus:bg-white focus:ring-0 outline-none transition-all font-medium"
              placeholder="jean.dupont@exemple.com"
            />
          </div>

          <div className="flex flex-col gap-4 pt-4">
            <button
              type="submit"
              className="group relative w-full flex justify-center py-4 px-4 rounded-xl bg-[#E76F51] text-white font-bold text-lg shadow-lg hover:bg-[#D65D40] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
            >
              Envoyer le lien
            </button>

            <Link
              href="/login"
              className="text-center text-sm text-[#47627D] hover:text-[#2A9D8F] transition-colors"
            >
              Retour à la connexion
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
