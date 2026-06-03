import { useState } from 'react';
import {
  TrendingUp, Plus, ArrowRight, CheckCircle, AlertTriangle, Clock,
  FileText, DollarSign, Users, ShoppingCart, Link2, ChevronRight,
  Target, BarChart2, Eye, Zap
} from 'lucide-react';
import type { RoleEntry, ViewId } from './Sidebar';

interface Props {
  role: RoleEntry;
  onNavigate: (view: ViewId, params?: { applicationId?: string }) => void;
}

type OppStatus = 'OPEN' | 'APPLICATION_DRAFTED' | 'SUBMITTED_FOR_FINANCE' | 'FINANCED' | 'INELIGIBLE' | 'CLOSED';

interface Opportunity {
  id: string;
  title: string;
  project: string;
  buyerDemand: string;
  estimatedCapital: number;
  expectedProfitRatio: number;
  status: OppStatus;
  evidencePackId: string | null;
  evidenceGaps: number;
  applicationCount: number;
  linkedPO: string | null;
  currency: string;
  createdAt: string;
}

const OPPORTUNITIES: Opportunity[] = [
  {
    id: 'OPP-001', title: 'Solar Panel Component Supply — Q3 2026', project: 'TechBuild Renewable Contract',
    buyerDemand: 'SolarTech Industries PO #ST-2026-089', estimatedCapital: 125000, expectedProfitRatio: 40,
    status: 'APPLICATION_DRAFTED', evidencePackId: 'EVP-004', evidenceGaps: 2, applicationCount: 1,
    linkedPO: 'PO-2024-019', currency: 'MYR', createdAt: '2026-05-10',
  },
  {
    id: 'OPP-002', title: 'Industrial UPS Systems — Facility Upgrade', project: 'GovTech Infrastructure',
    buyerDemand: 'GovTech Malaysia LOA #GT-2026-112', estimatedCapital: 88000, expectedProfitRatio: 35,
    status: 'FINANCED', evidencePackId: 'EVP-002', evidenceGaps: 0, applicationCount: 1,
    linkedPO: 'PO-2024-014', currency: 'MYR', createdAt: '2026-03-22',
  },
  {
    id: 'OPP-003', title: 'Warehouse Automation Components', project: 'RetailChain Expansion',
    buyerDemand: 'RetailChain Bhd Contract #RC-2026-055', estimatedCapital: 210000, expectedProfitRatio: 45,
    status: 'FINANCED', evidencePackId: 'EVP-003', evidenceGaps: 0, applicationCount: 1,
    linkedPO: 'PO-2024-017', currency: 'MYR', createdAt: '2026-04-05',
  },
  {
    id: 'OPP-004', title: 'Textile Inputs Procurement', project: 'Fashion Export Co. Q2',
    buyerDemand: 'Fashion Export Co. PO #FE-2026-033', estimatedCapital: 55000, expectedProfitRatio: 30,
    status: 'OPEN', evidencePackId: null, evidenceGaps: 5, applicationCount: 0,
    linkedPO: null, currency: 'MYR', createdAt: '2026-05-28',
  },
  {
    id: 'OPP-005', title: 'Office IT Equipment Refresh', project: 'TechBuild Internal',
    buyerDemand: 'Internal consumption only — no revenue generation', estimatedCapital: 30000, expectedProfitRatio: 0,
    status: 'INELIGIBLE', evidencePackId: null, evidenceGaps: 0, applicationCount: 0,
    linkedPO: null, currency: 'MYR', createdAt: '2026-06-01',
  },
];

