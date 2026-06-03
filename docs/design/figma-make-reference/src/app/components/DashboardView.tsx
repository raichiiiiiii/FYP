import { useState } from 'react';
import {
  TrendingUp, AlertTriangle, CheckCircle, Clock, ArrowRight,
  FileText, DollarSign, Activity, Zap, Target, ChevronRight,
  Users, Package, Shield, BarChart2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, Cell } from 'recharts';
import type { RoleEntry } from './Sidebar';
import type { ViewId } from './Sidebar';

interface Props {
  role: RoleEntry;
  onNavigate: (view: ViewId, params?: { applicationId?: string }) => void;
}

const KPI_DATA: Record<string, { label: string; value: string; sub: string; icon: any; color: string; trend: string }[]> = {
  'procurement-officer': [
    { label: 'Open Requisitions', value: '7', sub: '2 awaiting approval', icon: FileText, color: '#3b82f6', trend: '+2 this week' },
    { label: 'Active RFQs', value: '3', sub: '12 supplier responses', icon: Package, color: '#8b5cf6', trend: 'Eval due Fri' },
    { label: 'Evidence Readiness', value: '73%', sub: 'APP-2024-001 needs 2 items', icon: CheckCircle, color: '#059669', trend: '↑ from 60%' },
    { label: 'Pending Actions', value: '4', sub: 'Items require your attention', icon: Zap, color: '#f59e0b', trend: 'High priority' },
  ],
  'financier': [
    { label: 'Applications Pipeline', value: '12', sub: '3 awaiting due diligence', icon: FileText, color: '#0ea5e9', trend: '+2 this month' },
    { label: 'Total Exposure', value: 'MYR 1.8M', sub: 'Across 5 active contracts', icon: DollarSign, color: '#8b5cf6', trend: '↑ 8% MoM' },
    { label: 'At-Risk Milestones', value: '2', sub: 'Delivery delays detected', icon: AlertTriangle, color: '#ef4444', trend: 'Review needed' },
    { label: 'Avg. Review Time', value: '3.2d', sub: 'Due diligence cycle', icon: Clock, color: '#059669', trend: '↓ 1.1d vs last Q' },
  ],
  'shariah-reviewer': [
    { label: 'Pending Reviews', value: '3', sub: 'Compliance checklist queued', icon: Shield, color: '#8b5cf6', trend: '1 urgent' },
    { label: 'Approved This Month', value: '8', sub: '100% compliance rate', icon: CheckCircle, color: '#059669', trend: '↑ excellent' },
    { label: 'Exceptions Filed', value: '1', sub: 'Loss exception in review', icon: AlertTriangle, color: '#f59e0b', trend: 'Under review' },
    { label: 'Avg. Review Days', value: '1.8d', sub: 'Target: under 2 days', icon: Clock, color: '#3b82f6', trend: 'On target' },
  ],
  'finance-accountant': [
    { label: 'Active Ledgers', value: '5', sub: 'Project-level tracking', icon: BarChart2, color: '#3b82f6', trend: '2 need entries' },
    { label: 'Unreconciled Items', value: '3', sub: 'ERP sync pending', icon: AlertTriangle, color: '#f59e0b', trend: 'Action needed' },
    { label: 'Realised Profit', value: 'MYR 44K', sub: 'Across closed projects', icon: TrendingUp, color: '#059669', trend: '+12% vs budget' },
    { label: 'P/L Statements', value: '2', sub: 'Ready for distribution', icon: FileText, color: '#8b5cf6', trend: 'Pending approval' },
  ],
  'auditor': [
    { label: 'Events to Verify', value: '18', sub: 'Hash verification pending', icon: Shield, color: '#6b7280', trend: '5 high priority' },
    { label: 'Fabric Anchors', value: '142', sub: '3 pending confirmation', icon: Activity, color: '#059669', trend: 'Chain healthy' },
    { label: 'Open Findings', value: '2', sub: '0 critical issues', icon: AlertTriangle, color: '#f59e0b', trend: 'No critical' },
    { label: 'Evidence Packs', value: '7', sub: 'Ready for export', icon: FileText, color: '#3b82f6', trend: '2 requested' },
  ],
  'sme-admin': [
    { label: 'Active Users', value: '14', sub: '3 pending invitations', icon: Users, color: '#3b82f6', trend: '+2 this week' },
    { label: 'Integration Status', value: '2/3', sub: 'ERP sync active', icon: Activity, color: '#059669', trend: 'Fabric pending' },
    { label: 'Backup Status', value: 'OK', sub: 'Last: 2h ago', icon: CheckCircle, color: '#059669', trend: 'RPO 24h met' },
    { label: 'Audit Events', value: '1,247', sub: 'Last 30 days', icon: Shield, color: '#8b5cf6', trend: 'Append-only' },
  ],
};

