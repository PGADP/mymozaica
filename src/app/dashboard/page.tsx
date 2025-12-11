import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Play, Lock, Book, Clock, Sparkles, Check } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { GenerateBookButton } from "@/components/dashboard/GenerateBookButton";
import { TestModeButton } from "@/components/dashboard/TestModeButton";

// DÉFINITION DES ÈRES avec sujets suggérés pour guider l'Interviewer
const DEFAULT_ERAS = [
  {
    label: 'Petite enfance',
    start_age: 0,
    end_age: 5,
    order: 1,
    description: 'Premiers pas, premières images.',
    suggested_topics: [
      { sujet: 'Contexte de naissance', description: "Circonstances de l'accouchement (hôpital, domicile, urgence), conditions météorologiques ou historiques ce jour-là, choix du prénom (signification, débats), poids/taille, anecdotes racontées par les proches." },
      { sujet: 'Figures parentales', description: "Situation du couple à la naissance, leurs métiers et horaires (absences, présence), leur caractère perçu par l'enfant (autorité, douceur, anxiété), le climat émotionnel à la maison." },
      { sujet: 'Lieux et Habitat', description: "Description de la première chambre, odeurs de la maison, déménagements précoces, agencement des pièces, jardin ou cour, quartier (bruits de la rue, voisins marquants), maison des grands-parents." },
      { sujet: 'Éveil sensoriel', description: "Objets transitionnels (doudou, tétine), plats préférés ou détestés (textures, goûts), berceuses ou musiques entendues, peurs irrationnelles (le noir, le placard, un animal), premières maladies infantiles." },
      { sujet: 'Cercle élargi', description: "Fratrie (jalousie, protection, jeux), rôle des grands-parents ou nourrices (garde, vacances), animaux de compagnie, premiers camarades de jeu ou cousins." },
    ]
  },
  {
    label: 'Enfance',
    start_age: 5,
    end_age: 12,
    order: 2,
    description: "L'école primaire, les découvertes.",
    suggested_topics: [
      { sujet: 'Vie scolaire', description: "Trajet vers l'école (seul, accompagné, bus), instituteurs marquants (sévères, inspirants), matières préférées vs détestées, bulletin scolaire, la cour de récréation (jeux, clans, bagarres, solitude)." },
      { sujet: 'Loisirs et Passions', description: "Activités extrascolaires (sport, musique, art), collections (timbres, billes, cartes), héros de fiction (livres, dessins animés, films), jouets emblématiques (Lego, poupées, consoles), jeux vidéo." },
      { sujet: 'Dynamique familiale', description: "Rituels (repas du dimanche, soirées télé), répartition des tâches, règles de vie (strictes ou laxistes), vacances annuelles (camping, location, famille), fêtes religieuses ou laïques." },
      { sujet: 'Amitiés et Socialisation', description: "Le meilleur ami ou la meilleure amie, les premières trahisons, les groupes d'appartenance, les invitations à dormir, les anniversaires des copains." },
      { sujet: 'Conscience du monde', description: "Compréhension de l'argent (argent de poche), perception de l'actualité (souvenirs d'événements historiques vus à la TV), rapport à l'autorité extérieure (police, docteurs)." },
    ]
  },
  {
    label: 'Adolescence',
    start_age: 12,
    end_age: 21,
    order: 3,
    description: 'Le collège, le lycée, devenir soi.',
    suggested_topics: [
      { sujet: 'Collège / Lycée', description: "Changement de rythme, poids du regard des autres, harcèlement ou popularité, pression des examens (Brevet, Bac), professeurs mentors ou ennemis, les heures de permanence, la cantine." },
      { sujet: 'Puberté et Identité', description: "Rapport au corps qui change (complexes, style vestimentaire, acné), affirmation de soi (rébellion, conformisme), découverte de la sexualité, orientation sexuelle, questionnements de genre." },
      { sujet: 'Premiers émois', description: "Premiers baisers, premiers couples, amours platoniques, chagrins d'amour, découverte de l'intimité, importance du téléphone/réseaux sociaux dans la drague." },
      { sujet: 'Indépendance progressive', description: "Premières sorties sans parents, obtention du permis de conduire (le code, les leçons), premiers jobs d'été ou baby-sitting, gestion du premier budget personnel, désir de quitter le foyer." },
      { sujet: 'Culture et Tribus', description: "Goûts musicaux définissant l'époque, concerts, cinéma, appartenance à une sous-culture (rock, rap, geek, sportif, gothique), influence politique ou religieuse naissante." },
    ]
  },
  {
    label: 'Jeune Adulte',
    start_age: 21,
    end_age: 30,
    order: 4,
    description: "L'indépendance, les premiers choix.",
    suggested_topics: [
      { sujet: 'Études Supérieures', description: "Départ du foyer familial, vie étudiante (colocation, campus, fêtes), choix de la filière (vocation ou hasard), difficultés académiques, stages, Erasmus/échanges internationaux." },
      { sujet: 'Entrée dans la vie active', description: "Recherche du premier vrai emploi, entretiens d'embauche, premier salaire (et comment il a été dépensé), ambiance au bureau, désillusions ou passions professionnelles, hiérarchie." },
      { sujet: 'Logement et Autonomie', description: "Premier appartement à soi, gestion du quotidien (courses, ménage, factures), décoration, solitude vs vie sociale intense, galères financières (découverts, prêts étudiants)." },
      { sujet: 'Vie sentimentale sérieuse', description: "Installation en couple, vie commune, définition de projets à deux, ruptures significatives impactant la trajectoire de vie, célibat choisi ou subi." },
      { sujet: 'Voyages et Explorations', description: "Voyages initiatiques (sac à dos, humanitaire), découverte d'autres cultures, prise de risques, élargissement de la vision du monde." },
    ]
  },
  {
    label: 'Construction',
    start_age: 30,
    end_age: 40,
    order: 5,
    description: 'Bâtir sa vie, carrière, famille.',
    suggested_topics: [
      { sujet: 'Carrière et Ambition', description: "Promotions, prises de responsabilités, management d'équipes, changements de voie, création d'entreprise, équilibre vie pro/vie perso, stress et burn-out éventuel." },
      { sujet: 'Parentalité (ou non-désir)', description: "Désir d'enfant, parcours PMA/adoption, grossesse, accouchement, nuits sans sommeil, premiers pas, choix éducatifs, impact de l'enfant sur le couple. Ou choix assumé de ne pas avoir d'enfants." },
      { sujet: 'Patrimoine et Ancrage', description: "Achat immobilier (recherche, travaux, crédit sur 20 ans), achat de la voiture familiale, investissements, sentiment de s'installer ou de s'enraciner quelque part." },
      { sujet: 'Crises et Défis', description: "Séparations/Divorces, gestion de la garde alternée, perte de proches, problèmes de santé soudains, remise en question des choix de la vingtaine." },
      { sujet: 'Vie sociale', description: "Évolution des amitiés (les amis qui ont des enfants vs ceux qui n'en ont pas), manque de temps, dîners mondains ou simples, engagement associatif ou politique." },
    ]
  },
  {
    label: 'Maturation',
    start_age: 40,
    end_age: 50,
    order: 6,
    description: "L'affirmation, le milieu de vie.",
    suggested_topics: [
      { sujet: 'Évolution des enfants', description: "L'adolescence des enfants, conflits, départ de la maison (syndrome du nid vide), fierté et inquiétudes, relation d'adulte à adulte avec eux." },
      { sujet: 'La Génération Pivot', description: "Gestion des parents vieillissants (dépendance, EHPAD, décès), être pris en étau entre les besoins des enfants et ceux des parents, gestion des successions." },
      { sujet: 'Le cap de la cinquantaine', description: "Bilan de mi-vie, crise de la quarantaine/cinquantaine (achat impulsif, changement de look, liaison), acceptation du vieillissement physique (vue, dos, ménopause/andropause)." },
      { sujet: 'Stabilité ou Rupture Pro', description: "Sommet de la carrière, expertise reconnue, ou au contraire lassitude profonde, reconversion radicale, désir de sens plutôt que d'argent." },
      { sujet: 'Nouveaux Projets', description: "Résidence secondaire, grands voyages reportés, reprise d'études ou de passions artistiques abandonnées, sport pour se maintenir." },
    ]
  },
  {
    label: 'Sagesse',
    start_age: 50,
    end_age: 60,
    order: 7,
    description: 'Transmission et nouveaux horizons.',
    suggested_topics: [
      { sujet: 'Préparation à la retraite', description: "Anticipation financière, peur de l'inactivité ou impatience, transmission des dossiers au travail, mentorat des plus jeunes, réduction du temps de travail." },
      { sujet: 'Grands-parents', description: "Arrivée des petits-enfants, rôle de grand-parent (gâteau vs éducation), relation avec les gendres/belles-filles, redécouverte de la petite enfance sans la charge mentale." },
      { sujet: 'Le Couple', description: "Redécouverte du conjoint une fois les enfants partis, nouveau souffle ou séparation tardive (divorce gris), voyages en couple, aménagement de la maison pour deux." },
      { sujet: 'Santé et Corps', description: "Premières alertes sérieuses, interventions chirurgicales, importance de l'hygiène de vie, résilience face à la maladie, décès d'amis du même âge." },
      { sujet: 'Bilan intellectuel', description: "Réflexion sur le parcours accompli, regrets et fiertés, écriture, généalogie, tri des souvenirs (photos, objets)." },
    ]
  },
  {
    label: 'Grand Âge',
    start_age: 60,
    end_age: 120,
    order: 8,
    description: 'Le temps de la mémoire.',
    suggested_topics: [
      { sujet: 'La Retraite au quotidien', description: "Nouvelle routine, bénévolat, vie associative, jardinage/bricolage, sentiment de liberté vs sentiment d'inutilité sociale, gestion de l'ennui." },
      { sujet: 'Transmission', description: "Volonté de laisser une trace, raconter son histoire, transmettre des valeurs ou des biens matériels, secrets de famille révélés ou tus." },
      { sujet: 'Adaptation au monde', description: "Regard sur la technologie moderne, l'évolution des mœurs, critique ou admiration de la jeunesse actuelle, sentiment de décalage ou de connexion." },
      { sujet: 'Deuils et Solitude', description: "Perte du conjoint, solitude, rétrécissement du cercle amical, résilience, importance des animaux de compagnie ou des aides à domicile." },
      { sujet: 'Philosophie de vie', description: "Sagesse acquise, sérénité face à la mort, spiritualité ou athéisme affirmé, les leçons de vie à donner, la définition du bonheur a posteriori." },
    ]
  },
];

