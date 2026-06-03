import { useState } from 'react';
import {
  BarChart2, Plus, TrendingUp, TrendingDown, DollarSign, CheckCircle,
  AlertTriangle, FileText, Download, RefreshCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, BarChart, Bar, Cell } from 'recharts';
import type { RoleEntry } from './Sidebar';

interface Props { role: RoleEntry; applicationId: string; }

const LEDGER_ENTRIES = [
  { id: 'LE-001', type: 'CAPITAL', amount: 125000, description: 'Capital disbursed by Amanah Islamic Bank', occurredAt: '2026-05-25', erpStatus: 'SYNCED', evidence: 'DISB-2024-001' },
  { id: 'LE-002', type: 'COST', amount: -48000, description: 'PO-2024-001: Solar panels batch 1 – Mega Components', occurredAt: '2026-05-28', erpStatus: 'SYNCED', evidence: 'PO-2024-001' },
  { id: 'LE-003', type: 'COST', amount: -31500, description: 'PO-2024-002: Mounting hardware & fasteners', occurredAt: '2026-06-05', erpStatus: 'SYNCED', evidence: 'PO-2024-002' },
  { id: 'LE-004', type: 'REVENUE', amount: 180000, description: 'SolarTech Industries – milestone 1 payment', occurredAt: '2026-06-10', erpStatus: 'SYNCED', evidence: 'INV-2024-007' },
  { id: 'LE-005', type: 'EXPENSE', amount: -3200, description: 'Transport & logistics – approved expense', occurredAt: '2026-06-08', erpStatus: 'PENDING', evidence: null },
];

const BALANCE_OVER_TIME = [
  { date: 'May 25', balance: 125000, revenue: 0 },
  { date: 'May 28', balance: 77000, revenue: 0 },
  { date: 'Jun 5', balance: 45500, revenue: 0 },
  { date: 'Jun 8', balance: 42300, revenue: 0 },
  { date: 'Jun 10', balance: 222300, revenue: 180000 },
];

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string; sign: string }> = {
  CAPITAL: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', sign: '+' },
  REVENUE: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', sign: '+' },
  COST: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', sign: '' },
  EXPENSE: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', sign: '' },
};

