'use client'

import { useState, useEffect } from 'react'
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react'

// ─── CVSS 3.1 metric definitions ────────────────────────────────────────────

interface MetricOption {
  value: string
  label: string
  short: string
  score: number
}

interface Metric {
  id: string
  label: string
  abbr: string
  options: MetricOption[]
}

const BASE_METRICS: Metric[] = [
  {
    id: 'AV', label: 'Attack Vector', abbr: 'AV',
    options: [
      { value: 'N', label: 'Network',          short: 'N', score: 0.85 },
      { value: 'A', label: 'Adjacent Network', short: 'A', score: 0.62 },
      { value: 'L', label: 'Local',            short: 'L', score: 0.55 },
      { value: 'P', label: 'Physical',         short: 'P', score: 0.20 },
    ],
  },
  {
    id: 'AC', label: 'Attack Complexity', abbr: 'AC',
    options: [
      { value: 'L', label: 'Low',  short: 'L', score: 0.77 },
      { value: 'H', label: 'High', short: 'H', score: 0.44 },
    ],
  },
  {
    id: 'PR', label: 'Privileges Required', abbr: 'PR',
    options: [
      { value: 'N', label: 'None',  short: 'N', score: 0.85 },
      { value: 'L', label: 'Low',   short: 'L', score: 0.62 }, // scope unchanged; 0.68 when changed
      { value: 'H', label: 'High',  short: 'H', score: 0.27 }, // scope unchanged; 0.50 when changed
    ],
  },
  {
    id: 'UI', label: 'User Interaction', abbr: 'UI',
    options: [
      { value: 'N', label: 'None',     short: 'N', score: 0.85 },
      { value: 'R', label: 'Required', short: 'R', score: 0.62 },
    ],
  },
  {
    id: 'S', label: 'Scope', abbr: 'S',
    options: [
      { value: 'U', label: 'Unchanged', short: 'U', score: 0 },
      { value: 'C', label: 'Changed',   short: 'C', score: 1 },
    ],
  },
  {
    id: 'C', label: 'Confidentiality Impact', abbr: 'C',
    options: [
      { value: 'N', label: 'None',  short: 'N', score: 0.00 },
      { value: 'L', label: 'Low',   short: 'L', score: 0.22 },
      { value: 'H', label: 'High',  short: 'H', score: 0.56 },
    ],
  },
  {
    id: 'I', label: 'Integrity Impact', abbr: 'I',
    options: [
      { value: 'N', label: 'None',  short: 'N', score: 0.00 },
      { value: 'L', label: 'Low',   short: 'L', score: 0.22 },
      { value: 'H', label: 'High',  short: 'H', score: 0.56 },
    ],
  },
  {
    id: 'A', label: 'Availability Impact', abbr: 'A',
    options: [
      { value: 'N', label: 'None',  short: 'N', score: 0.00 },
      { value: 'L', label: 'Low',   short: 'L', score: 0.22 },
      { value: 'H', label: 'High',  short: 'H', score: 0.56 },
    ],
  },
]

// CVSS 3.1 score computation
function computeCvss(sel: Record<string, string>): number | null {
  const all = BASE_METRICS.every(m => sel[m.id])
  if (!all) return null

  const get = (id: string) => {
    const m = BASE_METRICS.find(x => x.id === id)!
    const opt = m.options.find(o => o.value === sel[id])!
    return opt.score
  }

  const scopeChanged = sel['S'] === 'C'

  // PR depends on Scope
  const prScore = (() => {
    if (sel['PR'] === 'N') return 0.85
    if (sel['PR'] === 'L') return scopeChanged ? 0.68 : 0.62
    return scopeChanged ? 0.50 : 0.27
  })()

  const ISCBase = 1 - (1 - get('C')) * (1 - get('I')) * (1 - get('A'))
  const ISC = scopeChanged
    ? 7.52 * (ISCBase - 0.029) - 3.25 * Math.pow(ISCBase - 0.02, 15)
    : 6.42 * ISCBase

  if (ISC <= 0) return 0.0

  const exploitability = 8.22 * get('AV') * get('AC') * prScore * get('UI')

  const rawScore = scopeChanged
    ? Math.min(1.08 * (ISC + exploitability), 10)
    : Math.min(ISC + exploitability, 10)

  // Round up to 1 decimal
  return Math.ceil(rawScore * 10) / 10
}

function scoreToSeverity(score: number | null): { label: string; color: string; bg: string } {
  if (score === null) return { label: '—', color: 'rgba(255,255,255,.3)', bg: 'rgba(255,255,255,.04)' }
  if (score === 0)    return { label: 'None',     color: 'rgba(255,255,255,.4)', bg: 'rgba(255,255,255,.06)' }
  if (score < 4.0)   return { label: 'Low',      color: '#93c5fd', bg: 'rgba(96,165,250,.12)' }
  if (score < 7.0)   return { label: 'Medium',   color: '#fde047', bg: 'rgba(234,179,8,.12)' }
  if (score < 9.0)   return { label: 'High',     color: '#fdba74', bg: 'rgba(249,115,22,.12)' }
  return                     { label: 'Critical', color: '#fca5a5', bg: 'rgba(239,68,68,.12)' }
}

function buildVector(sel: Record<string, string>): string {
  const all = BASE_METRICS.every(m => sel[m.id])
  if (!all) return ''
  return `CVSS:3.1/AV:${sel.AV}/AC:${sel.AC}/PR:${sel.PR}/UI:${sel.UI}/S:${sel.S}/C:${sel.C}/I:${sel.I}/A:${sel.A}`
}

// ─── Component ───────────────────────────────────────────────────────────────