// Interface pour les sujets bonus
interface BonusTopic {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
}

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

  // 2. Vérifier et réparer les SESSIONS
  const { data: existingSessions, count } = await supabaseAdmin
    .from('chat_sessions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  // Vérifier si au moins une session est unlocked ou in_progress
  const hasActiveSession = existingSessions?.some(s => s.status === 'unlocked' || s.status === 'in_progress');

  // Si aucune session active, réparer en déverrouillant la première
  if (existingSessions && existingSessions.length > 0 && !hasActiveSession) {
    console.log('🔧 Réparation: aucune session active, déverrouillage de la première...');

    // Trouver la première session (par era order)
    const { data: firstSession } = await supabaseAdmin
      .from('chat_sessions')
      .select('id, era_id, eras!inner(order)')
      .eq('user_id', userId)
      .order('eras(order)', { ascending: true })
      .limit(1)
      .single();

    if (firstSession) {
      await supabaseAdmin
        .from('chat_sessions')
        .update({ status: 'unlocked' })
        .eq('id', firstSession.id);
      console.log('✅ Session déverrouillée:', firstSession.id);
    }
  }

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

    console.log(`👤 Utilisateur a ${age} ans`);

    // Filtrer les ères selon l'âge actuel :
    // On ne garde QUE les ères où l'utilisateur a vécu (start_age < age actuel)
    // Exemple: 26 ans = 0-5 ✓, 5-12 ✓, 12-21 ✓, 21-30 ✓ (on est dedans), 30-40 ✗
    const relevantEras = eras
      .sort((a: any, b: any) => a.order - b.order)
      .filter((era: any) => era.start_age < age);

    console.log(`📚 Ères pertinentes: ${relevantEras.map((e: any) => e.label).join(', ')}`);

    // Créer les sessions - TOUJOURS commencer par la première ère (0-5 ans)
    const sessions = relevantEras.map((era: any, index: number) => {
      // Seule la PREMIÈRE ère (0-5 ans, order=1) est déverrouillée
      const status = index === 0 ? 'unlocked' : 'locked';

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

  // Récupérer UNIQUEMENT les sessions normales (exclure les sessions bonus)
  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select(`*, eras (*)`)
    .is('bonus_topic_id', null)  // Exclure les sessions bonus de la frise chronologique
    .order('eras(start_age)', { ascending: true });

  const timeline = sessions?.sort((a, b) => (a.eras?.start_age || 0) - (b.eras?.start_age || 0)) || [];

  // Debug: Afficher les statuts des sessions
  console.log('📊 Sessions timeline:', timeline.map(s => ({ era: s.eras?.label, status: s.status })));

  // Trouver la session courante (in_progress > unlocked > première session non complétée)
  const currentSession = timeline.find(s => s.status === 'in_progress')
    || timeline.find(s => s.status === 'unlocked')
    || timeline.find(s => s.status !== 'completed'); // Fallback: première session non terminée

  const completedSessions = timeline.filter(s => s.status === 'completed');

  console.log('🎯 Current session:', currentSession?.eras?.label, '| Status:', currentSession?.status);

  const progressPercent = Math.round(((completedSessions.length || 0) / (timeline.length || 1)) * 100);
  const isBookUnlocked = progressPercent >= 60; // Déverrouillé à 60%

  // Récupérer les sujets bonus dynamiques générés par l'Analyste
  const { data: bonusTopicsData } = await supabase
    .from('bonus_topics')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(6);

  const bonusTopics: BonusTopic[] = bonusTopicsData || [];

  return (
    <div className="min-h-screen bg-[#FDF6E3]">
      {/* HEADER */}
      <Header user={{
        email: profile?.email || user.email || '',
        first_name: profile?.first_name,
        last_name: profile?.last_name
      }} />

      {/* CONTENU PRINCIPAL */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">

        {/* Message de bienvenue */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold text-[#2C3E50] mb-1">
              Bonjour {profile?.first_name || 'cher auteur'}
            </h1>
            <p className="text-[#47627D]">
              Continuons à construire l'histoire de votre vie
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm">
            <span className="text-[#47627D]">Progression globale</span>
            <span className="font-bold text-2xl text-[#E76F51]">{progressPercent}%</span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 1 : FRISE CHRONOLOGIQUE PAR ÂGES
        ═══════════════════════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl p-8 border border-[#E76F51]/10 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#2C3E50] mb-1">
              Votre parcours de vie
            </h2>
            <p className="text-sm text-[#47627D]">
              {completedSessions.length} chapitres complétés sur {timeline.length}
            </p>
          </div>

          {/* Timeline horizontale */}
          <div className="relative">
            {/* Barre de fond */}
            <div className="h-2 bg-[#FDF6E3] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E76F51] transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Jalons par tranches d'âge */}
            <div className="relative mt-8">
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${timeline.length}, 1fr)` }}>
                {timeline.map((session) => {
                  const isActive = session.status === 'in_progress' || session.status === 'unlocked';
                  const isLocked = session.status === 'locked';
                  const isDone = session.status === 'completed';

                  return (
                    <Link
                      key={session.id}
                      href={!isLocked ? `/dashboard/interview/${session.id}` : '#'}
                      className={`text-center group ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 mx-auto -mt-[26px] mb-4 transition-all ${
                        isDone
                          ? 'bg-[#2A9D8F] border-[#2A9D8F] scale-125'
                          : isActive
                          ? 'bg-[#E76F51] border-[#E76F51] scale-125 animate-pulse'
                          : 'bg-white border-[#E9C46A]'
                      }`} />
                      <div className={`text-xs font-bold mb-1 transition-colors ${
                        isDone ? 'text-[#2A9D8F]' : isActive ? 'text-[#E76F51]' : 'text-[#47627D]'
                      }`}>
                        {session.eras.start_age}-{session.eras.end_age} ans
                      </div>
                      <div className="text-[10px] text-[#47627D] hidden md:block">
                        {session.eras.label}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 2 : REPRENDRE LE DERNIER SUJET / COMMENCER
        ═══════════════════════════════════════════════════════════ */}
        {currentSession ? (
          <section>
            <h2 className="text-sm font-bold text-[#47627D] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Clock size={16} />
              {completedSessions.length === 0 ? 'Commencez votre première interview' : 'Reprendre là où vous en étiez'}
            </h2>

            <div className="bg-white border border-[#E76F51]/30 rounded-3xl p-6 md:p-8 shadow-lg hover:border-[#E76F51] hover:shadow-xl transition-all group">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

                <div className="flex-1">
                  {/* Badge statut */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E76F51]/10 text-[#E76F51] rounded-full text-xs font-bold uppercase mb-3">
                    <div className="w-2 h-2 bg-[#E76F51] rounded-full animate-pulse" />
                    {completedSessions.length === 0 ? 'Prêt à démarrer' : 'En cours'}
                  </div>

                  {/* Titre */}
                  <h3 className="text-2xl md:text-3xl font-serif font-bold text-[#2C3E50] mb-2">
                    {currentSession.eras.label}
                  </h3>

                  {/* Description */}
                  <p className="text-[#47627D] italic max-w-xl">
                    "{currentSession.eras.description}"
                  </p>
                </div>

                {/* CTA */}
                <Link
                  href={`/dashboard/interview/${currentSession.id}`}
                  className="bg-[#E76F51] hover:bg-[#D65D40] text-white py-3 px-8 rounded-xl shadow-xl shadow-[#E76F51]/20 flex items-center gap-3 font-bold transition-all group-hover:shadow-2xl group-hover:shadow-[#E76F51]/30"
                >
                  <Play fill="currentColor" size={20} />
                  {completedSessions.length === 0 ? 'Commencer' : 'Continuer'}
                </Link>
              </div>
            </div>
          </section>
        ) : timeline.length > 0 ? (
          /* Fallback: Afficher la première ère disponible */
          <section>
            <h2 className="text-sm font-bold text-[#47627D] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Clock size={16} />
              Commencez votre première interview
            </h2>

            <div className="bg-white border border-[#E76F51]/30 rounded-3xl p-6 md:p-8 shadow-lg hover:border-[#E76F51] hover:shadow-xl transition-all group">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

                <div className="flex-1">
                  {/* Badge statut */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E76F51]/10 text-[#E76F51] rounded-full text-xs font-bold uppercase mb-3">
                    <div className="w-2 h-2 bg-[#E76F51] rounded-full animate-pulse" />
                    Prêt à démarrer
                  </div>

                  {/* Titre */}
                  <h3 className="text-2xl md:text-3xl font-serif font-bold text-[#2C3E50] mb-2">
                    {timeline[0].eras.label}
                  </h3>

                  {/* Description */}
                  <p className="text-[#47627D] italic max-w-xl">
                    "{timeline[0].eras.description}"
                  </p>
                </div>

                {/* CTA */}
                <Link
                  href={`/dashboard/interview/${timeline[0].id}`}
                  className="bg-[#E76F51] hover:bg-[#D65D40] text-white py-3 px-8 rounded-xl shadow-xl shadow-[#E76F51]/20 flex items-center gap-3 font-bold transition-all group-hover:shadow-2xl group-hover:shadow-[#E76F51]/30"
                >
                  <Play fill="currentColor" size={20} />
                  Commencer
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {/* ═══════════════════════════════════════════════════════════
            SECTION 3 : CHAPITRES BONUS (générés dynamiquement par l'Analyste)
        ═══════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#2C3E50] flex items-center gap-2">
              <Sparkles size={20} className="text-[#2A9D8F]" />
              Chapitres bonus
            </h2>
            {bonusTopics.length > 0 && (
              <span className="text-sm text-[#47627D]">{bonusTopics.length} disponibles</span>
            )}
          </div>

          {bonusTopics.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bonusTopics.map((topic) => (
                <Link
                  key={topic.id}
                  href={`/dashboard/interview/bonus/${topic.id}`}
                  className="group bg-white rounded-xl p-5 border border-[#2A9D8F]/20 hover:border-[#2A9D8F] hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#2A9D8F]/10 text-[#2A9D8F] rounded-full text-xs font-bold uppercase">
                      <Sparkles size={12} />
                      {topic.category || 'BONUS'}
                    </span>
                    {topic.status === 'completed' && (
                      <Check size={18} className="text-[#2A9D8F]" />
                    )}
                  </div>

                  <h3 className="font-bold text-[#2C3E50] mb-2 group-hover:text-[#2A9D8F] transition">
                    {topic.title}
                  </h3>

                  <p className="text-sm text-[#47627D] italic mb-4 line-clamp-2">
                    "{topic.description}"
                  </p>

                  <div className="flex items-center justify-between text-xs pt-3 border-t border-[#FDF6E3]">
                    {topic.status === 'completed' ? (
                      <>
                        <span className="text-[#2A9D8F] font-medium">Complété</span>
                        <span className="text-[#2A9D8F] group-hover:underline font-medium">Consulter →</span>
                      </>
                    ) : topic.status === 'in_progress' ? (
                      <>
                        <span className="text-[#E76F51] font-medium">En cours</span>
                        <span className="text-[#2A9D8F] group-hover:underline font-medium">Continuer →</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[#47627D]">À découvrir</span>
                        <span className="text-[#2A9D8F] group-hover:underline font-medium">Commencer →</span>
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white/50 border border-dashed border-[#2A9D8F]/30 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#2A9D8F]/10 rounded-full flex items-center justify-center">
                <Sparkles size={28} className="text-[#2A9D8F]" />
              </div>
              <h3 className="text-lg font-bold text-[#2C3E50] mb-2">
                Vos chapitres bonus apparaîtront ici
              </h3>
              <p className="text-sm text-[#47627D] max-w-md mx-auto">
                Au fil de vos interviews, l'IA détectera des sujets passionnants à approfondir :
                voyages, rencontres marquantes, passions... Ces chapitres bonus enrichiront votre livre.
              </p>
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 4 : GÉNÉRATION DU LIVRE
        ═══════════════════════════════════════════════════════════ */}
        <section>
          <div className={`relative rounded-3xl overflow-hidden border-2 ${
            isBookUnlocked
              ? 'border-[#E76F51] bg-gradient-to-br from-[#E76F51] to-[#D65D40]'
              : 'border-[#47627D]/20 bg-gradient-to-br from-[#47627D] to-[#2C3E50]'
          }`}>
            <div className="relative z-10 p-8 md:p-12 text-white text-center">

              {/* Badge unlock */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full font-bold text-sm">
                  {isBookUnlocked ? (
                    <>
                      <Lock size={18} className="text-white" />
                      Déverrouillé à {progressPercent}%
                    </>
                  ) : (
                    <>
                      <Lock size={18} />
                      Verrouillé - {60 - progressPercent}% restants
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
                    {isBookUnlocked ? 'Prêt à créer votre livre' : 'Votre livre en préparation'}
                  </h2>
                  <p className="text-white/80 text-lg max-w-2xl mx-auto">
                    {isBookUnlocked
                      ? 'Vous avez partagé suffisamment de souvenirs. Transformons-les en un récit captivant.'
                      : 'Continuez à raconter votre histoire pour débloquer la génération de votre livre.'}
                  </p>
                </div>

                {/* Bouton génération */}
                {isBookUnlocked && (
                  <div className="flex justify-center">
                    <GenerateBookButton />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 5 : HISTORIQUE DES CHAPITRES COMPLÉTÉS
        ═══════════════════════════════════════════════════════════ */}
        {completedSessions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#2C3E50] flex items-center gap-2">
                <Check size={20} className="text-[#2A9D8F]" />
                Vos chapitres complétés
              </h2>
              <span className="text-sm text-[#47627D]">{completedSessions.length} terminés</span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedSessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/dashboard/interview/${session.id}`}
                  className="group bg-white rounded-xl p-5 border border-[#2A9D8F]/20 hover:border-[#2A9D8F] hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#2A9D8F]/10 flex items-center justify-center flex-shrink-0">
                        <Check size={16} className="text-[#2A9D8F]" />
                      </div>
                      <h3 className="font-bold text-[#2C3E50] group-hover:text-[#E76F51] transition">
                        {session.eras.label}
                      </h3>
                    </div>
                    <Book size={16} className="text-[#47627D] group-hover:text-[#E76F51] transition" />
                  </div>

                  <p className="text-xs text-[#47627D] italic mb-3 line-clamp-2">
                    "{session.eras.description}"
                  </p>

                  <div className="flex items-center justify-between text-xs pt-3 border-t border-[#FDF6E3]">
                    <span className="text-[#2A9D8F] font-medium">Complété</span>
                    <span className="text-[#E76F51] group-hover:underline">Consulter</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* BOUTON TEST MODE - À SUPPRIMER EN PRODUCTION */}
      <TestModeButton />
    </div>
  );
}
