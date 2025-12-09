import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream font-sans text-slate selection:bg-terracotta selection:text-white">
      
      {/* Navbar Minimaliste */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-terracotta rounded-full flex items-center justify-center text-white font-serif font-bold">M</div>
          <span className="font-serif font-bold text-lg tracking-tight">My Mozaïca</span>
        </div>
        <div className="flex gap-4 text-sm font-medium">
          <Link href="/login" className="px-4 py-2 hover:text-terracotta transition-colors">
            J'ai déjà un compte
          </Link>
          <Link href="/start" className="px-4 py-2 bg-emerald text-white rounded-lg hover:bg-emerald-dark transition-all shadow-sm hover:shadow-md">
            Commencer
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-7xl font-serif font-bold text-slate mb-8 leading-[1.1]">
          Votre vie est une <br/>
          <span className="text-terracotta relative inline-block">
            œuvre d'art
            <svg className="absolute w-full h-3 -bottom-2 left-0 text-terracotta/20" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
            </svg>
          </span>
        </h1>
        
        <p className="text-xl text-slate-light mb-12 max-w-2xl mx-auto leading-relaxed">
          My Mozaïca est l'intelligence artificielle qui vous interviewe pour transformer vos souvenirs en une biographie imprimée unique.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link 
            href="/start" 
            className="w-full sm:w-auto px-8 py-4 bg-terracotta text-white text-lg font-bold rounded-2xl shadow-xl shadow-terracotta/20 hover:bg-terracotta-hover hover:-translate-y-1 transition-all"
          >
            Créer ma fresque
          </Link>
          <div className="text-sm text-slate-light/80 mt-4 sm:mt-0">
            Commencez gratuitement par votre profil
          </div>
        </div>

        {/* Aperçu Visuel (Placeholder Mosaïque) */}
        <div className="mt-20 relative h-64 md:h-80 bg-white border-4 border-white rounded-[2rem] shadow-2xl overflow-hidden mx-auto max-w-3xl">
          <div className="absolute inset-0 bg-gradient-to-br from-cream-50 via-white to-ochre/10 flex items-center justify-center">
            <div className="grid grid-cols-3 gap-4 opacity-50 transform -rotate-6 scale-110">
               {[1,2,3,4,5,6,7,8,9].map(i => (
                 <div key={i} className={`w-32 h-32 rounded-xl ${i % 2 === 0 ? 'bg-emerald/20' : 'bg-terracotta/20'}`}></div>
               ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
               <span className="bg-white/80 backdrop-blur-md px-6 py-3 rounded-full font-serif text-slate border border-cream-200 shadow-lg">
                 100% Guidé par l'IA
               </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}