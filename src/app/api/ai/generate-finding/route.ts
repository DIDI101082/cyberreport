import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
  // Limpiar bloques de código markdown (```json ... ``` o ``` ... ```)
  let cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim()

  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) {
    console.error('extractJson: no se encontró JSON en:', text.substring(0, 500))
    throw new Error('Respuesta IA inválida')
  }

  try {
    return JSON.parse(match[0])
  } catch (e) {
    console.error('extractJson: JSON malformado:', match[0].substring(0, 500))
    throw new Error('Respuesta IA inválida (JSON malformado)')
  }
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

// ─── GLM / Zhipu AI ────────────────────────────────────────────────
// Modelo confirmado: glm-4.7-flash (devolvió 429 = existe pero rate-limited)
// Endpoint confirmado: api.z.ai/api/paas/v4
// Reintentos con espera para manejar el rate limit (429)

const ZHIPU_URL = 'https://api.z.ai/api/paas/v4/chat/completions'
const GLM_MODEL = 'glm-4.7-flash'
const MAX_RETRIES = 3

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function generateWithGLM5(title: string, severity: string, category: string) {
  const apiKey = process.env.ZHIPU_API_KEY
  if (!apiKey) throw new Error('ZHIPU_API_KEY no configurada')

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(ZHIPU_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GLM_MODEL,
        messages: [
          { role: 'system', content: 'Eres un asistente de ciberseguridad. Responde SOLO con JSON válido, sin markdown, sin bloques de código, sin texto adicional.' },
          { role: 'user', content: buildPrompt(title, severity, category) },
        ],
        max_tokens: 1024,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      const text = data.choices?.[0]?.message?.content ?? ''
      if (!text) {
        throw new Error(`GLM respondió vacío. Respuesta completa: ${JSON.stringify(data).substring(0, 300)}`)
      }
      try {
        return extractJson(text)
      } catch (e) {
        throw new Error(`GLM respondió pero no JSON válido. Primeros 300 chars: ${text.substring(0, 300)}`)
      }
    }

    // Rate limit (429): esperar y reintentar
    if (res.status === 429) {
      if (attempt < MAX_RETRIES) {
        await sleep(attempt * 3000) // 3s, 6s, 9s
        continue
      }
      throw new Error('GLM: rate limit (429). La cuenta gratuita de Z.ai tiene límites de velocidad. Esperá unos segundos y probá de nuevo.')
    }

    // Otro error
    const err = await res.text()
    throw new Error(`GLM API error (${res.status}): ${err.substring(0, 200)}`)
  }

  throw new Error('GLM: se agotaron los reintentos')
}

// ─── POST: Generación de findings ───

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
