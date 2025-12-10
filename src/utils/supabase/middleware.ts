import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // 1. Créer une réponse initiale
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 2. Initialiser le client Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Important : mettre à jour les cookies dans la requête ET la réponse
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. Rafraîchir la session (IMPORTANT)
  // Ne PAS extraire { data: { user } } directement, car on veut s'assurer que getUser() met à jour le cookie
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 4. Protection des routes
  // Si pas d'utilisateur et qu'on essaie d'accéder au dashboard ou à l'onboarding
  if (
    !user &&
    (request.nextUrl.pathname.startsWith('/dashboard') ||
     request.nextUrl.pathname.startsWith('/onboarding') ||
     request.nextUrl.pathname.startsWith('/payment')) // Ajout de la protection paiement
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 5. Vérification du billing_status pour accès au dashboard
  if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('billing_status')
      .eq('id', user.id)
      .single();

    // Si le billing_status n'est pas 'paid', rediriger vers Lemonsqueezy
    if (profile?.billing_status !== 'paid') {
      const checkoutUrl = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL;

      if (checkoutUrl) {
        const checkoutWithParams = `${checkoutUrl}?checkout[email]=${encodeURIComponent(user.email || '')}&checkout[custom][user_id]=${user.id}`;
        return NextResponse.redirect(checkoutWithParams);
      }
    }
  }

  // 6. Redirection inverse (Si déjà connecté, ne pas laisser aller sur login ou start)
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/start')) {
     const url = request.nextUrl.clone()
     url.pathname = '/dashboard'
     return NextResponse.redirect(url)
  }

  return supabaseResponse
}