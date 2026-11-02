import { createClient } from '@/lib/supabase/server'
import type { TenantActivePlan, PlanTier } from '@/types/billing'

// Obtiene el plan activo del tenant autenticado
export async function getActivePlan(): Promise<TenantActivePlan | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const { data } = await supabase
    .from('tenant_active_plan')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .single()

  return data as TenantActivePlan | null
}

// Verifica si el plan activo tiene una feature
export function planHasFeature(plan: TenantActivePlan | null, feature: keyof TenantActivePlan): boolean {
  if (!plan || !plan.is_active) return false
  return Boolean(plan[feature])
}

// Verifica si puede agregar más proyectos
export async function canCreateProject(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) return false

  const { data } = await supabase.rpc('can_create_project', { p_tenant_id: profile.tenant_id })
  return data === true
}

// Verifica si puede agregar más usuarios
export async function canAddUser(): Promise<{ allowed: boolean; current: number; max: number | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { allowed: false, current: 0, max: 0 }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { allowed: false, current: 0, max: 0 }

  const plan = await getActivePlan()
  if (!plan?.is_active) return { allowed: false, current: 0, max: 0 }

  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', profile.tenant_id)

  const current = count ?? 0
  const max = plan.max_users

  return {
    allowed: max === null || current < max,
    current,
    max,
  }
}

// Helper para uso en API routes: devuelve 403 si no tiene el feature
export function requireFeature(plan: TenantActivePlan | null, feature: keyof TenantActivePlan) {
  if (!planHasFeature(plan, feature)) {
    return new Response(
      JSON.stringify({ error: 'Tu plan no incluye esta funcionalidad', upgrade_required: true }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }
  return null
}

// Orden de tiers para comparación
const TIER_ORDER: Record<PlanTier, number> = { starter: 0, professional: 1, agency: 2 }

export function tierAtLeast(current: PlanTier | undefined, required: PlanTier): boolean {
  if (!current) return false
  return TIER_ORDER[current] >= TIER_ORDER[required]
}