export function LedgerView({ role, applicationId }: Props) {
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({ type: 'REVENUE', amount: '', description: '', occurredAt: '' });
  const [entries, setEntries] = useState(LEDGER_ENTRIES);

  const totalRevenue = entries.filter(e => e.type === 'REVENUE').reduce((s, e) => s + e.amount, 0);
  const totalCosts = Math.abs(entries.filter(e => e.type === 'COST').reduce((s, e) => s + e.amount, 0));
  const totalExpenses = Math.abs(entries.filter(e => e.type === 'EXPENSE').reduce((s, e) => s + e.amount, 0));
  const totalCapital = entries.filter(e => e.type === 'CAPITAL').reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalCosts - totalExpenses;
  const capitalProviderRatio = 0.60;
  const entrepreneurRatio = 0.40;
  const rabbShare = netProfit > 0 ? netProfit * capitalProviderRatio : 0;
  const mudaribShare = netProfit > 0 ? netProfit * entrepreneurRatio : 0;
  const pendingERP = entries.filter(e => e.erpStatus === 'PENDING').length;

  const canAddEntry = ['finance-accountant', 'sme-admin'].includes(role.id);

  const handleAddEntry = () => {
    if (!newEntry.amount || !newEntry.description || !newEntry.occurredAt) return;
    const amount = newEntry.type === 'COST' || newEntry.type === 'EXPENSE' ? -Math.abs(parseFloat(newEntry.amount)) : parseFloat(newEntry.amount);
    setEntries(prev => [...prev, {
      id: `LE-${String(prev.length + 1).padStart(3, '0')}`,
      type: newEntry.type,
      amount,
      description: newEntry.description,
      occurredAt: newEntry.occurredAt,
      erpStatus: 'PENDING',
      evidence: null,
    }]);
    setNewEntry({ type: 'REVENUE', amount: '', description: '', occurredAt: '' });
    setShowAddEntry(false);
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#f1f5f9' }}>
      {/* Header */}
      <div className="px-8 py-5" style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ color: '#0f172a' }}>Project Ledger & P/L</h1>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 2 }}>{applicationId} · Solar Panel Component Supply</p>
          </div>
          <div className="flex items-center gap-2">
            {pendingERP > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                <RefreshCw size={13} color="#f59e0b" />
                <span style={{ color: '#c2410c', fontSize: 12 }}>{pendingERP} entries pending ERP sync</span>
              </div>
            )}
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:opacity-80 transition-all"
              style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: 12 }}>
              <Download size={13} /> Export
            </button>
            {canAddEntry && (
              <button onClick={() => setShowAddEntry(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:opacity-80 transition-all"
                style={{ background: '#047857', color: 'white', fontSize: 12 }}>
                <Plus size={13} /> Record Entry
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 py-6 grid grid-cols-3 gap-6">
        {/* Left: Ledger entries */}
        <div className="col-span-2 space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Capital Deployed', value: totalCapital, color: '#3b82f6', icon: DollarSign, sign: '+' },
              { label: 'Total Revenue', value: totalRevenue, color: '#059669', icon: TrendingUp, sign: '+' },
              { label: 'Total Costs', value: totalCosts + totalExpenses, color: '#ef4444', icon: TrendingDown, sign: '-' },
              { label: 'Net Profit', value: netProfit, color: netProfit >= 0 ? '#047857' : '#ef4444', icon: BarChart2, sign: netProfit >= 0 ? '+' : '-' },
            ].map((k, i) => {
              const Icon = k.icon;
              return (
                <div key={i} className="rounded-xl p-4" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${k.color}15` }}>
                      <Icon size={15} color={k.color} />
                    </div>
                  </div>
                  <p style={{ color: k.color, fontSize: 16, fontWeight: 700 }}>{k.sign} MYR {Math.abs(k.value).toLocaleString()}</p>
                  <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{k.label}</p>
                </div>
              );
            })}
          </div>

          {/* Balance chart */}
          <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
            <h3 style={{ color: '#0f172a', marginBottom: 4 }}>Running Balance</h3>
            <p style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>Capital remaining + revenue collected</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={BALANCE_OVER_TIME}>
                <defs>
                  <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#047857" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#047857" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis key="x-axis" dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis key="y-axis" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip key="tooltip" contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: any) => [`MYR ${Number(v).toLocaleString()}`, 'Balance']} />
                <ReferenceLine key="ref-capital" y={125000} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: 'Capital ceiling', fill: '#3b82f6', fontSize: 10, position: 'right' }} />
                <Area key="area-balance" name="Balance" type="monotone" dataKey="balance" stroke="#047857" fill="url(#balGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Ledger entries table */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
            <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <FileText size={15} color="#047857" />
              <h3 style={{ color: '#0f172a' }}>Ledger Entries</h3>
              <span className="ml-2 px-2 py-0.5 rounded-full" style={{ background: '#f0fdf4', color: '#047857', fontSize: 11 }}>{entries.length} entries</span>
            </div>
            <div className="divide-y" style={{ borderColor: '#f1f5f9' }}>
              {entries.map(entry => {
                const typeStyle = TYPE_COLORS[entry.type] || TYPE_COLORS.CAPITAL;
                return (
                  <div key={entry.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                    <span className="px-2 py-0.5 rounded text-xs shrink-0"
                      style={{ background: typeStyle.bg, color: typeStyle.text, border: `1px solid ${typeStyle.border}`, fontSize: 10 }}>
                      {entry.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p style={{ color: '#334155', fontSize: 13 }} className="truncate">{entry.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>{entry.occurredAt}</span>
                        {entry.evidence && (
                          <span className="flex items-center gap-1" style={{ color: '#10b981', fontSize: 10 }}>
                            <CheckCircle size={9} />{entry.evidence}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded" style={{
                          background: entry.erpStatus === 'SYNCED' ? '#f0fdf4' : '#fff7ed',
                          color: entry.erpStatus === 'SYNCED' ? '#15803d' : '#c2410c',
                          fontSize: 9,
                        }}>ERP: {entry.erpStatus}</span>
                      </div>
                    </div>
                    <span style={{ color: entry.amount >= 0 ? '#059669' : '#ef4444', fontSize: 14, fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {entry.amount >= 0 ? '+' : ''}MYR {entry.amount.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Add entry form */}
            {showAddEntry && canAddEntry && (
              <div className="p-5" style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                <h4 style={{ color: '#0f172a', marginBottom: 12, fontSize: 14 }}>Record New Ledger Entry</h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label style={{ color: '#64748b', fontSize: 11 }}>Entry Type</label>
                    <select value={newEntry.type} onChange={e => setNewEntry(p => ({ ...p, type: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg" style={{ border: '1px solid #e2e8f0', fontSize: 13 }}>
                      <option value="REVENUE">Revenue</option>
                      <option value="COST">Cost (procurement)</option>
                      <option value="EXPENSE">Allowed Expense</option>
                      <option value="CAPITAL">Capital</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ color: '#64748b', fontSize: 11 }}>Amount (MYR)</label>
                    <input type="number" value={newEntry.amount} onChange={e => setNewEntry(p => ({ ...p, amount: e.target.value }))}
                      placeholder="e.g. 50000" className="w-full mt-1 px-3 py-2 rounded-lg" style={{ border: '1px solid #e2e8f0', fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ color: '#64748b', fontSize: 11 }}>Description</label>
                    <input type="text" value={newEntry.description} onChange={e => setNewEntry(p => ({ ...p, description: e.target.value }))}
                      placeholder="Buyer payment, supplier cost..." className="w-full mt-1 px-3 py-2 rounded-lg" style={{ border: '1px solid #e2e8f0', fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ color: '#64748b', fontSize: 11 }}>Date</label>
                    <input type="date" value={newEntry.occurredAt} onChange={e => setNewEntry(p => ({ ...p, occurredAt: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg" style={{ border: '1px solid #e2e8f0', fontSize: 13 }} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddEntry} className="px-4 py-2 rounded-lg hover:opacity-80 transition-all"
                    style={{ background: '#047857', color: 'white', fontSize: 13 }}>
                    Record Entry
                  </button>
                  <button onClick={() => setShowAddEntry(false)} className="px-4 py-2 rounded-lg hover:opacity-80 transition-all"
                    style={{ background: '#f1f5f9', color: '#475569', fontSize: 13 }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live P/L + distribution – DELIGHTER D4 */}
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #f1f5f9', background: '#f0fdf4' }}>
              <div className="flex items-center gap-2">
                <TrendingUp size={15} color="#047857" />
                <h3 style={{ color: '#047857' }}>Live P/L Statement</h3>
                <span className="ml-auto px-1.5 py-0.5 rounded text-xs" style={{ background: '#dcfce7', color: '#15803d', fontSize: 10 }}>
                  Auto-calculated
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>Updates as entries are recorded</p>
            </div>
            <div className="p-5 space-y-3">
              <PLLine label="Revenue collected" value={totalRevenue} color="#059669" />
              <PLLine label="Less: Procurement costs" value={-totalCosts} color="#ef4444" />
              <PLLine label="Less: Allowable expenses" value={-totalExpenses} color="#f59e0b" />
              <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 12, marginTop: 4 }}>
                <div className="flex items-center justify-between">
                  <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 600 }}>Net Profit</span>
                  <span style={{ color: netProfit >= 0 ? '#047857' : '#ef4444', fontSize: 18, fontWeight: 700 }}>
                    {netProfit >= 0 ? '+' : ''}MYR {netProfit.toLocaleString()}
                  </span>
                </div>
              </div>

              {netProfit > 0 ? (
                <div className="mt-2 p-4 rounded-xl space-y-2" style={{ background: '#f0fdf4', border: '1px solid #a7f3d0' }}>
                  <p style={{ color: '#64748b', fontSize: 11, marginBottom: 8 }}>Expected Distribution (60/40 ratio)</p>
                  <div className="space-y-2">
                    <DistRow label="Rabb-ul-Mal (60%)" value={rabbShare} color="#0ea5e9" party="Amanah Islamic Bank" />
                    <DistRow label="Mudarib (40%)" value={mudaribShare} color="#8b5cf6" party="TechBuild Sdn Bhd" />
                  </div>
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid #a7f3d0' }}>
                    <p style={{ color: '#047857', fontSize: 11 }}>
                      ✓ No guaranteed fixed return detected — Shariah FR-38 compliant
                    </p>
                  </div>
                </div>
              ) : netProfit < 0 ? (
                <div className="mt-2 p-3 rounded-xl" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} color="#ef4444" />
                    <p style={{ color: '#991b1b', fontSize: 12 }}>Loss scenario — exception review required</p>
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>
                    Genuine loss is borne by Rabb-ul-Mal unless negligence or breach is found.
                  </p>
                </div>
              ) : (
                <div className="mt-2 p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <p style={{ color: '#94a3b8', fontSize: 12 }}>Add revenue entries to see distribution preview</p>
                </div>
              )}
            </div>
          </div>

          {/* ERP Reconciliation Status */}
          <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
            <h3 style={{ color: '#0f172a', marginBottom: 12 }}>ERP Reconciliation</h3>
            <div className="space-y-2">
              {entries.map(entry => (
                <div key={entry.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: entry.erpStatus === 'SYNCED' ? '#10b981' : '#f59e0b' }} />
                  <span style={{ color: '#64748b', fontSize: 11, flex: 1 }} className="truncate">{entry.id}</span>
                  <span className="px-1.5 py-0.5 rounded text-xs"
                    style={{ background: entry.erpStatus === 'SYNCED' ? '#f0fdf4' : '#fff7ed', color: entry.erpStatus === 'SYNCED' ? '#15803d' : '#c2410c', fontSize: 9 }}>
                    {entry.erpStatus}
                  </span>
                </div>
              ))}
            </div>
            {pendingERP > 0 && (
              <button className="w-full mt-3 px-3 py-2 rounded-lg hover:opacity-80 transition-all flex items-center justify-center gap-2"
                style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', fontSize: 12 }}>
                <RefreshCw size={12} /> Sync {pendingERP} pending entries
              </button>
            )}
          </div>

          {/* Data lineage – DR-07 */}
          <div className="rounded-xl p-4" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
            <p style={{ color: '#10b981', fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Evidence Lineage (DR-07)</p>
            <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 8 }}>P/L calculation is traceable to:</p>
            <div className="space-y-1.5">
              {['PO-2024-001 (cost evidence)', 'PO-2024-002 (cost evidence)', 'INV-2024-007 (revenue evidence)', 'DISB-2024-001 (capital record)'].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle size={11} color="#10b981" />
                  <span style={{ color: '#64748b', fontSize: 10 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PLLine({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: '#64748b', fontSize: 13 }}>{label}</span>
      <span style={{ color, fontSize: 13, fontWeight: 500 }}>
        {value >= 0 ? '+' : ''}MYR {Math.abs(value).toLocaleString()}
      </span>
    </div>
  );
}

function DistRow({ label, value, color, party }: { label: string; value: number; color: string; party: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p style={{ color: '#334155', fontSize: 12 }}>{label}</p>
        <p style={{ color: '#94a3b8', fontSize: 10 }}>{party}</p>
      </div>
      <span style={{ color, fontSize: 14, fontWeight: 700 }}>MYR {value.toLocaleString()}</span>
    </div>
  );
}
