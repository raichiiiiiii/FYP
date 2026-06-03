import { useState } from 'react';
import {
  ShoppingCart, CheckCircle, Clock, AlertTriangle, Package,
  FileText, ChevronRight, Plus, Filter, Search, TrendingUp,
  XCircle, ArrowRight, Truck, CreditCard
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, PieChart, Pie } from 'recharts';
import type { RoleEntry, ViewId } from './Sidebar';

interface Props {
  role: RoleEntry;
  onNavigate: (view: ViewId, params?: any) => void;
}

const PURCHASE_ORDERS = [
  { id: 'PO-2024-001', supplier: 'Mega Components Sdn Bhd', item: 'Solar Panels – Batch 1', amount: 48000, status: 'RECEIVED', matchStatus: 'MATCHED', dueDate: '2026-05-28', app: 'APP-2024-001' },
  { id: 'PO-2024-002', supplier: 'Mega Components Sdn Bhd', item: 'Mounting Hardware & Fasteners', amount: 31500, status: 'RECEIVED', matchStatus: 'MATCHED', dueDate: '2026-06-05', app: 'APP-2024-001' },
  { id: 'PO-2024-003', supplier: 'TechParts Asia Sdn Bhd', item: 'Inverter Units – 10kW', amount: 62000, status: 'ACKNOWLEDGED', matchStatus: 'PENDING', dueDate: '2026-06-15', app: null },
  { id: 'PO-2024-004', supplier: 'Struktur Steel Bhd', item: 'Steel Frame Components', amount: 18500, status: 'SUBMITTED', matchStatus: 'PENDING', dueDate: '2026-06-20', app: null },
  { id: 'PO-2024-005', supplier: 'ElectroPower Sdn Bhd', item: 'Wiring Harness & Conduits', amount: 9200, status: 'PARTIALLY_RECEIVED', matchStatus: 'EXCEPTION', dueDate: '2026-06-10', app: null },
];

const REQUISITIONS = [
  { id: 'REQ-2024-012', title: 'Industrial UPS Systems', department: 'Operations', amount: 22000, status: 'APPROVED', createdAt: '2026-06-01' },
  { id: 'REQ-2024-013', title: 'Safety Gear – Site Team', department: 'HSE', amount: 4500, status: 'PENDING_APPROVAL', createdAt: '2026-06-01' },
  { id: 'REQ-2024-014', title: 'Scaffolding Rental – Q3', department: 'Projects', amount: 12000, status: 'DRAFT', createdAt: '2026-05-30' },
];

const SUPPLIERS = [
  { id: 'SUP-MEGA-001', name: 'Mega Components Sdn Bhd', score: 94, shariahStatus: 'ELIGIBLE', deliveryRate: '98%', invoiceAccuracy: '100%', status: 'APPROVED' },
  { id: 'SUP-TECH-001', name: 'TechParts Asia Sdn Bhd', score: 78, shariahStatus: 'ELIGIBLE', deliveryRate: '92%', invoiceAccuracy: '96%', status: 'APPROVED' },
  { id: 'SUP-ELEC-001', name: 'ElectroPower Sdn Bhd', score: 61, shariahStatus: 'PENDING', deliveryRate: '88%', invoiceAccuracy: '91%', status: 'APPROVED' },
  { id: 'SUP-STL-001', name: 'Struktur Steel Bhd', score: 83, shariahStatus: 'ELIGIBLE', deliveryRate: '95%', invoiceAccuracy: '98%', status: 'APPROVED' },
];

const SPEND_BY_CATEGORY = [
  { name: 'Components', value: 79500, color: '#047857' },
  { name: 'Hardware', value: 31500, color: '#3b82f6' },
  { name: 'Services', value: 18500, color: '#8b5cf6' },
  { name: 'Equipment', value: 62000, color: '#f59e0b' },
];

const SPEND_TREND = [
  { month: 'Jan', spend: 28000 },
  { month: 'Feb', spend: 45000 },
  { month: 'Mar', spend: 38000 },
  { month: 'Apr', spend: 72000 },
  { month: 'May', spend: 91000 },
  { month: 'Jun', spend: 125000 },
];

