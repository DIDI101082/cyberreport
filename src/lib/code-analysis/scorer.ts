import type { CodeIssue, CodeHealthScore, IssueSeverity } from '@/types/code-analysis'

// Penalización por severidad (sobre 100 puntos)
const SEVERITY_PENALTY: Record<IssueSeverity, number> = {
  critical: 20,
  high:     10,
  medium:    5,
  low:       2,
  info:      0.5,
}

// Penalización máxima por categoría antes del capping
const MAX_PENALTY = 100

export function calculateHealthScore(issues: CodeIssue[]): CodeHealthScore {
  // Conteo por severidad
  const breakdown = {
    critical: issues.filter(i => i.severity === 'critical').length,
    high:     issues.filter(i => i.severity === 'high').length,
    medium:   issues.filter(i => i.severity === 'medium').length,
    low:      issues.filter(i => i.severity === 'low').length,
    info:     issues.filter(i => i.severity === 'info').length,
  }

  // Penalización total (cap en 100)
  const totalPenalty = Math.min(
    MAX_PENALTY,
    breakdown.critical * SEVERITY_PENALTY.critical +
    breakdown.high     * SEVERITY_PENALTY.high +
    breakdown.medium   * SEVERITY_PENALTY.medium +
    breakdown.low      * SEVERITY_PENALTY.low +
    breakdown.info     * SEVERITY_PENALTY.info
  )

  // Score de seguridad
  const security = Math.max(0, Math.round(100 - totalPenalty))

  // Score de compliance (basado en issues con refs de compliance)
  const complianceIssues = issues.filter(i => i.compliance_refs.length > 0)
  const compliancePenalty = Math.min(
    MAX_PENALTY,
    complianceIssues.reduce((sum, i) => sum + SEVERITY_PENALTY[i.severity], 0)
  )
  const compliance = Math.max(0, Math.round(100 - compliancePenalty))

  // Score de calidad (issues de best_practice y logging)
  const qualityIssues = issues.filter(i => ['best_practice', 'logging'].includes(i.category))
  const qualityPenalty = Math.min(
    50,
    qualityIssues.reduce((sum, i) => sum + SEVERITY_PENALTY[i.severity] * 0.5, 0)
  )
  const quality = Math.max(0, Math.round(100 - qualityPenalty))

  // Score general ponderado
  const overall = Math.round(security * 0.5 + compliance * 0.3 + quality * 0.2)

  // Grade
  const grade = overall >= 90 ? 'A' :
                overall >= 75 ? 'B' :
                overall >= 60 ? 'C' :
                overall >= 40 ? 'D' : 'F'

  return { overall, security, compliance, quality, breakdown, grade }
}

export function getGradeColor(grade: CodeHealthScore['grade']): string {
  return grade === 'A' ? 'text-green-600' :
         grade === 'B' ? 'text-blue-600' :
         grade === 'C' ? 'text-yellow-600' :
         grade === 'D' ? 'text-orange-600' : 'text-red-600'
}

export function getGradeBg(grade: CodeHealthScore['grade']): string {
  return grade === 'A' ? 'bg-green-50 border-green-200' :
         grade === 'B' ? 'bg-blue-50 border-blue-200' :
         grade === 'C' ? 'bg-yellow-50 border-yellow-200' :
         grade === 'D' ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'
}

export function getScoreLabel(score: number): string {
  return score >= 90 ? 'Excelente' :
         score >= 75 ? 'Bueno' :
         score >= 60 ? 'Regular' :
         score >= 40 ? 'Deficiente' : 'Crítico'
}