const STATUS_LABELS: Record<OppStatus, { label: string; bg: string; text: string; border: string }> = {
  OPEN: { label: 'Open', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  APPLICATION_DRAFTED: { label: 'Application Drafted', bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
  SUBMITTED_FOR_FINANCE: { label: 'Submitted', bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  FINANCED: { label: 'Financed', bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  INELIGIBLE: { label: 'Ineligible', bg: '#fee2e2', text: '#dc2626', border: '#fecaca' },
  CLOSED: { label: 'Closed', bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
};

// DLR-04: Contract readiness meter
function ContractReadinessMeter({ gaps, status, appCount }: { gaps: number; status: OppStatus; appCount: number }) {
  const checks = [
    { label: 'Buyer demand evidence', done: status !== 'OPEN' || gaps < 3 },
    { label: 'Finance application created', done: appCount > 0 },
    { label: 'Evidence gaps resolved', done: gaps === 0 },
    { label: 'Due diligence approved', done: status === 'FINANCED' },
    { label: 'Shariah review approved', done: status === 'FINANCED' },
  ];
  const pct = Math.round((checks.filter(c => c.done).length / checks.length) * 100);
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span style={{ color, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{pct}% ready</span>
      </div>
      <div className="grid grid-cols-1 gap-1">
        {checks.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            {c.done
              ? <CheckCircle size={11} color="#10b981" />
              : <div className="w-2.5 h-2.5 rounded-full border shrink-0" style={{ borderColor: '#d1d5db' }} />
            }
            <span style={{ color: c.done ? '#64748b' : '#94a3b8', fontSize: 11 }}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// DLR-02: New opportunity from PO prefill modal
function NewOpportunityModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [source, setSource] = useState<'po' | 'contract' | 'manual'>('po');

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-[640px] rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <div className="px-6 py-5" style={{ background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-3">
            <TrendingUp size={18} color="#10b981" />
            <div>
              <h4 style={{ color: 'white' }}>Create Financing Opportunity</h4>
              <p style={{ color: '#64748b', fontSize: 12, marginTop: 1 }}>DLR-02: Auto-prefill from existing procurement records</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          {step === 1 && (
            <div className="space-y-4">
              <p style={{ color: '#64748b', fontSize: 13 }}>Select a source record. The system will prefill opportunity fields from existing procurement data.</p>
              <div className="space-y-2">
                {[
                  { id: 'po' as const, label: 'From Purchase Order', sub: 'Auto-links buyer, supplier, capital amount, and evidence pack', icon: ShoppingCart },
                  { id: 'contract' as const, label: 'From Buyer Contract / LOA', sub: 'Prefills buyer demand proof, contract terms, delivery schedule', icon: FileText },
                  { id: 'manual' as const, label: 'Manual Entry', sub: 'Enter all fields manually — no prefill', icon: Plus },
                ].map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button key={opt.id} onClick={() => setSource(opt.id)}
                      className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-left"
                      style={{ border: `2px solid ${source === opt.id ? '#047857' : '#e2e8f0'}`, background: source === opt.id ? '#f0fdf4' : 'white' }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: source === opt.id ? '#047857' : '#f8fafc' }}>
                        <Icon size={16} color={source === opt.id ? 'white' : '#94a3b8'} />
                      </div>
                      <div>
                        <div style={{ color: '#0f172a', fontSize: 13, fontWeight: 500 }}>{opt.label}</div>
                        <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 1 }}>{opt.sub}</div>
                      </div>
                      {source === opt.id && <CheckCircle size={16} color="#047857" className="ml-auto" />}
                    </button>
                  );
                })}
              </div>
              {source === 'po' && (
                <div className="px-4 py-3 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <p style={{ color: '#047857', fontSize: 12, fontWeight: 600 }}>Prefill preview from PO-2024-019:</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      ['Title', 'Solar Panel Component Supply — Q3 2026'],
                      ['Buyer', 'SolarTech Industries'],
                      ['Estimated Capital', 'MYR 125,000'],
                      ['Evidence Pack', 'EVP-004 (auto-linked)'],
                    ].map(([k, v], i) => (
                      <div key={i}>
                        <div style={{ color: '#94a3b8', fontSize: 10 }}>{k}</div>
                        <div style={{ color: '#065f46', fontSize: 12, fontWeight: 500 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p style={{ color: '#047857', fontSize: 12 }}>Fields prefilled from PO-2024-019. Review and adjust before creating.</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Opportunity Title', value: 'Solar Panel Component Supply — Q3 2026', type: 'text' },
                  { label: 'Estimated Capital (MYR)', value: '125000', type: 'number' },
                  { label: 'Buyer', value: 'SolarTech Industries', type: 'text' },
                  { label: 'Profit Ratio (Mudarib %)', value: '40', type: 'number' },
                ].map((f, i) => (
                  <div key={i}>
                    <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <input defaultValue={f.value} type={f.type}
                      className="w-full px-3 py-2 rounded-lg outline-none"
                      style={{ border: '1px solid #e2e8f0', fontSize: 13, color: '#0f172a' }} />
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 rounded-xl flex items-start gap-2" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <Link2 size={13} color="#1d4ed8" className="shrink-0 mt-0.5" />
                <span style={{ color: '#1e40af', fontSize: 12 }}>Evidence pack EVP-004 will be auto-linked. 2 evidence gaps remain — you can resolve them after creation.</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #e2e8f0' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg" style={{ border: '1px solid #e2e8f0', color: '#64748b', fontSize: 13 }}>Cancel</button>
          {step === 1
            ? <button onClick={() => setStep(2)} className="px-4 py-2 rounded-lg hover:opacity-80 transition-all"
                style={{ background: '#047857', color: 'white', fontSize: 13 }}>
                Continue <ChevronRight size={14} className="inline" />
              </button>
            : <button onClick={onClose} className="px-4 py-2 rounded-lg hover:opacity-80 transition-all"
                style={{ background: '#047857', color: 'white', fontSize: 13 }}>
                Create Opportunity
              </button>
          }
        </div>
      </div>
    </div>
  );
}

export function OpportunitiesView({ role, onNavigate }: Props) {
  const [showNewModal, setShowNewModal] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const canCreate = ['sme-admin', 'procurement-officer'].includes(role.id);
  const totalCapital = OPPORTUNITIES.filter(o => o.status !== 'INELIGIBLE').reduce((s, o) => s + o.estimatedCapital, 0);
  const financed = OPPORTUNITIES.filter(o => o.status === 'FINANCED').length;

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#f1f5f9' }}>
      {showNewModal && <NewOpportunityModal onClose={() => setShowNewModal(false)} />}

      {/* Header */}
      <div className="px-8 py-5" style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ color: '#0f172a' }}>Finance Opportunities</h1>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 2 }}>Revenue-generating procurement opportunities eligible for Mudarabah financing</p>
          </div>
          {canCreate && (
            <button onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg hover:opacity-80 transition-all"
              style={{ background: '#047857', color: 'white', fontSize: 13 }}>
              <Plus size={14} /> New Opportunity
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-4 mt-4">
          {[
            { label: 'Total Opportunities', value: OPPORTUNITIES.filter(o => o.status !== 'INELIGIBLE').length, color: '#3b82f6' },
            { label: 'Financed', value: financed, color: '#10b981' },
            { label: 'Total Pipeline', value: `MYR ${(totalCapital / 1000).toFixed(0)}k`, color: '#8b5cf6' },
            { label: 'Ineligible / Blocked', value: OPPORTUNITIES.filter(o => o.status === 'INELIGIBLE').length, color: '#ef4444' },
          ].map((k, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: `${k.color}08`, border: `1px solid ${k.color}20` }}>
              <div>
                <p style={{ color: k.color, fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{k.value}</p>
                <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{k.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Opportunity cards */}
      <div className="px-8 py-6 space-y-3">
        {OPPORTUNITIES.map(opp => {
          const st = STATUS_LABELS[opp.status];
          const isExpanded = expanded === opp.id;
          return (
            <div key={opp.id} className="rounded-xl overflow-hidden" style={{ background: 'white', border: `1px solid ${opp.status === 'INELIGIBLE' ? '#fecaca' : '#e2e8f0'}` }}>
              <div className="p-5 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : opp.id)}>
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: opp.status === 'INELIGIBLE' ? '#fee2e2' : '#f0fdf4', border: `1px solid ${opp.status === 'INELIGIBLE' ? '#fecaca' : '#bbf7d0'}` }}>
                    <TrendingUp size={18} color={opp.status === 'INELIGIBLE' ? '#dc2626' : '#047857'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>{opp.id}</span>
                      <span className="px-2 py-0.5 rounded-full"
                        style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}`, fontSize: 10 }}>
                        {st.label}
                      </span>
                      {opp.evidenceGaps > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                          style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', fontSize: 10 }}>
                          <AlertTriangle size={9} /> {opp.evidenceGaps} evidence gaps
                        </span>
                      )}
                    </div>
                    <h4 style={{ color: '#0f172a', marginBottom: 4 }}>{opp.title}</h4>
                    <div style={{ color: '#64748b', fontSize: 12 }}>
                      {opp.project} · Buyer: {opp.buyerDemand.split(' ')[0]} {opp.buyerDemand.split(' ')[1]}
                      {opp.linkedPO && <span style={{ color: '#94a3b8' }}> · Linked PO: {opp.linkedPO}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p style={{ color: '#0f172a', fontSize: 18, fontWeight: 700 }}>{opp.currency} {opp.estimatedCapital.toLocaleString()}</p>
                    <div className="flex items-center gap-3">
                      <span style={{ color: '#64748b', fontSize: 11 }}>{opp.expectedProfitRatio}% Mudarib ratio</span>
                      <span style={{ color: '#94a3b8', fontSize: 11 }}>{opp.applicationCount} app{opp.applicationCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <ChevronRight size={14} color="#94a3b8" className={`shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>

                {opp.status === 'INELIGIBLE' && (
                  <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{ background: '#fee2e2', border: '1px solid #fecaca' }}>
                    <AlertTriangle size={13} color="#dc2626" className="shrink-0 mt-0.5" />
                    <div>
                      <span style={{ color: '#dc2626', fontSize: 12, fontWeight: 600 }}>Ineligible for Mudarabah financing</span>
                      <span style={{ color: '#991b1b', fontSize: 12 }}> — {opp.buyerDemand}. Mudarabah requires revenue-generating procurement with an external buyer. Reroute to standard procurement.</span>
                    </div>
                  </div>
                )}
              </div>

              {isExpanded && opp.status !== 'INELIGIBLE' && (
                <div className="px-5 pb-5 pt-0 border-t" style={{ borderColor: '#e2e8f0' }}>
                  <div className="grid grid-cols-2 gap-5 pt-4">
                    {/* DLR-04: Contract readiness meter */}
                    <div>
                      <h4 style={{ color: '#0f172a', fontSize: 13, marginBottom: 12 }}>Contract Readiness</h4>
                      <ContractReadinessMeter gaps={opp.evidenceGaps} status={opp.status} appCount={opp.applicationCount} />
                    </div>
                    <div className="space-y-3">
                      <h4 style={{ color: '#0f172a', fontSize: 13, marginBottom: 4 }}>Quick Actions</h4>
                      {opp.applicationCount === 0 && (
                        <button className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg hover:opacity-80 transition-all"
                          style={{ background: '#047857', color: 'white', fontSize: 13 }}>
                          <FileText size={14} /> Create Mudarabah Application
                        </button>
                      )}
                      {opp.applicationCount > 0 && (
                        <button onClick={() => onNavigate('workspace', { applicationId: 'APP-2024-001' })}
                          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg hover:opacity-80 transition-all"
                          style={{ background: '#f0fdf4', color: '#047857', border: '1px solid #bbf7d0', fontSize: 13 }}>
                          <Eye size={14} /> Open Application Workspace <ArrowRight size={13} className="ml-auto" />
                        </button>
                      )}
                      {opp.evidencePackId && (
                        <button className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg hover:opacity-80 transition-all"
                          style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', fontSize: 13 }}>
                          <Link2 size={14} /> View Evidence Pack {opp.evidencePackId}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
