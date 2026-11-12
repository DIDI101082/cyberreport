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

// ─── GLM / Zhipu AI ────────────────────────────────────────────────

const GLM_ENDPOINTS = [
  'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  'https://api.z.ai/api/paas/v4/chat/completions',
]

const GLM_MODEL_NAMES = [
  'glm-4-flash',
  'glm-4-flashx',
  'glm-4.7-flash',
  'glm-4.5-flash',
  'GLM-4-Flash',
]

async function generateWithGLM5(title: string, severity: string, category: string) {
  const apiKey = process.env.ZHIPU_API_KEY
  if (!apiKey) throw new Error('ZHIPU_API_KEY no configurada')

  const errors: string[] = []

  for (const endpoint of GLM_ENDPOINTS) {
    for (const modelName of GLM_MODEL_NAMES) {
      try {
        const res = await fetch(endpoint, {
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
        errors.push(`[${endpoint}][${modelName}] ${res.status}: ${err.substring(0, 120)}`)

        // Si el error NO es "Unknown Model", no probar más modelos en este endpoint
        if (!err.includes('1211') && !err.toLowerCase().includes('unknown model')) {
          break
        }
      } catch (fetchErr) {
        errors.push(`[${endpoint}][${modelName}] FETCH ERROR: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`)
        break // Error de red → saltar al siguiente endpoint
      }
    }
  }

  throw new Error(`GLM: ningún modelo funcionó. Intentos: ${errors.join(' | ')}`)
}

// ─── GET: Diagnóstico de Z.ai (visitar /api/ai/generate-finding en el navegador) ───

export async function GET() {
  const apiKey = process.env.ZHIPU_API_KEY
  const results: { key: string; tests: { endpoint: string; model: string; status: number | string; ok: boolean; body: string }[] } = {
    key: apiKey ? apiKey.substring(0, 8) + '...' : 'NO CONFIGURADA',
    tests: [],
  }

  if (!apiKey) return NextResponse.json(results)

  for (const baseUrl of [
    'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    'https://api.z.ai/api/paas/v4/chat/completions',
    'https://api.z.ai/v1/chat/completions',
  ]) {
    for (const model of ['glm-4-flash', 'glm-4-flashx', 'glm-4.7-flash', 'glm-4.5-flash']) {
      try {
        const res = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'Di hola' }],
            max_tokens: 5,
          }),
        })
        const body = await res.text()
        results.tests.push({
          endpoint: baseUrl,
          model,
          status: res.status,
          ok: res.ok,
          body: body.substring(0, 200),
        })
        // Si funcionó, no probar más modelos en este endpoint
        if (res.ok) break
      } catch (err) {
        results.tests.push({
          endpoint: baseUrl,
          model,
          status: 'FETCH_ERROR',
          ok: false,
          body: err instanceof Error ? err.message : String(err),
        })
        break
      }
    }
  }

  return NextResponse.json(results)
}

// ─── POST: Generación de findings ───────────────────────────────────

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

