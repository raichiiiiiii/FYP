import { useState } from 'react';
import {
  Building2, Users, Shield, Activity, HardDrive, Link2, FileText,
  CheckCircle, AlertTriangle, XCircle, Clock, ArrowRight, ChevronRight,
  Zap, Settings, RefreshCw, Anchor, Package, DollarSign, Eye, BarChart2
} from 'lucide-react';
import type { RoleEntry, ViewId } from './Sidebar';

interface Props {
  role: RoleEntry;
  onNavigate: (view: ViewId, params?: { applicationId?: string }) => void;
}

// ── Mock data ────────────────────────────────────────────────────────────────

const ORG = {
  legalName: 'TechBuild Sdn Bhd',
  regNumber: '202001234567 (1234567-X)',
  taxId: 'C123456789',
  sector: 'Manufacturing & Technology',
  deploymentMode: 'Standalone SME Node',
  shariahProfile: 'Mudarabah – Restricted',
  adminUser: 'Ahmad Razali',
  createdAt: '2026-01-15',
  memberCount: 14,
};

const SETUP_ITEMS = [
  { id: 'org-profile',    label: 'Organization profile complete',    status: 'complete' as const, detail: 'TechBuild Sdn Bhd · Reg 202001234567' },
  { id: 'admin-user',     label: 'Admin user configured',            status: 'complete' as const, detail: 'Ahmad Razali · ORG_ADMIN' },
  { id: 'workspace',      label: 'Default workspace active',         status: 'complete' as const, detail: 'TechBuild Main Workspace · 14 members' },
  { id: 'roles',          label: 'All critical roles assigned',      status: 'warning' as const,  detail: '3 of 9 roles have no active member' },
  { id: 'oidc',           label: 'Production authentication (OIDC)', status: 'warning' as const,  detail: 'Dev-login mode — OIDC not configured' },
  { id: 'tls',            label: 'TLS / HTTPS enforced',             status: 'warning' as const,  detail: 'Ports 3000/4000 without TLS — prototype only' },
  { id: 'backup',         label: 'Backup tested and verified',       status: 'warning' as const,  detail: 'Last backup 2h ago · restore not tested' },
  { id: 'erp',            label: 'ERP integration connected',        status: 'pending' as const,  detail: 'ERP adapter not configured' },
  { id: 'fabric',         label: 'Hyperledger Fabric channels live', status: 'warning' as const,  detail: '1 of 3 HLF channels bootstrapped' },
  { id: 'residency',      label: 'Data residency policy confirmed',  status: 'pending' as const,  detail: 'Region classification not confirmed' },
];

const USERS_SUMMARY = {
  active: 14,
  pending: 3,
  roleCoverage: [
    { role: 'SME Admin',             assigned: true  },
    { role: 'Procurement Officer',   assigned: true  },
    { role: 'Approver',              assigned: true  },
    { role: 'Finance / Accountant',  assigned: true  },
    { role: 'Supplier User',         assigned: true  },
    { role: 'Financier User',        assigned: true  },
    { role: 'Shariah Reviewer',      assigned: false },
    { role: 'Auditor',               assigned: false },
    { role: 'Developer / Integrator',assigned: false },
  ],
};

const SERVICES = [
  { name: 'API Gateway',           status: 'healthy'   as const, detail: '24 ms avg',       note: null },
  { name: 'PostgreSQL',            status: 'healthy'   as const, detail: '8 ms avg',        note: null },
  { name: 'Redis',                 status: 'healthy'   as const, detail: '2 ms avg',        note: null },
  { name: 'MinIO (Object Store)',  status: 'healthy'   as const, detail: '15 ms avg',       note: null },
  { name: 'Worker / Outbox',       status: 'degraded'  as const, detail: '—',               note: '2 retrying events' },
  { name: 'Hyperledger Fabric',    status: 'warning'   as const, detail: '—',               note: '1 anchor pending' },
];

