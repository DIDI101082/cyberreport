import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePDF } from '@/lib/reports/pdf'

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

    const pdfBytes = await generatePDF(project, findings ?? [], frameworks ?? [])
    const buffer = Buffer.from(pdfBytes)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="cyberreport_${projectId}.pdf"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error generando PDF:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
