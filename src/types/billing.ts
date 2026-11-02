export type PlanTier = 'starter' | 'professional' | 'agency'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused'

export interface Plan {
  id: string
  tier: PlanTier
  name: string
  price_usd: number
  max_projects: number | null
  max_users: number | null
  max_clients: number | null
  client_portal: boolean
  white_label: boolean
  tool_import: boolean
  api_access: boolean
  multi_workspace: boolean
  priority_support: boolean
  frameworks: string[]
}

export interface Subscription {
  id: string
  tenant_id: string
  plan_id: string
  status: SubscriptionStatus
  trial_ends_at: string | null
  current_period_start: string
  current_period_end: string
  canceled_at: string | null
  external_id: string | null
  payment_method: string | null
  created_at: string
}

export interface TenantActivePlan {
  tenant_id: string
  tenant_name: string
  tier: PlanTier
  plan_name: string
  price_usd: number
  max_projects: number | null
  max_users: number | null
  client_portal: boolean
  white_label: boolean
  tool_import: boolean
  api_access: boolean
  multi_workspace: boolean
  frameworks: string[]
  subscription_status: SubscriptionStatus
  trial_ends_at: string | null
  current_period_end: string
  is_active: boolean
}

// Config estática de los planes para la UI (no depende de la BD)
export const PLAN_CONFIG: Record<PlanTier, {
  label: string
  price: number
  description: string
  color: string
  badge?: string
  features: string[]
  limits: { projects: string; users: string; clients: string }
}> = {
  starter: {
    label: 'Starter',
    price: 49,
    description: 'Para consultores independientes y equipos chicos',
    color: 'gray',
    features: [
      '3 proyectos activos',
      '2 usuarios',
      'Exportación PDF y PPTX',
      'Framework OWASP',
      'Análisis de código básico',
      'Soporte por email',
    ],
    limits: { projects: '3', users: '2', clients: '—' },
  },
  professional: {
    label: 'Professional',
    price: 149,
    description: 'Para consultoras medianas con clientes recurrentes',
    color: 'blue',
    badge: 'Más popular',
    features: [
      'Proyectos ilimitados',
      '5 usuarios',
      'Portal de remediación para clientes',
      'Todos los frameworks (ISO 27001, PCI-DSS, NIST, CIS)',
      'Importación Nessus, ZAP, Burp Suite',
      'Análisis de código avanzado con IA',
      'Soporte prioritario',
    ],
    limits: { projects: 'Ilimitados', users: '5', clients: 'Ilimitados' },
  },
  agency: {
    label: 'Agency',
    price: 399,
    description: 'Para MSSPs y consultoras con múltiples clientes',
    color: 'purple',
    features: [
      'Todo lo de Professional',
      'Usuarios ilimitados',
      'Marca blanca en reportes',
      'Múltiples workspaces por cliente',
      'Acceso a API REST',
      'SLA garantizado',
      'Soporte prioritario 24/7',
    ],
    limits: { projects: 'Ilimitados', users: 'Ilimitados', clients: 'Ilimitados' },
  },
}