const PIPELINE_DATA = [
  { month: 'Jan', submitted: 4, approved: 3, rejected: 1 },
  { month: 'Feb', submitted: 6, approved: 4, rejected: 1 },
  { month: 'Mar', submitted: 5, approved: 5, rejected: 0 },
  { month: 'Apr', submitted: 8, approved: 6, rejected: 1 },
  { month: 'May', submitted: 10, approved: 7, rejected: 2 },
  { month: 'Jun', submitted: 12, approved: 8, rejected: 2 },
];

const EXPOSURE_DATA = [
  { month: 'Jan', capital: 450000 },
  { month: 'Feb', capital: 620000 },
  { month: 'Mar', capital: 890000 },
  { month: 'Apr', capital: 1100000 },
  { month: 'May', capital: 1450000 },
  { month: 'Jun', capital: 1800000 },
];

const NEXT_ACTIONS: Record<string, { title: string; sub: string; app?: string; priority: 'high' | 'medium' | 'low'; action: ViewId }[]> = {
  'procurement-officer': [
    { title: 'Complete 2 evidence items', sub: 'APP-2024-001 blocked for due diligence', app: 'APP-2024-001', priority: 'high', action: 'workspace' },
    { title: 'Approve supplier quotation', sub: 'QTN-2024-046 awaiting your review', priority: 'high', action: 'procurement' },
    { title: 'Submit new application', sub: 'PO-2024-089 ready for mudarabah', priority: 'medium', action: 'workspace' },
    { title: 'Acknowledge 3 purchase orders', sub: 'Suppliers awaiting acknowledgement', priority: 'low', action: 'procurement' },
  ],
  'financier': [
    { title: 'Review due diligence: APP-2024-001', sub: 'Solar panel components — RM 125,000', app: 'APP-2024-001', priority: 'high', action: 'workspace' },
    { title: 'Monitor APP-2024-002 milestone', sub: 'Delivery due in 5 days — risk flag', app: 'APP-2024-002', priority: 'high', action: 'workspace' },
    { title: 'Generate contract: APP-2024-003', sub: 'Both reviews approved — ready', app: 'APP-2024-003', priority: 'medium', action: 'workspace' },
    { title: 'Review policy rules', sub: '3 SME sectors need eligibility update', priority: 'low', action: 'settings' },
  ],
  'shariah-reviewer': [
    { title: 'Shariah review: APP-2024-001', sub: 'Electronics sector — restricted mudarabah', app: 'APP-2024-001', priority: 'high', action: 'workspace' },
    { title: 'Loss exception review: APP-2023-018', sub: 'Genuine loss vs breach classification', priority: 'high', action: 'audit' },
    { title: 'Review profit ratio: APP-2024-005', sub: 'Flagged for guaranteed return risk', priority: 'medium', action: 'workspace' },
  ],
  'finance-accountant': [
    { title: 'Record ledger entries: APP-2024-002', sub: 'Revenue collection confirmed — log now', app: 'APP-2024-002', priority: 'high', action: 'ledger' },
    { title: 'Calculate P/L: APP-2024-001', sub: 'All evidence linked — ready to calculate', app: 'APP-2024-001', priority: 'high', action: 'ledger' },
    { title: 'Reconcile 3 ERP entries', sub: 'PO postings pending sync', priority: 'medium', action: 'procurement' },
  ],
  'auditor': [
    { title: 'Verify closure pack: APP-2023-015', sub: 'Hash verification pending for 5 docs', priority: 'high', action: 'audit' },
    { title: 'Confirm Fabric anchor: APP-2024-001', sub: 'Contract signed — anchor tx pending', priority: 'medium', action: 'audit' },
    { title: 'Review audit trail: APP-2023-018', sub: 'Loss exception investigation', priority: 'high', action: 'audit' },
  ],
  'sme-admin': [
    { title: 'Accept 3 organization invitations', sub: 'Network channel pending', priority: 'medium', action: 'settings' },
    { title: 'Configure ERP adapter', sub: 'Fabric integration credentials expired', priority: 'high', action: 'settings' },
    { title: 'Review user access audit', sub: 'Monthly review due', priority: 'low', action: 'audit' },
  ],
};

