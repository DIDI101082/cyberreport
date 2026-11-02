import Anthropic from '@anthropic-ai/sdk'
import type { SeverityLevel, FindingCategory } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface FindingInput {
  title: string
  severity: SeverityLevel
  category: FindingCategory
  affected_endpoint?: string
  cvss_score?: number
  cve_id?: string
}

interface GeneratedFinding {
  description: string
  impact: string
  recommendation: string
}

export async function generateFindingContent(input: FindingInput): Promise<GeneratedFinding> {
  const severityLabels: Record<SeverityLevel, string> = {
    critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja', info: 'Informativa'
  }

  const prompt = `Eres un experto en ciberseguridad que redacta hallazgos para informes de pentesting profesionales.

Genera el contenido para el siguiente hallazgo de seguridad:

**Título:** ${input.title}
**Severidad:** ${severityLabels[input.severity]}
**Categoría:** ${input.category}
${input.affected_endpoint ? `**Endpoint afectado:** ${input.affected_endpoint}` : ''}
${input.cvss_score ? `**CVSS Score:** ${input.cvss_score}` : ''}
${input.cve_id ? `**CVE:** ${input.cve_id}` : ''}

Responde en formato JSON con exactamente estas 3 claves:
{
  "description": "Descripción técnica del hallazgo (2-3 párrafos). Explicá qué es la vulnerabilidad, cómo fue detectada y su naturaleza técnica.",
  "impact": "Impacto potencial en el negocio y la seguridad (1-2 párrafos). Describí las consecuencias si es explotada.",
  "recommendation": "Recomendaciones específicas y accionables para remediar la vulnerabilidad (lista de 3-5 pasos concretos)."
}

Escribí en español, con tono técnico-profesional, sin markdown dentro de los valores JSON.`

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Respuesta inesperada de la IA')

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No se pudo parsear la respuesta de la IA')

  return JSON.parse(jsonMatch[0]) as GeneratedFinding
}
