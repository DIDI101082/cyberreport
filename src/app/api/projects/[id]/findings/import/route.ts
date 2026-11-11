import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

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

    const affectedEndpoint: string = body.affected_endpoint ?? ''

    const insertData = {
      tenant_id:           profile?.tenant_id ?? null,
      project_id:          params.id,
      title:               body.title               ?? 'Sin título',
      severity:            body.severity             ?? 'info',
      status:              'open',
      category:            body.tool_source          ?? body.category ?? null,
      description:         body.description          ?? '',
      recommendation:      body.recommendation       ?? '',
      impact:              body.impact               ?? '',
      evidence:            body.evidence             ?? '',
      affected_components: affectedEndpoint ? [affectedEndpoint] : [],
      cve_id:              body.cve_id || null,
      cwe_id:              body.cwe_id || null,
      cvss_score:          body.cvss_score           ?? null,
      cvss_vector:         body.cvss_vector          ?? null,
    }

    const { error } = await supabase.from('findings').insert(insertData)

    if (error) {
      console.error('Import finding error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        tenant_id: profile?.tenant_id,
        project_id: params.id,
      })
      return NextResponse.json({
        error: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details
      }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Import route error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
