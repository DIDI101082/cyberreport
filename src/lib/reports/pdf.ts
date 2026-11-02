import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Project, Finding, Organization } from '@/types'
import { SEVERITY_CONFIG } from '@/lib/utils/severity'
import type { SeverityLevel } from '@/types'

const SEVERITY_COLORS: Record<SeverityLevel, [number, number, number]> = {
  critical: [220, 38, 38],
  high:     [234, 88, 12],
  medium:   [202, 138, 4],
  low:      [37, 99, 235],
  info:     [107, 114, 128],
}

export async function generatePDF(
  project: Project & { organization?: Organization },
  findings: Finding[],
  frameworks: string[]
): Promise<Uint8Array> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()

  // ── Portada ──────────────────────────────────────────
  doc.setFillColor(15, 23, 42) // slate-900
  doc.rect(0, 0, W, 297, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.text('CYBERREPORT', 20, 50)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184) // slate-400
  doc.text('by Accusys Technology', 20, 60)

  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text(project.name, 20, 110)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  if (project.organization?.name) {
    doc.text(`Cliente: ${project.organization.name}`, 20, 125)
  }
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 20, 135)
  doc.text(`Clasificación: CONFIDENCIAL`, 20, 145)

  // Frameworks en portada
  if (frameworks.length > 0) {
    doc.setFontSize(10)
    doc.setTextColor(99, 102, 241)
    frameworks.forEach((fw, i) => {
      doc.text(`◆ ${fw}`, 20, 165 + i * 8)
    })
  }

  // ── Resumen ejecutivo ─────────────────────────────────
  doc.addPage()
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, W, 297, 'F')

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen Ejecutivo', 20, 25)

  doc.setDrawColor(229, 231, 235)
  doc.setLineWidth(0.3)
  doc.line(20, 28, W - 20, 28)

  // Stats de severidad
  const severities: SeverityLevel[] = ['critical', 'high', 'medium', 'low', 'info']
  const counts = severities.reduce((acc, s) => {
    acc[s] = findings.filter(f => f.severity === s).length
    return acc
  }, {} as Record<SeverityLevel, number>)

  const boxW = (W - 40 - 16) / 5
  severities.forEach((s, i) => {
    const x = 20 + i * (boxW + 4)
    const [r, g, b] = SEVERITY_COLORS[s]
    doc.setFillColor(r, g, b)
    doc.roundedRect(x, 38, boxW, 20, 3, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(String(counts[s]), x + boxW / 2, 51, { align: 'center' })
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(SEVERITY_CONFIG[s].label.toUpperCase(), x + boxW / 2, 56, { align: 'center' })
  })

  // Total
  doc.setTextColor(71, 85, 105)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total de hallazgos identificados: ${findings.length}`, 20, 72)
  doc.text(`Auditoría completada el: ${new Date().toLocaleDateString('es-AR')}`, 20, 80)

  // ── Tabla de hallazgos ────────────────────────────────
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('Tabla de Hallazgos', 20, 100)

  autoTable(doc, {
    startY: 105,
    head: [['Severidad', 'Título', 'Categoría', 'CVSS', 'Estado']],
    body: findings.map(f => [
      SEVERITY_CONFIG[f.severity as SeverityLevel]?.label ?? f.severity,
      f.title,
      f.category ?? '—',
      f.cvss_score != null ? String(f.cvss_score) : '—',
      f.status === 'open' ? 'Abierto' :
      f.status === 'resolved' || f.status === 'mitigated' ? 'Resuelto' :
      f.status === 'in_review' ? 'En revisión' :
      f.status === 'in_progress' ? 'En progreso' :
      f.status === 'false_positive' ? 'Falso positivo' : 'Aceptado',
    ]),
    headStyles: { fillColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 25 },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 22, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const severity = (data.row.raw as string[])[0]
        const severityEntry = Object.entries(SEVERITY_CONFIG).find(([, v]) => v.label === severity)
        if (severityEntry) {
          const [r, g, b] = SEVERITY_COLORS[severityEntry[0] as SeverityLevel]
          data.cell.styles.fillColor = [r, g, b]
          data.cell.styles.textColor = [255, 255, 255]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
    margin: { left: 20, right: 20 },
  })

  // ── Detalle de cada hallazgo ──────────────────────────
  findings.forEach((finding, idx) => {
    doc.addPage()
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, W, 297, 'F')

    // Header de severidad
    const [r, g, b] = SEVERITY_COLORS[finding.severity as SeverityLevel] ?? [107, 114, 128]
    doc.setFillColor(r, g, b)
    doc.rect(0, 0, 5, 297, 'F')

    doc.setTextColor(r, g, b)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(
      `HALLAZGO ${idx + 1} / ${findings.length}  ·  ${SEVERITY_CONFIG[finding.severity as SeverityLevel]?.label.toUpperCase() ?? finding.severity.toUpperCase()}`,
      12, 18
    )

    doc.setTextColor(15, 23, 42)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    const titleLines = doc.splitTextToSize(finding.title, W - 30)
    doc.text(titleLines, 12, 28)

    let y = 28 + titleLines.length * 7 + 5

    // Meta info
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(12, y, W - 24, 18, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    if (finding.cve_id) doc.text(`CVE: ${finding.cve_id}`, 16, y + 7)
    if (finding.cvss_score != null) doc.text(`CVSS: ${finding.cvss_score}`, 80, y + 7)
    if (finding.category) doc.text(`Categoría: ${finding.category}`, 120, y + 7)
    y += 26

    const printSection = (title: string, content: string | null | undefined) => {
      if (!content) return
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text(title, 12, y)
      y += 6

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(51, 65, 85)
      const lines = doc.splitTextToSize(content, W - 30)

      if (y + lines.length * 5 > 270) {
        doc.addPage()
        doc.setFillColor(255, 255, 255)
        doc.rect(0, 0, W, 297, 'F')
        doc.setFillColor(r, g, b)
        doc.rect(0, 0, 5, 297, 'F')
        y = 20
      }

      doc.text(lines, 12, y)
      y += lines.length * 5 + 8
    }

    printSection('Descripción', finding.description)
    printSection('Impacto', finding.impact)
    printSection('Recomendación', finding.recommendation)
    if (finding.evidence) printSection('Evidencia / POC', finding.evidence)
  })

  // ── Página de marcos normativos ───────────────────────
  if (frameworks.length > 0) {
    doc.addPage()
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, W, 297, 'F')

    doc.setTextColor(15, 23, 42)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Referencia a Marcos Normativos', 20, 25)
    doc.setDrawColor(229, 231, 235)
    doc.line(20, 28, W - 20, 28)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    let y = 40
    frameworks.forEach(fw => {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text(fw, 20, y)
      y += 8

      const desc: Record<string, string> = {
        'ISO 27001': 'Los hallazgos identificados pueden afectar controles del Anexo A de ISO/IEC 27001:2022, particularmente en las categorías de control de acceso, gestión de vulnerabilidades y seguridad de comunicaciones.',
        'PCI-DSS v4.0': 'Los hallazgos se relacionan con requisitos de PCI-DSS v4.0 en áreas de protección de datos de tarjetas, control de acceso y monitoreo de actividades sospechosas.',
        'NIST CSF 2.0': 'Los hallazgos impactan las funciones del NIST CSF 2.0: Identificar, Proteger, Detectar, Responder y Recuperar, especialmente en sub-categorías de gestión de activos y protección de datos.',
      }

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(71, 85, 105)
      const lines = doc.splitTextToSize(desc[fw] ?? '', W - 40)
      doc.text(lines, 20, y)
      y += lines.length * 5 + 12
    })
  }

  const arrayBuffer = doc.output('arraybuffer')
  return new Uint8Array(arrayBuffer)
}
