import type { SeverityLevel } from '@/types'

export interface ParsedFinding {
  title: string
  description: string
  recommendation: string
  severity: SeverityLevel
  cvss_score: number | null
  cve_id: string | null
  affected_endpoint: string
  evidence: string
  category: string
  tool_source: string
}

function nessusRiskToSeverity(risk: string): SeverityLevel {
  switch (risk?.toLowerCase()) {
    case 'critical': return 'critical'
    case 'high':     return 'high'
    case 'medium':   return 'medium'
    case 'low':      return 'low'
    default:         return 'info'
  }
}

export function parseNessusXML(xmlText: string): ParsedFinding[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'text/xml')
  const findings: ParsedFinding[] = []

  const reportHosts = doc.querySelectorAll('ReportHost')
  reportHosts.forEach(host => {
    const hostName = host.getAttribute('name') ?? ''
    const items = host.querySelectorAll('ReportItem')
    items.forEach(item => {
      const risk = item.querySelector('risk_factor')?.textContent ?? 'None'
      if (risk === 'None') return

      const pluginName  = item.getAttribute('pluginName') ?? ''
      const port        = item.getAttribute('port') ?? ''
      const protocol    = item.getAttribute('protocol') ?? ''
      const description = item.querySelector('description')?.textContent ?? ''
      const solution    = item.querySelector('solution')?.textContent ?? ''
      const cvss        = item.querySelector('cvss3_base_score')?.textContent
                       ?? item.querySelector('cvss_base_score')?.textContent
      const cve         = item.querySelector('cve')?.textContent ?? null
      const synopsis    = item.querySelector('synopsis')?.textContent ?? pluginName
      const pluginOutput = item.querySelector('plugin_output')?.textContent ?? ''

      findings.push({
        title:             pluginName || synopsis,
        description:       description || synopsis,
        recommendation:    solution,
        severity:          nessusRiskToSeverity(risk),
        cvss_score:        cvss ? parseFloat(cvss) : null,
        cve_id:            cve,
        affected_endpoint: port ? `${hostName}:${port}/${protocol}` : hostName,
        evidence:          pluginOutput.slice(0, 2000),
        category:          'infrastructure',
        tool_source:       'nessus',
      })
    })
  })

  return findings
}

export function parseZAPXML(xmlText: string): ParsedFinding[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'text/xml')
  const findings: ParsedFinding[] = []

  // ZAP uses riskcode: 3=High,2=Medium,1=Low,0=Info
  const riskMap: Record<string, SeverityLevel> = {
    '3': 'high', '2': 'medium', '1': 'low', '0': 'info'
  }

  const alerts = doc.querySelectorAll('alertitem, alert')
  alerts.forEach(alert => {
    const riskcode  = alert.querySelector('riskcode')?.textContent ?? '0'
    const name      = alert.querySelector('name, alert')?.textContent ?? ''
    const desc      = alert.querySelector('desc')?.textContent ?? ''
    const solution  = alert.querySelector('solution')?.textContent ?? ''
    const uri       = alert.querySelector('uri')?.textContent ?? ''
    const evidence  = alert.querySelector('evidence')?.textContent ?? ''
    const cweid     = alert.querySelector('cweid')?.textContent ?? ''
    const confidence = alert.querySelector('confidence')?.textContent ?? ''

    findings.push({
      title:             name,
      description:       desc,
      recommendation:    solution,
      severity:          riskMap[riskcode] ?? 'info',
      cvss_score:        null,
      cve_id:            null,
      affected_endpoint: uri,
      evidence:          [evidence, cweid ? `CWE-${cweid}` : '', confidence ? `Confianza: ${confidence}` : ''].filter(Boolean).join('\n'),
      category:          'web',
      tool_source:       'zap',
    })
  })

  return findings
}

export function parseBurpXML(xmlText: string): ParsedFinding[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'text/xml')
  const findings: ParsedFinding[] = []

  const severityMap: Record<string, SeverityLevel> = {
    'high': 'high', 'medium': 'medium', 'low': 'low', 'information': 'info'
  }

  const issues = doc.querySelectorAll('issue')
  issues.forEach(issue => {
    const name         = issue.querySelector('name')?.textContent ?? ''
    const host         = issue.querySelector('host')?.textContent ?? ''
    const path         = issue.querySelector('path')?.textContent ?? ''
    const sev          = (issue.querySelector('severity')?.textContent ?? 'information').toLowerCase()
    const background   = issue.querySelector('issueBackground')?.textContent ?? ''
    const detail       = issue.querySelector('issueDetail')?.textContent ?? ''
    const remediation  = issue.querySelector('remediationBackground')?.textContent ?? ''
    const remDetail    = issue.querySelector('remediationDetail')?.textContent ?? ''
    const evidence     = issue.querySelector('requestresponse')?.textContent ?? ''

    findings.push({
      title:             name,
      description:       [background, detail].filter(Boolean).join('\n\n'),
      recommendation:    [remediation, remDetail].filter(Boolean).join('\n\n'),
      severity:          severityMap[sev] ?? 'info',
      cvss_score:        null,
      cve_id:            null,
      affected_endpoint: `${host}${path}`,
      evidence:          evidence.slice(0, 2000),
      category:          'web',
      tool_source:       'burp',
    })
  })

  return findings
}

export function detectAndParse(xmlText: string): { scanner: string; findings: ParsedFinding[] } {
  if (xmlText.includes('<NessusClientData') || xmlText.includes('<ReportHost')) {
    return { scanner: 'Nessus', findings: parseNessusXML(xmlText) }
  }
  if (xmlText.includes('<OWASPZAPReport') || xmlText.includes('<alertitem') || xmlText.includes('<alerts>')) {
    return { scanner: 'OWASP ZAP', findings: parseZAPXML(xmlText) }
  }
  if (xmlText.includes('<issues burpVersion') || xmlText.includes('<BurpSuite') || xmlText.includes('<issue>')) {
    return { scanner: 'Burp Suite', findings: parseBurpXML(xmlText) }
  }
  return { scanner: 'Desconocido', findings: [] }
}
