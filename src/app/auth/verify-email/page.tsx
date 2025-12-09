export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Carte principale */}
        <div className="bg-white rounded-[2rem] shadow-xl p-8 md:p-12 text-center">
          {/* Icône email */}
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>

          {/* Titre */}
          <h1 className="text-3xl md:text-4xl font-serif text-[#2C3E50] mb-4">
            Vérifiez votre email
          </h1>

          {/* Description */}
          <p className="text-lg text-[#47627D] mb-8 max-w-md mx-auto">
            Nous vous avons envoyé un email de confirmation.
            Cliquez sur le lien pour valider votre compte et accéder au paiement.
          </p>

          {/* Instructions */}
          <div className="bg-[#FDF6E3] p-6 rounded-xl mb-8">
            <p className="text-sm text-[#47627D] mb-4">
              <strong>Vous n'avez pas reçu l'email ?</strong>
            </p>
            <ul className="text-sm text-[#47627D] text-left space-y-2 max-w-md mx-auto">
              <li>• Vérifiez vos spams/courriers indésirables</li>
              <li>• Attendez quelques minutes (l'email peut mettre du temps à arriver)</li>
              <li>• Vérifiez que l'adresse email est correcte</li>
            </ul>
          </div>

          {/* Message secondaire */}
          <p className="text-sm text-[#47627D]">
            Une fois votre email confirmé, vous serez automatiquement redirigé vers la page de paiement.
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
