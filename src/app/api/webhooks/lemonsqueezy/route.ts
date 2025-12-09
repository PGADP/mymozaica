import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('❌ LEMONSQUEEZY_WEBHOOK_SECRET not configured');
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
      console.error('❌ Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);
    const eventName = body.meta?.event_name;

    console.log('📥 Webhook reçu:', eventName);

    // Gestion de l'événement order_created (paiement réussi)
    if (eventName === 'order_created') {
      const customData = body.meta?.custom_data;
      const userId = customData?.user_id;
      const customerEmail = body.data?.attributes?.user_email;
      const orderId = body.data?.id;

      if (!userId) {
        console.error('❌ user_id manquant dans custom_data');
        return NextResponse.json(
          { error: 'Missing user_id in custom data' },
          { status: 400 }
        );
      }

      console.log(`✅ Paiement réussi pour user_id: ${userId}`);

      // Mise à jour du profil avec Supabase Admin
      const supabaseAdmin = getSupabaseAdmin();

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          billing_status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('❌ Erreur mise à jour profil:', error.message);
        return NextResponse.json(
          { error: 'Failed to update user profile' },
          { status: 500 }
        );
      }

      console.log(`✅ Profil mis à jour: ${userId} -> billing_status=paid`);

      // Optionnel: Enregistrer la transaction dans une table dédiée
      // await supabaseAdmin.from('transactions').insert({
      //   user_id: userId,
      //   order_id: orderId,
      //   email: customerEmail,
      //   status: 'completed',
      //   amount: body.data?.attributes?.total,
      // });

      return NextResponse.json({ success: true, userId });
    }

    // Gestion d'autres événements (optionnel)
    if (eventName === 'subscription_cancelled') {
      const customData = body.meta?.custom_data;
      const userId = customData?.user_id;

      if (userId) {
        const supabaseAdmin = getSupabaseAdmin();
        await supabaseAdmin
          .from('profiles')
          .update({ billing_status: 'cancelled' })
          .eq('id', userId);

        console.log(`⚠️ Abonnement annulé pour user_id: ${userId}`);
      }

      return NextResponse.json({ success: true });
    }

    // Événement non géré
    console.log('⚠️ Événement non géré:', eventName);
    return NextResponse.json({ success: true, message: 'Event not handled' });
  } catch (error) {
    console.error('❌ Erreur webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
