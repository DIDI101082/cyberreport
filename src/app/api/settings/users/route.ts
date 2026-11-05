import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/settings/users — list users in own tenant
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('role, tenant_id').eq('id', user.id).single()

    if (!profile?.tenant_id) return NextResponse.json({ error: 'Sin tenant' }, { status: 400 })
    if (!['super_admin', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Solo administradores pueden ver usuarios' }, { status: 403 })
    }

    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, is_active, created_at')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Enrich with emails
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const emailMap = new Map((authUsers?.users ?? []).map(u => [u.id, u.email]))
    const enriched = (users ?? []).map(u => ({ ...u, email: emailMap.get(u.id) ?? null }))

    return NextResponse.json({ users: enriched })
  } catch (err) {
    console.error('GET users error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
