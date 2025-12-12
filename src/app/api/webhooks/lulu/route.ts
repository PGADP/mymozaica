import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/utils/supabase/admin';
import EmailService from '@/core/services/email';

/**
 * POST /api/webhooks/lulu
 *
 * Webhook Lulu pour recevoir les mises à jour de statut des print jobs
 *
 * Events:
 * - PRINT_JOB_STATUS_CHANGED
 * - PRINT_JOB_CREATED
 * - PRINT_JOB_SHIPPED
 *
 * Lulu envoie un HMAC signature dans le header 'X-Lulu-Signature'
 */

// Route GET pour debug
export async function GET() {
  return NextResponse.json({
    status: 'Webhook Lulu actif',
    env_check: {
      webhook_secret: !!process.env.LULU_WEBHOOK_SECRET,
    },
  });
}

// Vérification de la signature HMAC Lulu
function verifyLuluSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) return false;

  try {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  } catch {
    return false;
  }
}

// Mapper les statuts Lulu vers nos statuts internes
function mapLuluStatus(luluStatus: string): string {
  const statusMap: Record<string, string> = {
    CREATED: 'created',
    UNPAID: 'created',
    PAYMENT_IN_PROGRESS: 'created',
    PRODUCTION_READY: 'validated',
    PRODUCTION_DELAYED: 'validated',
    IN_PRODUCTION: 'in_production',
    SHIPPED: 'shipped',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
    ERROR: 'error',
  };

  return statusMap[luluStatus.toUpperCase()] || 'created';
}

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.LULU_WEBHOOK_SECRET;

    // Récupération du payload brut
    const rawBody = await req.text();
    const signature = req.headers.get('x-lulu-signature') || '';

    // Vérification de la signature (si secret configuré)
    if (webhookSecret && !verifyLuluSignature(rawBody, signature, webhookSecret)) {
      console.error('Invalid Lulu webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);
    const eventType = body.event_type || body.type;
    const printJobData = body.data || body.print_job || body;

    console.log('Lulu webhook recu:', eventType);
    console.log('Print job data:', JSON.stringify(printJobData, null, 2));

    const supabaseAdmin = createAdminClient();

    // Récupérer le print job par lulu_print_job_id ou external_id
    const luluPrintJobId = printJobData.id?.toString();
    const externalId = printJobData.external_id;

    let printJob = null;

    if (luluPrintJobId) {
      const { data } = await supabaseAdmin
        .from('print_jobs')
        .select('*, orders(*)')
        .eq('lulu_print_job_id', luluPrintJobId)
        .single();
      printJob = data;
    }

    if (!printJob && externalId) {
      const { data } = await supabaseAdmin
        .from('print_jobs')
        .select('*, orders(*)')
        .eq('external_id', externalId)
        .single();
      printJob = data;
    }

    if (!printJob) {
      console.warn('Print job non trouve:', { luluPrintJobId, externalId });
      // Retourner 200 pour éviter que Lulu réessaie
      return NextResponse.json({ success: true, message: 'Print job not found' });
    }

    // Extraire les informations du statut
    const newStatus = mapLuluStatus(
      printJobData.status?.name || printJobData.status || ''
    );
    const statusMessage = printJobData.status?.message || '';
    const tracking = printJobData.tracking || {};

    // Préparer la mise à jour
    const updateData: Record<string, unknown> = {
      status: newStatus,
      status_message: statusMessage,
      updated_at: new Date().toISOString(),
    };

    // Ajouter les timestamps selon le statut
    if (newStatus === 'validated') {
      updateData.validated_at = new Date().toISOString();
    }
    if (newStatus === 'in_production') {
      updateData.production_started_at = new Date().toISOString();
    }
    if (newStatus === 'shipped') {
      updateData.shipped_at = new Date().toISOString();
    }

    // Ajouter les informations de tracking si disponibles
    if (tracking.tracking_id || tracking.tracking_urls?.length) {
      updateData.tracking_id = tracking.tracking_id || null;
      updateData.tracking_url = tracking.tracking_urls?.[0] || null;
      updateData.carrier_name = tracking.carrier_name || null;
    }

    // Mettre à jour le print job
    const { error: updateError } = await supabaseAdmin
      .from('print_jobs')
      .update(updateData)
      .eq('id', printJob.id);

    if (updateError) {
      console.error('Erreur mise a jour print_job:', updateError);
    }

    // Mettre à jour la commande associée si nécessaire
    if (printJob.order_id) {
      let orderStatus = null;
      if (newStatus === 'in_production') {
        orderStatus = 'processing';
      } else if (newStatus === 'shipped') {
        orderStatus = 'shipped';
      } else if (newStatus === 'cancelled' || newStatus === 'error') {
        orderStatus = 'error';
      }

      if (orderStatus) {
        await supabaseAdmin
          .from('orders')
          .update({
            status: orderStatus,
            shipped_at: newStatus === 'shipped' ? new Date().toISOString() : undefined,
          })
          .eq('id', printJob.order_id);
      }
    }

    // Envoyer des emails selon le statut
    try {
      const emailService = EmailService.getInstance();

      // Récupérer les infos utilisateur pour l'email
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', printJob.user_id)
        .single();

      const customerEmail = profile?.email || '';
      const customerName = profile?.full_name || 'Client';
      const orderNumber = printJob.orders?.order_number || printJob.external_id || '';

      if (newStatus === 'in_production') {
        await emailService.sendProductionStarted({
          orderNumber,
          customerName,
          customerEmail,
        });
      } else if (newStatus === 'shipped') {
        await emailService.sendShipped({
          orderNumber,
          customerName,
          customerEmail,
          trackingId: updateData.tracking_id as string | undefined,
          trackingUrl: updateData.tracking_url as string | undefined,
          carrierName: updateData.carrier_name as string | undefined,
        });
      }
    } catch (emailError) {
      console.error('Erreur envoi email webhook:', emailError);
      // Non bloquant
    }

    console.log(`Print job ${printJob.id} mis a jour: ${newStatus}`);

    return NextResponse.json({
      success: true,
      printJobId: printJob.id,
      newStatus,
    });
  } catch (error) {
    console.error('Erreur webhook Lulu:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
