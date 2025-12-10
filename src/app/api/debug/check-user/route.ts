import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Endpoint de diagnostic pour vérifier l'état d'un email dans la BDD
 *
 * Usage: GET /api/debug/check-user?email=test@example.com
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Vérifier dans auth.users
    console.log('🔍 Checking auth.users for:', email);
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authUsers?.users?.find(u => u.email === email);

    // 2. Vérifier dans profiles
    console.log('🔍 Checking profiles for:', email);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    // 3. Si un auth user existe, récupérer son profil par ID
    let profileById = null;
    if (authUser) {
      console.log('🔍 Checking profile by auth user ID:', authUser.id);
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      profileById = data;
      if (error) {
        console.error('Error checking profile by ID:', error);
      }
    }

    // 4. Compter tous les profils
    const { count: totalProfiles } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const response = {
      timestamp: new Date().toISOString(),
      email,
      results: {
        auth_user: authUser ? {
          id: authUser.id,
          email: authUser.email,
          created_at: authUser.created_at,
          email_confirmed_at: authUser.email_confirmed_at,
          last_sign_in_at: authUser.last_sign_in_at
        } : null,
        profile_by_email: profile ? {
          id: profile.id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          created_at: profile.created_at,
          billing_status: profile.billing_status
        } : null,
        profile_by_id: profileById ? {
          id: profileById.id,
          email: profileById.email,
          first_name: profileById.first_name,
          last_name: profileById.last_name,
          created_at: profileById.created_at,
          billing_status: profileById.billing_status
        } : null,
        total_profiles_in_db: totalProfiles
      },
      diagnostics: {
        has_orphaned_auth_user: !!authUser && !profileById,
        has_orphaned_profile: !!profile && !authUser,
        email_matches: authUser?.email === profile?.email,
        id_matches: authUser?.id === profile?.id
      }
    };

    console.log('📊 Diagnostic results:', JSON.stringify(response, null, 2));

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Diagnostic error:', error);
    return NextResponse.json({
      error: 'Diagnostic failed',
      message: error.message,
      details: error
    }, { status: 500 });
  }
}
