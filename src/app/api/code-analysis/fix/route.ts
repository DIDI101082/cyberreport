import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Genera un fix completo y explicado para un issue específico
export async function POST(req: NextRequest) {
  try {
    const { issue, fullCode, filePath } = await req.json()

    const prompt = `Eres un experto en seguridad de software. Genera un fix COMPLETO y SEGURO para esta vulnerabilidad.

ARCHIVO: ${filePath}
VULNERABILIDAD: ${issue.title} (${issue.severity})
DESCRIPCIÓN: ${issue.description}
LÍNEA: ${issue.line_start}
CÓDIGO PROBLEMÁTICO:
\`\`\`
${issue.code_snippet}
\`\`\`

CÓDIGO COMPLETO DEL ARCHIVO:
\`\`\`
${fullCode?.slice(0, 6000) ?? '(no disponible)'}
\`\`\`

Responde con JSON:
{
  "fixed_snippet": "código corregido para reemplazar el snippet problemático",
  "explanation": "explicación paso a paso de qué se cambió y por qué",
  "security_notes": ["nota de seguridad 1", "nota 2"],
  "compliance_notes": ["cómo este fix cumple con OWASP A03:2021", "..."],
  "test_cases": ["caso de prueba 1 para verificar el fix", "..."],
  "additional_recommendations": "recomendaciones adicionales de seguridad relacionadas"
}

Solo JSON válido, en español.`

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Respuesta IA inválida' }, { status: 500 })

    return NextResponse.json(JSON.parse(jsonMatch[0]))
  } catch (error) {
    console.error('Error generando fix:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
