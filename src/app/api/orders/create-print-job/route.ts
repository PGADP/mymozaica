import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';
import LuluService, { LULU_POD_PACKAGE_ID } from '@/core/services/lulu';
import EmailService from '@/core/services/email';
import { ShippingLevel } from '@/core/database/types';

/**
 * POST /api/orders/create-print-job
 *
 * Crée un print job Lulu pour impression et livraison
 *
 * Body:
 * - orderId: string (UUID de la commande)
 * - interiorPdfUrl: string (URL signée du PDF intérieur)
 * - coverPdfUrl: string (URL signée du PDF couverture)
 * - quantity?: number (default: 1)
 * - shippingLevel?: ShippingLevel (default: 'MAIL')
 *
 * Retourne:
 * - printJob: objet print_job créé
 * - luluResponse: réponse Lulu API
 */
export async function POST(req: NextRequest) {
  try {
    // Authentification
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    // Récupérer les paramètres
    const body = await req.json();
    const {
      orderId,
      interiorPdfUrl,
      coverPdfUrl,
      quantity = 1,
      shippingLevel = 'MAIL' as ShippingLevel,
    } = body;

    // Validation
    if (!orderId) {
      return NextResponse.json({ error: 'orderId requis' }, { status: 400 });
    }

    if (!interiorPdfUrl || !coverPdfUrl) {
      return NextResponse.json(
        { error: 'interiorPdfUrl et coverPdfUrl requis' },
        { status: 400 }
      );
    }

    // Récupérer la commande
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, shipping_addresses(*)')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Commande non trouvee' },
        { status: 404 }
      );
    }

    // Vérifier que la commande est dans un état valide
    if (order.status !== 'pending_address' && order.status !== 'paid') {
      return NextResponse.json(
        { error: `Commande dans un etat invalide: ${order.status}` },
        { status: 400 }
      );
    }

    // Récupérer l'adresse de livraison
    let shippingAddress = order.shipping_addresses;
    if (!shippingAddress && order.shipping_address_id) {
      const { data: addr } = await supabaseAdmin
        .from('shipping_addresses')
        .select('*')
        .eq('id', order.shipping_address_id)
        .single();
      shippingAddress = addr;
    }

    if (!shippingAddress) {
      // Essayer de récupérer l'adresse par défaut de l'utilisateur
      const { data: defaultAddr } = await supabaseAdmin
        .from('shipping_addresses')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!defaultAddr) {
        return NextResponse.json(
          { error: 'Adresse de livraison requise' },
          { status: 400 }
        );
      }

      shippingAddress = defaultAddr;

      // Mettre à jour la commande avec l'adresse
      await supabaseAdmin
        .from('orders')
        .update({ shipping_address_id: defaultAddr.id })
        .eq('id', orderId);
    }

    // Récupérer l'email de l'utilisateur
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    const contactEmail = profile?.email || user.email || '';

    // Créer l'external_id unique
    const externalId = `MOZAICA-${order.order_number}-${Date.now()}`;

    // Créer le print job Lulu
    const luluService = LuluService.getInstance();

    const luluResponse = await luluService.createPrintJob({
      external_id: externalId,
      contact_email: contactEmail,
      shipping_level: shippingLevel,
      shipping_address: {
        name: shippingAddress.name,
        street1: shippingAddress.street1,
        street2: shippingAddress.street2 || undefined,
        city: shippingAddress.city,
        state_code: shippingAddress.state_code || undefined,
        country_code: shippingAddress.country_code,
        postcode: shippingAddress.postcode,
        phone_number: shippingAddress.phone_number,
      },
      line_items: [
        {
          pod_package_id: LULU_POD_PACKAGE_ID,
          quantity,
          interior: { source_url: interiorPdfUrl },
          cover: { source_url: coverPdfUrl },
        },
      ],
    });

    // Extraire les coûts de la réponse Lulu
    const printCostCents = Math.round(
      parseFloat(luluResponse.costs?.total_cost_excl_tax || '0') * 100
    );
    const shippingCostCents = Math.round(
      parseFloat(luluResponse.costs?.shipping_cost?.total_cost_excl_tax || '0') * 100
    );
    const totalCostCents = printCostCents + shippingCostCents;

    // Créer l'enregistrement print_job
    const { data: printJob, error: printJobError } = await supabaseAdmin
      .from('print_jobs')
      .insert({
        order_id: orderId,
        user_id: user.id,
        lulu_print_job_id: luluResponse.id?.toString(),
        external_id: externalId,
        pod_package_id: LULU_POD_PACKAGE_ID,
        quantity,
        interior_pdf_url: interiorPdfUrl,
        cover_pdf_url: coverPdfUrl,
        shipping_level: shippingLevel,
        print_cost_cents: printCostCents,
        shipping_cost_cents: shippingCostCents,
        total_cost_cents: totalCostCents,
        status: luluResponse.status?.name?.toLowerCase() || 'created',
        status_message: luluResponse.status?.message,
      })
      .select()
      .single();

    if (printJobError) {
      console.error('Erreur creation print_job:', printJobError);
      // Le print job Lulu a été créé mais pas enregistré localement
      // On continue mais on log l'erreur
    }

    // Mettre à jour le statut de la commande
    await supabaseAdmin
      .from('orders')
      .update({ status: 'processing' })
      .eq('id', orderId);

    // Envoyer un email (non bloquant)
    try {
      const emailService = EmailService.getInstance();
      await emailService.sendProductionStarted({
        orderNumber: order.order_number,
        customerName: profile?.full_name || shippingAddress.name,
        customerEmail: contactEmail,
      });
    } catch (emailError) {
      console.error('Erreur envoi email production:', emailError);
    }

    return NextResponse.json({
      success: true,
      printJob,
      luluPrintJobId: luluResponse.id,
      status: luluResponse.status?.name,
      isSandbox: luluService.isSandbox(),
    });
  } catch (error) {
    console.error('Erreur creation print job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}
