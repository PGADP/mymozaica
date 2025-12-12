'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Header from '@/components/dashboard/Header';
import {
  ArrowLeft,
  Book,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  FileText,
  BookOpen,
  ShoppingCart,
  Check
} from 'lucide-react';
import Link from 'next/link';

interface Chapter {
  id: string;
  chapter_order: number;
  title: string;
  content: string;
}

interface UserProfile {
  email: string;
  first_name?: string;
  last_name?: string;
}

// Convertir HTML en texte pour le comptage de mots
function htmlToText(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Diviser le contenu en pages (environ 180 mots par page pour police 10)
function splitContentIntoPages(content: string, wordsPerPage: number = 180): string[] {
  const text = htmlToText(content);
  const words = text.split(' ').filter(Boolean);
  const pages: string[] = [];

  for (let i = 0; i < words.length; i += wordsPerPage) {
    pages.push(words.slice(i, i + wordsPerPage).join(' '));
  }

  return pages.length > 0 ? pages : [''];
}

export default function BookPage() {
  const router = useRouter();
  const supabase = createClient();
  const bookContentRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'double'>('double');
  const [isEditing, setIsEditing] = useState(false);
  const [editChapterIndex, setEditChapterIndex] = useState(0);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Construire toutes les pages du livre (tous chapitres confondus)
  const allPages = useMemo(() => {
    const pages: { content: string; chapterTitle?: string; isChapterStart: boolean; chapterIndex: number }[] = [];

    chapters.forEach((chapter, chapterIdx) => {
      const chapterPages = splitContentIntoPages(chapter.content || '');
      chapterPages.forEach((pageContent, pageIdx) => {
        pages.push({
          content: pageContent,
          chapterTitle: pageIdx === 0 ? chapter.title : undefined,
          isChapterStart: pageIdx === 0,
          chapterIndex: chapterIdx
        });
      });
    });

    return pages;
  }, [chapters]);

  // Statistiques du livre
  const bookStats = useMemo(() => {
    let totalWords = 0;
    chapters.forEach(ch => {
      const text = htmlToText(ch.content || '');
      totalWords += text.split(' ').filter(Boolean).length;
    });

    return {
      totalPages: allPages.length,
      totalChapters: chapters.length,
      readingTime: Math.ceil(totalWords / 200)
    };
  }, [chapters, allPages]);

  // Charger les données
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', user.id)
        .single();

      setProfile(profileData);

      const { data: chaptersData } = await supabase
        .from('book_chapters')
        .select('*')
        .eq('user_id', user.id)
        .order('chapter_order', { ascending: true });

      if (chaptersData && chaptersData.length > 0) {
        setChapters(chaptersData);
      }

      setIsLoading(false);
    }

    loadData();
  }, []);

  // Navigation
  const goToPreviousPage = () => {
    if (viewMode === 'double') {
      setCurrentPageIndex(prev => Math.max(0, prev - 2));
    } else {
      setCurrentPageIndex(prev => Math.max(0, prev - 1));
    }
  };

  const goToNextPage = () => {
    const maxIndex = allPages.length - 1;
    if (viewMode === 'double') {
      setCurrentPageIndex(prev => Math.min(maxIndex - 1, prev + 2));
    } else {
      setCurrentPageIndex(prev => Math.min(maxIndex, prev + 1));
    }
  };

  // Aller à un chapitre spécifique
  const goToChapter = (chapterIndex: number) => {
    const pageIndex = allPages.findIndex(p => p.chapterIndex === chapterIndex && p.isChapterStart);
    if (pageIndex !== -1) {
      setCurrentPageIndex(viewMode === 'double' ? (pageIndex % 2 === 0 ? pageIndex : Math.max(0, pageIndex - 1)) : pageIndex);
    }
  };

  // Calculer la progression
  const progressPercent = allPages.length > 0 ? Math.round(((currentPageIndex + 1) / allPages.length) * 100) : 0;

  // Passer en mode édition pour un chapitre
  const startEditing = (chapterIndex: number) => {
    setEditChapterIndex(chapterIndex);
    setEditContent(chapters[chapterIndex]?.content || '');
    setIsEditing(true);
  };

  // Sauvegarder les modifications
  const handleSave = async () => {
    if (!chapters[editChapterIndex]) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('book_chapters')
      .update({ content: editContent })
      .eq('id', chapters[editChapterIndex].id);

    if (!error) {
      setChapters(prev => prev.map((ch, i) =>
        i === editChapterIndex ? { ...ch, content: editContent } : ch
      ));
      setIsEditing(false);
    }

    setIsSaving(false);
  };

  // Export PDF avec html2pdf
  const handleExportPDF = async () => {
    setIsExporting(true);

    try {
      // Import dynamique de html2pdf
      const html2pdf = (await import('html2pdf.js')).default;

      // Créer un conteneur pour le PDF
      const pdfContainer = document.createElement('div');
      pdfContainer.style.width = '148mm'; // Format A5
      pdfContainer.style.padding = '15mm';
      pdfContainer.style.fontFamily = "'Times New Roman', Times, serif";
      pdfContainer.style.fontSize = '10pt';
      pdfContainer.style.lineHeight = '1.7';
      pdfContainer.style.color = '#1a1a1a';
      pdfContainer.style.background = 'white';

      // Ajouter le titre du livre
      const bookTitle = document.createElement('div');
      bookTitle.style.textAlign = 'center';
      bookTitle.style.marginBottom = '30mm';
      bookTitle.style.paddingTop = '40mm';
      bookTitle.innerHTML = `
        <h1 style="font-family: 'Abhaya Libre', Georgia, serif; font-size: 24pt; font-weight: 600; color: #E76F51; margin-bottom: 10mm;">
          Mon Livre de Vie
        </h1>
        <p style="font-size: 12pt; color: #666;">Par ${profile?.first_name || 'Auteur'} ${profile?.last_name || ''}</p>
      `;
      pdfContainer.appendChild(bookTitle);

      // Ajouter chaque chapitre
      chapters.forEach((chapter, index) => {
        const chapterDiv = document.createElement('div');
        chapterDiv.style.pageBreakBefore = index > 0 ? 'always' : 'auto';
        chapterDiv.style.marginBottom = '10mm';

        // Titre du chapitre
        const titleEl = document.createElement('h2');
        titleEl.style.fontFamily = "'Abhaya Libre', Georgia, serif";
        titleEl.style.fontSize = '16pt';
        titleEl.style.fontWeight = '600';
        titleEl.style.color = '#E76F51';
        titleEl.style.textAlign = 'center';
        titleEl.style.marginBottom = '8mm';
        titleEl.style.marginTop = '15mm';
        titleEl.textContent = chapter.title;
        chapterDiv.appendChild(titleEl);

        // Contenu du chapitre
        const contentEl = document.createElement('div');
        contentEl.style.textAlign = 'justify';
        contentEl.innerHTML = chapter.content || '';
        chapterDiv.appendChild(contentEl);

        pdfContainer.appendChild(chapterDiv);
      });

      // Ajouter temporairement au DOM
      document.body.appendChild(pdfContainer);

      // Options pour html2pdf
      const opt = {
        margin: [15, 15, 20, 15] as [number, number, number, number], // top, right, bottom, left en mm
        filename: `MonLivreDeVie_${profile?.first_name || 'Livre'}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm' as const, format: 'a5' as const, orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // Générer le PDF
      await html2pdf().set(opt).from(pdfContainer).save();

      // Supprimer le conteneur temporaire
      document.body.removeChild(pdfContainer);

    } catch (error) {
      console.error('Erreur export PDF:', error);
      alert('Erreur lors de l\'export PDF. Veuillez réessayer.');
    }

    setIsExporting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-secondary animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Chargement de votre livre...</p>
        </div>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="min-h-screen bg-bg-main">
        {profile && (
          <Header user={{
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name
          }} />
        )}

        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <div className="bg-white rounded-3xl p-12 shadow-xl border border-primary/10">
            <Book className="w-20 h-20 text-text-muted mx-auto mb-6" />
            <h1 className="text-3xl font-heading font-bold text-text-main mb-4">
              Votre livre n'est pas encore prêt
            </h1>
            <p className="text-text-muted mb-8">
              Générez d'abord votre livre depuis le tableau de bord.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-heading font-bold transition-all"
            >
              <ArrowLeft size={20} />
              Retour au tableau de bord
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const authorName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.first_name || 'Auteur';

  // Page actuelle
  const currentPage = allPages[currentPageIndex];
  const nextPage = allPages[currentPageIndex + 1];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* TOP BAR */}
      <div className="bg-gray-900/95 backdrop-blur-xl border-b border-white/10 px-6 py-3 flex justify-between items-center sticky top-0 z-50 flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-all hover:-translate-x-1">
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Tableau de bord</span>
        </Link>

        <div className="flex gap-3">
          <button
            onClick={() => currentPage && startEditing(currentPage.chapterIndex)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all ${
              isEditing
                ? 'bg-secondary text-white'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            <FileText size={16} />
            {isEditing ? 'Mode lecture' : 'Modifier'}
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[260px_1fr_320px] min-h-0">

        {/* LEFT SIDEBAR - Navigation */}
        <aside className="bg-gray-800 border-r border-white/10 p-5 overflow-y-auto hidden lg:block">
          {/* Info livre */}
          <div className="mb-6 pb-6 border-b border-white/10">
            <h2 style={{ fontFamily: "'Abhaya Libre', Georgia, serif" }} className="text-lg font-bold text-white mb-1">
              Mon Livre de Vie
            </h2>
            <p className="text-sm text-gray-400 mb-4">Par {authorName}</p>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Pages</span>
                <p className="font-semibold text-white">{bookStats.totalPages}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Chapitres</span>
                <p className="font-semibold text-white">{bookStats.totalChapters}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Lecture</span>
                <p className="font-semibold text-white">{bookStats.readingTime} min</p>
              </div>
            </div>
          </div>

          {/* Table des matières */}
          <div className="mb-6">
            <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">
              Table des matières
            </h3>
            <ul className="space-y-1">
              {chapters.map((chapter, index) => {
                const isCurrentChapter = currentPage?.chapterIndex === index;
                return (
                  <li key={chapter.id}>
                    <button
                      onClick={() => goToChapter(index)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                        isCurrentChapter
                          ? 'bg-secondary text-white'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {index + 1}. {chapter.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Progression */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Progression</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-secondary to-secondary-hover transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </aside>

        {/* CENTER - Zone de lecture */}
        <main className="bg-gray-100 flex flex-col min-h-0">
          {/* Contrôles de lecture */}
          <div className="bg-white px-6 py-3 border-b border-gray-200 flex justify-center items-center flex-shrink-0">
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('single')}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                  viewMode === 'single' ? 'bg-white text-gray-800 shadow' : 'text-gray-500'
                }`}
              >
                <FileText size={16} />
                Page simple
              </button>
              <button
                onClick={() => setViewMode('double')}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                  viewMode === 'double' ? 'bg-white text-gray-800 shadow' : 'text-gray-500'
                }`}
              >
                <BookOpen size={16} />
                Double page
              </button>
            </div>
          </div>

          {/* Zone d'affichage du livre */}
          <div className="flex-1 flex justify-center items-center p-6 bg-gradient-to-b from-gray-200 to-gray-300 overflow-auto">
            {isEditing ? (
              /* Mode édition */
              <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl p-8">
                <h2 style={{ fontFamily: "'Abhaya Libre', Georgia, serif" }} className="text-2xl font-bold text-gray-800 mb-6">
                  {chapters[editChapterIndex]?.title}
                </h2>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[500px] p-4 border border-gray-200 rounded-lg text-gray-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-secondary"
                  style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '14px' }}
                />
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2 bg-secondary text-white rounded-lg font-medium hover:bg-secondary-hover transition flex items-center gap-2"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Sauvegarder
                  </button>
                </div>
              </div>
            ) : (
              /* Mode lecture */
              <div ref={bookContentRef} className={`flex ${viewMode === 'double' ? 'gap-1' : ''} shadow-2xl rounded-sm overflow-hidden`}>
                {/* Page gauche */}
                <div
                  className="bg-[#FFFEF8] relative flex flex-col"
                  style={{
                    width: viewMode === 'double' ? '380px' : '440px',
                    height: viewMode === 'double' ? '540px' : '620px',
                    padding: '40px 40px 50px 40px',
                    boxShadow: viewMode === 'double' ? '-2px 0 10px rgba(0,0,0,0.1) inset' : '0 20px 40px rgba(0,0,0,0.2)'
                  }}
                >
                  {currentPage?.isChapterStart && currentPage.chapterTitle && (
                    <h2
                      className="text-center mb-6"
                      style={{
                        fontFamily: "'Abhaya Libre', Georgia, serif",
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#E76F51'
                      }}
                    >
                      {currentPage.chapterTitle}
                    </h2>
                  )}
                  <p
                    className="text-gray-800 text-justify flex-1"
                    style={{
                      fontFamily: "'Times New Roman', Times, serif",
                      fontSize: '10pt',
                      lineHeight: '1.7'
                    }}
                  >
                    {currentPage?.content || ''}
                  </p>
                  {/* Numéro de page */}
                  <span
                    className="text-center block mt-4 text-gray-400"
                    style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '9pt' }}
                  >
                    {currentPageIndex + 1}
                  </span>
                </div>

                {/* Page droite (mode double uniquement) */}
                {viewMode === 'double' && nextPage && (
                  <div
                    className="bg-[#FFFEF8] relative flex flex-col"
                    style={{
                      width: '380px',
                      height: '540px',
                      padding: '40px 40px 50px 40px',
                      boxShadow: '2px 0 10px rgba(0,0,0,0.1) inset'
                    }}
                  >
                    {nextPage.isChapterStart && nextPage.chapterTitle && (
                      <h2
                        className="text-center mb-6"
                        style={{
                          fontFamily: "'Abhaya Libre', Georgia, serif",
                          fontSize: '18px',
                          fontWeight: 600,
                          color: '#E76F51'
                        }}
                      >
                        {nextPage.chapterTitle}
                      </h2>
                    )}
                    <p
                      className="text-gray-800 text-justify flex-1"
                      style={{
                        fontFamily: "'Times New Roman', Times, serif",
                        fontSize: '10pt',
                        lineHeight: '1.7'
                      }}
                    >
                      {nextPage.content || ''}
                    </p>
                    {/* Numéro de page */}
                    <span
                      className="text-center block mt-4 text-gray-400"
                      style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '9pt' }}
                    >
                      {currentPageIndex + 2}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation des pages - TOUJOURS VISIBLE */}
          {!isEditing && (
            <div className="bg-white px-6 py-4 border-t border-gray-200 flex justify-center items-center gap-6 flex-shrink-0">
              <button
                onClick={goToPreviousPage}
                disabled={currentPageIndex === 0}
                className="px-5 py-2.5 bg-secondary text-white rounded-lg font-semibold flex items-center gap-2 hover:bg-secondary-hover transition disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
                Précédent
              </button>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-600 min-w-[140px] text-center">
                Page {currentPageIndex + 1}{viewMode === 'double' && nextPage ? `-${currentPageIndex + 2}` : ''} sur {allPages.length}
              </div>
              <button
                onClick={goToNextPage}
                disabled={currentPageIndex >= allPages.length - (viewMode === 'double' ? 2 : 1)}
                className="px-5 py-2.5 bg-secondary text-white rounded-lg font-semibold flex items-center gap-2 hover:bg-secondary-hover transition disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                Suivant
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR - Achat & Actions */}
        <aside className="bg-white border-l border-gray-200 overflow-y-auto hidden lg:flex lg:flex-col">
          {/* Section Achat */}
          <div className="p-6 border-b border-gray-200">
            <span className="inline-block bg-gradient-to-r from-secondary to-secondary-hover text-white text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full mb-4">
              Livre imprime
            </span>
            <h3 style={{ fontFamily: "'Abhaya Libre', Georgia, serif" }} className="text-xl font-bold text-gray-800 mb-2">
              Commandez votre exemplaire papier
            </h3>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              Recevez votre livre en edition premium avec couverture souple mate et papier ivoire.
            </p>

            {/* Box prix */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-5 text-center mb-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-secondary to-transparent" />
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">A partir de</p>
              <p className="text-3xl font-extrabold text-white mb-1">15 €</p>
              <p className="text-xs text-gray-500">Livraison France incluse</p>
            </div>

            {/* CTA Commander */}
            <Link
              href="/dashboard/order-book"
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:-translate-y-1 transition-all mb-4"
            >
              <ShoppingCart size={18} />
              Commander un exemplaire
            </Link>

            {/* Features */}
            <ul className="space-y-2 mb-4">
              {[
                'Format A5 (14,8 × 21 cm)',
                'Papier ivoire 60# premium',
                'Couverture souple mate',
                'Livraison France 5-10 jours'
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600 py-1.5 border-b border-gray-100">
                  <span className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="text-center text-xs text-gray-400 bg-gray-50 rounded-lg p-2">
              Paiement securise par LemonSqueezy
            </div>
          </div>

          {/* Actions - Export PDF */}
          <div className="p-6 bg-gray-50 flex-1">
            <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">
              Export
            </h4>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-300 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Export en cours...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Telecharger PDF
                </>
              )}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
