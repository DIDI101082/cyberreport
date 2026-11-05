import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { tenantId: string }

// GET /api/admin/tenants/[tenantId]
export async function GET(
  _req: NextRequest,
  { params }: { params: Params }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('role, tenant_id').eq('id', user.id).single()

    const isSuperAdmin = profile?.role === 'super_admin'
    const isOwnTenant  = profile?.tenant_id === params.tenantId

    if (!isSuperAdmin && !isOwnTenant) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const [{ data: tenant }, { data: users }, { count: projectCount }] = await Promise.all([
      supabase.from('tenants').select('*').eq('id', params.tenantId).single(),
      supabase.from('profiles').select('id, full_name, role, is_active, created_at').eq('tenant_id', params.tenantId).order('created_at'),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('tenant_id', params.tenantId),
    ])

    // Get emails from auth.users (super_admin only)
    let usersWithEmail = users ?? []
    if (isSuperAdmin) {
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      const emailMap = new Map((authUsers?.users ?? []).map(u => [u.id, u.email]))
      usersWithEmail = (users ?? []).map(u => ({ ...u, email: emailMap.get(u.id) ?? null }))
    }

    return NextResponse.json({
      tenant,
      users: usersWithEmail,
      project_count: projectCount ?? 0,
    })
  } catch (err) {
    console.error('GET tenant detail error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH /api/admin/tenants/[tenantId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Params }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await req.json()
    const { name, plan, is_active } = body

    const { data, error } = await supabase
      .from('tenants')
      .update({ name, plan, is_active, updated_at: new Date().toISOString() })
      .eq('id', params.tenantId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ tenant: data })
  } catch (err) {
    console.error('PATCH tenant error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
