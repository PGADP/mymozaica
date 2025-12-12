/**
 * PDF GENERATOR SERVICE
 * Service pour générer des PDFs print-ready pour Lulu
 *
 * Utilise @sparticuz/chromium + puppeteer-core pour compatibilité Vercel
 *
 * Spécifications A5 Lulu :
 * - Trim : 5.83" x 8.27" (148mm x 210mm)
 * - Bleed : +0.125" (3.175mm) de chaque côté
 * - Final : 6.08" x 8.52" (154.5mm x 216.5mm)
 */

import chromium from '@sparticuz/chromium';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { createAdminClient } from '@/utils/supabase/admin';
import { LULU_MIN_PAGES, calculateSpineWidth, inchesToMm } from './lulu';

// ============================================
// CONSTANTES DIMENSIONS
// ============================================

// Dimensions A5 en pouces (Lulu utilise les pouces)
const A5_TRIM_WIDTH_INCHES = 5.83;
const A5_TRIM_HEIGHT_INCHES = 8.27;
const BLEED_INCHES = 0.125;

// Dimensions avec bleed
const A5_BLEED_WIDTH_INCHES = A5_TRIM_WIDTH_INCHES + (BLEED_INCHES * 2); // 6.08"
const A5_BLEED_HEIGHT_INCHES = A5_TRIM_HEIGHT_INCHES + (BLEED_INCHES * 2); // 8.52"

// Conversion en mm pour CSS
const A5_BLEED_WIDTH_MM = inchesToMm(A5_BLEED_WIDTH_INCHES); // ~154.5mm
const A5_BLEED_HEIGHT_MM = inchesToMm(A5_BLEED_HEIGHT_INCHES); // ~216.5mm

// ============================================
// TYPES
// ============================================

export interface BookChapter {
  chapter_number: number;
  title: string;
  content: string; // HTML content from Tiptap
}

export interface BookMetadata {
  title: string;
  authorName: string;
  subtitle?: string;
  backCoverText?: string;
}

export interface GeneratedPdfResult {
  storagePath: string;
  signedUrl: string;
  pageCount: number;
  fileSizeBytes: number;
  spineWidthMm?: number;
}

// ============================================
// SERVICE PDF GENERATOR
// ============================================

class PdfGeneratorService {
  private static instance: PdfGeneratorService;
  private browser: Browser | null = null;

  private constructor() {}

  public static getInstance(): PdfGeneratorService {
    if (!PdfGeneratorService.instance) {
      PdfGeneratorService.instance = new PdfGeneratorService();
    }
    return PdfGeneratorService.instance;
  }

  /**
   * Initialiser le navigateur Chromium
   */
  private async getBrowser(): Promise<Browser> {
    if (this.browser?.connected) {
      return this.browser;
    }

    this.browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    return this.browser;
  }

  /**
   * Fermer le navigateur
   */
  public async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Générer le PDF intérieur du livre (toutes les pages)
   */
  public async generateInteriorPdf(
    userId: string,
    chapters: BookChapter[],
    metadata: BookMetadata
  ): Promise<GeneratedPdfResult> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // Générer le HTML complet du livre
      const html = this.generateInteriorHtml(chapters, metadata);

      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Générer le PDF avec les dimensions Lulu
      const pdfBuffer = await page.pdf({
        width: `${A5_BLEED_WIDTH_MM}mm`,
        height: `${A5_BLEED_HEIGHT_MM}mm`,
        printBackground: true,
        preferCSSPageSize: false,
        margin: {
          top: `${inchesToMm(BLEED_INCHES)}mm`,
          right: `${inchesToMm(BLEED_INCHES)}mm`,
          bottom: `${inchesToMm(BLEED_INCHES)}mm`,
          left: `${inchesToMm(BLEED_INCHES)}mm`,
        },
      });

      // Calculer le nombre de pages (approximation basée sur le buffer)
      const pageCount = await this.countPdfPages(page, html);

      // Vérifier le minimum de pages
      if (pageCount < LULU_MIN_PAGES) {
        throw new Error(
          `Le livre n'a que ${pageCount} pages. Minimum requis : ${LULU_MIN_PAGES} pages.`
        );
      }

