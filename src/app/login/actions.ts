'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Login Error:', error)
    redirect('/login?error=Erreur d\'identification')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  // Récupération de l'URL de base dynamique (pour Vercel ou Localhost)
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/api/auth/callback`,
    },
  })

  if (error) {
    console.error('Signup Error:', error)
    redirect('/login?error=Impossible de créer le compte')
  }

  // Redirection vers la page de vérification email
  // L'utilisateur devra valider son email avant d'accéder au dashboard

  revalidatePath('/', 'layout')
  redirect('/auth/verify')
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/update-password`,
  })

  if (error) {
    console.error('Password Reset Error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}