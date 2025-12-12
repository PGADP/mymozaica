/**
 * EMAIL SERVICE
 * Service singleton pour l'envoi d'emails transactionnels via Resend
 *
 * Templates :
 * - Commande confirmée
 * - PDF prêt (téléchargement)
 * - Livre en production
 * - Livre expédié (avec tracking)
 */

import { Resend } from 'resend';

// ============================================
// TYPES
// ============================================

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  orderType: 'pack1_pdf' | 'pack2_book' | 'additional_book';
  amountPaid: number; // en centimes
}

export interface ShippingEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  trackingId?: string;
  trackingUrl?: string;
  carrierName?: string;
  estimatedDelivery?: string;
}

export interface PdfReadyEmailData {
  customerName: string;
  customerEmail: string;
  bookTitle: string;
  downloadUrl: string; // URL signée temporaire
}

// ============================================
// SERVICE EMAIL
// ============================================

class EmailService {
  private static instance: EmailService;
  private resend: Resend | null = null;
  private fromEmail: string;
  private fromName: string;

  private constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      console.warn('⚠️ RESEND_API_KEY non configurée - emails désactivés');
    }

    this.fromEmail = process.env.EMAIL_FROM || 'noreply@mymozaica.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'My Mozaïca';
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Envoyer un email
   */
  private async send(
    to: string,
    subject: string,
    html: string
  ): Promise<boolean> {
    if (!this.resend) {
      console.log(`[Email simulé] To: ${to}, Subject: ${subject}`);
      return true; // Simule succès en dev sans Resend
    }

    try {
      const { error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to,
        subject,
        html,
      });

      if (error) {
        console.error('Erreur envoi email:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Exception envoi email:', err);
      return false;
    }
  }

  /**
   * Email : Commande confirmée
   */
  public async sendOrderConfirmation(data: OrderEmailData): Promise<boolean> {
    const orderTypeLabels: Record<string, string> = {
      pack1_pdf: 'Pack Numérique (PDF)',
      pack2_book: 'Pack Livre (PDF + Livre physique)',
      additional_book: 'Livre supplémentaire',
    };

    const subject = `Commande confirmée - ${data.orderNumber}`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Georgia', serif; background: #FDF6E3; padding: 40px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { color: #2A9D8F; font-size: 24px; font-weight: bold; letter-spacing: 2px; }
    h1 { color: #E76F51; font-size: 24px; margin: 20px 0; }
    p { color: #2C3E50; line-height: 1.6; }
    .order-box { background: #FDF6E3; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .order-detail { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E9C46A; }
    .order-detail:last-child { border-bottom: none; }
    .label { color: #47627D; }
    .value { color: #2C3E50; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #47627D; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">MY MOZAICA</div>
    </div>

    <h1>Merci pour votre commande !</h1>

    <p>Bonjour ${this.escapeHtml(data.customerName)},</p>

    <p>Nous avons bien reçu votre commande. Voici le récapitulatif :</p>

    <div class="order-box">
      <div class="order-detail">
        <span class="label">Numéro de commande</span>
        <span class="value">${data.orderNumber}</span>
      </div>
      <div class="order-detail">
        <span class="label">Produit</span>
        <span class="value">${orderTypeLabels[data.orderType] || data.orderType}</span>
      </div>
      <div class="order-detail">
        <span class="label">Montant</span>
        <span class="value">${(data.amountPaid / 100).toFixed(2)} €</span>
      </div>
    </div>

    ${data.orderType === 'pack2_book' || data.orderType === 'additional_book' ? `
      <p><strong>Prochaine étape :</strong> Connectez-vous à votre espace pour renseigner votre adresse de livraison et finaliser la commande de votre livre.</p>
    ` : `
      <p>Votre PDF sera disponible dans votre espace client dès que votre livre sera prêt.</p>
    `}

    <div class="footer">
      <p>My Mozaïca - Votre histoire, notre passion</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.send(data.customerEmail, subject, html);
  }

  /**
   * Email : PDF prêt au téléchargement
   */
  public async sendPdfReady(data: PdfReadyEmailData): Promise<boolean> {
    const subject = `Votre livre "${data.bookTitle}" est prêt !`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Georgia', serif; background: #FDF6E3; padding: 40px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { color: #2A9D8F; font-size: 24px; font-weight: bold; letter-spacing: 2px; }
    h1 { color: #E76F51; font-size: 24px; margin: 20px 0; }
    p { color: #2C3E50; line-height: 1.6; }
    .cta-button { display: inline-block; background: #2A9D8F; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .note { background: #FDF6E3; border-radius: 8px; padding: 15px; margin: 20px 0; font-size: 14px; color: #47627D; }
    .footer { text-align: center; margin-top: 30px; color: #47627D; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">MY MOZAICA</div>
    </div>

    <h1>Votre livre est prêt !</h1>

    <p>Bonjour ${this.escapeHtml(data.customerName)},</p>

    <p>Excellente nouvelle ! Votre livre <strong>"${this.escapeHtml(data.bookTitle)}"</strong> est maintenant disponible au téléchargement.</p>

    <div style="text-align: center;">
      <a href="${data.downloadUrl}" class="cta-button">Télécharger mon livre (PDF)</a>
    </div>

    <div class="note">
      <strong>Note :</strong> Ce lien de téléchargement est valide pendant 48 heures. Vous pouvez également retrouver votre livre dans votre espace client.
    </div>

    <div class="footer">
      <p>My Mozaïca - Votre histoire, notre passion</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.send(data.customerEmail, subject, html);
  }

  /**
   * Email : Livre en cours de production
   */
  public async sendProductionStarted(data: ShippingEmailData): Promise<boolean> {
    const subject = `Votre livre est en cours d'impression - ${data.orderNumber}`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Georgia', serif; background: #FDF6E3; padding: 40px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { color: #2A9D8F; font-size: 24px; font-weight: bold; letter-spacing: 2px; }
    h1 { color: #E76F51; font-size: 24px; margin: 20px 0; }
    p { color: #2C3E50; line-height: 1.6; }
    .status-box { background: #E76F51; color: white; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .status-icon { font-size: 48px; margin-bottom: 10px; }
    .timeline { margin: 30px 0; }
    .timeline-item { display: flex; align-items: center; padding: 10px 0; }
    .timeline-dot { width: 12px; height: 12px; border-radius: 50%; margin-right: 15px; }
    .timeline-dot.done { background: #2A9D8F; }
    .timeline-dot.current { background: #E76F51; }
    .timeline-dot.pending { background: #E9C46A; }
    .footer { text-align: center; margin-top: 30px; color: #47627D; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">MY MOZAICA</div>
    </div>

    <h1>Votre livre est en cours d'impression !</h1>

    <p>Bonjour ${this.escapeHtml(data.customerName)},</p>

    <p>Bonne nouvelle ! Votre livre a été envoyé à notre imprimeur et est en cours de production.</p>

    <div class="status-box">
      <div class="status-icon">🖨️</div>
      <div>En cours d'impression</div>
    </div>

    <div class="timeline">
      <div class="timeline-item">
        <div class="timeline-dot done"></div>
        <span>Commande reçue</span>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot done"></div>
        <span>PDF validé</span>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot current"></div>
        <span><strong>En cours d'impression</strong></span>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot pending"></div>
        <span>Expédition</span>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot pending"></div>
        <span>Livraison</span>
      </div>
    </div>

    <p>Vous recevrez un email avec le numéro de suivi dès que votre livre sera expédié. Comptez généralement 2 à 5 jours ouvrés pour l'impression.</p>

    <div class="footer">
      <p>My Mozaïca - Votre histoire, notre passion</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.send(data.customerEmail, subject, html);
  }

  /**
   * Email : Livre expédié avec suivi
   */
  public async sendShipped(data: ShippingEmailData): Promise<boolean> {
    const subject = `Votre livre a été expédié ! - ${data.orderNumber}`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Georgia', serif; background: #FDF6E3; padding: 40px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { color: #2A9D8F; font-size: 24px; font-weight: bold; letter-spacing: 2px; }
    h1 { color: #E76F51; font-size: 24px; margin: 20px 0; }
    p { color: #2C3E50; line-height: 1.6; }
    .status-box { background: #2A9D8F; color: white; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .status-icon { font-size: 48px; margin-bottom: 10px; }
    .tracking-box { background: #FDF6E3; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .tracking-detail { padding: 8px 0; border-bottom: 1px solid #E9C46A; }
    .tracking-detail:last-child { border-bottom: none; }
    .label { color: #47627D; font-size: 14px; }
    .value { color: #2C3E50; font-weight: bold; }
    .cta-button { display: inline-block; background: #E76F51; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #47627D; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">MY MOZAICA</div>
    </div>

    <h1>Votre livre est en route !</h1>

    <p>Bonjour ${this.escapeHtml(data.customerName)},</p>

    <p>Excellente nouvelle ! Votre livre a été expédié et est en route vers vous.</p>

    <div class="status-box">
      <div class="status-icon">📦</div>
      <div>Expédié</div>
    </div>

    <div class="tracking-box">
      <div class="tracking-detail">
        <div class="label">Transporteur</div>
        <div class="value">${data.carrierName || 'Standard'}</div>
      </div>
      ${data.trackingId ? `
        <div class="tracking-detail">
          <div class="label">Numéro de suivi</div>
          <div class="value">${data.trackingId}</div>
        </div>
      ` : ''}
      ${data.estimatedDelivery ? `
        <div class="tracking-detail">
          <div class="label">Livraison estimée</div>
          <div class="value">${data.estimatedDelivery}</div>
        </div>
      ` : ''}
    </div>

    ${data.trackingUrl ? `
      <div style="text-align: center;">
        <a href="${data.trackingUrl}" class="cta-button">Suivre mon colis</a>
      </div>
    ` : ''}

    <p>Merci d'avoir fait confiance à My Mozaïca pour immortaliser votre histoire.</p>

    <div class="footer">
      <p>My Mozaïca - Votre histoire, notre passion</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.send(data.customerEmail, subject, html);
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

export default EmailService;
