'use client'

import { login, signup } from './actions'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#FDF6E3] flex flex-col items-center justify-center p-4 font-sans text-[#2C3E50]">
      
      {/* Carte de Connexion */}
      <div className="w-full max-w-md bg-white p-10 rounded-[2rem] shadow-2xl shadow-[#2C3E50]/5 border border-white">
        
        {/* En-tête */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#E76F51] rounded-2xl rotate-3 mx-auto mb-6 flex items-center justify-center text-white font-serif font-bold text-3xl shadow-lg shadow-[#E76F51]/20">
            M
          </div>
          <h2 className="text-3xl font-serif font-bold text-[#2C3E50] mb-2">
            Ravi de vous revoir
          </h2>
          <p className="text-[#47627D]">
            Reprenez le fil de votre histoire.
          </p>
        </div>

        {/* Formulaire */}
        <form className="space-y-6">
          <div className="space-y-5">
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
            <div>
              <div className="flex justify-between items-center mb-2 ml-1">
                <label 
                  htmlFor="password" 
                  className="block text-xs font-bold uppercase text-[#47627D] tracking-wider"
                >
                  Mot de passe
                </label>
                <Link
                  href="/login/forgot-password"
                  className="text-xs text-[#E76F51] hover:underline font-medium"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full rounded-xl border-2 border-[#FDF6E3] bg-[#FDF6E3]/50 py-4 px-5 text-[#2C3E50] placeholder:text-[#47627D]/40 focus:border-[#2A9D8F] focus:bg-white focus:ring-0 outline-none transition-all font-medium"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-4">
            <button
              formAction={login as any}
              className="group relative w-full flex justify-center py-4 px-4 rounded-xl bg-[#2C3E50] text-white font-bold text-lg shadow-lg hover:bg-[#1A252F] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
            >
              Se connecter
            </button>
            
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-[#FDF6E3]"></div>
              <span className="flex-shrink-0 mx-4 text-xs text-[#47627D]/50 uppercase font-bold">Ou</span>
              <div className="flex-grow border-t border-[#FDF6E3]"></div>
            </div>

            <button
              formAction={signup as any}
              className="group relative w-full flex justify-center py-4 px-4 rounded-xl bg-white border-2 border-[#E76F51] text-[#E76F51] font-bold text-lg hover:bg-[#E76F51] hover:text-white transition-all duration-200"
            >
              Créer ma fresque
            </button>
          </div>
        </form>
      </div>
      
      <p className="mt-8 text-center text-xs text-[#47627D]/60 max-w-xs leading-relaxed">
        En vous connectant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
      </p>
    </div>
  )
}