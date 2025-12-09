import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Play, Lock, Book, Star, RotateCcw } from "lucide-react";

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

    const sessions = eras.map((era: any) => {
      let status = 'locked';
      const endAge = era.end_age || 100;
      if (age >= endAge) status = 'available';
      else if (age >= era.start_age && age < endAge) status = 'in_progress';
      
      return {
        user_id: userId,
        era_id: era.id,
        status: status,
        current_summary: `Début du chapitre : ${era.label}`
      };
    });
    
    await supabaseAdmin.from('chat_sessions').insert(sessions);
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
    <div className="min-h-screen bg-[#FDF6E3] text-[#2C3E50] font-sans pb-24">
      
      {/* 1. FRISE (Top) */}
      <div className="bg-white/80 backdrop-blur-md border-b border-[#E76F51]/10 sticky top-0 z-40 py-6 shadow-sm">
        <div className="max-w-full overflow-x-auto no-scrollbar px-8">
          <div className="flex items-center gap-12 min-w-max mx-auto justify-start md:justify-center">
            {timeline.length > 0 ? timeline.map((session, index) => {
              const isActive = session.status === 'in_progress';
              const isLocked = session.status === 'locked';
              const isDone = session.status === 'completed';
              
              return (
                <div key={session.id} className="relative group">
                  {index < timeline.length - 1 && (
                    <div className={`absolute top-8 left-16 w-12 h-1 -z-10 ${isLocked ? 'bg-gray-200' : 'bg-[#E76F51]/30'}`}></div>
                  )}
                  <Link href={!isLocked ? `/dashboard/interview/${session.id}` : '#'} className={`flex flex-col items-center gap-3 transition-all ${isActive ? 'scale-110' : 'hover:scale-105'} ${isLocked ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 shadow-lg ${
                      isActive ? 'bg-white border-[#E76F51] text-[#E76F51]' :
                      isDone ? 'bg-[#2A9D8F] border-[#2A9D8F] text-white' :
                      'bg-[#FDF6E3] border-[#E9C46A] text-[#2C3E50]'
                    }`}>
                      {isLocked ? <Lock size={20}/> : <span className="font-serif font-bold text-lg">{index+1}</span>}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold uppercase tracking-wider">{session.eras.label}</p>
                      <p className="text-[10px] text-[#47627D]/60">{session.eras.start_age}-{session.eras.end_age} ans</p>
                    </div>
                  </Link>
                </div>
              );
            }) : (
              <div className="flex items-center gap-2 text-[#E76F51]">
                <RotateCcw className="animate-spin" /> Initialisation... (Rafraîchissez dans 2s)
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-xl mx-auto px-6 mt-10 space-y-12">
        {/* 2. CARTE ACTION */}
        {currentSession && (
          <section className="animate-in slide-in-from-bottom-4 fade-in duration-700">
            <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-[#E76F51]/10 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#2A9D8F] via-[#E76F51] to-[#E9C46A]"></div>
              <h1 className="text-3xl font-serif font-bold text-[#2C3E50] mb-2 mt-2">{currentSession.eras.label}</h1>
              <p className="text-sm text-[#47627D] mb-6 line-clamp-2 px-4">"{currentSession.eras.description}"</p>
              <Link href={`/dashboard/interview/${currentSession.id}`} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#E76F51] text-white font-bold rounded-xl shadow-lg hover:bg-[#D65D40] transition-colors">
                <Play fill="currentColor" size={18} />
                <span>Reprendre le fil</span>
              </Link>
            </div>
          </section>
        )}
        
        {/* 3. LIVRE */}
        <section className="bg-white p-6 rounded-3xl border border-[#2C3E50]/5 opacity-70 grayscale">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#2C3E50] text-white rounded-lg"><Book size={20}/></div>
                <h3 className="font-bold text-[#2C3E50]">Votre Livre</h3>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-[#E76F51]" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <p className="text-xs text-gray-400 text-center">Verrouillé jusqu'à 100%</p>
        </section>
      </main>
    </div>
  );
}