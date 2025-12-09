import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Récupérer l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Vérifier le billing_status dans la table profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('billing_status')
          .eq('id', user.id)
          .single()

        // Si le billing_status n'est pas 'paid', rediriger vers Lemonsqueezy
        if (profile?.billing_status !== 'paid') {
          const checkoutUrl = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL

          if (checkoutUrl) {
            const checkoutWithParams = `${checkoutUrl}?checkout[email]=${encodeURIComponent(user.email || '')}&checkout[custom][user_id]=${user.id}`
            return NextResponse.redirect(checkoutWithParams)
          }
        }

        // Si déjà payé, rediriger vers le dashboard
        return NextResponse.redirect(`${origin}/dashboard`)
      }
    }
  }

  // Erreur : on renvoie vers login
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}