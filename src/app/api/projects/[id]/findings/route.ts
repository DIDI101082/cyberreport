import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Usuario autenticado + tenant_id
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    const body = await req.json()

    const { error } = await supabase.from('findings').insert({
      tenant_id:           profile?.tenant_id ?? null,
      project_id:          params.id,
      title:               body.title               ?? 'Sin título',
      severity:            body.severity             ?? 'info',
      status:              body.status               ?? 'open',
      category:            body.category             ?? null,
      description:         body.description          ?? null,
      recommendation:      body.recommendation       ?? null,
      impact:              body.impact               ?? null,
      evidence:            body.evidence             ?? null,
      affected_components: body.affected_components  ?? [],
      cve_id:              body.cve_id               ?? null,
      cwe_id:              body.cwe_id               ?? null,
      cvss_score:          body.cvss_score           ?? null,
      cvss_vector:         body.cvss_vector          ?? null,
    })

    if (error) {
      console.error('Import finding error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Import route error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
