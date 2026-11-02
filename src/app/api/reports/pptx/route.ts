import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePPTX } from '@/lib/reports/pptx'

export async function POST(req: NextRequest) {
  try {
    const { projectId, frameworks } = await req.json()
    if (!projectId) return NextResponse.json({ error: 'projectId requerido' }, { status: 400 })

    const supabase = await createClient()

    const { data: project } = await supabase
      .from('projects')
      .select('*, organization:organizations(*)')
      .eq('id', projectId)
      .single()

    if (!project) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

    const { data: findings } = await supabase
      .from('findings')
      .select('*')
      .eq('project_id', projectId)
      .order('severity')

    const base64 = await generatePPTX(project, findings ?? [], frameworks ?? [])
    const buffer = Buffer.from(base64, 'base64')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="cyberreport_${projectId}.pptx"`,
      },
    })
  } catch (error) {
    console.error('Error generando PPTX:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
