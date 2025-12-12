'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function PaymentSuccessPage() {
  const [status, setStatus] = useState<'checking' | 'paid' | 'waiting'>('checking');
  const [countdown, setCountdown] = useState(10);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    const checkBillingStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('billing_status')
        .eq('id', user.id)
        .single();

      if (profile?.billing_status === 'paid') {
        setStatus('paid');
        // Redirection automatique après 3 secondes
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        setStatus('waiting');
        // Réessayer toutes les 2 secondes pendant 10 secondes
        if (countdown > 0) {
          timeoutId = setTimeout(() => {
            setCountdown(countdown - 2);
            checkBillingStatus();
          }, 2000);
        }
      }
    };

    checkBillingStatus();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [countdown, router, supabase]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#2A9D8F] bg-opacity-10 rounded-full mb-4 animate-pulse">
            <svg
              className="w-10 h-10 text-[#2A9D8F] animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <p className="text-[#2C3E50] font-medium">Vérification de votre paiement...</p>
        </div>
      </div>
    );
  }

  if (status === 'waiting') {
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-[2rem] shadow-xl p-8 md:p-12 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#E9C46A] bg-opacity-10 rounded-full">
                <svg
                  className="w-10 h-10 text-[#E9C46A]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-serif text-[#2C3E50] mb-4">
              Paiement en cours de traitement
            </h1>

            <p className="text-lg text-[#47627D] mb-8 max-w-md mx-auto">
              Votre paiement a été effectué avec succès ! Nous attendons la confirmation du système de paiement...
            </p>

            <div className="bg-[#FDF6E3] p-6 rounded-xl mb-6">
              <p className="text-sm text-[#47627D] mb-2">
                <strong>Que se passe-t-il maintenant ?</strong>
              </p>
              <p className="text-sm text-[#47627D]">
                Le système enregistre votre paiement. Cela prend généralement quelques secondes.
                Vous serez automatiquement redirigé vers votre dashboard.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/dashboard"
                className="inline-block bg-[#E76F51] hover:bg-[#D65D40] text-white font-medium px-8 py-4 rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl"
              >
                Accéder au Dashboard maintenant
              </Link>

              <button
                onClick={() => window.location.reload()}
                className="text-[#2A9D8F] hover:underline text-sm font-medium"
              >
                Rafraîchir la page
              </button>
            </div>

            <p className="mt-8 text-xs text-[#47627D]">
              Si le problème persiste, contactez-nous à{' '}
              <a href="mailto:support@mymozaica.com" className="text-[#2A9D8F] hover:underline">
                support@mymozaica.com
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Status === 'paid'
  return (
    <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Carte principale */}
        <div className="bg-white rounded-[2rem] shadow-xl p-8 md:p-12 text-center">
          {/* Icône de succès */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[#2A9D8F] bg-opacity-10 rounded-full">
              <svg
                className="w-10 h-10 text-[#2A9D8F]"
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
          </div>

          {/* Titre */}
          <h1 className="text-3xl md:text-4xl font-serif text-[#2C3E50] mb-4">
            Votre fresque est prête
          </h1>

          {/* Description */}
          <p className="text-lg text-[#47627D] mb-8 max-w-md mx-auto">
            Merci pour votre confiance. Vous pouvez maintenant commencer à raconter votre histoire.
          </p>

          {/* CTA Principal */}
          <Link
            href="/dashboard"
            className="inline-block bg-[#E76F51] hover:bg-[#D65D40] text-white font-medium px-8 py-4 rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl"
          >
            Accéder à mon Dashboard
          </Link>

          {/* Message de redirection automatique */}
          <p className="mt-6 text-sm text-[#2A9D8F] font-medium">
            Redirection automatique dans 3 secondes...
          </p>

          {/* Message secondaire */}
          <p className="mt-8 text-sm text-[#47627D]">
            Un email de confirmation vous a été envoyé.
          </p>
        </div>

        {/* Contact support */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[#47627D]">
            Besoin d'aide ?{' '}
            <a
              href="mailto:support@mymozaica.com"
              className="text-[#2A9D8F] hover:underline"
            >
              Contactez-nous
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
