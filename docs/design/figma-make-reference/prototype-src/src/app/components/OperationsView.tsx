import { useState } from 'react';
import {
  Server, Database, Zap, HardDrive, Globe, Shield, CheckCircle,
  AlertTriangle, XCircle, RefreshCw, Clock, Activity, Archive,
  Monitor, Cpu, Lock, AlertOctagon, ChevronDown, ExternalLink
} from 'lucide-react';
import type { RoleEntry, ViewId } from './Sidebar';

interface Props {
  role: RoleEntry;
  onNavigate: (view: ViewId) => void;
}

type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

interface ServiceHealth {
  name: string;
  status: HealthStatus;
  latency?: string;
  version?: string;
  note?: string;
  icon: React.ElementType;
}

const SERVICES: ServiceHealth[] = [
  { name: 'API Server (NestJS)', status: 'healthy', latency: '12ms', version: 'v1.0.0-rc2', icon: Server },
  { name: 'Web Frontend (Vite)', status: 'healthy', latency: '4ms', version: 'v1.0.0-rc2', icon: Monitor },
  { name: 'PostgreSQL 15', status: 'healthy', latency: '3ms', version: '15.4', icon: Database },
  { name: 'Redis 7 (BullMQ)', status: 'degraded', latency: '45ms', note: 'Elevated latency — queue processing slow', icon: Zap },
  { name: 'MinIO Object Storage', status: 'healthy', latency: '18ms', version: 'RELEASE.2024-01', icon: HardDrive },
  { name: 'Background Worker', status: 'healthy', latency: undefined, note: 'Processing 3 outbox events', icon: Cpu },
  { name: 'Hyperledger Fabric GW', status: 'degraded', latency: '2100ms', note: 'Network congestion — anchoring queued', icon: Shield },
  { name: 'Caddy Reverse Proxy', status: 'healthy', latency: '1ms', version: 'v2.8', icon: Globe },
];

const ENV_CHECKS = [
  { key: 'DATABASE_URL', status: 'ok', note: 'Connected, pooling active' },
  { key: 'REDIS_URL', status: 'warn', note: 'Connected but elevated latency' },
  { key: 'MINIO_ENDPOINT', status: 'ok', note: 'Object storage reachable' },
  { key: 'JWT_SECRET', status: 'ok', note: 'Secret configured, 256-bit' },
  { key: 'FABRIC_GATEWAY_URL', status: 'warn', note: 'Connected but network degraded' },
  { key: 'ESIGN_PROVIDER_URL', status: 'missing', note: 'Not configured — e-sign disabled' },
  { key: 'ERP_WEBHOOK_SECRET', status: 'missing', note: 'Not configured — ERP sync disabled' },
  { key: 'SMTP_HOST', status: 'ok', note: 'Email delivery active' },
];

const BACKUP_HISTORY = [
  { timestamp: '2026-06-02 03:00 UTC', size: '1.24 GB', status: 'completed', rpoHours: 21 },
  { timestamp: '2026-06-01 03:00 UTC', size: '1.21 GB', status: 'completed', rpoHours: 45 },
  { timestamp: '2026-05-31 03:00 UTC', size: '1.19 GB', status: 'completed', rpoHours: 69 },
];

const UAT_SCENARIOS = [
  { id: 'UC-07', title: 'Submit Mudarabah Application', role: 'Procurement Officer', status: 'seeded' },
  { id: 'UC-08', title: 'Financier Due Diligence Review', role: 'Financier User', status: 'seeded' },
  { id: 'UC-09', title: 'Shariah Review Flow', role: 'Shariah Reviewer', status: 'seeded' },
  { id: 'UC-05', title: 'Procure-to-Pay 3-Way Match', role: 'Procurement Officer', status: 'seeded' },
  { id: 'UC-12', title: 'P/L Calculation and Closure', role: 'Finance/Accountant', status: 'pending' },
  { id: 'UC-14', title: 'Audit Evidence Verification', role: 'Auditor', status: 'pending' },
];

const STATUS_ICON: Record<HealthStatus, React.ElementType> = {
  healthy: CheckCircle, degraded: AlertTriangle, down: XCircle, unknown: AlertOctagon,
};
const STATUS_COLOR: Record<HealthStatus, string> = {
  healthy: '#10b981', degraded: '#f59e0b', down: '#ef4444', unknown: '#94a3b8',
};

