import { useState } from 'react';
import {
  BookOpen, Download, Filter, TrendingUp, ShoppingCart, Shield,
  DollarSign, Zap, BarChart2, PieChart, Calendar, ChevronDown
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import type { RoleEntry, ViewId } from './Sidebar';

interface Props {
  role: RoleEntry;
  onNavigate: (view: ViewId) => void;
}

type ReportTab = 'procurement' | 'finance' | 'audit' | 'integration';

const SPEND_BY_MONTH = [
  { month: 'Jan', spend: 42000, financed: 30000 },
  { month: 'Feb', spend: 67000, financed: 45000 },
  { month: 'Mar', spend: 55000, financed: 55000 },
  { month: 'Apr', spend: 88000, financed: 88000 },
  { month: 'May', spend: 110000, financed: 95000 },
  { month: 'Jun', spend: 38000, financed: 30000 },
];

const SPEND_BY_CATEGORY = [
  { name: 'Solar / Energy', value: 125000, color: '#f59e0b' },
  { name: 'Industrial UPS', value: 88000, color: '#3b82f6' },
  { name: 'Automation', value: 210000, color: '#10b981' },
  { name: 'Textile Inputs', value: 55000, color: '#8b5cf6' },
  { name: 'Construction', value: 175000, color: '#ef4444' },
];

const SUPPLIER_PERFORMANCE = [
  { supplier: 'PanelCo Industries', deliveryRate: 95, invoiceAccuracy: 98, exceptions: 1, responseRate: 100 },
  { supplier: 'UPS Malaysia', deliveryRate: 88, invoiceAccuracy: 94, exceptions: 3, responseRate: 92 },
  { supplier: 'AutoLogix', deliveryRate: 100, invoiceAccuracy: 100, exceptions: 0, responseRate: 100 },
  { supplier: 'FabricFirst', deliveryRate: 72, invoiceAccuracy: 81, exceptions: 7, responseRate: 85 },
  { supplier: 'SteelBuild', deliveryRate: 97, invoiceAccuracy: 96, exceptions: 1, responseRate: 97 },
];

const FINANCE_PIPELINE = [
  { month: 'Jan', applied: 1, approved: 0, disbursed: 0, closed: 0 },
  { month: 'Feb', applied: 2, approved: 1, disbursed: 0, closed: 0 },
  { month: 'Mar', applied: 1, approved: 2, disbursed: 1, closed: 0 },
  { month: 'Apr', applied: 3, approved: 1, disbursed: 2, closed: 1 },
  { month: 'May', applied: 2, approved: 3, disbursed: 1, closed: 0 },
  { month: 'Jun', applied: 1, approved: 1, disbursed: 1, closed: 0 },
];

const PL_STATEMENTS = [
  { project: 'Industrial UPS — GovTech', revenue: 105000, costs: 88000, netProfit: 17000, rabbShare: 10200, mudaribShare: 6800, status: 'DISTRIBUTED' },
  { project: 'Steel Construction — PropDev', revenue: 210000, costs: 175000, netProfit: 35000, rabbShare: 21000, mudaribShare: 14000, status: 'DISTRIBUTED' },
  { project: 'Warehouse Automation', revenue: 265000, costs: 210000, netProfit: 55000, rabbShare: 33000, mudaribShare: 22000, status: 'REVIEWED' },
];

const INTEGRATION_HEALTH = [
  { day: 'Mon', completed: 45, failed: 2, retried: 5 },
  { day: 'Tue', completed: 52, failed: 1, retried: 3 },
  { day: 'Wed', completed: 38, failed: 4, retried: 8 },
  { day: 'Thu', completed: 61, failed: 0, retried: 1 },
  { day: 'Fri', completed: 49, failed: 3, retried: 6 },
  { day: 'Sat', completed: 12, failed: 1, retried: 2 },
  { day: 'Sun', completed: 8, failed: 0, retried: 0 },
];

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'];

export function ReportsView({ role, onNavigate }: Props) {
  const [tab, setTab] = useState<ReportTab>('procurement');
  const [period, setPeriod] = useState('2026-Q2');

  const tabs: { id: ReportTab; label: string; icon: React.ElementType }[] = [
    { id: 'procurement', label: 'Procurement Spend', icon: ShoppingCart },
    { id: 'finance', label: 'Finance Pipeline', icon: DollarSign },
    { id: 'audit', label: 'P/L & Audit', icon: Shield },
    { id: 'integration', label: 'Integration Health', icon: Zap },
  ];

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#f1f5f9' }}>
      {/* Header */}
      <div className="px-8 py-5" style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ color: '#0f172a' }}>Reports & Analytics</h1>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 2 }}>Procurement · finance pipeline · P/L audit · integration health</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ border: '1px solid #e2e8f0', fontSize: 13, color: '#475569', background: 'white' }}>
              <option value="2026-Q2">Q2 2026</option>
              <option value="2026-Q1">Q1 2026</option>
              <option value="2025-Q4">Q4 2025</option>
            </select>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg hover:opacity-80 transition-all"
              style={{ background: '#047857', color: 'white', fontSize: 13 }}>
              <Download size={14} /> Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 pt-4 flex gap-1" style={{ borderBottom: '1px solid #e2e8f0', background: 'white' }}>
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-all"
              style={{
                background: tab === t.id ? '#f1f5f9' : 'transparent',
                color: tab === t.id ? '#0f172a' : '#64748b',
                fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
                borderBottom: tab === t.id ? '2px solid #047857' : '2px solid transparent',
                marginBottom: -1,
              }}>
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="px-8 py-6 space-y-5">
        {tab === 'procurement' && (
          <>
            <div className="grid grid-cols-2 gap-5">
              {/* Spend by month */}
              <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
                <h4 style={{ color: '#0f172a', marginBottom: 16 }}>Monthly Spend vs. Financed</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={SPEND_BY_MONTH} barSize={14} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => `MYR ${v.toLocaleString()}`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar key="bar-spend" dataKey="spend" name="Total Spend" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar key="bar-financed" dataKey="financed" name="Mudarabah Financed" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Spend by category */}
              <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
                <h4 style={{ color: '#0f172a', marginBottom: 16 }}>Spend by Category</h4>
                <div className="flex items-center gap-4">
                  <RePieChart width={140} height={140}>
                    <Pie data={SPEND_BY_CATEGORY} dataKey="value" cx="50%" cy="50%" outerRadius={65} innerRadius={40}>
                      {SPEND_BY_CATEGORY.map((_, i) => <Cell key={`cat-cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                  </RePieChart>
                  <div className="flex-1 space-y-2">
                    {SPEND_BY_CATEGORY.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span style={{ color: '#64748b', fontSize: 11, flex: 1 }}>{c.name}</span>
                        <span style={{ color: '#0f172a', fontSize: 12, fontWeight: 600 }}>MYR {(c.value/1000).toFixed(0)}k</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Supplier performance */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <h4 style={{ color: '#0f172a' }}>Supplier Performance Scorecard</h4>
              </div>
              <div className="divide-y" style={{ borderColor: '#e2e8f0' }}>
                {SUPPLIER_PERFORMANCE.map((s, i) => (
                  <div key={i} className="px-5 py-4 grid grid-cols-5 gap-4 items-center">
                    <div style={{ color: '#0f172a', fontSize: 13 }}>{s.supplier}</div>
                    {[
                      { label: 'On-Time Delivery', value: s.deliveryRate },
                      { label: 'Invoice Accuracy', value: s.invoiceAccuracy },
                    ].map((m, j) => (
                      <div key={j}>
                        <div className="flex items-center justify-between mb-1">
                          <span style={{ color: '#94a3b8', fontSize: 10 }}>{m.label}</span>
                          <span style={{ color: m.value >= 90 ? '#10b981' : m.value >= 75 ? '#f59e0b' : '#ef4444', fontSize: 11, fontWeight: 600 }}>{m.value}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
                          <div className="h-full rounded-full" style={{ width: `${m.value}%`, background: m.value >= 90 ? '#10b981' : m.value >= 75 ? '#f59e0b' : '#ef4444' }} />
                        </div>
                      </div>
                    ))}
                    <div className="text-center">
                      <div style={{ color: s.exceptions > 3 ? '#ef4444' : '#64748b', fontSize: 13, fontWeight: 600 }}>{s.exceptions}</div>
                      <div style={{ color: '#94a3b8', fontSize: 10 }}>exceptions</div>
                    </div>
                    <div className="text-center">
                      <div style={{ color: '#0f172a', fontSize: 13, fontWeight: 600 }}>{s.responseRate}%</div>
                      <div style={{ color: '#94a3b8', fontSize: 10 }}>RFQ response</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'finance' && (
          <>
            <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
              <h4 style={{ color: '#0f172a', marginBottom: 16 }}>Application Pipeline — Monthly Funnel</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={FINANCE_PIPELINE} barSize={12} barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar key="bar-applied" dataKey="applied" name="Applied" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar key="bar-approved" dataKey="approved" name="Approved" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar key="bar-disbursed" dataKey="disbursed" name="Disbursed" fill="#047857" radius={[4, 4, 0, 0]} />
                  <Bar key="bar-closed" dataKey="closed" name="Closed" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Applied', value: 'MYR 658k', sub: '5 applications', color: '#3b82f6' },
                { label: 'Total Disbursed', value: 'MYR 423k', sub: '3 disbursements', color: '#10b981' },
                { label: 'Active Exposure', value: 'MYR 423k', sub: '3 monitored', color: '#8b5cf6' },
              ].map((k, i) => (
                <div key={i} className="rounded-xl px-5 py-4" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
                  <p style={{ color: k.color, fontSize: 22, fontWeight: 700 }}>{k.value}</p>
                  <p style={{ color: '#0f172a', fontSize: 13, marginTop: 2 }}>{k.label}</p>
                  <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 1 }}>{k.sub}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'audit' && (
          <>
            <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <h4 style={{ color: '#0f172a' }}>Profit / Loss Statements — Closed & Reviewed</h4>
              </div>
              <div className="divide-y" style={{ borderColor: '#e2e8f0' }}>
                {PL_STATEMENTS.map((pl, i) => (
                  <div key={i} className="px-5 py-4">
                    <div className="flex items-start gap-4 mb-3">
                      <div className="flex-1">
                        <div style={{ color: '#0f172a', fontSize: 13, fontWeight: 500 }}>{pl.project}</div>
                        <span className="px-2 py-0.5 rounded-full" style={{ background: '#d1fae5', color: '#059669', fontSize: 10, marginTop: 4, display: 'inline-block' }}>{pl.status}</span>
                      </div>
                      <div className="text-right">
                        <div style={{ color: '#10b981', fontSize: 18, fontWeight: 700 }}>MYR {pl.netProfit.toLocaleString()}</div>
                        <div style={{ color: '#94a3b8', fontSize: 11 }}>net profit</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: 'Revenue', value: pl.revenue, color: '#10b981' },
                        { label: 'Costs', value: pl.costs, color: '#ef4444' },
                        { label: 'Rabb-ul-Mal (60%)', value: pl.rabbShare, color: '#047857' },
                        { label: 'Mudarib (40%)', value: pl.mudaribShare, color: '#8b5cf6' },
                      ].map((m, j) => (
                        <div key={j} className="px-3 py-2 rounded-lg" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <div style={{ color: m.color, fontSize: 13, fontWeight: 600 }}>MYR {m.value.toLocaleString()}</div>
                          <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 1 }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'integration' && (
          <>
            <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
              <h4 style={{ color: '#0f172a', marginBottom: 16 }}>Weekly Outbox Health</h4>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={INTEGRATION_HEALTH}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area key="area-completed" type="monotone" dataKey="completed" name="Completed" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
                  <Area key="area-retried" type="monotone" dataKey="retried" name="Retried" stroke="#f59e0b" fill="#fef3c7" strokeWidth={2} />
                  <Area key="area-failed" type="monotone" dataKey="failed" name="Failed" stroke="#ef4444" fill="#fee2e2" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Success Rate', value: '92%', color: '#10b981' },
                { label: 'Avg. Attempts', value: '1.4', color: '#3b82f6' },
                { label: 'Dead-lettered', value: '1', color: '#ef4444' },
                { label: 'Fabric Anchored', value: '47', color: '#8b5cf6' },
              ].map((k, i) => (
                <div key={i} className="rounded-xl px-5 py-4" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
                  <p style={{ color: k.color, fontSize: 22, fontWeight: 700 }}>{k.value}</p>
                  <p style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{k.label}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
