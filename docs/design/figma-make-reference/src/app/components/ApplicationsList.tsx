import { useState } from 'react';
import {
  FileText, Plus, Search, Filter, ArrowRight, Clock,
  CheckCircle, AlertTriangle, DollarSign, TrendingUp
} from 'lucide-react';
import type { RoleEntry, ViewId } from './Sidebar';

interface Props {
  role: RoleEntry;
  onNavigate: (view: ViewId, params?: { applicationId?: string }) => void;
}

const APPLICATIONS = [
  {
    id: 'APP-2024-001', title: 'Solar Panel Component Supply', organization: 'TechBuild Sdn Bhd',
    status: 'DUE_DILIGENCE_IN_REVIEW', capital: 125000, currency: 'MYR',
    submittedAt: '2026-05-15', readiness: 73, buyer: 'SolarTech Industries',
    riskRating: 'MEDIUM',
  },
  {
    id: 'APP-2024-002', title: 'Industrial UPS Systems – Facility Upgrade', organization: 'BuildRight Sdn Bhd',
    status: 'MONITORING', capital: 88000, currency: 'MYR',
    submittedAt: '2026-04-10', readiness: 100, buyer: 'GovTech Malaysia',
    riskRating: 'LOW',
  },
  {
    id: 'APP-2024-003', title: 'Warehouse Automation Components', organization: 'LogiPro Sdn Bhd',
    status: 'APPROVED', capital: 210000, currency: 'MYR',
    submittedAt: '2026-05-28', readiness: 100, buyer: 'RetailChain Bhd',
    riskRating: 'LOW',
  },
  {
    id: 'APP-2024-004', title: 'Textile Manufacturing Inputs', organization: 'FabricFirst Sdn Bhd',
    status: 'EVIDENCE_PENDING', capital: 55000, currency: 'MYR',
    submittedAt: '2026-06-01', readiness: 50, buyer: 'Fashion Export Co.',
    riskRating: 'HIGH',
  },
  {
    id: 'APP-2023-018', title: 'Steel Construction Materials', organization: 'StructBuild Sdn Bhd',
    status: 'CLOSED', capital: 175000, currency: 'MYR',
    submittedAt: '2025-11-12', readiness: 100, buyer: 'PropDev Holdings',
    riskRating: 'LOW',
  },
];

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DRAFT: { label: 'Draft', bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
  SUBMITTED: { label: 'Submitted', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  EVIDENCE_PENDING: { label: 'Evidence Pending', bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  DUE_DILIGENCE_IN_REVIEW: { label: 'Due Diligence', bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
  SHARIAH_IN_REVIEW: { label: 'Shariah Review', bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe' },
  APPROVED: { label: 'Approved', bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  CONTRACT_PENDING_SIGNATURE: { label: 'Contract Pending', bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  CONTRACT_EXECUTED: { label: 'Executed', bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  DISBURSED: { label: 'Disbursed', bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  MONITORING: { label: 'Monitoring', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  PROFIT_LOSS_CALCULATED: { label: 'P/L Ready', bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
  CLOSED: { label: 'Closed', bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
};

const RISK_COLORS = { LOW: '#10b981', MEDIUM: '#f59e0b', HIGH: '#ef4444' };

export function ApplicationsList({ role, onNavigate }: Props) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = APPLICATIONS.filter(app => {
    const matchSearch = !search || app.id.toLowerCase().includes(search.toLowerCase()) || app.title.toLowerCase().includes(search.toLowerCase()) || app.organization.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || app.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalExposure = APPLICATIONS.filter(a => !['CLOSED', 'REJECTED'].includes(a.status)).reduce((s, a) => s + a.capital, 0);

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#f1f5f9' }}>
      {/* Header */}
      <div className="px-8 py-5" style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ color: '#0f172a' }}>Mudarabah Applications</h1>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 2 }}>Capital application pipeline</p>
          </div>
          <div className="flex items-center gap-2">
            {(role.id === 'procurement-officer' || role.id === 'sme-admin') && (
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg hover:opacity-80 transition-all"
                style={{ background: '#047857', color: 'white', fontSize: 13 }}>
                <Plus size={14} /> New Application
              </button>
            )}
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          {[
            { label: 'Total Applications', value: APPLICATIONS.length, color: '#3b82f6', icon: FileText },
            { label: 'Active (non-closed)', value: APPLICATIONS.filter(a => a.status !== 'CLOSED').length, color: '#059669', icon: TrendingUp },
            { label: 'Pending Review', value: APPLICATIONS.filter(a => ['DUE_DILIGENCE_IN_REVIEW', 'SHARIAH_IN_REVIEW', 'EVIDENCE_PENDING'].includes(a.status)).length, color: '#f59e0b', icon: Clock },
            { label: 'Total Exposure', value: `MYR ${(totalExposure / 1000).toFixed(0)}k`, color: '#8b5cf6', icon: DollarSign },
          ].map((k, i) => {
            const Icon = k.icon;
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: `${k.color}08`, border: `1px solid ${k.color}20` }}>
                <Icon size={16} color={k.color} />
                <div>
                  <p style={{ color: k.color, fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{k.value}</p>
                  <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{k.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-4 flex gap-3">
        <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
          <Search size={14} color="#94a3b8" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applications, organizations..."
            className="flex-1 outline-none" style={{ fontSize: 13, background: 'transparent', color: '#334155' }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 rounded-xl" style={{ border: '1px solid #e2e8f0', fontSize: 13, color: '#64748b', background: 'white' }}>
          <option value="all">All statuses</option>
          {Object.keys(STATUS_LABELS).map(s => <option key={s} value={s}>{STATUS_LABELS[s].label}</option>)}
        </select>
      </div>

      {/* Application cards */}
      <div className="px-8 pb-8 space-y-3">
        {filtered.map(app => {
          const statusStyle = STATUS_LABELS[app.status] || STATUS_LABELS.DRAFT;
          const riskColor = RISK_COLORS[app.riskRating as keyof typeof RISK_COLORS] || '#94a3b8';
          return (
            <div
              key={app.id}
              className="rounded-xl p-5 cursor-pointer transition-all hover:shadow-md"
              style={{ background: 'white', border: '1px solid #e2e8f0' }}
              onClick={() => onNavigate('workspace', { applicationId: app.id })}
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white"
                  style={{ background: '#047857', fontSize: 12, fontWeight: 700 }}>
                  {app.id.slice(-3)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>{app.id}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs"
                          style={{ background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}`, fontSize: 10 }}>
                          {statusStyle.label}
                        </span>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ background: riskColor }} />
                          <span style={{ color: riskColor, fontSize: 10 }}>{app.riskRating} risk</span>
                        </div>
                      </div>
                      <h4 style={{ color: '#0f172a', marginTop: 4 }}>{app.title}</h4>
                      <p style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{app.organization} → {app.buyer}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <p style={{ color: '#0f172a', fontSize: 18, fontWeight: 700 }}>MYR {app.capital.toLocaleString()}</p>
                      <p style={{ color: '#94a3b8', fontSize: 11 }}>Submitted {app.submittedAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${app.readiness}%`, background: app.readiness >= 80 ? '#10b981' : app.readiness >= 60 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                      <span style={{ color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>{app.readiness}% evidence</span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); onNavigate('workspace', { applicationId: app.id }); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:opacity-80 transition-all"
                      style={{ background: '#f0fdf4', color: '#047857', border: '1px solid #a7f3d0', fontSize: 12 }}>
                      Open workspace <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
