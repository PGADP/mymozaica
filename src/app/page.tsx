'use client';

import Link from 'next/link';
import { Mic, BookOpen, PenTool, CheckCircle, Sparkles, ArrowRight, ShieldCheck, Heart } from 'lucide-react';

export default function LandingPage() {
  // Fonction de navigation fluide
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white font-body text-text-main selection:bg-primary/20">

      {/* --- HEADER --- */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

          {/* LOGO HEADER */}
          <Link href="/" className="block hover:opacity-90 transition-opacity">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-heading font-bold text-xl">M</div>
              <span className="font-heading font-bold text-xl text-text-main">My Mozaïca</span>
            </div>
          </Link>

          <nav className="hidden md:flex gap-8 text-sm font-bold font-body text-gray-600 uppercase tracking-wider">
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-primary transition">Comment ça marche</button>
            <button onClick={() => scrollToSection('pricing')} className="hover:text-primary transition">Tarif</button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-primary transition">FAQ</button>
          </nav>

          <div className="hidden md:flex items-center gap-6 font-body">
            <Link href="/login" className="hidden md:block font-medium text-sm text-gray-600 hover:text-primary transition">
              Se connecter
            </Link>
            <Link
              href="/onboarding"
              className="btn-primary shadow-glow">
              Commencer mon livre
            </Link>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">

          {/* COLONNE GAUCHE : TEXTE */}
          <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-700 fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} /> Technologie d'Intelligence Artificielle
            </div>

            <h1 className="font-heading text-5xl md:text-7xl font-bold leading-[1.1] text-gray-900">
              Vos souvenirs deviennent un <span className="text-primary">livre éternel</span>.
            </h1>

            <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-lg font-medium">
              Racontez simplement votre vie à notre IA bienveillante. Nous l'écrivons, l'imprimons pour vous. Sans effort d'écriture, le tout de manière naturelle.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/onboarding"
                className="btn-primary text-lg py-4 px-8 shadow-glow hover:shadow-2xl hover:-translate-y-1"
              >
                Créer mon livre <ArrowRight size={20} />
              </Link>
              <div className="flex items-center gap-4 px-4 py-2 text-sm text-gray-500">
                <ShieldCheck size={18} className="text-secondary" />
                <span>Données protégées</span>
              </div>
            </div>
          </div>

          {/* COLONNE DROITE : VISUEL ÉVOCATEUR */}
          <div className="relative animate-in slide-in-from-right-10 duration-1000 fade-in delay-200 hidden lg:block">
            {/* CERCLE DE FOND */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-3xl opacity-60"></div>

            <div className="relative z-10 flex items-center justify-center">
              {/* ELEMENT 1 : L'App (Mobile) */}
              <div className="absolute left-0 bottom-0 w-48 bg-white rounded-[2rem] shadow-2xl border-4 border-gray-900 p-4 transform -rotate-6 z-20">
                <div className="w-12 h-1 bg-gray-300 rounded-full mb-4 mx-auto"></div>
                <div className="space-y-3">
                  <div className="bg-primary p-3 rounded-tl-xl rounded-tr-xl rounded-br-xl text-xs text-white">
                    Raconte-moi ton souvenir d'école préféré ?
                  </div>
                  <div className="bg-gray-100 p-3 rounded-tl-xl rounded-tr-xl rounded-bl-xl text-xs text-gray-700 ml-auto border border-gray-200">
                    <Mic size={12} className="inline mr-1 text-primary" /> C'était en 1968, l'école du village...
                  </div>
                </div>
                <div className="mt-8 flex justify-center">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg animate-pulse">
                    <Mic size={24} className="text-white" />
                  </div>
                </div>
              </div>

              {/* ELEMENT 2 : Le Livre (Résultat) */}
              <div className="relative bg-white w-64 h-80 rounded-r-lg rounded-l-sm shadow-2xl border border-gray-200 transform rotate-6 z-10 flex flex-col overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-gray-300 to-transparent z-20"></div>
                <div className="p-6 flex flex-col h-full items-center justify-center text-center border-l border-gray-100">
                  <div className="font-heading font-bold text-2xl text-gray-900 mb-2">Mémoires</div>
                  <div className="w-12 h-px bg-primary mb-4"></div>
                  <div className="font-body text-xs text-gray-500 italic">
                    "C'était en 1968, l'école du village avait une odeur de craie et de bois ciré..."
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- POUR QUI EST MY MOZAICA --- */}
      <section className="py-20 px-6 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-bold text-primary uppercase tracking-widest mb-3">Préservez ce qui compte vraiment</p>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-white">Pour qui est My Mozaïca ?</h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="group bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-primary/50 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary-hover rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="font-heading font-bold text-lg mb-2 text-white">Grands-Parents</h3>
              <p className="text-sm text-gray-400">Transmettez votre histoire de vie à vos petits-enfants</p>
            </div>

            <div className="group bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-purple-500/50 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="font-heading font-bold text-lg mb-2 text-white">Familles</h3>
              <p className="text-sm text-gray-400">Créez un héritage familial pour les générations futures</p>
            </div>

            <div className="group bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-pink-500/50 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-heading font-bold text-lg mb-2 text-white">Biographies</h3>
              <p className="text-sm text-gray-400">Racontez votre parcours professionnel ou personnel</p>
            </div>

            <div className="group bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-amber-500/50 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="font-heading font-bold text-lg mb-2 text-white">Héritages</h3>
              <p className="text-sm text-gray-400">Laissez un témoignage durable pour vos proches</p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-400 text-lg">
              <span className="font-semibold text-primary">Plus de 15 000 histoires</span> déjà préservées pour toujours
            </p>
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              De vos souvenirs à votre livre en 5 étapes
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Un processus guidé et intuitif qui respecte votre rythme et votre vie privée.
              Pas besoin de savoir écrire, nous nous occupons de tout.
            </p>
          </div>

          {/* Timeline verticale avec ligne de connexion */}
          <div className="relative max-w-5xl mx-auto">
            {/* Ligne verticale centrale (cachée sur mobile) */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-secondary to-amber-500 -translate-x-1/2"></div>

            {/* ETAPE 1 : Formulaire de démarrage */}
            <div className="relative mb-20">
              <div className="md:grid md:grid-cols-2 gap-8 items-center">
                <div className="md:text-right mb-8 md:mb-0">
                  <div className="inline-flex items-center gap-2 bg-primary text-white px-3 py-1 rounded-full text-sm font-bold mb-4">
                    <span className="w-6 h-6 bg-white text-primary rounded-full flex items-center justify-center text-xs font-bold">1</span>
                    DÉMARRAGE
                  </div>
                  <h3 className="font-heading text-2xl font-bold mb-3 text-gray-900">
                    Configurez votre profil
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Remplissez un formulaire rapide avec vos informations de base : nom, date de naissance, lieux importants.
                  </p>
                  <div className="inline-flex items-center gap-2 bg-red-100 border border-red-300 px-4 py-2 rounded-lg">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm text-red-700 font-semibold">
                      Définissez vos sujets sensibles à éviter
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200 shadow-lg">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-primary rounded-full"></div>
                        <div className="h-3 bg-gray-300 rounded w-32"></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-primary rounded-full"></div>
                        <div className="h-3 bg-gray-300 rounded w-40"></div>
                      </div>
                      <div className="flex items-center gap-3 opacity-50">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="h-3 bg-red-200 rounded w-36 line-through"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Point de connexion */}
              <div className="hidden md:block absolute left-1/2 top-8 w-5 h-5 bg-primary rounded-full -translate-x-1/2 ring-4 ring-white shadow-lg"></div>
            </div>

            {/* ETAPE 2 : Dashboard */}
            <div className="relative mb-20">
              <div className="md:grid md:grid-cols-2 gap-8 items-center">
                <div className="md:col-start-2 mb-8 md:mb-0">
                  <div className="inline-flex items-center gap-2 bg-secondary text-white px-3 py-1 rounded-full text-sm font-bold mb-4">
                    <span className="w-6 h-6 bg-white text-secondary rounded-full flex items-center justify-center text-xs font-bold">2</span>
                    ORGANISATION
                  </div>
                  <h3 className="font-heading text-2xl font-bold mb-3 text-gray-900">
                    Accédez à votre tableau de bord
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Découvrez tous les chapitres thématiques : Enfance, Adolescence, Vie Professionnelle, Parentalité, Voyages...
                  </p>
                  <p className="text-sm text-gray-500 italic">
                    Complétez-les dans l'ordre que vous souhaitez, à votre rythme. Aucune pression !
                  </p>
                </div>

                <div className="md:col-start-1 md:row-start-1 relative">
                  <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200 shadow-lg">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-secondary/10 border border-secondary/30 rounded-lg">
                        <span className="text-sm font-semibold text-gray-800">👶 Enfance</span>
                        <CheckCircle size={20} className="text-secondary" />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <span className="text-sm font-semibold text-gray-800">🎓 Adolescence</span>
                        <div className="w-5 h-5 border-2 border-amber-500 rounded-full"></div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-100 border border-gray-200 rounded-lg">
                        <span className="text-sm font-semibold text-gray-400">💼 Carrière</span>
                        <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-100 border border-gray-200 rounded-lg">
                        <span className="text-sm font-semibold text-gray-400">👨‍👩‍👧 Famille</span>
                        <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Point de connexion */}
              <div className="hidden md:block absolute left-1/2 top-8 w-5 h-5 bg-secondary rounded-full -translate-x-1/2 ring-4 ring-white shadow-lg"></div>
            </div>

            {/* ETAPE 3 : Conversation type chat */}
            <div className="relative mb-20">
              <div className="md:grid md:grid-cols-2 gap-8 items-center">
                <div className="md:text-right mb-8 md:mb-0">
                  <div className="inline-flex items-center gap-2 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold mb-4">
                    <span className="w-6 h-6 bg-white text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                    INTERVIEW
                  </div>
                  <h3 className="font-heading text-2xl font-bold mb-3 text-gray-900">
                    Racontez dans un chat intuitif
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Interface de conversation type WhatsApp. L'IA vous pose des questions, vous répondez naturellement.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-end">
                    <div className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm">
                      <Mic className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-gray-700">Réponse vocale</span>
                    </div>
                    <div className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm">
                      <PenTool className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-semibold text-gray-700">Réponse écrite</span>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="bg-gray-900 rounded-2xl p-6 border-2 border-gray-700 shadow-lg">
                    <div className="space-y-4">
                      <div className="bg-primary p-3 rounded-tl-2xl rounded-tr-2xl rounded-br-2xl text-sm text-white max-w-[85%]">
                        Quel est votre premier souvenir d'école ?
                      </div>
                      <div className="bg-gray-700 p-3 rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl text-sm text-white ml-auto max-w-[85%]">
                        <div className="flex items-center gap-2 mb-1 text-xs text-gray-400">
                          <Mic size={12} className="text-primary" />
                          <span>Transcription en cours...</span>
                        </div>
                        "C'était en septembre 1968, l'institutrice s'appelait Mme Dubois..."
                      </div>
                      <div className="flex justify-center">
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg animate-pulse">
                          <Mic size={20} className="text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Point de connexion */}
              <div className="hidden md:block absolute left-1/2 top-8 w-5 h-5 bg-purple-600 rounded-full -translate-x-1/2 ring-4 ring-white shadow-lg"></div>
            </div>

            {/* ETAPE 4 : Génération du livre */}
            <div className="relative mb-20">
              <div className="md:grid md:grid-cols-2 gap-8 items-center">
                <div className="md:col-start-2 mb-8 md:mb-0">
                  <div className="inline-flex items-center gap-2 bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-bold mb-4">
                    <span className="w-6 h-6 bg-white text-amber-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                    GÉNÉRATION
                  </div>
                  <h3 className="font-heading text-2xl font-bold mb-3 text-gray-900">
                    L'IA rédige votre biographie
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Une fois suffisamment de chapitres complétés, générez votre livre complet. L'IA structure, corrige et met en forme vos souvenirs.
                  </p>
                  <div className="inline-flex items-center gap-2 bg-amber-100 border border-amber-300 px-4 py-2 rounded-lg">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    <span className="text-sm text-amber-700 font-semibold">
                      Traitement par IA en quelques minutes
                    </span>
                  </div>
                </div>

                <div className="md:col-start-1 md:row-start-1 relative">
                  <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200 shadow-lg">
                    <div className="flex items-center justify-center mb-4">
                      <div className="relative">
                        <svg className="w-16 h-16 animate-spin text-amber-500" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-600" size={24} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Analyse des souvenirs...</span>
                        <span className="font-bold text-amber-600">47%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full" style={{width: '47%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Point de connexion */}
              <div className="hidden md:block absolute left-1/2 top-8 w-5 h-5 bg-amber-500 rounded-full -translate-x-1/2 ring-4 ring-white shadow-lg"></div>
            </div>

            {/* ETAPE 5 : Vérification et téléchargement */}
            <div className="relative">
              <div className="md:grid md:grid-cols-2 gap-8 items-center">
                <div className="md:text-right mb-8 md:mb-0">
                  <div className="inline-flex items-center gap-2 bg-secondary text-white px-3 py-1 rounded-full text-sm font-bold mb-4">
                    <span className="w-6 h-6 bg-white text-secondary rounded-full flex items-center justify-center text-xs font-bold">5</span>
                    FINALISATION
                  </div>
                  <h3 className="font-heading text-2xl font-bold mb-3 text-gray-900">
                    Vérifiez et téléchargez
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Relisez votre biographie complète, modifiez ce que vous souhaitez, puis téléchargez votre PDF en haute définition.
                  </p>
                  <div className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/30 px-4 py-2 rounded-lg">
                    <BookOpen className="w-5 h-5 text-secondary" />
                    <span className="text-sm text-secondary font-semibold">
                      Prêt à imprimer ou partager
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200 shadow-lg">
                    <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-gray-900">Mémoires_Final.pdf</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">124 pages</span>
                      </div>
                      <div className="space-y-2 text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-secondary" />
                          <span>12 chapitres rédigés</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-secondary" />
                          <span>Mise en page professionnelle</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-secondary" />
                          <span>Format A5 - Qualité HD</span>
                        </div>
                      </div>
                    </div>
                    <button className="w-full bg-secondary text-white py-3 rounded-lg font-heading font-bold flex items-center justify-center gap-2 hover:bg-secondary-hover transition">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Télécharger mon livre
                    </button>
                  </div>
                </div>
              </div>

              {/* Point de connexion */}
              <div className="hidden md:block absolute left-1/2 top-8 w-5 h-5 bg-secondary rounded-full -translate-x-1/2 ring-4 ring-white shadow-lg"></div>
            </div>
          </div>
        </div>
      </section>

      {/* --- PREUVE EMOTIONNELLE --- */}
      <section className="py-24 bg-primary text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <Heart size={48} className="mx-auto text-white/50 mb-8 animate-pulse" />
          <h2 className="font-body text-2xl md:text-4xl leading-tight mb-8 italic font-light">
            "Je ne savais pas par où commencer. My Mozaïca m'a pris par la main. C'est plus simple que ce que j'imaginais. Aujourd'hui, mes petits-enfants lisent mon histoire."
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full border-2 border-white flex items-center justify-center text-lg font-bold">MD</div>
            <div className="text-left">
              <div className="font-heading font-bold">Monique D.</div>
              <div className="text-white/70 text-sm">Utilisatrice depuis 2 mois</div>
            </div>
          </div>
        </div>
      </section>

      {/* --- PRICING --- */}
      <section id="pricing" className="py-32 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-gray-900">Un tarif unique et transparent</h2>
          <p className="text-gray-600 mb-16 max-w-xl mx-auto">Pas d'abonnement caché. Vous payez une fois, vous avez accès à vie à la plateforme pour écrire votre histoire.</p>

          <div className="bg-white border border-gray-200 rounded-3xl shadow-xl p-10 md:p-16 max-w-lg mx-auto relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-4 py-2 rounded-bl-xl font-body tracking-widest">OFFRE DE LANCEMENT</div>

            <h3 className="text-2xl font-bold font-heading text-gray-900 mb-2">Pack Biographie</h3>
            <div className="flex justify-center items-baseline gap-2 my-8">
              <span className="text-6xl font-bold text-gray-900 font-heading">49€</span>
              <span className="text-gray-500 font-body">/ unique</span>
            </div>

            <ul className="text-left space-y-5 mb-12 text-gray-700 font-medium">
              <li className="flex items-center gap-4"><CheckCircle size={20} className="text-secondary flex-shrink-0"/> <span>Accès à vie au Dashboard</span></li>
              <li className="flex items-center gap-4"><CheckCircle size={20} className="text-secondary flex-shrink-0"/> <span>Enregistrement vocal illimité</span></li>
              <li className="flex items-center gap-4"><CheckCircle size={20} className="text-secondary flex-shrink-0"/> <span>Rédaction IA Premium</span></li>
              <li className="flex items-center gap-4"><CheckCircle size={20} className="text-secondary flex-shrink-0"/> <span>Export PDF Haute Définition</span></li>
            </ul>

            <Link
              href="/onboarding"
              className="w-full btn-primary text-lg py-4 shadow-glow block text-center"
            >
              Commencer maintenant
            </Link>

            <p className="text-xs text-gray-500 mt-6 flex justify-center gap-2 items-center">
              <span className="w-2 h-2 bg-secondary rounded-full"></span> Paiement sécurisé
            </p>
          </div>
        </div>
      </section>

      {/* --- FAQ --- */}
      <section id="faq" className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 mb-4">Questions fréquentes</h2>
            <p className="text-gray-600 text-lg">Tout ce que vous devez savoir sur My Mozaïca</p>
          </div>

          <div className="space-y-4">
            {/* Question 1 */}
            <details className="group bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-all">
              <summary className="flex items-center justify-between p-6 cursor-pointer font-heading font-bold text-lg text-gray-900 group-hover:text-primary transition">
                <span>Comment fonctionne l'enregistrement vocal ?</span>
                <svg className="w-6 h-6 text-primary transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                Vous cliquez sur le bouton microphone et répondez naturellement aux questions. L'IA transcrit automatiquement vos paroles en texte. Vous pouvez aussi taper votre réponse si vous préférez.
              </div>
            </details>

            {/* Question 2 */}
            <details className="group bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-all">
              <summary className="flex items-center justify-between p-6 cursor-pointer font-heading font-bold text-lg text-gray-900 group-hover:text-primary transition">
                <span>Combien de temps faut-il pour créer ma biographie ?</span>
                <svg className="w-6 h-6 text-primary transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                Tout dépend de vous ! Certains utilisateurs terminent en 2-3 heures, d'autres prennent plusieurs semaines pour raconter leur vie en détail. Vous pouvez revenir à tout moment et continuer où vous vous êtes arrêté.
              </div>
            </details>

            {/* Question 3 */}
            <details className="group bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-all">
              <summary className="flex items-center justify-between p-6 cursor-pointer font-heading font-bold text-lg text-gray-900 group-hover:text-primary transition">
                <span>Puis-je modifier le texte généré par l'IA ?</span>
                <svg className="w-6 h-6 text-primary transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                Absolument ! Vous avez un contrôle total sur chaque chapitre. Vous pouvez éditer, réorganiser ou réécrire n'importe quelle partie avant l'export final.
              </div>
            </details>

            {/* Question 4 */}
            <details className="group bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-all">
              <summary className="flex items-center justify-between p-6 cursor-pointer font-heading font-bold text-lg text-gray-900 group-hover:text-primary transition">
                <span>Mes données sont-elles sécurisées ?</span>
                <svg className="w-6 h-6 text-primary transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                Oui, vos souvenirs sont cryptés et stockés sur des serveurs sécurisés européens. Nous ne partageons jamais vos données avec des tiers. Vous êtes le seul propriétaire de votre histoire.
              </div>
            </details>

            {/* Question 5 */}
            <details className="group bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-all">
              <summary className="flex items-center justify-between p-6 cursor-pointer font-heading font-bold text-lg text-gray-900 group-hover:text-primary transition">
                <span>Quel format de livre vais-je recevoir ?</span>
                <svg className="w-6 h-6 text-primary transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                Vous recevez un PDF haute définition avec une mise en page professionnelle, prêt à imprimer chez votre imprimeur local ou sur des plateformes d'impression en ligne. Nous proposons également une option d'impression et livraison directe (en option).
              </div>
            </details>

            {/* Question 6 */}
            <details className="group bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-all">
              <summary className="flex items-center justify-between p-6 cursor-pointer font-heading font-bold text-lg text-gray-900 group-hover:text-primary transition">
                <span>Y a-t-il des frais supplémentaires après l'achat ?</span>
                <svg className="w-6 h-6 text-primary transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                Non, aucun. Le paiement unique de 49€ vous donne un accès à vie à toutes les fonctionnalités : enregistrements illimités, rédaction IA, exports PDF. Pas d'abonnement caché ni de frais mensuels.
              </div>
            </details>
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-500 mb-4">Une autre question ?</p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-primary font-semibold hover:text-primary-hover transition"
            >
              Contactez-nous
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-heading font-bold">M</div>
            <span className="font-heading font-bold text-lg text-white">My Mozaïca</span>
          </div>
          <div className="text-sm text-gray-400">
            © {new Date().getFullYear()} My Mozaïca. Tous droits réservés.
          </div>
          <div className="flex gap-6 text-sm font-medium text-gray-400">
            <Link href="#" className="hover:text-white transition">Mentions légales</Link>
            <Link href="#" className="hover:text-white transition">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
