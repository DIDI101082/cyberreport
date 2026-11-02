import pptxgen from 'pptxgenjs'
import type { Project, Finding, Organization } from '@/types'
import { SEVERITY_CONFIG } from '@/lib/utils/severity'
import type { SeverityLevel } from '@/types'

const THEME = {
  dark:    '0F1729',
  accent:  '3B82F6',
  purple:  '7C3AED',
  red:     'DC2626',
  orange:  'EA580C',
  yellow:  'CA8A04',
  blue:    '2563EB',
  gray:    '6B7280',
  white:   'FFFFFF',
  light:   'F8FAFC',
  text:    '1E293B',
  muted:   '64748B',
}

const SEVERITY_HEX: Record<SeverityLevel, string> = {
  critical: THEME.red,
  high:     THEME.orange,
  medium:   THEME.yellow,
  low:      THEME.blue,
  info:     THEME.gray,
}

export async function generatePPTX(
  project: Project & { organization?: Organization },
  findings: Finding[],
  frameworks: string[]
): Promise<string> {
  const pptx = new pptxgen()
  pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 })
  pptx.layout = 'WIDE'

  // ─── SLIDE 1: Portada ─────────────────────────────────
  const slide1 = pptx.addSlide()
  slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: THEME.dark } })
  // Barra de acento
  slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.08, h: '100%', fill: { color: THEME.accent } })

  slide1.addText('CYBERREPORT', {
    x: 0.5, y: 1.2, w: 8, h: 1,
    fontSize: 40, bold: true, color: THEME.white, fontFace: 'Calibri',
  })
  slide1.addText('by Accusys Technology', {
    x: 0.5, y: 2.1, w: 6, h: 0.4,
    fontSize: 14, color: '94A3B8', fontFace: 'Calibri',
  })

  // Línea separadora
  slide1.addShape(pptx.ShapeType.line, {
    x: 0.5, y: 2.7, w: 8, h: 0,
    line: { color: THEME.accent, width: 1 },
  })

  slide1.addText(project.name, {
    x: 0.5, y: 3, w: 10, h: 0.8,
    fontSize: 22, bold: true, color: THEME.white, fontFace: 'Calibri',
  })

  const meta = [
    `Cliente: ${project.organization?.name ?? '—'}`,
    `Fecha: ${new Date().toLocaleDateString('es-AR')}`,
    `Clasificación: CONFIDENCIAL`,
  ]
  meta.forEach((line, i) => {
    slide1.addText(line, {
      x: 0.5, y: 3.9 + i * 0.45, w: 8, h: 0.4,
      fontSize: 12, color: '94A3B8', fontFace: 'Calibri',
    })
  })

  if (frameworks.length > 0) {
    slide1.addText(frameworks.join('  ·  '), {
      x: 0.5, y: 5.8, w: 12, h: 0.4,
      fontSize: 10, color: '818CF8', fontFace: 'Calibri', bold: true,
    })
  }

  // ─── SLIDE 2: Resumen ejecutivo ────────────────────────
  const slide2 = pptx.addSlide()
  slide2.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: THEME.dark } })
  slide2.addText('Resumen Ejecutivo', {
    x: 0.4, y: 0.12, w: 10, h: 0.5,
    fontSize: 18, bold: true, color: THEME.white, fontFace: 'Calibri',
  })

  const severities: SeverityLevel[] = ['critical', 'high', 'medium', 'low', 'info']
  const counts = severities.reduce((acc, s) => {
    acc[s] = findings.filter(f => f.severity === s).length
    return acc
  }, {} as Record<SeverityLevel, number>)

  // Tarjetas de severidad
  severities.forEach((s, i) => {
    const x = 0.4 + i * 2.5
    slide2.addShape(pptx.ShapeType.roundRect, {
      x, y: 0.9, w: 2.2, h: 1.8,
      fill: { color: SEVERITY_HEX[s] },
      rectRadius: 0.08,
    })
    slide2.addText(String(counts[s]), {
      x, y: 1.0, w: 2.2, h: 0.9,
      fontSize: 36, bold: true, color: THEME.white, align: 'center', fontFace: 'Calibri',
    })
    slide2.addText(SEVERITY_CONFIG[s].label.toUpperCase(), {
      x, y: 2.1, w: 2.2, h: 0.45,
      fontSize: 9, color: THEME.white, align: 'center', bold: true, fontFace: 'Calibri',
    })
  })

  slide2.addText(`Total de hallazgos: ${findings.length}`, {
    x: 0.4, y: 3.0, w: 8, h: 0.4,
    fontSize: 13, color: THEME.text, fontFace: 'Calibri',
  })

  // ─── SLIDE 3: Tabla de hallazgos ──────────────────────
  const slide3 = pptx.addSlide()
  slide3.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: THEME.dark } })
  slide3.addText('Hallazgos Identificados', {
    x: 0.4, y: 0.12, w: 10, h: 0.5,
    fontSize: 18, bold: true, color: THEME.white, fontFace: 'Calibri',
  })

  const tableRows: pptxgen.TableRow[] = [
    [
      { text: 'Severidad', options: { bold: true, color: THEME.white, fill: { color: THEME.dark }, fontSize: 9 } },
      { text: 'Hallazgo', options: { bold: true, color: THEME.white, fill: { color: THEME.dark }, fontSize: 9 } },
      { text: 'Categoría', options: { bold: true, color: THEME.white, fill: { color: THEME.dark }, fontSize: 9 } },
      { text: 'CVSS', options: { bold: true, color: THEME.white, fill: { color: THEME.dark }, fontSize: 9 } },
      { text: 'Estado', options: { bold: true, color: THEME.white, fill: { color: THEME.dark }, fontSize: 9 } },
    ],
    ...findings.slice(0, 12).map(f => ([
      {
        text: SEVERITY_CONFIG[f.severity as SeverityLevel]?.label ?? f.severity,
        options: {
          bold: true,
          color: THEME.white,
          fill: { color: SEVERITY_HEX[f.severity as SeverityLevel] ?? THEME.gray },
          fontSize: 8,
          align: 'center' as const,
        }
      },
      { text: f.title, options: { fontSize: 8, color: THEME.text } },
      { text: f.category ?? '—', options: { fontSize: 8, color: THEME.muted } },
      { text: f.cvss_score != null ? String(f.cvss_score) : '—', options: { fontSize: 8, color: THEME.muted, align: 'center' as const } },
      {
        text: f.status === 'open' ? 'Abierto' : f.status === 'resolved' ? 'Resuelto' : 'En revisión',
        options: { fontSize: 8, color: THEME.muted }
      },
    ] as pptxgen.TableRow)),
  ]

  slide3.addTable(tableRows, {
    x: 0.4, y: 0.85, w: 12.5,
    colW: [1.6, 5.2, 1.8, 1.2, 1.8],
    border: { type: 'solid', pt: 0.5, color: 'E2E8F0' },
    rowH: 0.38,
  })

  // ─── SLIDES de detalle (top 5 hallazgos críticos/altos) ─
  const topFindings = findings
    .filter(f => ['critical', 'high'].includes(f.severity))
    .slice(0, 5)

  topFindings.forEach((finding, idx) => {
    const slide = pptx.addSlide()
    const hex = SEVERITY_HEX[finding.severity as SeverityLevel]

    // Barra de color de severidad
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: '100%', fill: { color: hex } })
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: THEME.dark } })

    slide.addText(`Hallazgo ${idx + 1} · ${SEVERITY_CONFIG[finding.severity as SeverityLevel]?.label ?? finding.severity}`, {
      x: 0.5, y: 0.1, w: 10, h: 0.5,
      fontSize: 12, bold: true, color: hex, fontFace: 'Calibri',
    })

    slide.addText(finding.title, {
      x: 0.5, y: 0.8, w: 12.5, h: 0.7,
      fontSize: 18, bold: true, color: THEME.text, fontFace: 'Calibri',
    })

    // Meta
    const metaItems = []
    if (finding.cve_id) metaItems.push(`CVE: ${finding.cve_id}`)
    if (finding.cvss_score != null) metaItems.push(`CVSS: ${finding.cvss_score}`)
    if (finding.category) metaItems.push(`Categoría: ${finding.category}`)
    if (metaItems.length) {
      slide.addText(metaItems.join('   ·   '), {
        x: 0.5, y: 1.5, w: 12, h: 0.3,
        fontSize: 9, color: THEME.muted, fontFace: 'Calibri',
      })
    }

    // Secciones de contenido
    const sections = [
      { label: 'Descripción', content: finding.description },
      { label: 'Impacto', content: finding.impact },
      { label: 'Recomendación', content: finding.recommendation },
    ]

    let yPos = 2.0
    sections.forEach(({ label, content }) => {
      if (!content) return
      slide.addText(label, {
        x: 0.5, y: yPos, w: 12, h: 0.3,
        fontSize: 10, bold: true, color: THEME.text, fontFace: 'Calibri',
      })
      yPos += 0.32

      const truncated = content.length > 300 ? content.slice(0, 300) + '…' : content
      slide.addText(truncated, {
        x: 0.5, y: yPos, w: 12, h: 1.0,
        fontSize: 9, color: THEME.muted, fontFace: 'Calibri',
        valign: 'top', wrap: true,
      })
      yPos += 1.2
    })
  })

  // ─── SLIDE: Marcos normativos ─────────────────────────
  if (frameworks.length > 0) {
    const slideFrameworks = pptx.addSlide()
    slideFrameworks.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: THEME.dark } })
    slideFrameworks.addText('Referencia a Marcos Normativos', {
      x: 0.4, y: 0.12, w: 10, h: 0.5,
      fontSize: 18, bold: true, color: THEME.white, fontFace: 'Calibri',
    })

    const fwDesc: Record<string, string> = {
      'ISO 27001': 'Los hallazgos afectan controles del Anexo A de ISO/IEC 27001:2022, incluyendo A.8 (Controles Tecnológicos), A.9 (Control de Acceso) y A.12 (Gestión de Vulnerabilidades).',
      'PCI-DSS v4.0': 'Se identificaron debilidades en requisitos de PCI-DSS v4.0: Req. 6 (Software Seguro), Req. 7 (Control de Acceso) y Req. 11 (Pruebas de Seguridad).',
      'NIST CSF 2.0': 'Los hallazgos afectan las funciones IDENTIFICAR (ID.AM, ID.RA), PROTEGER (PR.AC, PR.DS) y DETECTAR (DE.CM) del NIST CSF 2.0.',
    }

    frameworks.forEach((fw, i) => {
      slideFrameworks.addShape(pptx.ShapeType.roundRect, {
        x: 0.4, y: 0.9 + i * 2.1, w: 12.4, h: 1.8,
        fill: { color: THEME.light },
        line: { color: 'E2E8F0', pt: 1 },
        rectRadius: 0.08,
      })
      slideFrameworks.addText(fw, {
        x: 0.7, y: 1.0 + i * 2.1, w: 11, h: 0.4,
        fontSize: 13, bold: true, color: THEME.text, fontFace: 'Calibri',
      })
      slideFrameworks.addText(fwDesc[fw] ?? '', {
        x: 0.7, y: 1.45 + i * 2.1, w: 11.5, h: 1.0,
        fontSize: 9.5, color: THEME.muted, fontFace: 'Calibri', wrap: true, valign: 'top',
      })
    })
  }

  // ─── SLIDE: Cierre ────────────────────────────────────
  const slideFinal = pptx.addSlide()
  slideFinal.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: THEME.dark } })
  slideFinal.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.08, h: '100%', fill: { color: THEME.accent } })

  slideFinal.addText('Gracias', {
    x: 0.5, y: 2.5, w: 12, h: 1,
    fontSize: 36, bold: true, color: THEME.white, align: 'center', fontFace: 'Calibri',
  })
  slideFinal.addText('Este informe es de carácter CONFIDENCIAL y está destinado exclusivamente al cliente indicado.', {
    x: 1, y: 3.8, w: 11, h: 0.6,
    fontSize: 10, color: '94A3B8', align: 'center', fontFace: 'Calibri',
  })
  slideFinal.addText('accusys.com.ar  ·  info@accusys.com.ar', {
    x: 1, y: 5.5, w: 11, h: 0.4,
    fontSize: 10, color: THEME.accent, align: 'center', fontFace: 'Calibri',
  })

  return pptx.write({ outputType: 'base64' }) as unknown as string
}