const INTEGRATIONS = [
  { name: 'ERP Adapter (Odoo)',    status: 'active'   as const, detail: 'Last sync 14 min ago' },
  { name: 'HLF Channel (Mega↔TB)',  status: 'active'   as const, detail: '142 anchors committed' },
  { name: 'HLF Channel (Parts↔TB)',status: 'pending'  as const, detail: 'Bootstrap pending' },
  { name: 'HLF Channel (TB↔Solar)',status: 'pending'  as const, detail: 'Bootstrap pending' },
  { name: 'E-Signature API',       status: 'deferred' as const, detail: 'Mock mode — prototype only' },
  { name: 'Finance API (Amanah)',   status: 'inactive' as const, detail: 'Not configured' },
  { name: 'Outbox / Webhooks',     status: 'warning'  as const, detail: '2 events retrying' },
];

const AUDIT_SUMMARY = {
  recentEvents: 18,
  pendingAnchors: 1,
  hashMismatches: 0,
  lastEvent: '2 min ago',
  lastEventDesc: 'Evidence checklist item completed',
};

const NEXT_ACTIONS = [
  { label: 'Assign Shariah Reviewer role',      sub: '0 members currently have this role',        priority: 'high'   as const, view: 'admin'         as ViewId },
  { label: 'Configure OIDC authentication',      sub: 'Dev-login mode is not production safe',     priority: 'high'   as const, view: 'integrations'  as ViewId },
  { label: 'Bootstrap remaining HLF channels',  sub: '2 of 3 channels not yet live',              priority: 'high'   as const, view: 'network'       as ViewId },
  { label: 'Run backup restore test',            sub: 'RPO confirmed; restore not verified',       priority: 'medium' as const, view: 'operations'    as ViewId },
  { label: 'Configure Finance API adapter',      sub: 'Amanah Islamic Bank integration pending',   priority: 'medium' as const, view: 'integrations'  as ViewId },
  { label: 'Confirm data residency policy',      sub: 'Required before production readiness sign-off', priority: 'low' as const, view: 'admin'        as ViewId },
];

