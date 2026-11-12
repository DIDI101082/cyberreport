import { NextResponse } from 'next/server'

// Endpoint de diagnóstico para Z.ai / Zhipu AI
// Visitar: /api/ai/debug-glm

const ENDPOINTS = [
  { name: 'Z.ai global (v4)', url: 'https://api.z.ai/api/paas/v4' },
  { name: 'Z.ai global (v1)', url: 'https://api.z.ai/v1' },
  { name: 'BigModel CN (v4)', url: 'https://open.bigmodel.cn/api/paas/v4' },
]

const MODEL_NAMES_TO_TRY = [
  'glm-4-flash',
  'glm-4.7-flash',
  'GLM-4-Flash',
  'GLM-4.7-Flash',
  'glm-4.5-flash',
  'glm-4-flashx',
  'glm-4-0520',
  'glm-4',
  'glm-3-turbo',
]

export async function GET() {
  const apiKey = process.env.ZHIPU_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ZHIPU_API_KEY no configurada' })
  }

  const results: Record<string, unknown> = {
    keyPrefix: apiKey.substring(0, 8) + '...',
    timestamp: new Date().toISOString(),
    modelsEndpoint: {},
    chatTests: [],
  }

  // 1. Intentar listar modelos disponibles en cada endpoint
  for (const ep of ENDPOINTS) {
    try {
      const res = await fetch(`${ep.url}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      const body = await res.text()
      let parsed
      try { parsed = JSON.parse(body) } catch { parsed = body }
      (results.modelsEndpoint as Record<string, unknown>)[ep.name] = {
        status: res.status,
        data: parsed,
      }
    } catch (err) {
      (results.modelsEndpoint as Record<string, unknown>)[ep.name] = {
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // 2. Probar un chat mínimo con cada combinación endpoint + modelo
  for (const ep of ENDPOINTS) {
    for (const model of MODEL_NAMES_TO_TRY) {
      try {
        const res = await fetch(`${ep.url}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'Hola' }],
            max_tokens: 5,
          }),
        })
        const body = await res.text()
        let parsed
        try { parsed = JSON.parse(body) } catch { parsed = body }

        const entry = {
          endpoint: ep.name,
          model,
          status: res.status,
          ok: res.ok,
          response: parsed,
        }
        ;(results.chatTests as unknown[]).push(entry)

        // Si funcionó, no necesitamos probar más modelos en este endpoint
        if (res.ok) break
      } catch (err) {
        ;(results.chatTests as unknown[]).push({
          endpoint: ep.name,
          model,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  return NextResponse.json(results, {
    headers: { 'Content-Type': 'application/json' },
  })
}
