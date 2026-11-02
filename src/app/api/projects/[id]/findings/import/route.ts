import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('findings')
      .select('id, title, severity, status, category, cwe_id')
      .eq('project_id', params.id)
      .order('severity', { ascending: false })

    if (error) {
      console.error('GET findings error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('GET findings route error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
