import { useState } from 'react';
import {
  CheckCircle, Circle, AlertTriangle, Clock, FileText, DollarSign,
  Shield, ChevronDown, ChevronUp, ExternalLink, Zap, Link,
  XCircle, Info, TrendingUp, Anchor, RefreshCw, Download,
  ArrowRight, Eye, Lock, Unlock, Activity, Package
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { RoleEntry, ViewId } from './Sidebar';

interface Props {
  applicationId: string;
  role: RoleEntry;
  onNavigate: (view: ViewId, params?: any) => void;
}

// ─── Application lifecycle states ───────────────────────────────────────────
const LIFECYCLE = [
  { key: 'DRAFT', label: 'Draft', short: 'Draft' },
  { key: 'SUBMITTED', label: 'Submitted', short: 'Submitted' },
  { key: 'EVIDENCE_PENDING', label: 'Evidence Pending', short: 'Evidence' },
  { key: 'DUE_DILIGENCE_IN_REVIEW', label: 'Due Diligence', short: 'Due Dilig.' },
  { key: 'SHARIAH_IN_REVIEW', label: 'Shariah Review', short: 'Shariah' },
  { key: 'APPROVED', label: 'Approved', short: 'Approved' },
  { key: 'CONTRACT_PENDING_SIGNATURE', label: 'Contract Pending', short: 'Contract' },
  { key: 'CONTRACT_EXECUTED', label: 'Contract Executed', short: 'Executed' },
  { key: 'DISBURSED', label: 'Capital Disbursed', short: 'Disbursed' },
  { key: 'MONITORING', label: 'Monitoring', short: 'Monitoring' },
  { key: 'PROFIT_LOSS_CALCULATED', label: 'P/L Calculated', short: 'P/L Calc' },
  { key: 'CLOSED', label: 'Closed', short: 'Closed' },
];

type AppStatus = typeof LIFECYCLE[number]['key'];

// ─── Mock application data ───────────────────────────────────────────────────
const MOCK_APP = {
  id: 'APP-2024-001',
  title: 'Solar Panel Component Supply – Buyer Contract BC-2024-089',
  requestedCapital: 125000,
  capitalProviderRatio: 0.60,
  entrepreneurRatio: 0.40,
  currency: 'MYR',
  organization: 'TechBuild Sdn Bhd',
  applicant: 'Ahmad Razali',
  submittedAt: '2026-05-15T09:30:00Z',
  opportunity: {
    expectedRevenue: 280000,
    estimatedCapital: 125000,
    expectedProfit: 37500,
    buyer: 'SolarTech Industries Sdn Bhd',
    purpose: 'Restricted procurement working capital for buyer PO fulfillment',
    restrictedUse: 'Solar panel components from Mega Components Sdn Bhd only',
    deliveryTimeline: '90 days',
    riskAssumptions: 'Buyer has confirmed PO. Supplier is pre-approved. Payment terms Net-30.',
  },
  evidenceChecklist: [
    { id: 'EV-001', code: 'BUYER_DEMAND', label: 'Buyer Purchase Order / Contract', status: 'COMPLETED', ref: 'PO-BC-2024-089', completedAt: '2026-05-10', hash: '0x4f3a...c9d2' },
    { id: 'EV-002', code: 'SUPPLIER_QUOTATION', label: 'Approved Supplier Quotation', status: 'COMPLETED', ref: 'QTN-2024-045', completedAt: '2026-05-11', hash: '0x8b1e...f7a3' },
    { id: 'EV-003', code: 'COST_BUDGET', label: 'Itemised Cost Budget', status: 'COMPLETED', ref: 'BDG-2024-001', completedAt: '2026-05-12', hash: '0x2c9d...e401' },
    { id: 'EV-004', code: 'SHARIAH_CERT', label: 'Shariah Eligibility – Goods/Services', status: 'COMPLETED', ref: 'SC-MC-2024', completedAt: '2026-05-12', hash: '0xa7f2...3bc1' },
    { id: 'EV-005', code: 'SUPPLIER_PROFILE', label: 'Supplier Due Diligence Profile', status: 'PENDING', ref: null, completedAt: null, autoLink: { label: 'SUP-MEGA-001 found in registry', ref: 'SUP-MEGA-001' } },
    { id: 'EV-006', code: 'BUYER_CREDIT', label: 'Buyer Credit Assessment', status: 'PENDING', ref: null, completedAt: null, autoLink: null },
    { id: 'EV-007', code: 'DELIVERY_PLAN', label: 'Procurement Delivery Schedule', status: 'COMPLETED', ref: 'SCHED-2024-001', completedAt: '2026-05-13', hash: '0x5d8f...1e90' },
    { id: 'EV-008', code: 'DISBURSE_ACCOUNT', label: 'Controlled Disbursement Account', status: 'WAIVED', ref: null, waiverReason: 'Direct supplier payment mode selected', completedAt: '2026-05-14' },
  ],
  dueDiligence: {
    reviewer: 'Omar Farouq',
    status: 'APPROVED',
    riskRating: 'MEDIUM',
    decision: 'APPROVED',
    findings: 'Buyer SolarTech Industries has strong payment history. Supplier pre-approved. Cost budget is reasonable at 44.6% margin.',
    conditions: ['Monthly cost reconciliation reports required', 'Direct supplier payment only – no cash to mudarib'],
    completedAt: '2026-05-20T14:00:00Z',
  },
  shariahReview: {
    reviewer: 'Dr. Hassan Al-Malik',
    status: 'PENDING',
    decision: null,
    eligibleGoods: null,
    profitRatioCheck: null,
    opinion: null,
    completedAt: null,
  },
  contract: { status: null, number: null, documentVersion: null, hash: null, signedAt: null },
  disbursement: { amount: null, method: null, status: null, disbursedAt: null },
  ledgerEntries: [
    { id: 'LE-001', type: 'CAPITAL', amount: 125000, description: 'Capital disbursed by Amanah Islamic Bank', occurredAt: '2026-05-25' },
    { id: 'LE-002', type: 'COST', amount: -48000, description: 'PO-2024-001: Supplier payment – solar panels batch 1', occurredAt: '2026-05-28' },
    { id: 'LE-003', type: 'COST', amount: -31500, description: 'PO-2024-002: Supplier payment – mounting hardware', occurredAt: '2026-06-05' },
    { id: 'LE-004', type: 'REVENUE', amount: 180000, description: 'Buyer partial payment – milestone 1', occurredAt: '2026-06-10' },
  ],
  auditTrail: [
    { event: 'MUDARABAH_APPLICATION_CREATED', actor: 'Ahmad Razali', timestamp: '2026-05-10T08:00:00Z', anchor: 'NONE' },
    { event: 'EVIDENCE_CHECKLIST_GENERATED', actor: 'System', timestamp: '2026-05-10T08:01:00Z', anchor: 'NONE' },
    { event: 'EVIDENCE_CHECKLIST_ITEM_COMPLETED', actor: 'Ahmad Razali', timestamp: '2026-05-10T14:00:00Z', anchor: 'NONE' },
    { event: 'MUDARABAH_APPLICATION_SUBMITTED', actor: 'Ahmad Razali', timestamp: '2026-05-15T09:30:00Z', anchor: 'COMMITTED', txId: '0xf4a1b2c3...7d8e' },
    { event: 'DUE_DILIGENCE_RECORDED', actor: 'Omar Farouq', timestamp: '2026-05-20T14:00:00Z', anchor: 'COMMITTED', txId: '0x9e3c4f2a...1b5d' },
    { event: 'SHARIAH_REVIEW_ASSIGNED', actor: 'System', timestamp: '2026-05-20T14:01:00Z', anchor: 'PENDING' },
  ],
  fabricAnchors: { pending: 1, committed: 3 },
};

const BURN_DATA = [
  { day: 'D1', capital: 125000, spent: 0 },
  { day: 'D7', capital: 125000, spent: 12000 },
  { day: 'D14', capital: 125000, spent: 28000 },
  { day: 'D21', capital: 125000, spent: 48000 },
  { day: 'D28', capital: 125000, spent: 67000 },
  { day: 'D35', capital: 125000, spent: 79500 },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  DRAFT: { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
  SUBMITTED: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  EVIDENCE_PENDING: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  DUE_DILIGENCE_IN_REVIEW: { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
  SHARIAH_IN_REVIEW: { bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe' },
  APPROVED: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  CONTRACT_PENDING_SIGNATURE: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  CONTRACT_EXECUTED: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  DISBURSED: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  MONITORING: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  PROFIT_LOSS_CALCULATED: { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
  CLOSED: { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
};

// Role-aware action guidance – DELIGHTER D2
const ROLE_BANNERS: Record<string, Record<string, { message: string; cta: string; color: string; icon: any }>> = {
  'procurement-officer': {
    DUE_DILIGENCE_IN_REVIEW: {
      message: 'Due diligence is under review. You have 2 evidence items still pending — completing them may accelerate the decision.',
      cta: 'Complete evidence gaps',
      color: '#f59e0b',
      icon: AlertTriangle,
    },
    EVIDENCE_PENDING: {
      message: 'Your application has an evidence checklist. Complete all required items to unlock due diligence.',
      cta: 'View checklist',
      color: '#ef4444',
      icon: FileText,
    },
    DRAFT: {
      message: 'Application is in draft. Add opportunity economics and attach required evidence, then submit.',
      cta: 'Submit application',
      color: '#3b82f6',
      icon: ArrowRight,
    },
  },
  'financier': {
    DUE_DILIGENCE_IN_REVIEW: {
      message: 'This application is awaiting your due diligence review. Evidence checklist is 73% complete (2 items pending).',
      cta: 'Record due diligence decision',
      color: '#0ea5e9',
      icon: Eye,
    },
    SHARIAH_IN_REVIEW: {
      message: 'Shariah review is in progress. Once completed, you can approve the application and generate a contract.',
      cta: 'Monitor Shariah review',
      color: '#8b5cf6',
      icon: Shield,
    },
    APPROVED: {
      message: 'Application is approved. Generate the restricted mudarabah contract to proceed to signature.',
      cta: 'Generate contract',
      color: '#059669',
      icon: FileText,
    },
  },
  'shariah-reviewer': {
    SHARIAH_IN_REVIEW: {
      message: 'This application is awaiting your Shariah/compliance review. Due diligence has been approved.',
      cta: 'Record Shariah decision',
      color: '#8b5cf6',
      icon: Shield,
    },
    DUE_DILIGENCE_IN_REVIEW: {
      message: 'Financier due diligence is still in progress. Shariah review will be assigned once it is approved.',
      cta: 'View evidence',
      color: '#94a3b8',
      icon: Clock,
    },
  },
  'finance-accountant': {
    MONITORING: {
      message: 'Project is active. Record all revenue and cost entries promptly to keep the ledger current.',
      cta: 'Record ledger entry',
      color: '#3b82f6',
      icon: DollarSign,
    },
    DISBURSED: {
      message: 'Capital has been disbursed. Start recording project-level ledger entries to enable P/L calculation.',
      cta: 'Record first entry',
      color: '#059669',
      icon: Activity,
    },
  },
  'auditor': {
    DUE_DILIGENCE_IN_REVIEW: {
      message: 'You have read-only access to this application. Material events will appear in the audit trail below.',
      cta: 'View audit trail',
      color: '#6b7280',
      icon: Shield,
    },
  },
};

// ─── Pre-flight checks – DELIGHTER D7 ───────────────────────────────────────
const PRE_FLIGHT_CHECKS = [
  { id: 'revenue', label: 'Revenue-generating opportunity confirmed', status: 'pass', note: 'Buyer PO BC-2024-089 attached' },
  { id: 'capital', label: 'Capital amount and currency defined', status: 'pass', note: 'MYR 125,000 requested' },
  { id: 'ratio', label: 'Profit-sharing ratio set', status: 'pass', note: '60/40 – Rabb/Mudarib' },
  { id: 'timeline', label: 'Delivery timeline specified', status: 'pass', note: '90 days from disbursement' },
  { id: 'supplier', label: 'Supplier plan attached', status: 'pass', note: 'Mega Components Sdn Bhd – approved' },
  { id: 'buyer_evidence', label: 'Buyer demand evidence linked', status: 'pass', note: 'PO-BC-2024-089 – hash verified' },
  { id: 'supplier_profile', label: 'Supplier due diligence profile complete', status: 'warn', note: 'SUP-MEGA-001 found – needs linking' },
  { id: 'buyer_credit', label: 'Buyer credit assessment attached', status: 'fail', note: 'Missing – required by financier policy' },
  { id: 'no_fixed_return', label: 'No guaranteed fixed return detected', status: 'pass', note: 'Ratio-based distribution confirmed' },
];

export function ApplicationWorkspace({ applicationId, role, onNavigate }: Props) {
  const [appStatus, setAppStatus] = useState<AppStatus>('DUE_DILIGENCE_IN_REVIEW');
  const [showPreFlight, setShowPreFlight] = useState(false);
  const [showDDForm, setShowDDForm] = useState(false);
  const [showShariahForm, setShowShariahForm] = useState(false);
  const [showProfitValidator, setShowProfitValidator] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<string | null>('evidence');
  const [linkedItems, setLinkedItems] = useState<Set<string>>(new Set());
  const [ddDecision, setDdDecision] = useState('');
  const [shariahDecision, setShariahDecision] = useState('');
  const [profitRatio, setProfitRatio] = useState('');
  const [fixedAmountFlag, setFixedAmountFlag] = useState(false);

  const app = MOCK_APP;
  const statusStyle = STATUS_COLORS[appStatus] || STATUS_COLORS.DRAFT;
  const currentStepIndex = LIFECYCLE.findIndex(l => l.key === appStatus);
  const banner = ROLE_BANNERS[role.id]?.[appStatus];

  // Live P/L preview – DELIGHTER D4
  const totalRevenue = app.ledgerEntries.filter(e => e.type === 'REVENUE').reduce((s, e) => s + e.amount, 0);
  const totalCosts = Math.abs(app.ledgerEntries.filter(e => e.type === 'COST').reduce((s, e) => s + e.amount, 0));
  const totalCapital = app.ledgerEntries.filter(e => e.type === 'CAPITAL').reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalCosts;
  const rabbShare = netProfit > 0 ? netProfit * app.capitalProviderRatio : 0;
  const mudaribShare = netProfit > 0 ? netProfit * app.entrepreneurRatio : 0;

  const completedEvidence = app.evidenceChecklist.filter(e => e.status === 'COMPLETED' || e.status === 'WAIVED').length;
  const totalEvidence = app.evidenceChecklist.length;
  const readinessScore = Math.round((completedEvidence / totalEvidence) * 100);

  const handleAutoLink = (itemId: string, ref: string) => {
    setLinkedItems(prev => new Set([...prev, itemId]));
  };

  const handleAdvanceState = () => {
    const idx = LIFECYCLE.findIndex(l => l.key === appStatus);
    if (idx < LIFECYCLE.length - 1) {
      setAppStatus(LIFECYCLE[idx + 1].key as AppStatus);
    }
  };

  const isProfitRatioSafe = (ratio: string) => {
    const val = parseFloat(ratio);
    return !isNaN(val) && val > 0 && val < 100;
  };

  const canFinancierAct = role.id === 'financier';
  const canShariahAct = role.id === 'shariah-reviewer';
  const canAccountantAct = role.id === 'finance-accountant';

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#f1f5f9' }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <div className="px-8 pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span style={{ color: '#64748b', fontSize: 12 }}>Mudarabah Finance</span>
                <span style={{ color: '#cbd5e1', fontSize: 12 }}>/</span>
                <span style={{ color: '#64748b', fontSize: 12 }}>{app.id}</span>
              </div>
              <h1 className="truncate" style={{ color: '#0f172a' }}>{app.title}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="px-2.5 py-1 rounded-full text-sm"
                  style={{ background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}`, fontSize: 12, fontWeight: 500 }}>
                  {LIFECYCLE.find(l => l.key === appStatus)?.label || appStatus}
                </span>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>Applicant: {app.applicant}</span>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>{app.organization}</span>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>MYR {app.requestedCapital.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setShowPreFlight(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all hover:opacity-80"
                style={{ background: '#f0fdf4', color: '#047857', border: '1px solid #a7f3d0', fontSize: 12 }}>
                <Zap size={13} /> Pre-flight Check
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all hover:opacity-80"
                style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: 12 }}>
                <Download size={13} /> Export Pack
              </button>
            </div>
          </div>
        </div>

        {/* ── Lifecycle Stepper ─────────────────────────────────────────── */}
        <div className="px-8 pb-4 overflow-x-auto">
          <div className="flex items-center gap-0 min-w-max">
            {LIFECYCLE.map((step, i) => {
              const isDone = i < currentStepIndex;
              const isActive = i === currentStepIndex;
              const isFuture = i > currentStepIndex;
              return (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: isDone ? '#059669' : isActive ? '#047857' : '#e2e8f0',
                        border: isActive ? '2px solid #10b981' : 'none',
                        boxShadow: isActive ? '0 0 0 3px rgba(16,185,129,0.2)' : 'none',
                      }}>
                      {isDone ? <CheckCircle size={14} color="white" fill="white" />
                        : isActive ? <Circle size={10} color="white" fill="white" />
                          : <Circle size={10} color="#94a3b8" />}
                    </div>
                    <span style={{ fontSize: 9, color: isDone ? '#059669' : isActive ? '#047857' : '#94a3b8', fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap' }}>
                      {step.short}
                    </span>
                  </div>
                  {i < LIFECYCLE.length - 1 && (
                    <div className="w-8 h-0.5 mx-0.5 mb-3" style={{ background: isDone ? '#059669' : '#e2e8f0' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Role Banner (Delighter D2) ───────────────────────────────────── */}
      {banner && (
        <div className="px-8 pt-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: `${banner.color}10`, border: `1px solid ${banner.color}30` }}>
            <banner.icon size={16} color={banner.color} />
            <p style={{ color: '#334155', fontSize: 13, flex: 1 }}>{banner.message}</p>
            <button className="px-3 py-1.5 rounded-lg shrink-0 hover:opacity-80 transition-all"
              style={{ background: banner.color, color: 'white', fontSize: 12, fontWeight: 500 }}>
              {banner.cta}
            </button>
          </div>
        </div>
      )}

      <div className="px-8 py-4 grid grid-cols-3 gap-4">
        {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
        <div className="col-span-2 space-y-4">

          {/* Application Summary + Opportunity Economics */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <DollarSign size={15} color="#047857" />
              <h3 style={{ color: '#0f172a' }}>Opportunity Economics</h3>
            </div>
            <div className="p-5 grid grid-cols-3 gap-4">
              <EconCard label="Expected Revenue" value={`MYR ${app.opportunity.expectedRevenue.toLocaleString()}`} color="#059669" />
              <EconCard label="Capital Requested" value={`MYR ${app.opportunity.estimatedCapital.toLocaleString()}`} color="#3b82f6" />
              <EconCard label="Expected Profit" value={`MYR ${app.opportunity.expectedProfit.toLocaleString()}`} color="#8b5cf6" />
              <EconCard label="Rabb-ul-Mal Ratio" value={`${app.capitalProviderRatio * 100}%`} sub="Capital provider share" color="#0ea5e9" />
              <EconCard label="Mudarib Ratio" value={`${app.entrepreneurRatio * 100}%`} sub="Entrepreneur share" color="#f59e0b" />
              <EconCard label="Delivery Timeline" value={app.opportunity.deliveryTimeline} color="#047857" />
              <div className="col-span-3 p-3 rounded-lg" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <p style={{ color: '#64748b', fontSize: 11, marginBottom: 2 }}>Restricted Use of Capital</p>
                <p style={{ color: '#334155', fontSize: 13 }}>{app.opportunity.restrictedUse}</p>
              </div>
              <div className="col-span-3 p-3 rounded-lg" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <p style={{ color: '#64748b', fontSize: 11, marginBottom: 2 }}>Risk Assumptions</p>
                <p style={{ color: '#334155', fontSize: 13 }}>{app.opportunity.riskAssumptions}</p>
              </div>
            </div>
          </div>

          {/* Evidence Checklist with Auto-Link – DELIGHTER D6 */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <button className="w-full px-5 py-4 flex items-center gap-2" style={{ borderBottom: expandedPanel === 'evidence' ? '1px solid #f1f5f9' : 'none' }}
              onClick={() => setExpandedPanel(expandedPanel === 'evidence' ? null : 'evidence')}>
              <FileText size={15} color="#047857" />
              <h3 style={{ color: '#0f172a' }}>Evidence Checklist</h3>
              <div className="ml-2 flex items-center gap-1.5">
                <div className="h-1.5 w-24 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${readinessScore}%`, background: readinessScore >= 80 ? '#10b981' : '#f59e0b' }} />
                </div>
                <span style={{ color: readinessScore >= 80 ? '#059669' : '#f59e0b', fontSize: 11, fontWeight: 500 }}>{readinessScore}% ready</span>
              </div>
              <div className="ml-auto">
                {expandedPanel === 'evidence' ? <ChevronUp size={15} color="#94a3b8" /> : <ChevronDown size={15} color="#94a3b8" />}
              </div>
            </button>
            {expandedPanel === 'evidence' && (
              <div className="p-5 space-y-2">
                {app.evidenceChecklist.map(item => {
                  const isLinked = linkedItems.has(item.id);
                  const effectiveStatus = isLinked ? 'COMPLETED' : item.status;
                  return (
                    <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl"
                      style={{
                        background: effectiveStatus === 'COMPLETED' ? '#f0fdf4' : effectiveStatus === 'WAIVED' ? '#f8fafc' : effectiveStatus === 'PENDING' ? '#fff7ed' : '#f8fafc',
                        border: `1px solid ${effectiveStatus === 'COMPLETED' ? '#bbf7d0' : effectiveStatus === 'WAIVED' ? '#e2e8f0' : '#fed7aa'}`,
                      }}>
                      <div className="mt-0.5 shrink-0">
                        {effectiveStatus === 'COMPLETED' ? <CheckCircle size={15} color="#10b981" />
                          : effectiveStatus === 'WAIVED' ? <Lock size={15} color="#94a3b8" />
                            : <Circle size={15} color="#f59e0b" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 500 }}>{item.label}</span>
                          {effectiveStatus === 'COMPLETED' && item.ref && (
                            <span className="px-1.5 py-0.5 rounded text-xs flex items-center gap-1"
                              style={{ background: 'rgba(16,185,129,0.1)', color: '#047857', fontSize: 10 }}>
                              <Link size={9} />{isLinked ? (item as any).autoLink?.ref : item.ref}
                            </span>
                          )}
                          {effectiveStatus === 'COMPLETED' && (item as any).hash && (
                            <span style={{ color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}>{(item as any).hash}</span>
                          )}
                          {effectiveStatus === 'WAIVED' && (
                            <span className="px-1.5 py-0.5 rounded" style={{ background: '#f1f5f9', color: '#64748b', fontSize: 10 }}>Waived</span>
                          )}
                        </div>
                        {effectiveStatus === 'WAIVED' && (item as any).waiverReason && (
                          <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{(item as any).waiverReason}</p>
                        )}
                        {effectiveStatus === 'COMPLETED' && item.completedAt && (
                          <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Completed {item.completedAt}</p>
                        )}
                        {/* Auto-link suggestion – DELIGHTER D6 */}
                        {effectiveStatus === 'PENDING' && (item as any).autoLink && !isLinked && (
                          <div className="mt-2 flex items-center gap-2 p-2 rounded-lg"
                            style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                            <Zap size={12} color="#3b82f6" />
                            <span style={{ color: '#1d4ed8', fontSize: 11 }}>
                              Auto-link found: <strong>{(item as any).autoLink.label}</strong>
                            </span>
                            <button
                              onClick={() => handleAutoLink(item.id, (item as any).autoLink.ref)}
                              className="ml-auto px-2 py-0.5 rounded hover:opacity-80 transition-all"
                              style={{ background: '#3b82f6', color: 'white', fontSize: 10 }}>
                              Link now
                            </button>
                          </div>
                        )}
                        {effectiveStatus === 'PENDING' && !(item as any).autoLink && (
                          <div className="mt-2 flex items-center gap-2">
                            <span style={{ color: '#f59e0b', fontSize: 11 }}>Missing – required for due diligence</span>
                            {(role.id === 'procurement-officer' || role.id === 'sme-admin') && (
                              <button className="px-2 py-0.5 rounded text-xs hover:opacity-80 transition-all"
                                style={{ background: '#f59e0b', color: 'white', fontSize: 10 }}>
                                Upload
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Due Diligence Panel */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <button className="w-full px-5 py-4 flex items-center gap-2" style={{ borderBottom: expandedPanel === 'dd' ? '1px solid #f1f5f9' : 'none' }}
              onClick={() => setExpandedPanel(expandedPanel === 'dd' ? null : 'dd')}>
              <Eye size={15} color="#0ea5e9" />
              <h3 style={{ color: '#0f172a' }}>Due Diligence</h3>
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs"
                style={{ background: app.dueDiligence.status === 'APPROVED' ? '#f0fdf4' : '#fff7ed', color: app.dueDiligence.status === 'APPROVED' ? '#15803d' : '#c2410c', fontSize: 11 }}>
                {app.dueDiligence.status}
              </span>
              {expandedPanel === 'dd' ? <ChevronUp size={15} color="#94a3b8" className="ml-auto" /> : <ChevronDown size={15} color="#94a3b8" className="ml-auto" />}
            </button>
            {expandedPanel === 'dd' && (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <InfoField label="Reviewer" value={app.dueDiligence.reviewer} />
                  <InfoField label="Risk Rating" value={app.dueDiligence.riskRating} highlight={app.dueDiligence.riskRating === 'HIGH' ? '#ef4444' : app.dueDiligence.riskRating === 'MEDIUM' ? '#f59e0b' : '#059669'} />
                  <InfoField label="Completed" value={new Date(app.dueDiligence.completedAt!).toLocaleDateString('en-MY')} />
                </div>
                <div className="p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <p style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>Findings</p>
                  <p style={{ color: '#334155', fontSize: 13 }}>{app.dueDiligence.findings}</p>
                </div>
                <div>
                  <p style={{ color: '#64748b', fontSize: 11, marginBottom: 8 }}>Conditions</p>
                  {app.dueDiligence.conditions.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 mb-2">
                      <CheckCircle size={13} color="#10b981" className="mt-0.5 shrink-0" />
                      <p style={{ color: '#334155', fontSize: 13 }}>{c}</p>
                    </div>
                  ))}
                </div>
                {canFinancierAct && appStatus === 'DUE_DILIGENCE_IN_REVIEW' && (
                  <div className="pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                    {!showDDForm ? (
                      <button onClick={() => setShowDDForm(true)}
                        className="px-4 py-2 rounded-lg hover:opacity-80 transition-all"
                        style={{ background: '#047857', color: 'white', fontSize: 13 }}>
                        Record Decision
                      </button>
                    ) : (
                      <DDForm onSubmit={(dec) => { setDdDecision(dec); setShowDDForm(false); if (dec === 'APPROVED') handleAdvanceState(); }} />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Shariah Review Panel */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <button className="w-full px-5 py-4 flex items-center gap-2" style={{ borderBottom: expandedPanel === 'shariah' ? '1px solid #f1f5f9' : 'none' }}
              onClick={() => setExpandedPanel(expandedPanel === 'shariah' ? null : 'shariah')}>
              <Shield size={15} color="#8b5cf6" />
              <h3 style={{ color: '#0f172a' }}>Shariah / Compliance Review</h3>
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs"
                style={{ background: app.shariahReview.status === 'APPROVED' ? '#f0fdf4' : '#faf5ff', color: app.shariahReview.status === 'APPROVED' ? '#15803d' : '#7e22ce', fontSize: 11 }}>
                {appStatus === 'SHARIAH_IN_REVIEW' ? 'IN REVIEW' : app.shariahReview.status || 'PENDING'}
              </span>
              {expandedPanel === 'shariah' ? <ChevronUp size={15} color="#94a3b8" className="ml-auto" /> : <ChevronDown size={15} color="#94a3b8" className="ml-auto" />}
            </button>
            {expandedPanel === 'shariah' && (
              <div className="p-5 space-y-4">
                {appStatus !== 'SHARIAH_IN_REVIEW' && appStatus !== 'APPROVED' ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#faf5ff', border: '1px solid #e9d5ff' }}>
                    <Clock size={14} color="#8b5cf6" />
                    <p style={{ color: '#7e22ce', fontSize: 13 }}>Shariah review will be triggered after due diligence is approved.</p>
                  </div>
                ) : (
                  <>
                    {/* Profit Ratio Validator – DELIGHTER D3 */}
                    <div className="p-4 rounded-xl" style={{ background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Shield size={14} color="#8b5cf6" />
                        <p style={{ color: '#5b21b6', fontSize: 13, fontWeight: 500 }}>Shariah Profit Ratio Validator</p>
                        <span className="px-1.5 py-0.5 rounded text-xs ml-auto" style={{ background: '#e9d5ff', color: '#7e22ce', fontSize: 10 }}>Delighter — auto check</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          placeholder="Enter Rabb-ul-Mal ratio (e.g. 60)"
                          value={profitRatio}
                          onChange={e => {
                            setProfitRatio(e.target.value);
                            setFixedAmountFlag(false);
                          }}
                          className="flex-1 px-3 py-2 rounded-lg"
                          style={{ border: '1px solid #ddd6fe', fontSize: 13, background: 'white' }}
                        />
                        <span style={{ color: '#64748b', fontSize: 13 }}>% capital provider</span>
                      </div>
                      {profitRatio && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2">
                            {isProfitRatioSafe(profitRatio) ? (
                              <CheckCircle size={14} color="#10b981" />
                            ) : (
                              <XCircle size={14} color="#ef4444" />
                            )}
                            <span style={{ color: isProfitRatioSafe(profitRatio) ? '#059669' : '#ef4444', fontSize: 12 }}>
                              {isProfitRatioSafe(profitRatio)
                                ? `Valid ratio — ${profitRatio}% to Rabb, ${100 - parseFloat(profitRatio)}% to Mudarib`
                                : 'Invalid ratio — must be between 0 and 100'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle size={14} color="#10b981" />
                            <span style={{ color: '#059669', fontSize: 12 }}>No guaranteed fixed return detected — compliant with FR-38</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#e9d5ff' }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(parseFloat(profitRatio) || 0, 100)}%`, background: '#8b5cf6' }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {canShariahAct && !showShariahForm && (
                      <button onClick={() => setShowShariahForm(true)}
                        className="px-4 py-2 rounded-lg hover:opacity-80 transition-all"
                        style={{ background: '#7e22ce', color: 'white', fontSize: 13 }}>
                        Record Shariah Decision
                      </button>
                    )}
                    {showShariahForm && (
                      <ShariahForm onSubmit={(dec) => { setShariahDecision(dec); setShowShariahForm(false); if (dec === 'APPROVED') handleAdvanceState(); }} />
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Audit Trail */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <button className="w-full px-5 py-4 flex items-center gap-2" style={{ borderBottom: expandedPanel === 'audit' ? '1px solid #f1f5f9' : 'none' }}
              onClick={() => setExpandedPanel(expandedPanel === 'audit' ? null : 'audit')}>
              <Activity size={15} color="#059669" />
              <h3 style={{ color: '#0f172a' }}>Audit Trail</h3>
              <span className="ml-auto flex items-center gap-1.5">
                <span style={{ color: '#64748b', fontSize: 12 }}>{app.auditTrail.length} events</span>
                {expandedPanel === 'audit' ? <ChevronUp size={15} color="#94a3b8" /> : <ChevronDown size={15} color="#94a3b8" />}
              </span>
            </button>
            {expandedPanel === 'audit' && (
              <div className="p-5 space-y-2">
                {app.auditTrail.map((evt, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${evt.anchor === 'COMMITTED' ? 'bg-emerald-500' : evt.anchor === 'PENDING' ? 'bg-amber-400' : 'bg-slate-300'}`}
                      style={{ background: evt.anchor === 'COMMITTED' ? '#10b981' : evt.anchor === 'PENDING' ? '#f59e0b' : '#cbd5e1' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ color: '#334155', fontSize: 12, fontWeight: 500, fontFamily: 'monospace' }}>{evt.event}</span>
                        {evt.anchor === 'COMMITTED' && evt.txId && (
                          <span style={{ color: '#10b981', fontSize: 10, fontFamily: 'monospace' }}>
                            <Anchor size={9} className="inline mr-1" />{evt.txId}
                          </span>
                        )}
                        {evt.anchor === 'PENDING' && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: '#fff7ed', color: '#c2410c', fontSize: 10 }}>
                            <RefreshCw size={9} />Fabric pending
                          </span>
                        )}
                      </div>
                      <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{evt.actor} · {new Date(evt.timestamp).toLocaleString('en-MY')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Action Panel */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ color: '#0f172a' }}>Actions</h3>
              <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Role: {role.label}</p>
            </div>
            <div className="p-5 space-y-2">
              <ActionButton
                label="Record Due Diligence"
                icon={Eye}
                enabled={canFinancierAct && appStatus === 'DUE_DILIGENCE_IN_REVIEW'}
                reason={!canFinancierAct ? 'Financier User only' : appStatus !== 'DUE_DILIGENCE_IN_REVIEW' ? 'Not in due diligence review' : undefined}
                color="#0ea5e9"
                onClick={() => { setExpandedPanel('dd'); setShowDDForm(true); }}
              />
              <ActionButton
                label="Record Shariah Review"
                icon={Shield}
                enabled={canShariahAct && appStatus === 'SHARIAH_IN_REVIEW'}
                reason={!canShariahAct ? 'Shariah Reviewer only' : appStatus !== 'SHARIAH_IN_REVIEW' ? 'Not in Shariah review' : undefined}
                color="#8b5cf6"
                onClick={() => { setExpandedPanel('shariah'); setShowShariahForm(true); }}
              />
              <ActionButton
                label="Approve Application"
                icon={CheckCircle}
                enabled={canFinancierAct && appStatus === 'SHARIAH_IN_REVIEW'}
                reason={!canFinancierAct ? 'Financier User only' : 'Requires both review gates to pass'}
                color="#059669"
                onClick={handleAdvanceState}
              />
              <ActionButton
                label="Generate Contract"
                icon={FileText}
                enabled={canFinancierAct && appStatus === 'APPROVED'}
                reason={appStatus !== 'APPROVED' ? 'Requires approved status' : undefined}
                color="#047857"
                onClick={handleAdvanceState}
              />
              <ActionButton
                label="Mark Contract Signed"
                icon={Lock}
                enabled={canFinancierAct && appStatus === 'CONTRACT_PENDING_SIGNATURE'}
                reason="Requires contract to be generated and signed"
                color="#047857"
                onClick={handleAdvanceState}
              />
              <ActionButton
                label="Record Disbursement"
                icon={DollarSign}
                enabled={canFinancierAct && appStatus === 'CONTRACT_EXECUTED'}
                reason="Contract must be executed first"
                color="#0ea5e9"
                onClick={handleAdvanceState}
              />
              <ActionButton
                label="Record Ledger Entry"
                icon={BarChart2}
                enabled={canAccountantAct && ['DISBURSED', 'MONITORING', 'PROFIT_LOSS_CALCULATED'].includes(appStatus)}
                reason="Finance/Accountant only · requires disbursement"
                color="#3b82f6"
                onClick={() => onNavigate('ledger')}
              />
              <ActionButton
                label="Calculate Profit/Loss"
                icon={TrendingUp}
                enabled={canAccountantAct && appStatus === 'MONITORING'}
                reason="All ledger evidence must be complete"
                color="#8b5cf6"
                onClick={handleAdvanceState}
              />
              <ActionButton
                label="Export Closure Pack"
                icon={Download}
                enabled={['auditor', 'financier'].includes(role.id) && appStatus === 'PROFIT_LOSS_CALCULATED'}
                reason="P/L calculation must be complete"
                color="#059669"
                onClick={handleAdvanceState}
              />
            </div>
          </div>

          {/* Contract + Disbursement Status */}
          <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ color: '#0f172a', marginBottom: 16 }}>Contract & Disbursement</h3>
            <div className="space-y-3">
              <StatusRow label="Contract" status={app.contract.status || 'Not generated'} icon={FileText} color={app.contract.status ? '#059669' : '#94a3b8'} />
              <StatusRow label="Document" status={app.contract.documentVersion || 'Pending'} icon={FileText} color={app.contract.documentVersion ? '#059669' : '#94a3b8'} />
              <StatusRow label="Disbursement" status={app.disbursement.status || 'Not recorded'} icon={DollarSign} color={app.disbursement.status ? '#059669' : '#94a3b8'} />
              <StatusRow label="E-signature" status="Deferred — Mock" icon={Lock} color="#94a3b8" isDeferr />
            </div>
          </div>

          {/* Live P/L Preview – DELIGHTER D4 */}
          <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={15} color="#8b5cf6" />
              <h3 style={{ color: '#0f172a' }}>Live P/L Preview</h3>
              <span className="ml-auto px-1.5 py-0.5 rounded text-xs" style={{ background: '#f5f3ff', color: '#7e22ce', fontSize: 10 }}>Delighter — auto calc</span>
            </div>
            <div className="space-y-2.5">
              <PLRow label="Total Revenue" value={totalRevenue} color="#059669" />
              <PLRow label="Total Allowable Costs" value={-totalCosts} color="#ef4444" />
              <PLRow label="Capital Deployed" value={totalCapital} color="#3b82f6" />
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 4 }}>
                <PLRow label="Net Profit" value={netProfit} color={netProfit >= 0 ? '#059669' : '#ef4444'} bold />
              </div>
              {netProfit > 0 && (
                <div className="p-3 rounded-xl mt-2 space-y-1" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <p style={{ color: '#64748b', fontSize: 11, marginBottom: 6 }}>Expected Distribution</p>
                  <PLRow label={`Rabb-ul-Mal (${app.capitalProviderRatio * 100}%)`} value={rabbShare} color="#0ea5e9" />
                  <PLRow label={`Mudarib (${app.entrepreneurRatio * 100}%)`} value={mudaribShare} color="#8b5cf6" />
                </div>
              )}
              <p style={{ color: '#94a3b8', fontSize: 10, marginTop: 4 }}>Based on {app.ledgerEntries.length} ledger entries · Updates as entries are added</p>
            </div>
          </div>

          {/* Disbursement Burn Rate Chart – DELIGHTER D8 */}
          <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Activity size={15} color="#3b82f6" />
              <h3 style={{ color: '#0f172a' }}>Capital Burn Rate</h3>
            </div>
            <p style={{ color: '#64748b', fontSize: 11, marginBottom: 12 }}>Cumulative spend vs. RM 125,000 ceiling</p>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={BURN_DATA} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis key="x-axis" dataKey="day" tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis key="y-axis" hide />
                <Tooltip key="tooltip" contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: any) => [`MYR ${Number(v).toLocaleString()}`, 'Spent']} />
                <Area key="area-capital" name="Capital Ceiling" type="monotone" dataKey="capital" stroke="#e2e8f0" fill="none" strokeDasharray="4 4" />
                <Area key="area-spent" name="Spent" type="monotone" dataKey="spent" stroke="#3b82f6" fill="url(#burnGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5" style={{ background: '#3b82f6' }} />
                <span style={{ color: '#64748b', fontSize: 10 }}>Actual spend</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 border-t-2 border-dashed" style={{ borderColor: '#e2e8f0' }} />
                <span style={{ color: '#64748b', fontSize: 10 }}>Capital ceiling</span>
              </div>
            </div>
          </div>

          {/* Fabric Anchor Status */}
          <div className="rounded-xl p-4" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
            <div className="flex items-center gap-2 mb-3">
              <Anchor size={14} color="#10b981" />
              <span style={{ color: 'white', fontSize: 13, fontWeight: 500 }}>Fabric Anchor Status</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <p style={{ color: '#10b981', fontSize: 20, fontWeight: 700 }}>{app.fabricAnchors.committed}</p>
                <p style={{ color: '#64748b', fontSize: 10 }}>Committed</p>
              </div>
              <div className="p-2.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="flex items-center gap-1.5">
                  <p style={{ color: '#f59e0b', fontSize: 20, fontWeight: 700 }}>{app.fabricAnchors.pending}</p>
                  <RefreshCw size={12} color="#f59e0b" className="animate-spin mt-1" />
                </div>
                <p style={{ color: '#64748b', fontSize: 10 }}>Pending</p>
              </div>
            </div>
            <p style={{ color: '#475569', fontSize: 10, marginTop: 8 }}>Off-chain hashes only · No confidential payload on-chain</p>
          </div>
        </div>
      </div>

      {/* ── Pre-flight Check Modal – DELIGHTER D7 ───────────────────────── */}
      {showPreFlight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div className="px-6 py-5" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#f0fdf4', border: '1px solid #a7f3d0' }}>
                  <Zap size={18} color="#047857" />
                </div>
                <div>
                  <h3 style={{ color: '#0f172a' }}>Pre-flight Submission Check</h3>
                  <p style={{ color: '#64748b', fontSize: 12, marginTop: 1 }}>Validating all gateway conditions before submission</p>
                </div>
                <button onClick={() => setShowPreFlight(false)} className="ml-auto p-1.5 rounded-lg hover:bg-slate-100">
                  <XCircle size={18} color="#94a3b8" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-2 max-h-80 overflow-y-auto">
              {PRE_FLIGHT_CHECKS.map(check => (
                <div key={check.id} className="flex items-start gap-3 p-3 rounded-xl"
                  style={{
                    background: check.status === 'pass' ? '#f0fdf4' : check.status === 'warn' ? '#fff7ed' : '#fef2f2',
                    border: `1px solid ${check.status === 'pass' ? '#bbf7d0' : check.status === 'warn' ? '#fed7aa' : '#fecaca'}`,
                  }}>
                  {check.status === 'pass' ? <CheckCircle size={15} color="#10b981" className="shrink-0 mt-0.5" />
                    : check.status === 'warn' ? <AlertTriangle size={15} color="#f59e0b" className="shrink-0 mt-0.5" />
                      : <XCircle size={15} color="#ef4444" className="shrink-0 mt-0.5" />}
                  <div>
                    <p style={{ color: '#0f172a', fontSize: 13, fontWeight: 500 }}>{check.label}</p>
                    <p style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>{check.note}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: '1px solid #f1f5f9' }}>
              <div className="flex items-center gap-2">
                <span style={{ color: '#059669', fontSize: 12 }}>✓ {PRE_FLIGHT_CHECKS.filter(c => c.status === 'pass').length} passed</span>
                <span style={{ color: '#f59e0b', fontSize: 12 }}>⚠ {PRE_FLIGHT_CHECKS.filter(c => c.status === 'warn').length} warning</span>
                <span style={{ color: '#ef4444', fontSize: 12 }}>✗ {PRE_FLIGHT_CHECKS.filter(c => c.status === 'fail').length} missing</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowPreFlight(false)} className="px-4 py-2 rounded-lg text-sm hover:opacity-80"
                  style={{ background: '#f1f5f9', color: '#475569', fontSize: 13 }}>
                  Close
                </button>
                <button className="px-4 py-2 rounded-lg text-sm hover:opacity-80"
                  style={{ background: PRE_FLIGHT_CHECKS.some(c => c.status === 'fail') ? '#94a3b8' : '#047857', color: 'white', fontSize: 13 }}
                  disabled={PRE_FLIGHT_CHECKS.some(c => c.status === 'fail')}>
                  Submit Application
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function EconCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
      <p style={{ color: '#64748b', fontSize: 11 }}>{label}</p>
      <p style={{ color, fontSize: 18, fontWeight: 700, lineHeight: 1.2, marginTop: 4 }}>{value}</p>
      {sub && <p style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

function InfoField({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div>
      <p style={{ color: '#94a3b8', fontSize: 11 }}>{label}</p>
      <p style={{ color: highlight || '#334155', fontSize: 13, fontWeight: highlight ? 600 : 400, marginTop: 2 }}>{value}</p>
    </div>
  );
}

function StatusRow({ label, status, icon: Icon, color, isDeferr }: { label: string; status: string; icon: any; color: string; isDeferr?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={13} color={color} />
      <span style={{ color: '#64748b', fontSize: 12 }}>{label}</span>
      <span className="ml-auto text-xs px-2 py-0.5 rounded"
        style={{ background: isDeferr ? '#f1f5f9' : color === '#94a3b8' ? '#f8fafc' : '#f0fdf4', color: isDeferr ? '#94a3b8' : color, fontSize: 10 }}>
        {status}
      </span>
    </div>
  );
}

function PLRow({ label, value, color, bold }: { label: string; value: number; color: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: '#64748b', fontSize: 12 }}>{label}</span>
      <span style={{ color, fontSize: 13, fontWeight: bold ? 700 : 500 }}>
        {value >= 0 ? '+' : ''}MYR {Math.abs(value).toLocaleString()}
      </span>
    </div>
  );
}

function ActionButton({ label, icon: Icon, enabled, reason, color, onClick }: {
  label: string; icon: any; enabled: boolean; reason?: string; color: string; onClick?: () => void;
}) {
  return (
    <div className="relative group">
      <button
        onClick={enabled ? onClick : undefined}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all text-left"
        style={{
          background: enabled ? `${color}12` : '#f8fafc',
          border: `1px solid ${enabled ? `${color}30` : '#e2e8f0'}`,
          color: enabled ? color : '#cbd5e1',
          cursor: enabled ? 'pointer' : 'not-allowed',
        }}
      >
        <Icon size={14} />
        <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
        {enabled && <ArrowRight size={12} className="ml-auto" />}
        {!enabled && <Lock size={11} className="ml-auto" color="#cbd5e1" />}
      </button>
      {!enabled && reason && (
        <div className="absolute bottom-full left-0 right-0 mb-1 p-2 rounded-lg z-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
          style={{ background: '#0f172a', color: '#94a3b8', fontSize: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          {reason}
        </div>
      )}
    </div>
  );
}

import { BarChart2 } from 'lucide-react';

function DDForm({ onSubmit }: { onSubmit: (decision: string) => void }) {
  const [dec, setDec] = useState('APPROVED');
  const [notes, setNotes] = useState('');
  const [risk, setRisk] = useState('MEDIUM');
  return (
    <div className="space-y-3 p-4 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
      <h4 style={{ color: '#0f172a', fontSize: 14 }}>Due Diligence Decision</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={{ color: '#64748b', fontSize: 11 }}>Decision</label>
          <select value={dec} onChange={e => setDec(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid #e2e8f0', fontSize: 13 }}>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div>
          <label style={{ color: '#64748b', fontSize: 11 }}>Risk Rating</label>
          <select value={risk} onChange={e => setRisk(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid #e2e8f0', fontSize: 13 }}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
      </div>
      <div>
        <label style={{ color: '#64748b', fontSize: 11 }}>Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Findings, conditions, and observations..."
          className="w-full mt-1 px-3 py-2 rounded-lg text-sm resize-none" style={{ border: '1px solid #e2e8f0', fontSize: 13 }} />
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSubmit(dec)} className="px-4 py-2 rounded-lg hover:opacity-80 transition-all"
          style={{ background: dec === 'APPROVED' ? '#047857' : '#ef4444', color: 'white', fontSize: 13 }}>
          Record Decision
        </button>
      </div>
    </div>
  );
}

function ShariahForm({ onSubmit }: { onSubmit: (decision: string) => void }) {
  const [dec, setDec] = useState('APPROVED');
  const [eligible, setEligible] = useState(true);
  const [opinion, setOpinion] = useState('');
  return (
    <div className="space-y-3 p-4 rounded-xl" style={{ background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
      <h4 style={{ color: '#5b21b6', fontSize: 14 }}>Shariah / Compliance Decision</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={{ color: '#64748b', fontSize: 11 }}>Decision</label>
          <select value={dec} onChange={e => setDec(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid #ddd6fe', fontSize: 13 }}>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div className="flex items-center gap-2 mt-5">
          <input type="checkbox" checked={eligible} onChange={e => setEligible(e.target.checked)} id="eligible" />
          <label htmlFor="eligible" style={{ color: '#64748b', fontSize: 12 }}>Goods/services eligible</label>
        </div>
      </div>
      <div>
        <label style={{ color: '#64748b', fontSize: 11 }}>Shariah Opinion</label>
        <textarea value={opinion} onChange={e => setOpinion(e.target.value)} rows={3} placeholder="Eligibility finding, profit-ratio review, loss-treatment assessment..."
          className="w-full mt-1 px-3 py-2 rounded-lg text-sm resize-none" style={{ border: '1px solid #ddd6fe', fontSize: 13 }} />
      </div>
      <button onClick={() => onSubmit(dec)} className="px-4 py-2 rounded-lg hover:opacity-80 transition-all"
        style={{ background: '#7e22ce', color: 'white', fontSize: 13 }}>
        Record Shariah Decision
      </button>
    </div>
  );
}