      // Upload vers Supabase Storage
      const supabase = createAdminClient();
      const timestamp = Date.now();
      const storagePath = `${userId}/interior-${timestamp}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('book-pdfs')
        .upload(storagePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Générer URL signée (48h)
      const { data: signedUrlData, error: signedError } = await supabase.storage
        .from('book-pdfs')
        .createSignedUrl(storagePath, 48 * 60 * 60); // 48 heures

      if (signedError || !signedUrlData) {
        throw new Error(`Signed URL failed: ${signedError?.message}`);
      }

      return {
        storagePath,
        signedUrl: signedUrlData.signedUrl,
        pageCount,
        fileSizeBytes: pdfBuffer.length,
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Générer le PDF de couverture (spread : dos + devant + arrière)
   */
  public async generateCoverPdf(
    userId: string,
    pageCount: number,
    metadata: BookMetadata
  ): Promise<GeneratedPdfResult> {
    // Calculer la largeur du dos
    const spineWidthInches = calculateSpineWidth(pageCount);
    const spineWidthMm = inchesToMm(spineWidthInches);

    // Dimensions totales de la couverture (spread)
    // Largeur = 4ème de couv + dos + 1ère de couv + bleeds
    const coverWidthMm =
      inchesToMm(A5_TRIM_WIDTH_INCHES) + // 4ème de couv
      spineWidthMm + // Dos
      inchesToMm(A5_TRIM_WIDTH_INCHES) + // 1ère de couv
      inchesToMm(BLEED_INCHES * 2); // Bleeds gauche et droite

    const coverHeightMm = A5_BLEED_HEIGHT_MM; // Même hauteur que l'intérieur

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      const html = this.generateCoverHtml(
        metadata,
        spineWidthMm,
        coverWidthMm,
        coverHeightMm
      );

      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        width: `${coverWidthMm}mm`,
        height: `${coverHeightMm}mm`,
        printBackground: true,
        preferCSSPageSize: false,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });

      // Upload vers Supabase Storage
      const supabase = createAdminClient();
      const timestamp = Date.now();
      const storagePath = `${userId}/cover-${timestamp}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('book-pdfs')
        .upload(storagePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Générer URL signée (48h)
      const { data: signedUrlData, error: signedError } = await supabase.storage
        .from('book-pdfs')
        .createSignedUrl(storagePath, 48 * 60 * 60);

      if (signedError || !signedUrlData) {
        throw new Error(`Signed URL failed: ${signedError?.message}`);
      }

      return {
        storagePath,
        signedUrl: signedUrlData.signedUrl,
        pageCount: 1, // Couverture = 1 page
        fileSizeBytes: pdfBuffer.length,
        spineWidthMm,
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Générer les deux PDFs (intérieur + couverture)
   */
  public async generatePrintPdfs(
    userId: string,
    chapters: BookChapter[],
    metadata: BookMetadata
  ): Promise<{ interior: GeneratedPdfResult; cover: GeneratedPdfResult }> {
    // Générer l'intérieur d'abord pour connaître le nombre de pages
    const interior = await this.generateInteriorPdf(userId, chapters, metadata);

    // Générer la couverture avec le bon calcul de dos
    const cover = await this.generateCoverPdf(userId, interior.pageCount, metadata);

    // Fermer le navigateur après génération
    await this.closeBrowser();

    return { interior, cover };
  }

  /**
   * Compter les pages du PDF généré
   */
  private async countPdfPages(page: Page, html: string): Promise<number> {
    // Méthode : compter les éléments avec page-break
    const pageCount = await page.evaluate(() => {
      const pageBreaks = document.querySelectorAll('.page-break');
      // +1 pour la première page, +1 pour chaque break
      return pageBreaks.length + 1;
    });

    // Minimum 2 pages (page de titre + au moins 1 chapitre)
    return Math.max(pageCount, 2);
  }

  /**
   * Générer le HTML pour l'intérieur du livre
   */
  private generateInteriorHtml(chapters: BookChapter[], metadata: BookMetadata): string {
    const chaptersHtml = chapters
      .sort((a, b) => a.chapter_number - b.chapter_number)
      .map(
        (chapter, index) => `
        ${index > 0 ? '<div class="page-break"></div>' : ''}
        <div class="chapter">
          <h2 class="chapter-title">Chapitre ${chapter.chapter_number}</h2>
          <h3 class="chapter-subtitle">${this.escapeHtml(chapter.title)}</h3>
          <div class="chapter-content">
            ${chapter.content}
          </div>
        </div>
      `
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: ${A5_BLEED_WIDTH_MM}mm ${A5_BLEED_HEIGHT_MM}mm;
      margin: ${inchesToMm(BLEED_INCHES + 0.5)}mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #2C3E50;
    }

    /* Page de titre */
    .title-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      text-align: center;
      padding: 40mm 20mm;
    }

    .book-title {
      font-size: 24pt;
      font-weight: bold;
      color: #E76F51;
      margin-bottom: 10mm;
    }

    .book-subtitle {
      font-size: 14pt;
      font-style: italic;
      color: #47627D;
      margin-bottom: 20mm;
    }

    .book-author {
      font-size: 16pt;
      color: #2C3E50;
    }

    /* Chapitres */
    .chapter {
      page-break-inside: avoid;
    }

    .chapter-title {
      font-size: 18pt;
      font-weight: bold;
      color: #E76F51;
      margin-bottom: 5mm;
      text-align: center;
    }

    .chapter-subtitle {
      font-size: 14pt;
      font-style: italic;
      color: #47627D;
      margin-bottom: 15mm;
      text-align: center;
    }

    .chapter-content {
      text-align: justify;
    }

    .chapter-content p {
      margin-bottom: 4mm;
      text-indent: 5mm;
    }

    .chapter-content p:first-of-type {
      text-indent: 0;
    }

    .chapter-content h2, .chapter-content h3 {
      margin-top: 8mm;
      margin-bottom: 4mm;
      color: #2C3E50;
    }

    .chapter-content strong {
      color: #E76F51;
    }

    .chapter-content em {
      font-style: italic;
    }

    /* Saut de page */
    .page-break {
      page-break-after: always;
      height: 0;
    }
  </style>
</head>
<body>
  <!-- Page de titre -->
  <div class="title-page">
    <h1 class="book-title">${this.escapeHtml(metadata.title)}</h1>
    ${metadata.subtitle ? `<p class="book-subtitle">${this.escapeHtml(metadata.subtitle)}</p>` : ''}
    <p class="book-author">${this.escapeHtml(metadata.authorName)}</p>
  </div>

  <div class="page-break"></div>

  <!-- Chapitres -->
  ${chaptersHtml}
</body>
</html>
    `;
  }

  /**
   * Générer le HTML pour la couverture (spread complet)
   */
  private generateCoverHtml(
    metadata: BookMetadata,
    spineWidthMm: number,
    totalWidthMm: number,
    heightMm: number
  ): string {
    const bleedMm = inchesToMm(BLEED_INCHES);
    const pageWidthMm = inchesToMm(A5_TRIM_WIDTH_INCHES);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      width: ${totalWidthMm}mm;
      height: ${heightMm}mm;
      font-family: 'Georgia', 'Times New Roman', serif;
      background: #F5E6D3; /* Beige */
    }

    .cover-spread {
      display: flex;
      width: 100%;
      height: 100%;
    }

    /* 4ème de couverture (arrière) */
    .back-cover {
      width: ${pageWidthMm + bleedMm}mm;
      height: 100%;
      padding: ${bleedMm + 15}mm ${bleedMm + 10}mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .back-cover-text {
      font-size: 10pt;
      line-height: 1.5;
      color: #2C3E50;
      text-align: justify;
    }

    /* Dos du livre */
    .spine {
      width: ${spineWidthMm}mm;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #E76F51;
    }

    .spine-title {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      transform: rotate(180deg);
      font-size: 10pt;
      font-weight: bold;
      color: white;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    /* 1ère de couverture (devant) */
    .front-cover {
      width: ${pageWidthMm + bleedMm}mm;
      height: 100%;
      padding: ${bleedMm}mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
    }

    .front-cover-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 20mm;
    }

    .front-title {
      font-size: 28pt;
      font-weight: bold;
      color: #E76F51;
      margin-bottom: 10mm;
    }

    .front-subtitle {
      font-size: 14pt;
      font-style: italic;
      color: #47627D;
      margin-bottom: 15mm;
    }

    .front-author {
      font-size: 16pt;
      color: #2C3E50;
    }

    .front-logo {
      padding-bottom: ${bleedMm + 10}mm;
    }

    .logo-text {
      font-size: 12pt;
      color: #2A9D8F;
      font-weight: bold;
      letter-spacing: 2px;
    }
  </style>
</head>
<body>
  <div class="cover-spread">
    <!-- 4ème de couverture (arrière gauche) -->
    <div class="back-cover">
      <div class="back-cover-text">
        ${metadata.backCoverText ? this.escapeHtml(metadata.backCoverText).replace(/\n/g, '<br>') : `
          <p>Découvrez l'histoire unique de ${this.escapeHtml(metadata.authorName)}.</p>
          <br>
          <p>Ce livre retrace les moments clés d'une vie, les souvenirs précieux et les expériences qui ont façonné une personne extraordinaire.</p>
          <br>
          <p><em>Une biographie personnelle, rédigée avec l'aide de l'intelligence artificielle, pour préserver les mémoires pour les générations futures.</em></p>
        `}
      </div>
    </div>

    <!-- Dos du livre -->
    <div class="spine">
      <span class="spine-title">${this.escapeHtml(metadata.title)} - ${this.escapeHtml(metadata.authorName)}</span>
    </div>

    <!-- 1ère de couverture (devant droite) -->
    <div class="front-cover">
      <div class="front-cover-content">
        <h1 class="front-title">${this.escapeHtml(metadata.title)}</h1>
        ${metadata.subtitle ? `<p class="front-subtitle">${this.escapeHtml(metadata.subtitle)}</p>` : ''}
        <p class="front-author">${this.escapeHtml(metadata.authorName)}</p>
      </div>
      <div class="front-logo">
        <span class="logo-text">MY MOZAICA</span>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Échapper les caractères HTML
   */
  private escapeHtml(text: string): string {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => escapeMap[char]);
  }
}

export default PdfGeneratorService;
