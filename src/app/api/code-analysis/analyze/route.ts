import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { analyzeFileStatically, buildAIPrompt, parseAIResponse } from '@/lib/code-analysis/analyzer'
import { calculateHealthScore } from '@/lib/code-analysis/scorer'
import type { CodeIssue, AnalysisSession } from '@/types/code-analysis'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const { files, projectId, frameworks = ['OWASP', 'ISO27001', 'PCI-DSS'] } = await req.json() as {
      files: { path: string; content: string }[]
      projectId?: string
      frameworks?: string[]
    }

    if (!files?.length) {
      return NextResponse.json({ error: 'Se requieren archivos para analizar' }, { status: 400 })
    }

    const allIssues: CodeIssue[] = []
    let totalLines = 0
    let summaries: string[] = []
    let positiveFindings: string[] = []

    // ─── Analizar cada archivo ─────────────────────────────────────────────
    for (const file of files.slice(0, 20)) { // máximo 20 archivos por sesión
      const { issues: staticIssues, lines } = analyzeFileStatically(file.path, file.content)
      totalLines += lines

      // Enriquecer con IA
      const prompt = buildAIPrompt(file.path, file.content, staticIssues, frameworks)

      let aiIssues: Omit<CodeIssue, 'id'>[] = []
      let summary = ''
      let positives: string[] = []

      try {
        const message = await anthropic.messages.create({
          model: 'claude-opus-4-5',
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }],
        })

        const text = message.content[0].type === 'text' ? message.content[0].text : ''
        const parsed = parseAIResponse(text, file.path)
        aiIssues = parsed.issues
        summary = parsed.summary
        positives = parsed.positive_findings
      } catch (err) {
        console.error(`Error IA para ${file.path}:`, err)
        // Si la IA falla, seguimos con los resultados estáticos
      }

      // Agregar fix_suggestion a los issues estáticos (la IA ya los dio separados)
      const enrichedStatic = staticIssues.map(i => ({ ...i }))

      // Combinar resultados
      const combined: CodeIssue[] = [
        ...enrichedStatic,
        ...aiIssues.map((issue, idx) => ({ ...issue, id: `AI-${file.path}-${idx}` })),
      ]

      allIssues.push(...combined)
      if (summary) summaries.push(`${file.path}: ${summary}`)
      positiveFindings.push(...positives)
    }

    // ─── Score global ──────────────────────────────────────────────────────
    const health_score = calculateHealthScore(allIssues)
    const duration_ms = Date.now() - startTime

    const session: Omit<AnalysisSession, 'id'> = {
      project_id: projectId ?? '',
      created_at: new Date().toISOString(),
      language: 'Multi',
      files_analyzed: files.length,
      lines_analyzed: totalLines,
      duration_ms,
      issues: allIssues,
      health_score,
      frameworks_checked: frameworks as AnalysisSession['frameworks_checked'],
      status: 'completed',
    }

    // Guardar en Supabase si hay proyecto asociado
    if (projectId) {
      try {
        const supabase = await createClient()
        await supabase.from('code_analysis_sessions').insert({
          ...session,
          issues: allIssues,
          health_score,
        })
      } catch {
        // No crítico si falla el guardado
      }
    }

    return NextResponse.json({
      session,
      summary: summaries.join('\n\n'),
      positive_findings: [...new Set(positiveFindings)],
    })
  } catch (error) {
    console.error('Error en análisis de código:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
