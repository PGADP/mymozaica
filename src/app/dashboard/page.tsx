import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Play, Lock, Book, Star, RotateCcw } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { GenerateBookButton } from "@/components/dashboard/GenerateBookButton";

// DÉFINITION DES ÈRES (Secours)
const DEFAULT_ERAS = [
  { label: 'Petite enfance', start_age: 0, end_age: 5, order: 1, description: 'Premiers pas, premières images.' },
  { label: 'Enfance', start_age: 5, end_age: 12, order: 2, description: "L'école primaire, les découvertes." },
  { label: 'Adolescence', start_age: 12, end_age: 21, order: 3, description: 'Le collège, le lycée, devenir soi.' },
  { label: 'Jeune Adulte', start_age: 21, end_age: 30, order: 4, description: "L'indépendance, les premiers choix." },
  { label: 'Construction', start_age: 30, end_age: 40, order: 5, description: 'Bâtir sa vie, carrière, famille.' },
  { label: 'Maturation', start_age: 40, end_age: 50, order: 6, description: "L'affirmation, le milieu de vie." },
  { label: 'Sagesse', start_age: 50, end_age: 60, order: 7, description: 'Transmission et nouveaux horizons.' },
  { label: 'Grand Âge', start_age: 60, end_age: 120, order: 8, description: 'Le temps de la mémoire.' },
];

