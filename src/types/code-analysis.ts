// ─── Code Security Analysis Types ─────────────────────────────────────────────

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export type IssueCategory =
  | 'injection'
  | 'xss'
  | 'auth'
  | 'secrets'
  | 'crypto'
  | 'path_traversal'
  | 'deserialization'
  | 'dependency'
  | 'access_control'
  | 'logging'
  | 'ssrf'
  | 'xxe'
  | 'compliance'
  | 'best_practice'

export type ComplianceFramework = 'OWASP' | 'ISO27001' | 'PCI-DSS' | 'NIST' | 'CWE' | 'CVE'

export interface ComplianceRef {
  framework: ComplianceFramework
  id: string         // e.g. "A03:2021", "CWE-89", "PCI 6.2.4"
  label: string
  url?: string
}

export interface CodeIssue {
  id: string
  severity: IssueSeverity
  category: IssueCategory
  title: string
  description: string
  file_path: string
  line_start: number
  line_end?: number
  code_snippet: string
  fix_suggestion: string       // Código corregido sugerido por IA
  fix_explanation: string      // Por qué es inseguro y cómo corregirlo
  compliance_refs: ComplianceRef[]
  false_positive_probability: number   // 0-1
  effort_to_fix: 'trivial' | 'low' | 'medium' | 'high'
  ai_confidence: number        // 0-1
}

export interface CodeHealthScore {
  overall: number              // 0-100
  security: number
  compliance: number
  quality: number
  breakdown: {
    critical: number
    high: number
    medium: number
    low: number
    info: number
  }
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  trend?: 'improving' | 'stable' | 'degrading'
}

export interface AnalysisSession {
  id: string
  project_id: string
  created_at: string
  language: string
  files_analyzed: number
  lines_analyzed: number
  duration_ms: number
  issues: CodeIssue[]
  health_score: CodeHealthScore
  frameworks_checked: ComplianceFramework[]
  status: 'pending' | 'running' | 'completed' | 'failed'
}

export interface FileAnalysisResult {
  file_path: string
  language: string
  lines: number
  issues: CodeIssue[]
  health_score: number
}

// Reglas de análisis estático (base sin IA)
export interface StaticRule {
  id: string
  name: string
  severity: IssueSeverity
  category: IssueCategory
  pattern: RegExp
  compliance_refs: ComplianceRef[]
  message: string
  fix_hint: string
}
