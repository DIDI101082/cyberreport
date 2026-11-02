import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SEV_VALID = ['critical', 'high', 'medium', 'low', 'info'] as const

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const body     = await req.json()

    // Validate severity
    const severity = SEV_VALID.includes(body.severity) ? body.severity : 'info'

    const { data, error } = await supabase
      .from('findings')
      .insert({
        project_id:        params.id,
        title:             body.title?.slice(0, 500) || 'Hallazgo importado',
        severity,
        status:            'open',
        description:       body.description   || null,
        recommendation:    body.recommendation || null,
        affected_endpoint: body.affected_endpoint || null,
        cve_id:            body.cve_id || null,
        cwe_id:            body.cwe_id || null,
        tool_source:       body.tool_source || null,
        ai_generated:      false,
        category:          'web',   // sensible default for ZAP/Burp findings
      })
      .select('id')
      .single()

    if (error) {
      console.error('Import finding error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: data.id })
  } catch (err) {
    console.error('Import route error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
