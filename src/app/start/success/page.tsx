import Link from 'next/link';

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Carte principale */}
        <div className="bg-white rounded-[2rem] shadow-xl p-8 md:p-12 text-center">
          {/* Icône de succès (confetti visuel) */}
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

          {/* Message secondaire */}
          <p className="mt-8 text-sm text-[#47627D]">
            Un email de confirmation vous a été envoyé.
          </p>
        </div>

        {/* Éléments décoratifs optionnels */}
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
