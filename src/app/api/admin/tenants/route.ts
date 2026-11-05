import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/tenants — list all tenants (super_admin only)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    // Get all tenants with user/project counts
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Enrich with user and project counts
    const enriched = await Promise.all((tenants ?? []).map(async (t) => {
      const [{ count: userCount }, { count: projectCount }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id),
      ])
      return { ...t, user_count: userCount ?? 0, project_count: projectCount ?? 0 }
    }))

    return NextResponse.json({ tenants: enriched })
  } catch (err) {
    console.error('GET /api/admin/tenants error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST /api/admin/tenants — create tenant (super_admin only)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const { name, slug, plan } = body

    if (!name || !slug) return NextResponse.json({ error: 'name y slug son requeridos' }, { status: 400 })

    const { data, error } = await supabase
      .from('tenants')
      .insert({ name, slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'), plan: plan ?? 'starter' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ tenant: data }, { status: 201 })
  } catch (err) {
    console.error('POST /api/admin/tenants error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
