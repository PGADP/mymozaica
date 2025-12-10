import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Header from "@/components/dashboard/Header";
import { Shield, Trash2, Mail, User, Calendar, MapPin } from "lucide-react";
import Link from "next/link";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Récupérer le profil complet
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) redirect("/dashboard");

  // Formater la date de naissance
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[#FDF6E3] text-[#2C3E50] font-sans">
      {/* HEADER */}
      <Header user={{
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name
      }} />

      <main className="max-w-3xl mx-auto px-6 py-10 pb-24">
        {/* Titre */}
        <div className="mb-10">
          <Link
            href="/dashboard"
            className="text-sm text-[#47627D] hover:text-[#2A9D8F] mb-4 inline-flex items-center gap-2"
          >
            ← Retour au Dashboard
          </Link>
          <h1 className="text-4xl font-serif font-bold text-[#2C3E50] mt-4">
            Paramètres du compte
          </h1>
          <p className="text-[#47627D] mt-2">
            Gérez vos informations personnelles et vos préférences.
          </p>
        </div>

        <div className="space-y-6">
          {/* Section: Informations Personnelles */}
          <section className="bg-white rounded-[2rem] p-8 shadow-lg border border-[#E76F51]/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#2A9D8F] text-white rounded-lg">
                <User size={20} />
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#2C3E50]">
                Informations personnelles
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-[#FDF6E3] rounded-xl">
                <Mail size={18} className="text-[#47627D] mt-1" />
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase text-[#47627D] tracking-wider mb-1">
                    Email
                  </p>
                  <p className="text-[#2C3E50] font-medium">{profile.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-[#FDF6E3] rounded-xl">
                <User size={18} className="text-[#47627D] mt-1" />
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase text-[#47627D] tracking-wider mb-1">
                    Nom complet
                  </p>
                  <p className="text-[#2C3E50] font-medium">
                    {profile.first_name} {profile.last_name}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-[#FDF6E3] rounded-xl">
                <Calendar size={18} className="text-[#47627D] mt-1" />
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase text-[#47627D] tracking-wider mb-1">
                    Date de naissance
                  </p>
                  <p className="text-[#2C3E50] font-medium">
                    {formatDate(profile.birth_date)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-[#FDF6E3] rounded-xl">
                <MapPin size={18} className="text-[#47627D] mt-1" />
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase text-[#47627D] tracking-wider mb-1">
                    Ville de naissance
                  </p>
                  <p className="text-[#2C3E50] font-medium">{profile.birth_city}</p>
                </div>
              </div>
            </div>

            <p className="mt-6 text-sm text-[#47627D] bg-[#2A9D8F]/5 p-4 rounded-xl border border-[#2A9D8F]/10">
              <strong>Note :</strong> Vos informations personnelles ne peuvent pas être modifiées après la création du compte.
              Elles sont essentielles pour la création de votre fresque de vie.
            </p>
          </section>

          {/* Section: RGPD & Confidentialité */}
          <section className="bg-white rounded-[2rem] p-8 shadow-lg border border-[#E76F51]/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#E9C46A] text-white rounded-lg">
                <Shield size={20} />
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#2C3E50]">
                Confidentialité & RGPD
              </h2>
            </div>

            <div className="space-y-4 text-[#47627D]">
              <p className="text-sm leading-relaxed">
                Nous respectons votre vie privée et protégeons vos données personnelles conformément au RGPD.
              </p>

              <div className="bg-[#FDF6E3] p-6 rounded-xl space-y-3">
                <h3 className="font-bold text-[#2C3E50] mb-3">Vos droits :</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-[#2A9D8F] mt-1">•</span>
                    <span><strong>Droit d'accès :</strong> Vous pouvez consulter toutes vos données à tout moment depuis votre dashboard.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#2A9D8F] mt-1">•</span>
                    <span><strong>Droit à l'effacement :</strong> Vous pouvez supprimer votre compte et toutes vos données de manière permanente.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#2A9D8F] mt-1">•</span>
                    <span><strong>Droit à la portabilité :</strong> Téléchargez votre livre au format PDF à tout moment.</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <a
                  href="/legal/privacy"
                  className="text-sm text-[#2A9D8F] hover:underline font-medium"
                >
                  Politique de confidentialité
                </a>
                <span className="text-[#47627D]">•</span>
                <a
                  href="/legal/terms"
                  className="text-sm text-[#2A9D8F] hover:underline font-medium"
                >
                  Conditions d'utilisation
                </a>
              </div>
            </div>
          </section>

          {/* Section: Zone de Danger */}
          <section className="bg-white rounded-[2rem] p-8 shadow-lg border border-[#E76F51]/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#E76F51] text-white rounded-lg">
                <Trash2 size={20} />
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#2C3E50]">
                Zone de danger
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-[#47627D] leading-relaxed">
                La suppression de votre compte est <strong>définitive et irréversible</strong>.
                Toutes vos données, conversations et votre livre seront définitivement supprimés.
              </p>

              <div className="bg-[#E76F51]/5 border border-[#E76F51]/20 p-6 rounded-xl">
                <h3 className="font-bold text-[#E76F51] mb-3">
                  ⚠️ Avant de supprimer votre compte :
                </h3>
                <ul className="space-y-2 text-sm text-[#47627D]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#E76F51] mt-1">•</span>
                    <span>Téléchargez votre livre si vous souhaitez le conserver.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#E76F51] mt-1">•</span>
                    <span>Cette action ne peut pas être annulée.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#E76F51] mt-1">•</span>
                    <span>Vous devrez créer un nouveau compte si vous changez d'avis.</span>
                  </li>
                </ul>
              </div>

              <form action="/api/account/delete" method="POST">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#E76F51] hover:bg-[#D65D40] text-white font-bold rounded-xl shadow-lg transition-colors duration-200"
                >
                  <Trash2 size={18} />
                  <span>Supprimer définitivement mon compte</span>
                </button>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