const RECENT_ACTIVITY = [
  { time: '2 min ago', event: 'Evidence checklist item completed', app: 'APP-2024-001', user: 'Ahmad Razali', color: '#059669' },
  { time: '1h ago', event: 'Due diligence submitted', app: 'APP-2024-001', user: 'Finance Team', color: '#0ea5e9' },
  { time: '3h ago', event: 'Mudarabah application submitted', app: 'APP-2024-002', user: 'Siti Norzahira', color: '#8b5cf6' },
  { time: 'Yesterday', event: 'Shariah review approved', app: 'APP-2023-018', user: 'Dr. Hassan Al-Malik', color: '#059669' },
  { time: 'Yesterday', event: 'Contract signed and executed', app: 'APP-2023-017', user: 'Amanah Islamic Bank', color: '#f59e0b' },
  { time: '2 days ago', event: 'Fabric anchor committed', app: 'APP-2023-017', user: 'System', color: '#10b981' },
];

const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#6b7280' };
const PRIORITY_BG = { high: 'rgba(239,68,68,0.08)', medium: 'rgba(245,158,11,0.08)', low: 'rgba(107,114,128,0.06)' };

export function DashboardView({ role, onNavigate }: Props) {
  const [readinessApp] = useState({ score: 73, items: 8, completed: 5, appId: 'APP-2024-001' });
  const kpis = KPI_DATA[role.id] || KPI_DATA['procurement-officer'];
  const nextActions = NEXT_ACTIONS[role.id] || [];

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#f1f5f9' }}>
      {/* Header */}
      <div className="px-8 py-6" style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ color: '#0f172a' }}>Good morning, {role.label.split(' ')[0]}</h1>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 2 }}>
              {role.org} · {new Date().toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-full flex items-center gap-2" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
              <span style={{ color: '#047857', fontSize: 12, fontWeight: 500 }}>System operational</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          {kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={i} className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p style={{ color: '#64748b', fontSize: 12 }}>{kpi.label}</p>
                    <p style={{ color: '#0f172a', fontSize: 28, fontWeight: 700, marginTop: 4, lineHeight: 1.1 }}>{kpi.value}</p>
                    <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{kpi.sub}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${kpi.color}15` }}>
                    <Icon size={18} color={kpi.color} />
                  </div>
                </div>
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ color: kpi.color, fontSize: 11, fontWeight: 500 }}>{kpi.trend}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Application Readiness Score - DELIGHTER D1 */}
          <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ color: '#0f172a' }}>Application Readiness</h3>
              <button
                onClick={() => onNavigate('workspace', { applicationId: readinessApp.appId })}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors hover:opacity-80"
                style={{ background: '#f0fdf4', color: '#047857', fontSize: 11 }}
              >
                View <ChevronRight size={11} />
              </button>
            </div>
            <p style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>APP-2024-001 · Solar Panel Components</p>

            {/* Circular gauge */}
            <div className="flex items-center justify-center my-4">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke={readinessApp.score >= 80 ? '#10b981' : readinessApp.score >= 60 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - readinessApp.score / 100)}`}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span style={{ color: '#0f172a', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{readinessApp.score}%</span>
                  <span style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>ready</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span style={{ color: '#64748b', fontSize: 12 }}>Evidence items</span>
                <span style={{ color: '#0f172a', fontSize: 12, fontWeight: 500 }}>{readinessApp.completed}/{readinessApp.items} complete</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(readinessApp.completed / readinessApp.items) * 100}%`, background: '#f59e0b' }} />
              </div>
              <p style={{ color: '#ef4444', fontSize: 11 }}>⚠ 2 items blocking due diligence submission</p>
            </div>
          </div>

          {/* Next Actions - DELIGHTER D2 */}
          <div className="col-span-2 rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ color: '#0f172a' }}>Your Next Actions</h3>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#3b82f6' }} />
                <span style={{ color: '#1d4ed8', fontSize: 11 }}>Role-aware guidance</span>
              </div>
            </div>
            <div className="space-y-2">
              {nextActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => onNavigate(action.action, action.app ? { applicationId: action.app } : undefined)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:opacity-80 text-left"
                  style={{ background: PRIORITY_BG[action.priority], border: `1px solid ${PRIORITY_COLORS[action.priority]}20` }}
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PRIORITY_COLORS[action.priority] }} />
                  <div className="flex-1 min-w-0">
                    <p style={{ color: '#0f172a', fontSize: 13, fontWeight: 500 }}>{action.title}</p>
                    <p style={{ color: '#64748b', fontSize: 11 }}>{action.sub}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {action.app && <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(0,0,0,0.05)', color: '#64748b', fontSize: 10 }}>{action.app}</span>}
                    <ArrowRight size={13} color="#94a3b8" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Applications Pipeline Chart */}
          <div className="col-span-2 rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ color: '#0f172a' }}>Applications Pipeline</h3>
              <select className="text-xs border rounded-lg px-2 py-1.5" style={{ color: '#64748b', borderColor: '#e2e8f0', fontSize: 12 }}>
                <option>Last 6 months</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={PIPELINE_DATA} barCategoryGap="30%">
                <XAxis key="x-axis" dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis key="y-axis" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip key="tooltip" contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                <Bar key="bar-submitted" dataKey="submitted" name="Submitted" fill="#e0f2fe" radius={[3,3,0,0]} />
                <Bar key="bar-approved" dataKey="approved" name="Approved" fill="#059669" radius={[3,3,0,0]} />
                <Bar key="bar-rejected" dataKey="rejected" name="Rejected" fill="#fca5a5" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Risk Heat Matrix - DELIGHTER D9 */}
          <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ color: '#0f172a', marginBottom: 4 }}>Risk Heat Matrix</h3>
            <p style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>Buyer × Supplier risk mapping</p>
            <div className="space-y-1">
              {/* Y-axis label */}
              <div className="flex items-end gap-1">
                <div style={{ width: 48, color: '#94a3b8', fontSize: 10, textAlign: 'center' }}>Buyer risk</div>
                <div className="flex-1" />
              </div>
              <div className="flex gap-1 items-center">
                <div style={{ width: 48, color: '#94a3b8', fontSize: 10, textAlign: 'right', paddingRight: 6 }}>High</div>
                <div className="flex-1 grid grid-cols-2 gap-1">
                  <RiskCell color="#fef9c3" borderColor="#fde047" label="Med-High" count={2} tooltip="Solar Panel (APP-001), Textile (APP-004)" />
                  <RiskCell color="#fee2e2" borderColor="#fca5a5" label="High" count={1} tooltip="Unverified buyer + new supplier" />
                </div>
              </div>
              <div className="flex gap-1 items-center">
                <div style={{ width: 48, color: '#94a3b8', fontSize: 10, textAlign: 'right', paddingRight: 6 }}>Low</div>
                <div className="flex-1 grid grid-cols-2 gap-1">
                  <RiskCell color="#dcfce7" borderColor="#86efac" label="Low" count={4} tooltip="Most approved applications" />
                  <RiskCell color="#fef9c3" borderColor="#fde047" label="Med" count={2} tooltip="New suppliers, strong buyers" />
                </div>
              </div>
              <div className="flex gap-1">
                <div style={{ width: 48 }} />
                <div className="flex-1 grid grid-cols-2 gap-1 mt-1">
                  <div style={{ color: '#94a3b8', fontSize: 10, textAlign: 'center' }}>Low</div>
                  <div style={{ color: '#94a3b8', fontSize: 10, textAlign: 'center' }}>High</div>
                </div>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 10, textAlign: 'center', marginTop: 4 }}>Supplier risk</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ color: '#0f172a' }}>Recent Activity</h3>
            <button onClick={() => onNavigate('audit')} style={{ color: '#047857', fontSize: 12 }} className="flex items-center gap-1 hover:opacity-80">
              View audit trail <ChevronRight size={13} />
            </button>
          </div>
          <div className="space-y-3">
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                <div className="flex-1 flex items-center gap-3">
                  <span style={{ color: '#0f172a', fontSize: 13 }}>{item.event}</span>
                  <span className="px-1.5 py-0.5 rounded" style={{ background: '#f1f5f9', color: '#64748b', fontSize: 10 }}>{item.app}</span>
                </div>
                <span style={{ color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap' }}>{item.user}</span>
                <span style={{ color: '#cbd5e1', fontSize: 11, whiteSpace: 'nowrap' }}>{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskCell({ color, borderColor, label, count, tooltip }: { color: string; borderColor: string; label: string; count: number; tooltip: string }) {
  const [showTip, setShowTip] = useState(false);
  return (
    <div
      className="relative rounded-lg p-2.5 flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105"
      style={{ background: color, border: `1px solid ${borderColor}`, minHeight: 56 }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <span style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{count}</span>
      <span style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>{label}</span>
      {showTip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 p-2 rounded-lg z-10 pointer-events-none"
          style={{ background: '#0f172a', color: 'white', fontSize: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}
