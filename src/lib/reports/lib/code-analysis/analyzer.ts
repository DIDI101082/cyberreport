import type { CodeIssue, FileAnalysisResult, IssueSeverity, IssueCategory } from '@/types/code-analysis'
import { STATIC_RULES, SUPPORTED_LANGUAGES } from './static-rules'
import { calculateHealthScore } from './scorer'

// ─── Análisis estático rápido (sin IA) ────────────────────────────────────────
export function analyzeFileStatically(
  filePath: string,
  code: string
): FileAnalysisResult {
  const ext = '.' + filePath.split('.').pop()?.toLowerCase()
  const language = SUPPORTED_LANGUAGES[ext] ?? 'Unknown'
  const lines = code.split('\n')
  const issues: CodeIssue[] = []

  for (const rule of STATIC_RULES) {
    const matches = [...code.matchAll(rule.pattern)]
    for (const match of matches) {
      if (!match.index) continue

      // Calcular número de línea
      const before = code.slice(0, match.index)
      const lineStart = before.split('\n').length
      const lineEnd = lineStart + match[0].split('\n').length - 1

      // Snippet de contexto (±2 líneas)
      const snippetStart = Math.max(0, lineStart - 3)
      const snippetEnd = Math.min(lines.length - 1, lineEnd + 2)
      const code_snippet = lines.slice(snippetStart, snippetEnd + 1)
        .map((l, i) => `${snippetStart + i + 1}: ${l}`)
        .join('\n')

      issues.push({
        id: `${rule.id}-${issues.length}`,
        severity: rule.severity,
        category: rule.category,
        title: rule.name,
        description: rule.message,
        file_path: filePath,
        line_start: lineStart,
        line_end: lineEnd !== lineStart ? lineEnd : undefined,
        code_snippet,
        fix_suggestion: '',     // La IA lo completa después
        fix_explanation: rule.fix_hint,
        compliance_refs: rule.compliance_refs,
        false_positive_probability: 0.15,
        effort_to_fix: 'low',
        ai_confidence: 0.7,
      })
    }
  }

  // Deduplicar por línea
  const seen = new Set<string>()
  const unique = issues.filter(i => {
    const key = `${i.file_path}:${i.line_start}:${i.id.split('-')[0]}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const health_score = calculateHealthScore(unique).overall

  return { file_path: filePath, language, lines: lines.length, issues: unique, health_score }
}

// ─── Preparar contexto para análisis IA ───────────────────────────────────────
export function buildAIPrompt(
  filePath: string,
  code: string,
  staticIssues: CodeIssue[],
  frameworks: string[]
): string {
  const staticSummary = staticIssues.length > 0
    ? `Se detectaron estos patrones estáticos pre-análisis:\n${
        staticIssues.map(i => `- ${i.title} (línea ${i.line_start}): ${i.description}`).join('\n')
      }`
    : 'No se detectaron patrones estáticos obvios.'

  return `Eres un experto en seguridad de aplicaciones (AppSec) y auditor de código. Analiza el siguiente código fuente en busca de vulnerabilidades de seguridad y problemas de compliance.

ARCHIVO: ${filePath}
FRAMEWORKS A VERIFICAR: ${frameworks.join(', ')}

ANÁLISIS ESTÁTICO PREVIO:
${staticSummary}

CÓDIGO:
\`\`\`
${code.slice(0, 8000)}${code.length > 8000 ? '\n... [truncado]' : ''}
\`\`\`

Responde con un JSON con este esquema exacto:
{
  "issues": [
    {
      "severity": "critical|high|medium|low|info",
      "category": "injection|xss|auth|secrets|crypto|path_traversal|deserialization|dependency|access_control|logging|ssrf|xxe|compliance|best_practice",
      "title": "Nombre corto del problema",
      "description": "Descripción técnica detallada del problema de seguridad",
      "line_start": 42,
      "line_end": 45,
      "code_snippet": "código relevante",
      "fix_suggestion": "código corregido completo",
      "fix_explanation": "por qué es inseguro y cómo el fix lo soluciona",
      "compliance_refs": [
        { "framework": "OWASP", "id": "A03:2021", "label": "Injection" }
      ],
      "false_positive_probability": 0.1,
      "effort_to_fix": "trivial|low|medium|high",
      "ai_confidence": 0.9
    }
  ],
  "summary": "Resumen general del análisis en 2-3 oraciones",
  "positive_findings": ["Aspecto de seguridad bien implementado 1", "..."]
}

INSTRUCCIONES:
- Sé MÁS PROACTIVO que SonarQube: detectar lógica insegura contextual, no solo patrones sintácticos
- Incluir issues de los falsos negativos que el análisis estático puede perder
- NO repetir exactamente los mismos issues del análisis estático (ya están capturados)
- Fix suggestion debe ser código listo para copiar, no pseudocódigo
- En español para descripción y explicación, código en el lenguaje original
- Priorizar issues que realmente importan al negocio
- Solo JSON válido, sin texto extra`
}

// ─── Parsear respuesta IA ─────────────────────────────────────────────────────
export function parseAIResponse(
  raw: string,
  filePath: string
): { issues: Omit<CodeIssue, 'id'>[]; summary: string; positive_findings: string[] } {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    const parsed = JSON.parse(jsonMatch[0])

    const issues = (parsed.issues ?? []).map((issue: Record<string, unknown>) => ({
      severity: (issue.severity as IssueSeverity) ?? 'medium',
      category: (issue.category as IssueCategory) ?? 'best_practice',
      title: String(issue.title ?? ''),
      description: String(issue.description ?? ''),
      file_path: filePath,
      line_start: Number(issue.line_start ?? 0),
      line_end: issue.line_end ? Number(issue.line_end) : undefined,
      code_snippet: String(issue.code_snippet ?? ''),
      fix_suggestion: String(issue.fix_suggestion ?? ''),
      fix_explanation: String(issue.fix_explanation ?? ''),
      compliance_refs: (issue.compliance_refs as CodeIssue['compliance_refs']) ?? [],
      false_positive_probability: Number(issue.false_positive_probability ?? 0.2),
      effort_to_fix: (issue.effort_to_fix as CodeIssue['effort_to_fix']) ?? 'medium',
      ai_confidence: Number(issue.ai_confidence ?? 0.8),
    }))

    return {
      issues,
      summary: String(parsed.summary ?? ''),
      positive_findings: (parsed.positive_findings as string[]) ?? [],
    }
  } catch {
    return { issues: [], summary: 'Error al parsear respuesta de IA.', positive_findings: [] }
  }
}
