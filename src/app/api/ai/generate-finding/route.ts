import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// GLM-5 (Zhipu AI) — API compatible con OpenAI
const ZHIPU_API_URL = 'https://api.z.ai/api/paas/v4/chat/completions'

const severityMap: Record<string, string> = {
  critical: 'CRÍTICA',
  high: 'ALTA',
  medium: 'MEDIA',
  low: 'BAJA',
  info: 'INFORMATIVA',
}

function buildPrompt(title: string, severity: string, category: string): string {
  return `Eres un experto en ciberseguridad y pentesting. Genera contenido técnico en español para el siguiente hallazgo de seguridad:

Título: ${title}
Severidad: ${severityMap[severity] ?? severity}
Categoría: ${category}

Devuelve un JSON válido con exactamente estas tres claves:
- "description": descripción técnica detallada del hallazgo (2-3 párrafos)
- "impact": impacto potencial para el negocio y los sistemas (1-2 párrafos)
- "recommendation": pasos concretos y específicos para remediar (lista de 3-5 pasos)

Solo el JSON, sin markdown ni texto adicional.`
}

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Respuesta IA inválida')
  return JSON.parse(match[0])
}

async function generateWithAnthropic(title: string, severity: string, category: string) {
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildPrompt(title, severity, category) }],
  })
  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return extractJson(text)
}

async function generateWithGemini(title: string, severity: string, category: string) {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY no configurada')
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const result = await model.generateContent(buildPrompt(title, severity, category))
  return extractJson(result.response.text())
}

async function generateWithGLM5(title: string, severity: string, category: string) {
  const apiKey = process.env.ZHIPU_API_KEY
  if (!apiKey) throw new Error('ZHIPU_API_KEY no configurada')

  const res = await fetch(ZHIPU_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'glm-4-flash',
      messages: [{ role: 'user', content: buildPrompt(title, severity, category) }],
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GLM-5 API error (${res.status}): ${err}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content ?? ''
  return extractJson(text)
}

export async function POST(req: NextRequest) {
  try {
    const { title, severity, category, provider = 'anthropic' } = await req.json()

    if (!title) {
      return NextResponse.json({ error: 'title requerido' }, { status: 400 })
    }

    let parsed
    if (provider === 'gemini') {
      parsed = await generateWithGemini(title, severity ?? 'high', category ?? 'web')
    } else if (provider === 'glm5') {
      parsed = await generateWithGLM5(title, severity ?? 'high', category ?? 'web')
    } else {
      parsed = await generateWithAnthropic(title, severity ?? 'high', category ?? 'web')
    }

    return NextResponse.json(parsed)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error interno'
    console.error('Error generando finding con IA:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