interface CvssCalculatorProps {
  initialVector?: string
  onApply?: (score: number, vector: string) => void
}

export default function CvssCalculator({ initialVector, onApply }: CvssCalculatorProps) {
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState<Record<string, string>>({})

  // Parse initial vector if provided
  useEffect(() => {
    if (!initialVector) return
    const parsed: Record<string, string> = {}
    const parts = initialVector.replace('CVSS:3.1/', '').split('/')
    for (const part of parts) {
      const [key, val] = part.split(':')
      if (key && val) parsed[key] = val
    }
    if (Object.keys(parsed).length > 0) {
      setSel(parsed)
      setOpen(true)
    }
  }, [initialVector])

  const score = computeCvss(sel)
  const sev = scoreToSeverity(score)
  const vector = buildVector(sel)
  const allSelected = BASE_METRICS.every(m => sel[m.id])

  function handleApply() {
    if (score !== null && vector && onApply) {
      onApply(score, vector)
      setOpen(false)
    }
  }

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif' }}>
      <style>{`
        .cvss-toggle { display: inline-flex; align-items: center; gap: 7px; padding: 7px 12px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); border-radius: 8px; cursor: pointer; font-size: 12.5px; font-weight: 600; color: #34d399; transition: all 0.12s; font-family: inherit; }
        .cvss-toggle:hover { background: rgba(16,185,129,0.18); }
        .cvss-panel { margin-top: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.09); border-radius: 13px; overflow: hidden; }
        .cvss-score-bar { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-bottom: 1px solid rgba(255,255,255,0.07); background: rgba(0,0,0,0.15); }
        .cvss-score-num { font-size: 36px; font-weight: 900; line-height: 1; min-width: 60px; }
        .cvss-score-info { flex: 1; }
        .cvss-sev-badge { display: inline-block; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 6px; margin-bottom: 4px; }
        .cvss-vector-str { font-size: 10.5px; font-family: 'SF Mono','Fira Code',monospace; color: rgba(255,255,255,0.3); word-break: break-all; line-height: 1.6; }
        .cvss-metrics { padding: 14px 18px; display: flex; flex-direction: column; gap: 12px; }
        .cvss-metric { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .cvss-metric-label { font-size: 11.5px; font-weight: 600; color: rgba(255,255,255,0.4); min-width: 150px; flex-shrink: 0; }
        .cvss-opts { display: flex; gap: 5px; flex-wrap: wrap; }
        .cvss-opt { font-size: 11.5px; font-weight: 600; padding: 5px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.4); cursor: pointer; transition: all 0.12s; }
        .cvss-opt:hover:not(.active) { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }
        .cvss-opt.active { background: rgba(37,99,235,0.2); border-color: rgba(59,130,246,0.4); color: #93c5fd; }
        .cvss-footer { padding: 12px 18px; border-top: 1px solid rgba(255,255,255,0.07); display: flex; align-items: center; gap: 10px; }
        .cvss-hint { font-size: 11.5px; color: rgba(255,255,255,0.3); flex: 1; }
        .cvss-apply { padding: 8px 16px; border-radius: 8px; background: rgba(37,99,235,0.8); border: 1px solid rgba(59,130,246,0.4); color: #fff; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.12s; }
        .cvss-apply:hover:not(:disabled) { background: rgba(37,99,235,1); }
        .cvss-apply:disabled { opacity: 0.4; cursor: not-allowed; }
        .cvss-gauge { width: 100%; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; margin-top: 6px; overflow: hidden; }
        .cvss-gauge-fill { height: 100%; border-radius: 2px; transition: width 0.3s ease, background 0.3s ease; }
      `}</style>

      {/* Toggle button */}
      <button type="button" className="cvss-toggle" onClick={() => setOpen(o => !o)}>
        <Calculator size={13} />
        Calculadora CVSS 3.1
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="cvss-panel">
          {/* Score display */}
          <div className="cvss-score-bar">
            <div
              className="cvss-score-num"
              style={{ color: score !== null ? sev.color : 'rgba(255,255,255,.2)' }}
            >
              {score !== null ? score.toFixed(1) : '—'}
            </div>
            <div className="cvss-score-info">
              <span
                className="cvss-sev-badge"
                style={{ background: sev.bg, color: sev.color }}
              >
                {sev.label}
              </span>
              <div className="cvss-gauge">
                <div
                  className="cvss-gauge-fill"
                  style={{
                    width: score !== null ? `${(score / 10) * 100}%` : '0%',
                    background: sev.color,
                  }}
                />
              </div>
              {vector && (
                <div className="cvss-vector-str">{vector}</div>
              )}
            </div>
          </div>

          {/* Metric selectors */}
          <div className="cvss-metrics">
            {BASE_METRICS.map(metric => (
              <div key={metric.id} className="cvss-metric">
                <span className="cvss-metric-label">
                  {metric.label} <span style={{ color: 'rgba(255,255,255,.25)', fontWeight: 400 }}>({metric.abbr})</span>
                </span>
                <div className="cvss-opts">
                  {metric.options.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`cvss-opt${sel[metric.id] === opt.value ? ' active' : ''}`}
                      onClick={() => setSel(s => ({ ...s, [metric.id]: opt.value }))}
                    >
                      {opt.short} · {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer / Apply */}
          {onApply && (
            <div className="cvss-footer">
              <span className="cvss-hint">
                {allSelected
                  ? 'Score y vector calculados · listo para aplicar'
                  : 'Seleccioná todos los parámetros para calcular el score'}
              </span>
              <button
                type="button"
                className="cvss-apply"
                disabled={!allSelected || score === null}
                onClick={handleApply}
              >
                Aplicar al hallazgo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