function ReadinessScore() {
  const healthy = SERVICES.filter(s => s.status === 'healthy').length;
  const total = SERVICES.length;
  const pct = Math.round((healthy / total) * 100);
  const envOk = ENV_CHECKS.filter(e => e.status === 'ok').length;
  const envTotal = ENV_CHECKS.length;
  const overallPct = Math.round(((pct / 100) * 0.6 + (envOk / envTotal) * 0.4) * 100);
  const color = overallPct >= 85 ? '#10b981' : overallPct >= 60 ? '#f59e0b' : '#ef4444';
  const r = 36, circ = 2 * Math.PI * r;
  const offset = circ * (1 - overallPct / 100);

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <svg width={96} height={96} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={48} cy={48} r={r} fill="none" stroke="#1e293b" strokeWidth={8} />
        <circle cx={48} cy={48} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ marginTop: -80, textAlign: 'center', zIndex: 1, position: 'relative' }}>
        <div style={{ color, fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{overallPct}%</div>
        <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>readiness</div>
      </div>
      <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 8 }}>
        {healthy}/{total} services · {envOk}/{envTotal} env vars
      </div>
    </div>
  );
}

export function OperationsView({ role, onNavigate }: Props) {
  const [tab, setTab] = useState<'health' | 'env' | 'backup' | 'uat'>('health');
  const [runningCheck, setRunningCheck] = useState(false);

  const isDevRole = role.id === 'sme-admin' || role.id === 'developer';
  const overallStatus: HealthStatus = SERVICES.some(s => s.status === 'down') ? 'down'
    : SERVICES.some(s => s.status === 'degraded') ? 'degraded' : 'healthy';

  const rpoHours = BACKUP_HISTORY[0]?.rpoHours ?? 999;
  const backupFresh = rpoHours < 26;

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#f1f5f9' }}>
      {/* Header */}
      <div className="px-8 py-5" style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ color: '#0f172a' }}>Deployment Health</h1>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 2 }}>
              Node readiness · services · environment · backup · UAT
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Overall health badge */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg"
              style={{ background: `${STATUS_COLOR[overallStatus]}15`, border: `1px solid ${STATUS_COLOR[overallStatus]}30` }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: STATUS_COLOR[overallStatus] }} />
              <span style={{ color: STATUS_COLOR[overallStatus], fontSize: 13, fontWeight: 600 }}>
                {overallStatus === 'healthy' ? 'All Systems Operational' : overallStatus === 'degraded' ? 'Partial Degradation' : 'System Down'}
              </span>
            </div>
            {isDevRole && (
              <button
                onClick={() => { setRunningCheck(true); setTimeout(() => setRunningCheck(false), 2000); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg hover:opacity-80 transition-all"
                style={{ background: '#047857', color: 'white', fontSize: 13 }}>
                <RefreshCw size={13} className={runningCheck ? 'animate-spin' : ''} />
                {runningCheck ? 'Checking...' : 'Run Health Check'}
              </button>
            )}
          </div>
        </div>

        {/* DLR-20: Student-budget / prototype risk warning */}
        <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
          <AlertTriangle size={15} color="#c2410c" className="shrink-0 mt-0.5" />
          <div>
            <span style={{ color: '#c2410c', fontSize: 12, fontWeight: 600 }}>Prototype / Student VM Deployment Detected</span>
            <span style={{ color: '#9a3412', fontSize: 12 }}> — TLS not configured on port 3000/4000. Public API exposure is unsafe for production data. Configure Caddy with a real domain before demo with external parties. </span>
            <a href="#" style={{ color: '#ea580c', fontSize: 12 }}>View deployment runbook →</a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 pt-4 flex gap-1" style={{ borderBottom: '1px solid #e2e8f0', background: 'white' }}>
        {(['health', 'env', 'backup', 'uat'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2.5 rounded-t-lg transition-all"
            style={{
              background: tab === t ? '#f1f5f9' : 'transparent',
              color: tab === t ? '#0f172a' : '#64748b',
              fontSize: 13, fontWeight: tab === t ? 600 : 400,
              borderBottom: tab === t ? '2px solid #047857' : '2px solid transparent',
              marginBottom: -1,
            }}>
            {{ health: 'Runtime Services', env: 'Environment', backup: 'Backup & DR', uat: 'UAT Scenarios' }[t]}
          </button>
        ))}
      </div>

      <div className="px-8 py-6 space-y-5">
        {tab === 'health' && (
          <>
            {/* Readiness + topology */}
            <div className="grid grid-cols-4 gap-5">
              <div className="rounded-xl p-5 flex flex-col items-center justify-center" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
                <ReadinessScore />
                <div className="mt-4 w-full">
                  <div className="text-center" style={{ color: '#64748b', fontSize: 11, marginBottom: 8 }}>
                    {!backupFresh && '⚠ Backup overdue · '}
                    {SERVICES.some(s => s.status === 'degraded') && '⚠ Redis & Fabric degraded'}
                  </div>
                </div>
              </div>

              <div className="col-span-3 rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
                <h4 style={{ color: '#0f172a', marginBottom: 14 }}>Runtime Topology</h4>
                <div className="grid grid-cols-2 gap-2.5">
                  {SERVICES.map(svc => {
                    const Icon = svc.icon;
                    const StatusIcon = STATUS_ICON[svc.status];
                    return (
                      <div key={svc.name} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                        style={{ background: `${STATUS_COLOR[svc.status]}08`, border: `1px solid ${STATUS_COLOR[svc.status]}20` }}>
                        <Icon size={14} color={STATUS_COLOR[svc.status]} />
                        <div className="flex-1 min-w-0">
                          <div style={{ color: '#0f172a', fontSize: 12, fontWeight: 500 }} className="truncate">{svc.name}</div>
                          {svc.note && <div style={{ color: '#94a3b8', fontSize: 10 }} className="truncate">{svc.note}</div>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {svc.latency && <span style={{ color: '#94a3b8', fontSize: 10 }}>{svc.latency}</span>}
                          <StatusIcon size={13} color={STATUS_COLOR[svc.status]} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Migration status */}
            <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
              <h4 style={{ color: '#0f172a', marginBottom: 14 }}>Database Migration Status</h4>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Applied Migrations', value: '24', color: '#10b981' },
                  { label: 'Pending Migrations', value: '0', color: '#10b981' },
                  { label: 'Schema Drift', value: 'None', color: '#10b981' },
                  { label: 'Last Migration', value: '2026-05-30', color: '#64748b' },
                ].map((m, i) => (
                  <div key={i} className="px-4 py-3 rounded-lg" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: m.color, fontSize: 18, fontWeight: 700 }}>{m.value}</div>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Network exposure */}
            <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
              <h4 style={{ color: '#0f172a', marginBottom: 14 }}>Network Exposure</h4>
              <div className="space-y-2">
                {[
                  { port: '3000', service: 'Frontend (Vite dev)', exposure: 'Public', tls: false, risk: 'high' },
                  { port: '4000', service: 'API (NestJS)', exposure: 'Public', tls: false, risk: 'high' },
                  { port: '5432', service: 'PostgreSQL', exposure: 'Internal', tls: true, risk: 'low' },
                  { port: '6379', service: 'Redis', exposure: 'Internal', tls: false, risk: 'medium' },
                  { port: '9000', service: 'MinIO', exposure: 'Internal', tls: true, risk: 'low' },
                  { port: '80/443', service: 'Caddy (planned)', exposure: 'Not configured', tls: false, risk: 'high' },
                ].map((p, i) => (
                  <div key={i} className="flex items-center gap-4 px-3 py-2 rounded-lg" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: 12, fontFamily: 'monospace', width: 48 }}>{p.port}</span>
                    <span style={{ color: '#0f172a', fontSize: 12, flex: 1 }}>{p.service}</span>
                    <span style={{ color: '#64748b', fontSize: 11, width: 80 }}>{p.exposure}</span>
                    <span className="px-2 py-0.5 rounded-full" style={{
                      background: p.risk === 'high' ? '#fee2e2' : p.risk === 'medium' ? '#fef3c7' : '#d1fae5',
                      color: p.risk === 'high' ? '#dc2626' : p.risk === 'medium' ? '#d97706' : '#059669',
                      fontSize: 10,
                    }}>
                      {p.tls ? '🔒 TLS' : `${p.risk} risk`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'env' && (
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h4 style={{ color: '#0f172a' }}>Environment Variables</h4>
              <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>Required runtime configuration · secrets are not displayed</p>
            </div>
            <div className="divide-y" style={{ borderColor: '#e2e8f0' }}>
              {ENV_CHECKS.map((e, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <code style={{ color: '#334155', fontSize: 12, fontFamily: 'monospace', width: 220 }}>{e.key}</code>
                  <div className="flex-1" style={{ color: '#64748b', fontSize: 12 }}>{e.note}</div>
                  <span className="px-2.5 py-1 rounded-full" style={{
                    background: e.status === 'ok' ? '#d1fae5' : e.status === 'warn' ? '#fef3c7' : '#fee2e2',
                    color: e.status === 'ok' ? '#059669' : e.status === 'warn' ? '#d97706' : '#dc2626',
                    fontSize: 10, fontWeight: 600,
                  }}>
                    {e.status === 'ok' ? 'Configured' : e.status === 'warn' ? 'Warning' : 'Missing'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'backup' && (
          <>
            {/* DLR-19: Backup freshness nudge */}
            <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
              <div className="flex items-center justify-between mb-5">
                <h4 style={{ color: '#0f172a' }}>Backup & Disaster Recovery</h4>
                {!backupFresh && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                    <AlertTriangle size={13} color="#c2410c" />
                    <span style={{ color: '#c2410c', fontSize: 12, fontWeight: 600 }}>Backup Overdue — {rpoHours}h since last backup</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 mb-5">
                {[
                  { label: 'RPO Target', value: '24h', sub: 'Recovery point objective' },
                  { label: 'Last Backup', value: `${rpoHours}h ago`, sub: backupFresh ? 'Within RPO' : 'Overdue' },
                  { label: 'Restore Test', value: 'Not run', sub: 'Recommend monthly test' },
                ].map((m, i) => (
                  <div key={i} className="px-4 py-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#0f172a', fontSize: 18, fontWeight: 700 }}>{m.value}</div>
                    <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{m.label}</div>
                    <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 1 }}>{m.sub}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {BACKUP_HISTORY.map((b, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-lg" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Archive size={14} color="#10b981" />
                    <span style={{ color: '#0f172a', fontSize: 12 }}>{b.timestamp}</span>
                    <span style={{ color: '#64748b', fontSize: 12 }}>{b.size}</span>
                    <span className="ml-auto px-2.5 py-0.5 rounded-full" style={{ background: '#d1fae5', color: '#059669', fontSize: 10 }}>Completed</span>
                  </div>
                ))}
              </div>
              {isDevRole && (
                <button className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg hover:opacity-80 transition-all"
                  style={{ background: '#047857', color: 'white', fontSize: 13 }}>
                  <Archive size={13} /> Record Backup Performed
                </button>
              )}
            </div>
          </>
        )}

        {tab === 'uat' && (
          <>
            {/* DLR-24: Demo data navigation */}
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl mb-4"
              style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <Activity size={15} color="#1d4ed8" className="shrink-0 mt-0.5" />
              <div>
                <span style={{ color: '#1d4ed8', fontSize: 12, fontWeight: 600 }}>UAT / Demo Mode Active</span>
                <span style={{ color: '#1e40af', fontSize: 12 }}> — Seeded data is available. Use role switcher to test scenarios. No real financial data present.</span>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <h4 style={{ color: '#0f172a' }}>UAT Scenario Entry Points</h4>
                <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>Jump directly to seeded scenarios by use case</p>
              </div>
              <div className="divide-y" style={{ borderColor: '#e2e8f0' }}>
                {UAT_SCENARIOS.map((s, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3">
                    <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace', width: 56 }}>{s.id}</span>
                    <div className="flex-1">
                      <div style={{ color: '#0f172a', fontSize: 13 }}>{s.title}</div>
                      <div style={{ color: '#94a3b8', fontSize: 11 }}>{s.role}</div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full" style={{
                      background: s.status === 'seeded' ? '#d1fae5' : '#f1f5f9',
                      color: s.status === 'seeded' ? '#059669' : '#64748b',
                      fontSize: 10,
                    }}>
                      {s.status === 'seeded' ? 'Ready' : 'Pending seed'}
                    </span>
                    {s.status === 'seeded' && (
                      <button className="flex items-center gap-1 px-3 py-1 rounded-lg hover:opacity-80 transition-all"
                        style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: 12 }}>
                        Start <ExternalLink size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