const PO_STATUS_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  DRAFT: { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
  SUBMITTED: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  ACKNOWLEDGED: { bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe' },
  RECEIVED: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  PARTIALLY_RECEIVED: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  BILLED: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  COMPLETED: { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
};

const MATCH_COLOR: Record<string, { bg: string; text: string }> = {
  MATCHED: { bg: '#f0fdf4', text: '#15803d' },
  PENDING: { bg: '#f8fafc', text: '#94a3b8' },
  EXCEPTION: { bg: '#fef2f2', text: '#991b1b' },
};

type Tab = 'purchase-orders' | 'requisitions' | 'suppliers' | 'analytics';

export function ProcurementView({ role, onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('purchase-orders');
  const [search, setSearch] = useState('');
  const [selectedPO, setSelectedPO] = useState<string | null>(null);

  const exceptionPOs = PURCHASE_ORDERS.filter(po => po.matchStatus === 'EXCEPTION');

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#f1f5f9' }}>
      {/* Header */}
      <div className="px-8 py-5" style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ color: '#0f172a' }}>Procurement Hub</h1>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 2 }}>Source-to-contract · Procure-to-pay</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:opacity-80 transition-all"
              style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: 12 }}>
              <Filter size={13} /> Filter
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:opacity-80 transition-all"
              style={{ background: '#047857', color: 'white', fontSize: 12 }}>
              <Plus size={13} /> New Requisition
            </button>
          </div>
        </div>

        {/* Exception alert */}
        {exceptionPOs.length > 0 && (
          <div className="mt-3 flex items-center gap-3 px-4 py-2.5 rounded-xl"
            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <AlertTriangle size={14} color="#ef4444" />
            <p style={{ color: '#991b1b', fontSize: 13 }}>
              <strong>{exceptionPOs.length} invoice match exception{exceptionPOs.length > 1 ? 's' : ''}</strong> — {exceptionPOs.map(p => p.id).join(', ')} require resolution before payment approval.
            </p>
            <button style={{ color: '#ef4444', fontSize: 12, marginLeft: 'auto' }} className="flex items-center gap-1 hover:opacity-80">
              Resolve <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div className="px-8 py-4 grid grid-cols-5 gap-3">
        {[
          { label: 'Open POs', value: PURCHASE_ORDERS.filter(p => !['COMPLETED'].includes(p.status)).length, color: '#3b82f6', icon: ShoppingCart },
          { label: 'Matched', value: PURCHASE_ORDERS.filter(p => p.matchStatus === 'MATCHED').length, color: '#059669', icon: CheckCircle },
          { label: 'Exceptions', value: PURCHASE_ORDERS.filter(p => p.matchStatus === 'EXCEPTION').length, color: '#ef4444', icon: AlertTriangle },
          { label: 'Pending Approval', value: REQUISITIONS.filter(r => r.status === 'PENDING_APPROVAL').length, color: '#f59e0b', icon: Clock },
          { label: 'Approved Suppliers', value: SUPPLIERS.filter(s => s.status === 'APPROVED').length, color: '#8b5cf6', icon: Package },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${k.color}15` }}>
                <Icon size={16} color={k.color} />
              </div>
              <div>
                <p style={{ color: '#0f172a', fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{k.value}</p>
                <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{k.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="px-8">
        <div className="flex gap-0 rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', width: 'fit-content' }}>
          {(['purchase-orders', 'requisitions', 'suppliers', 'analytics'] as Tab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-5 py-3 transition-all hover:opacity-80"
              style={{
                background: activeTab === tab ? '#047857' : 'transparent',
                color: activeTab === tab ? 'white' : '#64748b',
                fontSize: 13,
                fontWeight: activeTab === tab ? 500 : 400,
                borderRight: '1px solid #e2e8f0',
              }}>
              {tab === 'purchase-orders' ? 'Purchase Orders'
                : tab === 'requisitions' ? 'Requisitions'
                  : tab === 'suppliers' ? 'Suppliers'
                    : 'Spend Analytics'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 py-4">
        {/* Purchase Orders Tab */}
        {activeTab === 'purchase-orders' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
              <Search size={14} color="#94a3b8" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search purchase orders..."
                className="flex-1 outline-none" style={{ fontSize: 13, color: '#334155', background: 'transparent' }} />
            </div>

            {PURCHASE_ORDERS.filter(po => po.id.toLowerCase().includes(search.toLowerCase()) || po.supplier.toLowerCase().includes(search.toLowerCase())).map(po => {
              const statusStyle = PO_STATUS_COLOR[po.status] || PO_STATUS_COLOR.DRAFT;
              const matchStyle = MATCH_COLOR[po.matchStatus] || MATCH_COLOR.PENDING;
              const isSelected = selectedPO === po.id;
              return (
                <div key={po.id}>
                  <div
                    className="rounded-xl p-4 cursor-pointer transition-all hover:shadow-sm"
                    style={{ background: 'white', border: `1px solid ${isSelected ? '#047857' : '#e2e8f0'}` }}
                    onClick={() => setSelectedPO(isSelected ? null : po.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#f0fdf4' }}>
                        <Package size={16} color="#059669" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span style={{ color: '#0f172a', fontSize: 14, fontWeight: 500 }}>{po.id}</span>
                          {po.app && (
                            <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#ecfdf5', color: '#047857', fontSize: 10 }}>
                              {po.app}
                            </span>
                          )}
                        </div>
                        <p style={{ color: '#64748b', fontSize: 13 }}>{po.item}</p>
                        <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 1 }}>{po.supplier}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span style={{ color: '#0f172a', fontSize: 15, fontWeight: 600 }}>MYR {po.amount.toLocaleString()}</span>
                        <span className="px-2 py-1 rounded-lg text-xs"
                          style={{ background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}`, fontSize: 11 }}>
                          {po.status.replace('_', ' ')}
                        </span>
                        <span className="px-2 py-1 rounded-lg text-xs"
                          style={{ background: matchStyle.bg, color: matchStyle.text, fontSize: 11 }}>
                          {po.matchStatus === 'MATCHED' ? '✓ 3-way match' : po.matchStatus === 'EXCEPTION' ? '⚠ Exception' : 'Match pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded PO detail – three-way match visualization */}
                  {isSelected && (
                    <div className="rounded-xl p-5 mt-1" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ color: '#0f172a', marginBottom: 16 }}>Three-Way Match Status</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <MatchBox label="Purchase Order" ref_={po.id} status={po.status !== 'DRAFT' ? 'ok' : 'pending'} amount={po.amount} />
                        <MatchBox label="Goods Receipt" ref_={po.status === 'RECEIVED' || po.status === 'PARTIALLY_RECEIVED' ? 'GR-' + po.id.slice(-3) : null} status={po.status === 'RECEIVED' ? 'ok' : po.status === 'PARTIALLY_RECEIVED' ? 'warn' : 'pending'} amount={po.status !== 'DRAFT' ? po.amount : null} />
                        <MatchBox label="Supplier Invoice" ref_={po.matchStatus === 'MATCHED' ? 'INV-' + po.id.slice(-3) : null} status={po.matchStatus === 'MATCHED' ? 'ok' : po.matchStatus === 'EXCEPTION' ? 'error' : 'pending'} amount={po.matchStatus === 'MATCHED' ? po.amount : null} />
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg`}
                          style={{
                            background: po.matchStatus === 'MATCHED' ? '#f0fdf4' : po.matchStatus === 'EXCEPTION' ? '#fef2f2' : '#f8fafc',
                            border: `1px solid ${po.matchStatus === 'MATCHED' ? '#bbf7d0' : po.matchStatus === 'EXCEPTION' ? '#fecaca' : '#e2e8f0'}`
                          }}>
                          {po.matchStatus === 'MATCHED' ? <CheckCircle size={13} color="#10b981" /> : po.matchStatus === 'EXCEPTION' ? <AlertTriangle size={13} color="#ef4444" /> : <Clock size={13} color="#94a3b8" />}
                          <span style={{ fontSize: 12, color: po.matchStatus === 'MATCHED' ? '#15803d' : po.matchStatus === 'EXCEPTION' ? '#991b1b' : '#64748b' }}>
                            {po.matchStatus === 'MATCHED' ? 'Three-way match complete – approved for payment'
                              : po.matchStatus === 'EXCEPTION' ? 'Match exception – quantity or price mismatch detected'
                                : 'Match pending – awaiting receipt or invoice'}
                          </span>
                        </div>
                        {po.app && (
                          <button onClick={() => onNavigate('workspace', { applicationId: po.app! })}
                            className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg hover:opacity-80"
                            style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontSize: 12 }}>
                            View finance workspace <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Requisitions Tab */}
        {activeTab === 'requisitions' && (
          <div className="space-y-3">
            {REQUISITIONS.map(req => (
              <div key={req.id} className="rounded-xl p-4" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#eff6ff' }}>
                    <FileText size={16} color="#3b82f6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span style={{ color: '#0f172a', fontSize: 14, fontWeight: 500 }}>{req.id}</span>
                      <span style={{ color: '#64748b', fontSize: 12 }}>— {req.title}</span>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 1 }}>{req.department} · Created {req.createdAt}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span style={{ color: '#0f172a', fontSize: 14, fontWeight: 600 }}>MYR {req.amount.toLocaleString()}</span>
                    <span className="px-2 py-1 rounded-lg text-xs"
                      style={{
                        background: req.status === 'APPROVED' ? '#f0fdf4' : req.status === 'PENDING_APPROVAL' ? '#fff7ed' : '#f8fafc',
                        color: req.status === 'APPROVED' ? '#15803d' : req.status === 'PENDING_APPROVAL' ? '#c2410c' : '#64748b',
                        border: `1px solid ${req.status === 'APPROVED' ? '#bbf7d0' : req.status === 'PENDING_APPROVAL' ? '#fed7aa' : '#e2e8f0'}`,
                        fontSize: 11,
                      }}>
                      {req.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Suppliers Tab */}
        {activeTab === 'suppliers' && (
          <div className="space-y-3">
            {SUPPLIERS.map(sup => (
              <div key={sup.id} className="rounded-xl p-4" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white"
                    style={{ background: '#047857', fontSize: 13, fontWeight: 600 }}>
                    {sup.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span style={{ color: '#0f172a', fontSize: 14, fontWeight: 500 }}>{sup.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-xs"
                        style={{ background: sup.shariahStatus === 'ELIGIBLE' ? '#f0fdf4' : '#fff7ed', color: sup.shariahStatus === 'ELIGIBLE' ? '#15803d' : '#c2410c', fontSize: 10 }}>
                        Shariah: {sup.shariahStatus}
                      </span>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 1 }}>{sup.id} · Delivery: {sup.deliveryRate} · Invoice accuracy: {sup.invoiceAccuracy}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-20 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
                          <div className="h-full rounded-full" style={{ width: `${sup.score}%`, background: sup.score >= 80 ? '#10b981' : sup.score >= 60 ? '#f59e0b' : '#ef4444' }} />
                        </div>
                        <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 600 }}>{sup.score}</span>
                      </div>
                      <span style={{ color: '#94a3b8', fontSize: 10, marginTop: 1 }}>Performance score</span>
                    </div>
                    <span className="px-2 py-1 rounded-lg" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: 11 }}>
                      {sup.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
              <h3 style={{ color: '#0f172a', marginBottom: 4 }}>Monthly Spend Trend</h3>
              <p style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>Cumulative procurement spend</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={SPEND_TREND}>
                  <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                    formatter={v => [`MYR ${Number(v).toLocaleString()}`, 'Spend']} />
                  <Bar dataKey="spend" fill="#047857" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
              <h3 style={{ color: '#0f172a', marginBottom: 4 }}>Spend by Category</h3>
              <p style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>Current period</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={SPEND_BY_CATEGORY} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={35}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {SPEND_BY_CATEGORY.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                    formatter={v => [`MYR ${Number(v).toLocaleString()}`, 'Spend']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="col-span-2 rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ color: '#0f172a' }}>Maverick Spend Detection</h3>
                <span className="px-2 py-1 rounded-full" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontSize: 11 }}>
                  Auto-monitored (FR-21)
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl mb-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <CheckCircle size={15} color="#10b981" />
                <p style={{ color: '#15803d', fontSize: 13 }}>No maverick spend detected — all purchases are within approved suppliers, catalogs, and approval rules.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl text-center" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <p style={{ color: '#0f172a', fontSize: 20, fontWeight: 700 }}>100%</p>
                  <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Approved supplier compliance</p>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <p style={{ color: '#0f172a', fontSize: 20, fontWeight: 700 }}>0</p>
                  <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Out-of-policy purchases</p>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <p style={{ color: '#0f172a', fontSize: 20, fontWeight: 700 }}>MYR 0</p>
                  <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Unapproved spend flagged</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MatchBox({ label, ref_, status, amount }: { label: string; ref_: string | null; status: 'ok' | 'warn' | 'error' | 'pending'; amount: number | null }) {
  const colors = { ok: { bg: '#f0fdf4', border: '#bbf7d0', icon: '#10b981' }, warn: { bg: '#fff7ed', border: '#fed7aa', icon: '#f59e0b' }, error: { bg: '#fef2f2', border: '#fecaca', icon: '#ef4444' }, pending: { bg: '#f8fafc', border: '#e2e8f0', icon: '#94a3b8' } };
  const c = colors[status];
  return (
    <div className="p-3 rounded-xl text-center" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="flex justify-center mb-2">
        {status === 'ok' ? <CheckCircle size={20} color={c.icon} /> : status === 'error' ? <XCircle size={20} color={c.icon} /> : status === 'warn' ? <AlertTriangle size={20} color={c.icon} /> : <Clock size={20} color={c.icon} />}
      </div>
      <p style={{ color: '#334155', fontSize: 12, fontWeight: 500 }}>{label}</p>
      {ref_ && <p style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{ref_}</p>}
      {amount && <p style={{ color: '#0f172a', fontSize: 13, fontWeight: 600, marginTop: 4 }}>MYR {amount.toLocaleString()}</p>}
      {!ref_ && status === 'pending' && <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Awaiting...</p>}
    </div>
  );
}
