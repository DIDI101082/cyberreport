import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — obtiene la suscripción activa del tenant
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

    const { data: plan } = await supabase
      .from('tenant_active_plan')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .single()

    return NextResponse.json({ plan })
  } catch (error) {
    console.error('Error obteniendo suscripción:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST — cambia el plan del tenant (en producción, esto se haría vía webhook de Stripe/MP)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { tier, payment_method = 'manual' } = await req.json()
    if (!['starter', 'professional', 'agency'].includes(tier)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

    // Obtener el plan
    const { data: plan } = await supabase
      .from('plans')
      .select('id')
      .eq('tier', tier)
      .single()

    if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

    // Cancelar suscripción activa anterior
    await supabase
      .from('subscriptions')
      .update({ status: 'canceled', canceled_at: new Date().toISOString() })
      .eq('tenant_id', profile.tenant_id)
      .neq('status', 'canceled')

    // Crear nueva suscripción
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    const { data: newSub, error } = await supabase
      .from('subscriptions')
      .insert({
        tenant_id: profile.tenant_id,
        plan_id: plan.id,
        status: 'active',
        payment_method,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ subscription: newSub })
  } catch (error) {
    console.error('Error cambiando plan:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
