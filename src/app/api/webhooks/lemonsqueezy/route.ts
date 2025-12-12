import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import EmailService from '@/core/services/email';
import { OrderType, PackType } from '@/core/database/types';

// Route GET pour debug - À SUPPRIMER EN PRODUCTION
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('user_id');
  const testUpdate = searchParams.get('test_update');

  // Si test_update=true et user_id fourni, met à jour manuellement
  if (testUpdate === 'true' && userId) {
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        billing_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `billing_status mis à jour pour ${userId}`,
      profile: data
    });
  }

  return NextResponse.json({
    status: 'Webhook Lemonsqueezy actif',
    env_check: {
      webhook_secret: !!process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
      supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
  });
}

// Client Supabase Admin (contourne RLS)
const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Vérification de la signature Lemonsqueezy
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Générer un numéro de commande unique
function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MOZAICA-${dateStr}-${random}`;
}

// Déterminer le type de commande
function determineOrderType(
  packType?: string,
  addonType?: string
): OrderType | null {
  if (packType === 'pack1') return 'pack1_pdf';
  if (packType === 'pack2') return 'pack2_book';
  if (addonType === 'first_book' || addonType === 'extra_book') return 'additional_book';
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('LEMONSQUEEZY_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Récupération du payload brut
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature') || '';

    // Vérification de la signature
    if (!verifySignature(rawBody, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);
    const eventName = body.meta?.event_name;

    console.log('Webhook recu:', eventName);

    // Gestion de l'événement order_created (paiement réussi)
    if (eventName === 'order_created') {
      // Lemonsqueezy peut envoyer custom_data de différentes manières
      const customData = body.meta?.custom_data || body.data?.attributes?.first_order_item?.custom_data || {};
      const userId = customData?.user_id || customData?.['user_id'];
      const packType = customData?.pack_type as PackType | undefined;
      const addonType = customData?.addon_type as string | undefined;

      console.log('custom_data:', JSON.stringify(customData));
      console.log('user_id:', userId);
      console.log('pack_type:', packType);
      console.log('addon_type:', addonType);

      const customerEmail = body.data?.attributes?.user_email;
      const customerName = body.data?.attributes?.user_name || 'Client';
      const lemonsqueezyOrderId = body.data?.id;
      const lemonsqueezyProductId = body.data?.attributes?.first_order_item?.variant_id;
      const amountPaid = body.data?.attributes?.total || 0; // en centimes

      if (!userId) {
        console.error('user_id manquant dans custom_data');
        return NextResponse.json(
          { error: 'Missing user_id in custom data' },
          { status: 400 }
        );
      }

      const supabaseAdmin = getSupabaseAdmin();

      // Déterminer le type de commande
      const orderType = determineOrderType(packType, addonType);

      if (!orderType) {
        console.error('Type de commande indéterminé');
        // Fallback: mise à jour simple du billing_status (ancien comportement)
        await supabaseAdmin
          .from('profiles')
          .update({
            billing_status: 'paid',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        return NextResponse.json({ success: true, userId });
      }

      // Générer le numéro de commande
      const orderNumber = generateOrderNumber();

      // Créer la commande
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
          user_id: userId,
          order_number: orderNumber,
          order_type: orderType,
          lemonsqueezy_order_id: lemonsqueezyOrderId?.toString(),
          lemonsqueezy_product_id: lemonsqueezyProductId?.toString(),
          amount_paid: amountPaid,
          currency: 'EUR',
          status: orderType === 'pack1_pdf' ? 'paid' : 'pending_address', // PDF direct = paid, livre = attente adresse
          quantity: 1,
          paid_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (orderError) {
        console.error('Erreur creation commande:', orderError.message);
        return NextResponse.json(
          { error: 'Failed to create order' },
          { status: 500 }
        );
      }

      console.log('Commande creee:', orderNumber);

      // Mise à jour du profil selon le type de pack
      const profileUpdate: Record<string, unknown> = {
        billing_status: 'paid',
        updated_at: new Date().toISOString(),
      };

      if (packType === 'pack1') {
        profileUpdate.pack_type = 'pack1';
        profileUpdate.books_included = 0;
      } else if (packType === 'pack2') {
        profileUpdate.pack_type = 'pack2';
        profileUpdate.books_included = 1; // 1 livre inclus dans pack2
      } else if (addonType) {
        // Livre supplémentaire - incrémenter le compteur
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('additional_books_ordered')
          .eq('id', userId)
          .single();

        profileUpdate.additional_books_ordered = (profile?.additional_books_ordered || 0) + 1;
      }

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', userId);

      if (profileError) {
        console.error('Erreur mise a jour profil:', profileError.message);
      }

      console.log(`Profil mis a jour: ${userId} -> billing_status=paid, pack_type=${packType || 'none'}`);

      // Envoyer email de confirmation
      try {
        const emailService = EmailService.getInstance();
        await emailService.sendOrderConfirmation({
          orderNumber,
          customerName,
          customerEmail,
          orderType,
          amountPaid,
        });
        console.log('Email de confirmation envoye');
      } catch (emailError) {
        console.error('Erreur envoi email:', emailError);
        // Ne pas bloquer le webhook si l'email échoue
      }

      return NextResponse.json({
        success: true,
        userId,
        orderNumber,
        orderType,
      });
    }

    // Gestion de l'événement subscription_cancelled (si utilisé)
    if (eventName === 'subscription_cancelled') {
      const customData = body.meta?.custom_data;
      const userId = customData?.user_id;

      if (userId) {
        const supabaseAdmin = getSupabaseAdmin();
        await supabaseAdmin
          .from('profiles')
          .update({ billing_status: 'cancelled' })
          .eq('id', userId);

        console.log(`Abonnement annule pour user_id: ${userId}`);
      }

      return NextResponse.json({ success: true });
    }

    // Événement non géré
    console.log('Evenement non gere:', eventName);
    return NextResponse.json({ success: true, message: 'Event not handled' });
  } catch (error) {
    console.error('Erreur webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
