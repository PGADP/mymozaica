'use client'

import { createClient } from "@/utils/supabase/client";
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function VerifyContent() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  const handleResend = async () => {
    if (!email) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` }
    });
    setLoading(false);
    if (error) setMsg("Erreur lors de l'envoi.");
    else setMsg("Email renvoyé ! Vérifiez vos spams.");
  };

  return (
    <div className="min-h-screen bg-[#FDF6E3] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white p-10 rounded-[2rem] shadow-xl border border-[#E9C46A]/20">
        <div className="text-6xl mb-6">✉️</div>
        <h1 className="text-3xl font-serif font-bold text-[#2C3E50] mb-4">Vérifiez vos emails</h1>
        <p className="text-[#47627D] mb-6">
          Cliquez sur le lien reçu à <strong>{email}</strong> pour activer votre fresque.
        </p>

        {email && (
          <button 
            onClick={handleResend}
            disabled={loading}
            className="text-sm text-[#2A9D8F] font-bold hover:underline mb-6 block w-full"
          >
            {loading ? "Envoi..." : "Je n'ai rien reçu ? Renvoyer l'email"}
          </button>
        )}
        
        {msg && <p className="text-xs text-green-600 bg-green-50 p-2 rounded mb-4">{msg}</p>}

        <Link href="/login" className="text-[#E76F51] font-bold hover:underline">
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return <Suspense><VerifyContent /></Suspense>;
}