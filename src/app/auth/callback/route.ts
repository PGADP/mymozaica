import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // si "next" est fourni dans l'URL, on l'utilise comme redirection
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Redirection réussie vers l'app connectée
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Erreur : on renvoie vers login
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}