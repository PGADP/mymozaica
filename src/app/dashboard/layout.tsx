import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Vérification de l'authentification
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Vérification du statut de paiement
  const { data: profile } = await supabase
    .from('profiles')
    .select('billing_status')
    .eq('id', user.id)
    .single();

  // Si le statut n'est pas 'paid', redirection vers la page de checkout
  if (profile?.billing_status !== 'paid') {
    const checkoutUrl = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL;

    if (checkoutUrl) {
      // Redirection vers Lemonsqueezy avec les infos utilisateur
      const checkoutWithParams = `${checkoutUrl}?checkout[email]=${encodeURIComponent(user.email || '')}&checkout[custom][user_id]=${user.id}`;
      redirect(checkoutWithParams);
    } else {
      // Fallback: redirection vers une page d'attente si l'URL n'est pas configurée
      redirect('/start/success');
    }
  }

  return (
    <div className="min-h-screen bg-[#FDF6E3]">
      {children}
    </div>
  );
}