// Fonction d'auto-réparation
async function ensureSessionsExist(userId: string) {
  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!adminUrl || !adminKey) return;

  const supabaseAdmin = createAdminClient(adminUrl, adminKey);
  
  // 1. Initialiser ERAS si table vide
  const { count: erasCount } = await supabaseAdmin.from('eras').select('*', { count: 'exact', head: true });
  if (erasCount === 0) {
    await supabaseAdmin.from('eras').insert(DEFAULT_ERAS);
  }

  // 2. Initialiser SESSIONS si vide
  const { count } = await supabaseAdmin.from('chat_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId);
  
  if (count === 0) {
    const { data: profile } = await supabaseAdmin.from('profiles').select('birth_date').eq('id', userId).single();
    if (!profile?.birth_date) return;

    const { data: eras } = await supabaseAdmin.from('eras').select('*');
    if (!eras) return;

    const birthDate = new Date(profile.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

    // Filtrer les ères selon l'âge actuel : ne créer QUE celles jusqu'à l'âge actuel
    const relevantEras = eras
      .sort((a: any, b: any) => a.order - b.order)
      .filter((era: any) => era.start_age <= age); // Ne garder que les ères déjà vécues ou en cours

    const sessions = relevantEras.map((era: any, index: number) => {
        // Logique de déverrouillage :
        // - Première ère (0-5 ans) : unlocked (puis deviendra in_progress au démarrage)
        // - Toutes les autres : locked (se débloquent après complétion de la précédente)
        let status: string;
        if (index === 0) {
          status = 'unlocked'; // Première ère accessible
        } else {
          status = 'locked'; // Verrouillée jusqu'à complétion de la précédente
        }

        return {
          user_id: userId,
          era_id: era.id,
          status: status,
          current_summary: `Prêt à commencer : ${era.label}`
        };
      });
    
    await supabaseAdmin.from('chat_sessions').insert(sessions);
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Récupérer le profil pour le Header
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, first_name, last_name')
    .eq('id', user.id)
    .single();

  // Appel bloquant pour garantir les données avant affichage
  await ensureSessionsExist(user.id);

  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select(`*, eras (*)`)
    .order('eras(start_age)', { ascending: true });

  const timeline = sessions?.sort((a, b) => (a.eras?.start_age || 0) - (b.eras?.start_age || 0)) || [];
  const currentSession = timeline.find(s => s.status === 'in_progress') || timeline.find(s => s.status === 'available');

  const progressPercent = Math.round(((sessions?.filter(s => s.status === 'completed').length || 0) / (sessions?.length || 1)) * 100);

  return (
    <div className="min-h-screen bg-[#FDF6E3] text-[#2C3E50] font-sans">

      {/* HEADER */}
      <Header user={{
        email: profile?.email || user.email || '',
        first_name: profile?.first_name,
        last_name: profile?.last_name
      }} />

      {/* 1. FRISE CHRONOLOGIQUE (Timeline) */}
      <div className="bg-gradient-to-b from-white to-white/95 backdrop-blur-md border-b border-[#E76F51]/10 py-8 shadow-sm">
        <div className="max-w-full overflow-x-auto no-scrollbar px-8">
          <div className="flex items-center gap-16 min-w-max mx-auto justify-start md:justify-center">
            {timeline.length > 0 ? timeline.map((session, index) => {
              const isActive = session.status === 'in_progress';
              const isLocked = session.status === 'locked';
              const isDone = session.status === 'completed';

              return (
                <div key={session.id} className="relative group">
                  {/* Ligne de connexion entre les ères */}
                  {index < timeline.length - 1 && (
                    <div className={`absolute top-10 left-20 w-16 h-0.5 transition-all duration-300 ${
                      isLocked ? 'bg-gray-200' :
                      isDone ? 'bg-gradient-to-r from-[#2A9D8F] to-[#2A9D8F]/50' :
                      'bg-gradient-to-r from-[#E9C46A] to-[#E9C46A]/30'
                    }`}></div>
                  )}

                  <Link
                    href={!isLocked ? `/dashboard/interview/${session.id}` : '#'}
                    className={`flex flex-col items-center gap-4 transition-all duration-300 ${
                      isActive ? 'scale-110 -translate-y-1' : 'hover:scale-105 hover:-translate-y-0.5'
                    } ${isLocked ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {/* Badge numéro/état */}
                    <div className="relative">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                        isActive
                          ? 'bg-white border-[#E76F51] text-[#E76F51] shadow-xl shadow-[#E76F51]/30 ring-4 ring-[#E76F51]/10'
                          : isDone
                          ? 'bg-gradient-to-br from-[#2A9D8F] to-[#238276] border-[#2A9D8F] text-white shadow-xl shadow-[#2A9D8F]/20'
                          : 'bg-gradient-to-br from-[#FDF6E3] to-[#F5EDD3] border-[#E9C46A] text-[#2C3E50] shadow-lg group-hover:shadow-xl group-hover:border-[#E76F51]'
                      }`}>
                        {isLocked ? (
                          <Lock size={22} className="opacity-60" />
                        ) : isDone ? (
                          <Star size={22} fill="currentColor" />
                        ) : (
                          <span className="font-serif font-bold text-xl">{index + 1}</span>
                        )}
                      </div>

                      {/* Indicateur "En cours" */}
                      {isActive && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#E76F51] rounded-full border-2 border-white animate-pulse"></div>
                      )}
                    </div>

                    {/* Labels */}
                    <div className="text-center max-w-[120px]">
                      <p className={`text-xs font-bold uppercase tracking-wider mb-1 transition-colors ${
                        isActive ? 'text-[#E76F51]' : isDone ? 'text-[#2A9D8F]' : 'text-[#2C3E50] group-hover:text-[#E76F51]'
                      }`}>
                        {session.eras.label}
                      </p>
                      <p className="text-[10px] text-[#47627D]/70">
                        {session.eras.start_age}-{session.eras.end_age} ans
                      </p>
                    </div>
                  </Link>
                </div>
              );
            }) : (
              <div className="flex items-center gap-3 text-[#E76F51] py-4">
                <RotateCcw className="animate-spin" size={20} />
                <span className="text-sm font-medium">Initialisation de votre fresque...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 mt-12 pb-24 space-y-8">
        {/* 2. CARTE ACTION PRINCIPALE */}
        {currentSession && (
          <section className="animate-in slide-in-from-bottom-4 fade-in duration-700">
            <div className="bg-gradient-to-br from-white via-white to-[#FDF6E3]/30 rounded-[2rem] p-10 shadow-2xl border border-[#E76F51]/10 text-center relative overflow-hidden group hover:shadow-3xl transition-all duration-300">
              {/* Barre décorative du haut */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#2A9D8F] via-[#E76F51] to-[#E9C46A] group-hover:h-3 transition-all duration-300"></div>

              {/* Badge "En cours" */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#E76F51]/10 text-[#E76F51] rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                <div className="w-2 h-2 bg-[#E76F51] rounded-full animate-pulse"></div>
                Ère en cours
              </div>

              {/* Titre de l'ère */}
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#2C3E50] mb-4 leading-tight">
                {currentSession.eras.label}
              </h1>

              {/* Description */}
              <p className="text-base text-[#47627D] mb-8 max-w-md mx-auto leading-relaxed">
                {currentSession.eras.description}
              </p>

              {/* CTA Button */}
              <Link
                href={`/dashboard/interview/${currentSession.id}`}
                className="inline-flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-[#E76F51] to-[#D65D40] text-white font-bold text-lg rounded-2xl shadow-2xl shadow-[#E76F51]/30 hover:shadow-3xl hover:shadow-[#E76F51]/40 hover:scale-105 transition-all duration-300 group"
              >
                <Play fill="currentColor" size={20} className="group-hover:scale-110 transition-transform" />
                <span>Reprendre le fil de votre histoire</span>
              </Link>

              {/* Statistiques rapides */}
              <div className="mt-8 pt-6 border-t border-[#FDF6E3] flex justify-center gap-8">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#2A9D8F]">{timeline.filter(s => s.status === 'completed').length}</p>
                  <p className="text-xs text-[#47627D] uppercase tracking-wider">Ères complétées</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#E9C46A]">{timeline.filter(s => s.status !== 'locked').length}</p>
                  <p className="text-xs text-[#47627D] uppercase tracking-wider">Ères débloquées</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 3. SECTION LIVRE - Plus moderne */}
        <section className="relative">
          <div className={`bg-white rounded-[2rem] p-8 shadow-xl border border-[#2C3E50]/5 relative overflow-hidden transition-all duration-300 ${
            progressPercent === 100 ? 'opacity-100' : 'opacity-60'
          }`}>
            {/* Overlay si verrouillé */}
            {progressPercent < 100 && (
              <div className="absolute inset-0 bg-gradient-to-br from-[#FDF6E3]/80 to-[#FDF6E3]/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
                <div className="text-center px-6">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Lock size={28} className="text-[#47627D]" />
                  </div>
                  <p className="font-bold text-[#2C3E50] text-lg mb-2">Livre verrouillé</p>
                  <p className="text-sm text-[#47627D]">
                    Complétez toutes les ères pour déverrouiller votre livre
                  </p>
                </div>
              </div>
            )}

            {/* Contenu */}
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-[#2C3E50] to-[#1A252F] text-white rounded-2xl shadow-lg">
                <Book size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-serif font-bold text-[#2C3E50]">Votre Livre de Vie</h3>
                <p className="text-sm text-[#47627D]">La compilation de votre histoire</p>
              </div>
            </div>

            {/* Barre de progression améliorée */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-[#47627D]">Progression globale</span>
                <span className="text-[#2A9D8F] font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full h-4 bg-[#FDF6E3] rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-[#2A9D8F] via-[#2A9D8F] to-[#238276] transition-all duration-500 rounded-full relative overflow-hidden"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>
              <p className="text-xs text-[#47627D] text-center">
                {progressPercent === 100
                  ? '✨ Votre livre est prêt à être téléchargé !'
                  : `Encore ${timeline.filter(s => s.status !== 'completed').length} ères à compléter`}
              </p>
            </div>

            {/* Bouton générer mon livre (si 100%) */}
            {progressPercent === 100 && (
              <GenerateBookButton />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}