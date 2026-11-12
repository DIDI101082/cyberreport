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
// Z.ai tiene 3 endpoints posibles:
//   1. OpenAI-compatible: https://api.z.ai/api/openai/v1
//   2. PAAS v4:           https://api.z.ai/api/paas/v4
//   3. BigModel China:    https://open.bigmodel.cn/api/paas/v4
// Las API keys de z.ai (internacional) y bigmodel.cn (China) son diferentes.
// Modelos Flash gratuitos: glm-4-flash, glm-4.7-flash, glm-4.5-flash

const GLM_CONFIGS = [
  { url: 'https://api.z.ai/api/openai/v1/chat/completions', model: 'glm-4-flash' },
  { url: 'https://api.z.ai/api/openai/v1/chat/completions', model: 'glm-4.7-flash' },
  { url: 'https://api.z.ai/api/openai/v1/chat/completions', model: 'GLM-4-Flash' },
  { url: 'https://api.z.ai/api/paas/v4/chat/completions', model: 'glm-4-flash' },
  { url: 'https://api.z.ai/api/paas/v4/chat/completions', model: 'glm-4.7-flash' },
  { url: 'https://api.z.ai/api/paas/v4/chat/completions', model: 'GLM-4-Flash' },
  { url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4-flash' },
  { url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4.7-flash' },
]

async function generateWithGLM5(title: string, severity: string, category: string) {
  const apiKey = process.env.ZHIPU_API_KEY
  if (!apiKey) throw new Error('ZHIPU_API_KEY no configurada')

  const errors: string[] = []

  for (const cfg of GLM_CONFIGS) {
    try {
      const res = await fetch(cfg.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.model,
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
      const label = cfg.url.includes('openai') ? 'openai' : cfg.url.includes('bigmodel') ? 'cn' : 'paas'
      errors.push(`${cfg.model}@${label}:${res.status}`)
    } catch (fetchErr) {
      const label = cfg.url.includes('openai') ? 'openai' : cfg.url.includes('bigmodel') ? 'cn' : 'paas'
      errors.push(`${cfg.model}@${label}:NET_ERR`)
    }
  }

  throw new Error(`GLM error: ninguna combinación endpoint+modelo funcionó. Probados: ${errors.join(', ')}`)
}

// ─── GET: Diagnóstico ───

export async function GET() {
  const apiKey = process.env.ZHIPU_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ZHIPU_API_KEY no configurada' })

  const tests: { ep: string; model: string; status: number | string; ok: boolean; body: string }[] = []

  for (const cfg of GLM_CONFIGS) {
    try {
      const res = await fetch(cfg.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.model,
          messages: [{ role: 'user', content: 'Hola' }],
          max_tokens: 5,
        }),
      })
      const body = await res.text()
      tests.push({
        ep: cfg.url.replace('https://', '').replace('/chat/completions', ''),
        model: cfg.model,
        status: res.status,
        ok: res.ok,
        body: body.substring(0, 200),
      })
      if (res.ok) break
    } catch (err) {
      tests.push({
        ep: cfg.url.replace('https://', '').replace('/chat/completions', ''),
        model: cfg.model,
        status: 'ERR',
        ok: false,
        body: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return NextResponse.json({ key: apiKey.substring(0, 8) + '...', tests })
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
