import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SeverityBadge from '@/components/ui/SeverityBadge'
import type { SeverityLevel } from '@/types'
import { SEVERITY_ORDER } from '@/lib/utils/severity'
import { Plus, FileText, ChevronRight, ArrowLeft, Globe, Server, Upload, ShieldCheck, CheckCircle2, Users } from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  open:       { label: 'Abierto',   color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  in_review:  { label: 'Revisión',  color: '#facc15', bg: 'rgba(250,204,21,0.1)' },
  resolved:   { label: 'Resuelto',  color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  accepted:   { label: 'Aceptado',  color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)' },
}

const SEV_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#60a5fa',
  info:     'rgba(255,255,255,0.4)',
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*, organization:organizations(name, contact_email)')
    .eq('id', params.id)
    .single()

  if (!project) notFound()

  const { data: findings } = await supabase
    .from('findings')
    .select('*')
    .eq('project_id', params.id)
    .order('severity', { ascending: false })

  const severityCounts = SEVERITY_ORDER.reduce((acc, s) => {
    acc[s] = (findings ?? []).filter(f => f.severity === s).length
    return acc
  }, {} as Record<SeverityLevel, number>)

  const orgName = (Array.isArray(project.organization) ? project.organization[0] : project.organization as { name: string } | null)?.name

  return (
    <>
      <style>{`
        .pd-wrap { padding: 24px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; color: #fff; }
        .pd-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,0.4); text-decoration: none; margin-bottom: 18px; transition: color 0.12s; }
        .pd-back:hover { color: rgba(255,255,255,0.8); }
        .pd-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
        .pd-title { font-size: 20px; font-weight: 700; color: #fff; margin: 0 0 4px; }
        .pd-sub { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0; }
        .pd-actions { display: flex; gap: 8px; }
        .btn-outline { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 500; border-radius: 9px; text-decoration: none; transition: all 0.12s; }
        .btn-outline:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .btn-primary { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; background: rgba(37,99,235,0.85); border: 1px solid rgba(59,130,246,0.4); color: #fff; font-size: 13px; font-weight: 600; border-radius: 9px; text-decoration: none; transition: all 0.12s; }
        .btn-primary:hover { background: rgba(37,99,235,1); }
        .btn-green { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #34d399; font-size: 13px; font-weight: 500; border-radius: 9px; text-decoration: none; transition: all 0.12s; }
        .btn-green:hover { background: rgba(16,185,129,0.22); color: #6ee7b7; }
        .module-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
        .module-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 11px; padding: 14px 16px; text-decoration: none; display: flex; align-items: center; gap: 12px; transition: all 0.12s; }
        .module-card:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.15); }
        .module-icon { width: 36px; height: 36px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .module-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 2px; }
        .module-desc { font-size: 11px; color: rgba(255,255,255,0.35); margin: 0; }
        .sev-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }
        .sev-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 11px; padding: 14px 10px; text-align: center; }
        .sev-count { font-size: 26px; font-weight: 800; margin: 0 0 4px; }
        .findings-panel { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; }
        .findings-header { padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; }
        .findings-title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.9); margin: 0; }
        .finding-row { display: flex; align-items: center; justify-content: space-between; padding: 13px 18px; border-bottom: 1px solid rgba(255,255,255,0.05); text-decoration: none; transition: background 0.1s; }
        .finding-row:last-child { border-bottom: none; }
        .finding-row:hover { background: rgba(255,255,255,0.03); }
        .finding-name { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.85); margin: 0 0 3px; }
        .finding-row:hover .finding-name { color: #60a5fa; }
        .finding-meta { font-size: 11px; color: rgba(255,255,255,0.3); margin: 0; font-family: monospace; display: flex; align-items: center; gap: 6px; }
        .status-pill { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 99px; }
        .empty-box { padding: 50px 20px; text-align: center; }
        .empty-text {
