export type ProjectType = 'web' | 'infrastructure' | 'both'
export type ProjectStatus = 'in_progress' | 'review' | 'completed' | 'archived'
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type FindingCategory = 'web' | 'network' | 'system' | 'social_engineering' | 'physical' | 'other'
export type FindingStatus = 'open' | 'in_progress' | 'in_review' | 'resolved' | 'mitigated' | 'accepted' | 'false_positive'
export type ReportFormat = 'pdf' | 'pptx'
export type ReportStatus = 'pending' | 'generating' | 'ready' | 'error'

export interface Tenant {
  id: string
  name: string
  slug: string
  logo_url?: string
  plan: 'free' | 'pro' | 'enterprise'
  created_at: string
}

export interface Organization {
  id: string
  tenant_id: string
  name: string
  logo_url?: string
  industry?: string
  contact_name?: string
  contact_email?: string
  created_at: string
}

export interface Project {
  id: string
  tenant_id: string
  organization_id: string
  name: string
  description?: string
  type: ProjectType
  status: ProjectStatus
  start_date?: string
  end_date?: string
  auditor_name?: string
  created_at: string
  updated_at: string
  organization?: Organization
  findings?: Finding[]
}

export interface Finding {
  id: string
  project_id: string
  title: string
  category: FindingCategory
  severity: SeverityLevel
  affected_endpoint?: string
  description?: string
  impact?: string
  recommendation?: string
  cvss_score?: number
  cve_id?: string
  ai_generated: boolean
  evidence_urls?: string[]
  evidence?: string
  external_refs?: string[]
  tool_source?: string
  status: FindingStatus
  created_at: string
  updated_at: string
  controls?: FindingControl[]
}

export interface Framework {
  id: string
  name: string
  version?: string
  description?: string
  controls?: FrameworkControl[]
}

export interface FrameworkControl {
  id: string
  framework_id: string
  control_id: string
  title: string
  description?: string
  category?: string
  framework?: Framework
}

export interface FindingControl {
  id: string
  finding_id: string
  control_id: string
  notes?: string
  control?: FrameworkControl
}

export interface Report {
  id: string
  project_id: string
  format: ReportFormat
  status: ReportStatus
  file_url?: string
  frameworks_included?: string[]
  generated_at?: string
  created_at: string
}

export interface SeverityCount {
  critical: number
  high: number
  medium: number
  low: number
  info: number
}
