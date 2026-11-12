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

// Intenta múltiples nombres de modelo porque Z.ai acepta distintos formatos
const GLM_MODEL_NAMES = ['glm-4.7-flash', 'GLM-4.7-Flash', 'glm-4-flash', 'glm-4.5-flash']

async function generateWithGLM5(title: string, severity: string, category: string) {
  const apiKey = process.env.ZHIPU_API_KEY
  if (!apiKey) throw new Error('ZHIPU_API_KEY no configurada')

  let lastError = ''

  for (const modelName of GLM_MODEL_NAMES) {
    const res = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: buildPrompt(title, severity, category) }],
        max_tokens: 1024,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      const text = data.choices?.[0]?.message?.content ?? ''
      return extractJson(text)
    }

    const err = await res.text()
    // Si el error NO es "Unknown Model", no tiene sentido probar otro nombre
    if (!err.includes('1211') && !err.toLowerCase().includes('unknown model')) {
      throw new Error(`GLM API error (${res.status}): ${err}`)
    }
    lastError = `${modelName}: ${err}`
  }

  throw new Error(`Ningún modelo GLM funcionó. Último error: ${lastError}`)
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