// DLR-28 environment mode
const ENV_MODE = 'PROTOTYPE'; // 'PROTOTYPE' | 'UAT' | 'PRODUCTION_READY_BLOCKED' | 'PRODUCTION_READY'
const ENV_CONFIG = {
  PROTOTYPE:                { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', label: 'PROTOTYPE', desc: 'Safe for development and local demo. Not production-ready — TLS not enforced, OIDC not configured, backup not verified.' },
  UAT:                      { color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.25)', label: 'UAT / STAGING', desc: 'Safe for user acceptance testing. Review open security findings before promotion to production.' },
  PRODUCTION_READY_BLOCKED: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', label: 'PRODUCTION READY — BLOCKED', desc: 'Production promotion is blocked. Resolve all critical setup items before confirming readiness.' },
  PRODUCTION_READY:         { color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', label: 'PRODUCTION READY', desc: 'All required setup items confirmed. Node is operating within production policy.' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#6b7280' };
const PRIORITY_BG    = { high: 'rgba(239,68,68,0.07)', medium: 'rgba(245,158,11,0.07)', low: 'rgba(107,114,128,0.05)' };

function statusIcon(status: 'complete' | 'warning' | 'pending') {
  if (status === 'complete') return <CheckCircle size={14} color="#10b981" />;
  if (status === 'warning')  return <AlertTriangle size={14} color="#f59e0b" />;
  return <Clock size={14} color="#94a3b8" />;
}

function serviceColor(status: 'healthy' | 'degraded' | 'warning') {
  if (status === 'healthy')  return '#10b981';
  if (status === 'degraded') return '#ef4444';
  return '#f59e0b';
}

function integrationColor(status: 'active' | 'pending' | 'inactive' | 'deferred' | 'warning') {
  if (status === 'active')   return '#10b981';
  if (status === 'pending')  return '#f59e0b';
  if (status === 'warning')  return '#ef4444';
  if (status === 'deferred') return '#94a3b8';
  return '#64748b';
}

// ── Component ────────────────────────────────────────────────────────────────

export function PlatformDashboardView({ role, onNavigate }: Props) {
  const [setupExpanded, setSetupExpanded] = useState(true);
  const envCfg = ENV_CONFIG[ENV_MODE];

  const completedSetup = SETUP_ITEMS.filter(i => i.status === 'complete').length;
  const readinessPct = Math.round((completedSetup / SETUP_ITEMS.length) * 100);

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#f1f5f9' }}>

      {/* Header */}
      <div className="px-8 py-5" style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 style={{ color: '#0f172a' }}>Platform Manager Dashboard</h1>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 2 }}>{ORG.legalName} · {role.label}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* DLR-28: environment label */}
            <div className="px-3 py-2 rounded-xl" style={{ background: envCfg.bg, border: `1px solid ${envCfg.border}` }}>
              <p style={{ color: envCfg.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>{envCfg.label}</p>
            </div>
            <button
              onClick={() => onNavigate('operations')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:opacity-80 transition-all"
              style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: 12 }}>
              <Activity size={13} /> Full health view
            </button>
          </div>
        </div>
      </div>

      {/* DLR-28: Environment warning banner */}
      {ENV_MODE !== 'PRODUCTION_READY' && (
        <div className="px-8 py-3 flex items-center gap-3" style={{ background: envCfg.bg, borderBottom: `1px solid ${envCfg.border}` }}>
          <AlertTriangle size={14} color={envCfg.color} />
          <span style={{ color: envCfg.color, fontSize: 13 }}>
            <strong>DLR-28 · {envCfg.label}:</strong> {envCfg.desc}
          </span>
        </div>
      )}

      <div className="px-8 py-6 space-y-5">

        {/* Row 1: Org Profile + Setup Completeness + Users */}
        <div className="grid grid-cols-3 gap-5">

          {/* Card 1: Organization Profile */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <CardHeader icon={Building2} iconColor="#0ea5e9" title="Organization Profile" />
            <div className="p-4 space-y-2">
              <OrgRow label="Legal name"      value={ORG.legalName} />
              <OrgRow label="Reg number"      value={ORG.regNumber} />
              <OrgRow label="Tax ID"          value={ORG.taxId} />
              <OrgRow label="Sector"          value={ORG.sector} />
              <OrgRow label="Deployment"      value={ORG.deploymentMode} />
              <OrgRow label="Shariah profile" value={ORG.shariahProfile} highlight="#7c3aed" />
              <OrgRow label="Admin"           value={ORG.adminUser} />
              <OrgRow label="Members"         value={`${ORG.memberCount} active`} />
            </div>
            <CardFooter label="Edit profile" onClick={() => onNavigate('admin')} />
          </div>

          {/* Card 2: Setup Completeness — DLR-27 */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <Zap size={15} color="#f59e0b" />
              <h3 style={{ color: '#0f172a' }}>Setup Completeness</h3>
              <span className="ml-auto px-2 py-0.5 rounded-full" style={{ background: readinessPct === 100 ? '#f0fdf4' : '#fff7ed', color: readinessPct === 100 ? '#047857' : '#c2410c', fontSize: 11 }}>
                {completedSetup}/{SETUP_ITEMS.length}
              </span>
            </div>
            <div className="px-4 pt-3 pb-1">
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${readinessPct}%`, background: readinessPct === 100 ? '#10b981' : readinessPct >= 60 ? '#f59e0b' : '#ef4444' }} />
              </div>
              <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 4, marginBottom: 8 }}>{readinessPct}% ready · {SETUP_ITEMS.filter(i => i.status === 'warning').length} warnings · {SETUP_ITEMS.filter(i => i.status === 'pending').length} pending</p>
            </div>
            <div className="px-4 pb-4 space-y-1.5">
              {SETUP_ITEMS.map(item => (
                <div key={item.id} className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">{statusIcon(item.status)}</div>
                  <div className="min-w-0">
                    <p style={{ color: '#334155', fontSize: 12 }}>{item.label}</p>
                    <p style={{ color: '#94a3b8', fontSize: 10 }}>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <CardFooter label="Continue setup" onClick={() => onNavigate('admin')} />
          </div>

          {/* Card 3: Users & Roles */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <CardHeader icon={Users} iconColor="#8b5cf6" title="Users & Roles" />
            <div className="p-4">
              <div className="flex gap-3 mb-4">
                <StatBadge value={USERS_SUMMARY.active} label="Active" color="#10b981" />
                <StatBadge value={USERS_SUMMARY.pending} label="Pending invite" color="#f59e0b" />
              </div>
              <p style={{ color: '#64748b', fontSize: 11, marginBottom: 8 }}>Role coverage</p>
              <div className="space-y-1.5">
                {USERS_SUMMARY.roleCoverage.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {r.assigned
                      ? <CheckCircle size={12} color="#10b981" />
                      : <AlertTriangle size={12} color="#f59e0b" />}
                    <span style={{ color: r.assigned ? '#334155' : '#c2410c', fontSize: 12 }}>{r.role}</span>
                    {!r.assigned && <span style={{ color: '#94a3b8', fontSize: 10 }}>— no member</span>}
                  </div>
                ))}
              </div>
            </div>
            <CardFooter label="Manage users" onClick={() => onNavigate('admin')} />
          </div>
        </div>

        {/* Row 2: Security + Deployment Health + Backup */}
        <div className="grid grid-cols-3 gap-5">

          {/* Card 4: Security & Auth */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <CardHeader icon={Shield} iconColor="#ef4444" title="Security & Auth" />
            <div className="p-4 space-y-3">
              <SecurityRow label="Auth mode"          value="Dev-login (prototype)"     status="warning" />
              <SecurityRow label="OIDC configured"    value="Not configured"            status="warning" />
              <SecurityRow label="TLS enforced"       value="No (ports 3000/4000 open)" status="warning" />
              <SecurityRow label="Session policy"     value="Default (24h)"             status="ok" />
              <SecurityRow label="RBAC enforcement"   value="Active"                    status="ok" />
              <SecurityRow label="Access-denied (7d)" value="2 events"                  status="ok" />
            </div>
            <CardFooter label="Configure auth" onClick={() => onNavigate('admin')} />
          </div>

          {/* Card 5: Deployment Health */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <CardHeader icon={Activity} iconColor="#059669" title="Deployment Health" />
            <div className="p-4 space-y-2">
              {SERVICES.map((svc, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: serviceColor(svc.status) }} />
                  <span style={{ color: '#334155', fontSize: 12, flex: 1 }}>{svc.name}</span>
                  <span style={{ color: serviceColor(svc.status), fontSize: 11, fontWeight: 500 }}>
                    {svc.note ?? svc.detail}
                  </span>
                </div>
              ))}
            </div>
            <CardFooter label="Full health view" onClick={() => onNavigate('operations')} />
          </div>

          {/* Card 6: Backup & Restore */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <CardHeader icon={HardDrive} iconColor="#f59e0b" title="Backup & Restore" />
            <div className="p-4 space-y-3">
              <OrgRow label="Last backup"    value="2 hours ago" />
              <OrgRow label="RPO target"     value="24 h" />
              <OrgRow label="RPO status"     value="Met" highlight="#10b981" />
              <OrgRow label="RTO target"     value="4 h" />
              <OrgRow label="Restore tested" value="Not completed" highlight="#ef4444" />
              <OrgRow label="Backup region"  value="ap-southeast-1" />
            </div>
            <div className="px-4 pb-3">
              <div className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                <AlertTriangle size={12} color="#f59e0b" className="mt-0.5 shrink-0" />
                <p style={{ color: '#c2410c', fontSize: 11 }}>Restore test required before production readiness confirmation.</p>
              </div>
            </div>
            <CardFooter label="Backup settings" onClick={() => onNavigate('operations')} />
          </div>
        </div>

        {/* Row 3: Integrations + Audit/Evidence */}
        <div className="grid grid-cols-2 gap-5">

          {/* Card 7: Integration Readiness */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <CardHeader icon={Link2} iconColor="#0284c7" title="Integration Readiness" />
            <div className="p-4 space-y-2">
              {INTEGRATIONS.map((ig, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: integrationColor(ig.status) }} />
                  <span style={{ color: '#334155', fontSize: 12, flex: 1 }}>{ig.name}</span>
                  <span style={{ color: integrationColor(ig.status), fontSize: 11 }}>{ig.detail}</span>
                </div>
              ))}
            </div>
            <CardFooter label="Manage integrations" onClick={() => onNavigate('integrations')} />
          </div>

          {/* Card 8: Audit & Evidence */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <CardHeader icon={FileText} iconColor="#047857" title="Audit & Evidence" />
            <div className="p-4">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <StatCard value={AUDIT_SUMMARY.recentEvents} label="Events (7d)" color="#3b82f6" />
                <StatCard value={AUDIT_SUMMARY.pendingAnchors} label="Pending anchors" color="#f59e0b" />
                <StatCard value={AUDIT_SUMMARY.hashMismatches} label="Hash mismatches" color={AUDIT_SUMMARY.hashMismatches > 0 ? '#ef4444' : '#10b981'} />
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: '#f0fdf4', border: '1px solid #a7f3d0' }}>
                <CheckCircle size={12} color="#10b981" />
                <p style={{ color: '#047857', fontSize: 12 }}>No hash mismatches detected · Audit chain intact</p>
              </div>
              <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 10 }}>
                Last event: <strong style={{ color: '#334155' }}>{AUDIT_SUMMARY.lastEvent}</strong> — {AUDIT_SUMMARY.lastEventDesc}
              </p>
            </div>
            <CardFooter label="Open audit trail" onClick={() => onNavigate('audit')} />
          </div>
        </div>

        {/* Row 4: Next Actions + UAT/Demo Readiness */}
        <div className="grid grid-cols-2 gap-5">

          {/* Card 9: Next Best Actions — DLR-27 */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <Zap size={15} color="#047857" />
              <h3 style={{ color: '#0f172a' }}>Next Best Actions</h3>
              <span className="ml-auto px-2 py-0.5 rounded-full text-xs" style={{ background: '#f0fdf4', color: '#047857', fontSize: 10 }}>DLR-27 · setup guidance</span>
            </div>
            <div className="p-4 space-y-2">
              {NEXT_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  onClick={() => onNavigate(action.view)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:opacity-80 text-left"
                  style={{ background: PRIORITY_BG[action.priority], border: `1px solid ${PRIORITY_COLOR[action.priority]}20` }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PRIORITY_COLOR[action.priority] }} />
                  <div className="flex-1 min-w-0">
                    <p style={{ color: '#0f172a', fontSize: 13, fontWeight: 500 }}>{action.label}</p>
                    <p style={{ color: '#64748b', fontSize: 11 }}>{action.sub}</p>
                  </div>
                  <ArrowRight size={13} color="#94a3b8" />
                </button>
              ))}
            </div>
          </div>

          {/* Card 10: UAT / Demo Readiness — DLR-28 */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <BarChart2 size={15} color={envCfg.color} />
              <h3 style={{ color: '#0f172a' }}>UAT / Demo Readiness</h3>
              <span className="ml-auto px-2 py-0.5 rounded-full text-xs" style={{ background: envCfg.bg, color: envCfg.color, border: `1px solid ${envCfg.border}`, fontSize: 10 }}>{envCfg.label}</span>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: 'Seeded demo data', value: 'Available', status: 'ok' as const, detail: '9 apps · 6 ledgers · 142 audit events' },
                { label: 'Demo roles available', value: 'All 9 roles', status: 'ok' as const, detail: 'Role switcher active in prototype mode' },
                { label: 'Network canvas', value: 'Live', status: 'ok' as const, detail: 'HLF topology + zoom/pan' },
                { label: 'TLS / HTTPS', value: 'Not enforced', status: 'warning' as const, detail: 'Ports 3000/4000 — demo only' },
                { label: 'OIDC authentication', value: 'Not configured', status: 'warning' as const, detail: 'Dev-login mode active' },
                { label: 'Production readiness', value: 'Blocked', status: 'blocked' as const, detail: '5 items must pass before production sign-off' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">
                    {item.status === 'ok'      && <CheckCircle size={13} color="#10b981" />}
                    {item.status === 'warning' && <AlertTriangle size={13} color="#f59e0b" />}
                    {item.status === 'blocked' && <XCircle size={13} color="#ef4444" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span style={{ color: '#334155', fontSize: 12, fontWeight: 500 }}>{item.label}</span>
                      <span style={{ color: item.status === 'ok' ? '#059669' : item.status === 'warning' ? '#f59e0b' : '#ef4444', fontSize: 11 }}>{item.value}</span>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: 11 }}>{item.detail}</p>
                  </div>
                </div>
              ))}

              <div className="mt-2 p-3 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #a7f3d0' }}>
                <p style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>UAT scenario entry points</p>
                {[
                  { label: 'Application lifecycle walkthrough', role: 'sme-admin', view: 'applications' as ViewId },
                  { label: 'Finance due diligence review', role: 'financier-user', view: 'applications' as ViewId },
                  { label: 'Shariah compliance review', role: 'shariah-reviewer', view: 'applications' as ViewId },
                  { label: 'Audit trail verification', role: 'auditor', view: 'audit' as ViewId },
                ].map((s, i) => (
                  <button key={i} onClick={() => onNavigate(s.view)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1 hover:opacity-80 transition-all text-left"
                    style={{ background: 'rgba(4,120,87,0.06)', color: '#047857', fontSize: 12 }}>
                    <ChevronRight size={11} /> {s.label}
                    <span style={{ color: '#94a3b8', fontSize: 10, marginLeft: 'auto' }}>as {s.role}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CardHeader({ icon: Icon, iconColor, title }: { icon: any; iconColor: string; title: string }) {
  return (
    <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
      <Icon size={15} color={iconColor} />
      <h3 style={{ color: '#0f172a' }}>{title}</h3>
    </div>
  );
}

function CardFooter({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="px-4 py-3" style={{ borderTop: '1px solid #f1f5f9' }}>
      <button onClick={onClick} className="flex items-center gap-1 hover:opacity-70 transition-all" style={{ color: '#047857', fontSize: 12 }}>
        {label} <ChevronRight size={12} />
      </button>
    </div>
  );
}

function OrgRow({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: '#94a3b8', fontSize: 12 }}>{label}</span>
      <span style={{ color: highlight ?? '#334155', fontSize: 12, fontWeight: highlight ? 600 : 400 }}>{value}</span>
    </div>
  );
}

function SecurityRow({ label, value, status }: { label: string; value: string; status: 'ok' | 'warning' | 'error' }) {
  const color = status === 'ok' ? '#64748b' : status === 'warning' ? '#c2410c' : '#ef4444';
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: '#94a3b8', fontSize: 12 }}>{label}</span>
      <span style={{ color, fontSize: 12, fontWeight: status !== 'ok' ? 500 : 400 }}>{value}</span>
    </div>
  );
}

function StatBadge({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex-1 p-3 rounded-xl text-center" style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
      <p style={{ color, fontSize: 22, fontWeight: 700 }}>{value}</p>
      <p style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>{label}</p>
    </div>
  );
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="p-3 rounded-xl text-center" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
      <p style={{ color, fontSize: 20, fontWeight: 700 }}>{value}</p>
      <p style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>{label}</p>
    </div>
  );
}
