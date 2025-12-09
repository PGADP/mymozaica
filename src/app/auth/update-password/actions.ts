'use server'

import { createClient } from '@/utils/supabase/server'

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    console.error('Update Password Error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
