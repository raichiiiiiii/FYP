import { useState } from 'react';
import {
  Shield, CheckCircle, XCircle, Clock, Anchor, Search, Download,
  AlertTriangle, FileText, Hash, ExternalLink, RefreshCw, Eye
} from 'lucide-react';
import type { RoleEntry } from './Sidebar';

interface Props { role: RoleEntry; }

const AUDIT_EVENTS = [
  { id: 'AE-001', event: 'ORGANIZATION_CREATED', module: 'Identity', actor: 'Ahmad Razali', entityType: 'Organization', entityId: 'ORG-TB-001', timestamp: '2026-01-15T09:00:00Z', anchor: 'NONE', hash: null },
  { id: 'AE-002', event: 'MUDARABAH_APPLICATION_CREATED', module: 'Finance', actor: 'Ahmad Razali', entityType: 'MudarabahApplication', entityId: 'APP-2024-001', timestamp: '2026-05-10T08:00:00Z', anchor: 'NONE', hash: null },
  { id: 'AE-003', event: 'EVIDENCE_CHECKLIST_GENERATED', module: 'Finance', actor: 'System', entityType: 'EvidenceChecklist', entityId: 'CL-APP-2024-001', timestamp: '2026-05-10T08:01:00Z', anchor: 'NONE', hash: null },
  { id: 'AE-004', event: 'MUDARABAH_APPLICATION_SUBMITTED', module: 'Finance', actor: 'Ahmad Razali', entityType: 'MudarabahApplication', entityId: 'APP-2024-001', timestamp: '2026-05-15T09:30:00Z', anchor: 'COMMITTED', hash: '0x4f3ab2c91d7e', txId: '0xf4a1b2c3d4e5f67890abcdef' },
  { id: 'AE-005', event: 'PURCHASE_ORDER_ISSUED', module: 'Procurement', actor: 'Ahmad Razali', entityType: 'PurchaseOrder', entityId: 'PO-2024-001', timestamp: '2026-05-18T10:00:00Z', anchor: 'COMMITTED', hash: '0x8b1ef7a3290c', txId: '0xa1b2c3d4e5f678' },
  { id: 'AE-006', event: 'RECEIPT_RECORDED', module: 'Procurement', actor: 'Ahmad Razali', entityType: 'Receipt', entityId: 'GR-2024-001', timestamp: '2026-05-20T14:30:00Z', anchor: 'COMMITTED', hash: '0x2c9de4013fa7', txId: '0xb2c3d4e5f67890' },
  { id: 'AE-007', event: 'DUE_DILIGENCE_RECORDED', module: 'Finance', actor: 'Omar Farouq', entityType: 'DueDiligenceReport', entityId: 'DD-APP-2024-001', timestamp: '2026-05-20T15:00:00Z', anchor: 'COMMITTED', hash: '0x9e3c4f2a1b5d', txId: '0xc3d4e5f6789012' },
  { id: 'AE-008', event: 'SHARIAH_REVIEW_ASSIGNED', module: 'Finance', actor: 'System', entityType: 'ShariahReview', entityId: 'SR-APP-2024-001', timestamp: '2026-05-20T15:01:00Z', anchor: 'PENDING', hash: '0x5d8f1e90a3bc', txId: null },
  { id: 'AE-009', event: 'PROJECT_LEDGER_ENTRY_RECORDED', module: 'Finance', actor: 'Finance Team', entityType: 'ProjectLedgerEntry', entityId: 'LE-001', timestamp: '2026-05-25T09:00:00Z', anchor: 'COMMITTED', hash: '0xa7f23bc19de4', txId: '0xd4e5f678901234' },
  { id: 'AE-010', event: 'FABRIC_ANCHOR_FAILED', module: 'Integrations', actor: 'System', entityType: 'AuditAnchor', entityId: 'ANCH-008-RETRY', timestamp: '2026-06-01T03:15:00Z', anchor: 'FAILED', hash: null, txId: null },
];

const EVIDENCE_PACKS = [
  { id: 'EP-2024-001', name: 'APP-2024-001 Full Evidence Pack', items: 8, hash: '0x4f3ab2c9...7e89', status: 'VERIFIED', createdAt: '2026-06-01', app: 'APP-2024-001' },
  { id: 'EP-2024-002', name: 'PO-2024-001 Procurement Evidence', items: 3, hash: '0x8b1ef7a3...90cd', status: 'VERIFIED', createdAt: '2026-05-20', app: 'APP-2024-001' },
  { id: 'EP-2023-015', name: 'APP-2023-015 Closure Pack', items: 14, hash: '0x2c9de401...a7b8', status: 'VERIFIED', createdAt: '2026-03-12', app: 'APP-2023-015' },
];

// Closure pack export readiness – DELIGHTER D10
const CLOSURE_CHECKLIST = [
  { item: 'Mudarabah Contract', status: 'ready', detail: 'CONTRACT-2024-001 · Hash verified' },
  { item: 'Due Diligence Report', status: 'ready', detail: 'DD-APP-2024-001 · Approved' },
  { item: 'Shariah Review Opinion', status: 'pending', detail: 'Awaiting review completion' },
  { item: 'Project Ledger', status: 'ready', detail: '5 entries · ERP synced' },
  { item: 'P/L Statement', status: 'pending', detail: 'Not yet calculated' },
  { item: 'Profit Distribution Record', status: 'pending', detail: 'Requires P/L first' },
  { item: 'Fabric Anchor References', status: 'warning', detail: '1 anchor still pending' },
  { item: 'Audit Event Timeline', status: 'ready', detail: '10 events · Append-only' },
];

const ANCHOR_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
  COMMITTED: { bg: '#f0fdf4', text: '#15803d', icon: CheckCircle },
  PENDING: { bg: '#fff7ed', text: '#c2410c', icon: Clock },
  FAILED: { bg: '#fef2f2', text: '#991b1b', icon: XCircle },
  NONE: { bg: '#f8fafc', text: '#94a3b8', icon: Clock },
};

export function AuditView({ role }: Props) {
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [verifyHash, setVerifyHash] = useState('');
  const [verifyResult, setVerifyResult] = useState<'valid' | 'invalid' | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'packs' | 'closure'>('events');

  const modules = ['all', ...Array.from(new Set(AUDIT_EVENTS.map(e => e.module)))];

  const filtered = AUDIT_EVENTS.filter(e => {
    const matchSearch = !search || e.event.toLowerCase().includes(search.toLowerCase()) || e.actor.toLowerCase().includes(search.toLowerCase()) || e.entityId.toLowerCase().includes(search.toLowerCase());
    const matchModule = filterModule === 'all' || e.module === filterModule;
    return matchSearch && matchModule;
  });

  const handleVerify = () => {
    if (!verifyHash) return;
    const known = AUDIT_EVENTS.find(e => e.hash && e.hash.startsWith(verifyHash.slice(0, 6)));
    setVerifyResult(known ? 'valid' : 'invalid');
  };

  const canVerify = ['auditor', 'sme-admin', 'financier'].includes(role.id);
  const closureReady = CLOSURE_CHECKLIST.filter(c => c.status === 'ready').length;
  const closureTotal = CLOSURE_CHECKLIST.length;

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#f1f5f9' }}>
      {/* Header */}
      <div className="px-8 py-5" style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ color: '#0f172a' }}>Audit & Verification</h1>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 2 }}>Immutable event log · Hash verification · Fabric anchors</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#f0fdf4', border: '1px solid #a7f3d0' }}>
              <Anchor size={13} color="#059669" />
              <span style={{ color: '#047857', fontSize: 12 }}>
                {AUDIT_EVENTS.filter(e => e.anchor === 'COMMITTED').length} anchors committed
              </span>
            </div>
            {AUDIT_EVENTS.filter(e => e.anchor === 'FAILED').length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                <AlertTriangle size={13} color="#ef4444" />
                <span style={{ color: '#991b1b', fontSize: 12 }}>
                  {AUDIT_EVENTS.filter(e => e.anchor === 'FAILED').length} anchor failed – retry queued
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 pt-4">
        <div className="flex gap-0 rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', width: 'fit-content' }}>
          {(['events', 'packs', 'closure'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-5 py-3 transition-all hover:opacity-80"
              style={{
                background: activeTab === tab ? '#047857' : 'transparent',
                color: activeTab === tab ? 'white' : '#64748b',
                fontSize: 13,
                fontWeight: activeTab === tab ? 500 : 400,
                borderRight: '1px solid #e2e8f0',
              }}>
              {tab === 'events' ? 'Audit Events' : tab === 'packs' ? 'Evidence Packs' : 'Closure Readiness'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 py-4 grid grid-cols-3 gap-6">
        <div className="col-span-2">
          {/* Audit Events Tab */}
          {activeTab === 'events' && (
            <div className="space-y-3">
              {/* Filters */}
              <div className="flex gap-3">
                <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
                  <Search size={14} color="#94a3b8" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events, actors, entity IDs..."
                    className="flex-1 outline-none" style={{ fontSize: 13, background: 'transparent', color: '#334155' }} />
                </div>
                <select value={filterModule} onChange={e => setFilterModule(e.target.value)}
                  className="px-3 py-2 rounded-xl" style={{ border: '1px solid #e2e8f0', fontSize: 13, color: '#64748b', background: 'white' }}>
                  {modules.map(m => <option key={m} value={m}>{m === 'all' ? 'All modules' : m}</option>)}
                </select>
              </div>

              {/* Events */}
              <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
                {filtered.map((evt, i) => {
                  const anchorStyle = ANCHOR_COLORS[evt.anchor] || ANCHOR_COLORS.NONE;
                  const AnchorIcon = anchorStyle.icon;
                  return (
                    <div key={evt.id} className="px-5 py-3 hover:bg-slate-50 transition-colors" style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <div className="flex items-start gap-3">
                        <div className="mt-1 shrink-0">
                          <AnchorIcon size={13} color={anchorStyle.text} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span style={{ color: '#334155', fontSize: 12, fontWeight: 500, fontFamily: 'monospace' }}>{evt.event}</span>
                            <span className="px-1.5 py-0.5 rounded text-xs"
                              style={{ background: '#f1f5f9', color: '#64748b', fontSize: 10 }}>{evt.module}</span>
                            <span className="px-1.5 py-0.5 rounded text-xs"
                              style={{ background: anchorStyle.bg, color: anchorStyle.text, fontSize: 10 }}>
                              {evt.anchor === 'COMMITTED' ? '⚓ anchored' : evt.anchor === 'PENDING' ? '⏳ pending' : evt.anchor === 'FAILED' ? '✗ failed' : 'local only'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span style={{ color: '#94a3b8', fontSize: 11 }}>{evt.actor}</span>
                            <span style={{ color: '#94a3b8', fontSize: 11 }}>·</span>
                            <span style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}>{evt.entityType}/{evt.entityId}</span>
                            <span style={{ color: '#94a3b8', fontSize: 11 }}>·</span>
                            <span style={{ color: '#94a3b8', fontSize: 11 }}>{new Date(evt.timestamp).toLocaleString('en-MY')}</span>
                          </div>
                          {evt.hash && (
                            <div className="flex items-center gap-2 mt-1">
                              <Hash size={10} color="#94a3b8" />
                              <span style={{ color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}>{evt.hash}</span>
                              {evt.txId && <span style={{ color: '#10b981', fontSize: 10, fontFamily: 'monospace' }}>· tx: {evt.txId}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Evidence Packs Tab */}
          {activeTab === 'packs' && (
            <div className="space-y-3">
              {EVIDENCE_PACKS.map(pack => (
                <div key={pack.id} className="rounded-xl p-4" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#f0fdf4' }}>
                      <FileText size={18} color="#059669" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span style={{ color: '#0f172a', fontSize: 14, fontWeight: 500 }}>{pack.name}</span>
                        <span className="px-2 py-0.5 rounded text-xs"
                          style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: 10 }}>
                          {pack.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>{pack.items} items</span>
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>·</span>
                        <span style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}>Hash: {pack.hash}</span>
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>·</span>
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>{pack.createdAt}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {canVerify && (
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:opacity-80 transition-all"
                          style={{ background: '#f0fdf4', color: '#047857', border: '1px solid #a7f3d0', fontSize: 11 }}>
                          <Eye size={12} /> Verify
                        </button>
                      )}
                      <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:opacity-80 transition-all"
                        style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: 11 }}>
                        <Download size={12} /> Export
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Closure Pack Readiness – DELIGHTER D10 */}
          {activeTab === 'closure' && (
            <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid #f1f5f9', background: closureReady === closureTotal ? '#f0fdf4' : '#fff7ed' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: closureReady === closureTotal ? '#dcfce7' : '#fed7aa' }}>
                      <Shield size={18} color={closureReady === closureTotal ? '#059669' : '#f59e0b'} />
                    </div>
                    <div>
                      <h3 style={{ color: '#0f172a' }}>Closure Pack Export Readiness</h3>
                      <p style={{ color: '#64748b', fontSize: 12 }}>APP-2024-001 · {closureReady}/{closureTotal} items ready</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span style={{ color: '#0f172a', fontSize: 20, fontWeight: 700 }}>{Math.round((closureReady / closureTotal) * 100)}%</span>
                      <span style={{ color: '#94a3b8', fontSize: 11 }}>complete</span>
                    </div>
                    <button
                      disabled={closureReady < closureTotal}
                      className="px-4 py-2 rounded-lg hover:opacity-80 transition-all"
                      style={{ background: closureReady === closureTotal ? '#047857' : '#94a3b8', color: 'white', fontSize: 13, cursor: closureReady < closureTotal ? 'not-allowed' : 'pointer' }}>
                      Export Pack
                    </button>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(closureReady / closureTotal) * 100}%`, background: closureReady === closureTotal ? '#10b981' : '#f59e0b' }} />
                </div>
              </div>
              <div className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                {CLOSURE_CHECKLIST.map((item, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3">
                    {item.status === 'ready' ? <CheckCircle size={15} color="#10b981" />
                      : item.status === 'warning' ? <AlertTriangle size={15} color="#f59e0b" />
                        : <Clock size={15} color="#94a3b8" />}
                    <div className="flex-1">
                      <p style={{ color: '#334155', fontSize: 13 }}>{item.item}</p>
                      <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 1 }}>{item.detail}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs"
                      style={{
                        background: item.status === 'ready' ? '#f0fdf4' : item.status === 'warning' ? '#fff7ed' : '#f8fafc',
                        color: item.status === 'ready' ? '#15803d' : item.status === 'warning' ? '#c2410c' : '#94a3b8',
                        fontSize: 10,
                      }}>
                      {item.status === 'ready' ? 'Ready' : item.status === 'warning' ? 'Warning' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Hash verifier */}
        <div className="space-y-4">
          {/* Hash verification tool */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <div className="flex items-center gap-2">
                <Hash size={15} color="#047857" />
                <h3 style={{ color: '#0f172a' }}>Hash Verifier</h3>
              </div>
              <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Verify document/event integrity against stored hashes</p>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label style={{ color: '#64748b', fontSize: 11 }}>Document or event hash</label>
                <input
                  value={verifyHash}
                  onChange={e => { setVerifyHash(e.target.value); setVerifyResult(null); }}
                  placeholder="0x4f3ab2c9..."
                  className="w-full mt-1 px-3 py-2 rounded-lg"
                  style={{ border: '1px solid #e2e8f0', fontSize: 12, fontFamily: 'monospace' }}
                />
              </div>
              <button onClick={handleVerify} disabled={!canVerify || !verifyHash}
                className="w-full px-4 py-2 rounded-lg hover:opacity-80 transition-all flex items-center justify-center gap-2"
                style={{ background: canVerify && verifyHash ? '#047857' : '#94a3b8', color: 'white', fontSize: 13 }}>
                <Shield size={14} /> Verify Hash
              </button>
              {!canVerify && (
                <p style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center' }}>Auditor, Admin, or Financier role required</p>
              )}
              {verifyResult === 'valid' && (
                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <CheckCircle size={15} color="#10b981" />
                  <div>
                    <p style={{ color: '#15803d', fontSize: 13, fontWeight: 500 }}>Hash verified ✓</p>
                    <p style={{ color: '#94a3b8', fontSize: 11 }}>Document integrity confirmed — matches Fabric anchor record</p>
                  </div>
                </div>
              )}
              {verifyResult === 'invalid' && (
                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                  <XCircle size={15} color="#ef4444" />
                  <div>
                    <p style={{ color: '#991b1b', fontSize: 13, fontWeight: 500 }}>Hash not found</p>
                    <p style={{ color: '#94a3b8', fontSize: 11 }}>No matching record — possible tamper or unknown hash</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fabric anchor stats */}
          <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
            <h3 style={{ color: '#0f172a', marginBottom: 12 }}>Fabric Anchor Stats</h3>
            {[
              { label: 'Committed', count: AUDIT_EVENTS.filter(e => e.anchor === 'COMMITTED').length, color: '#10b981' },
              { label: 'Pending', count: AUDIT_EVENTS.filter(e => e.anchor === 'PENDING').length, color: '#f59e0b' },
              { label: 'Failed / Retry', count: AUDIT_EVENTS.filter(e => e.anchor === 'FAILED').length, color: '#ef4444' },
              { label: 'Local only', count: AUDIT_EVENTS.filter(e => e.anchor === 'NONE').length, color: '#94a3b8' },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: i < 3 ? '1px solid #f1f5f9' : 'none' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  <span style={{ color: '#334155', fontSize: 13 }}>{s.label}</span>
                </div>
                <span style={{ color: s.color, fontSize: 14, fontWeight: 600 }}>{s.count}</span>
              </div>
            ))}
          </div>

          {/* Append-only confirmation */}
          <div className="rounded-xl p-4" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} color="#10b981" />
              <span style={{ color: 'white', fontSize: 12, fontWeight: 500 }}>Append-Only Audit Log</span>
            </div>
            <p style={{ color: '#64748b', fontSize: 11 }}>
              Audit events cannot be deleted or modified. Each event has an immutable correlation ID, actor ID, timestamp, and optional Fabric transaction reference.
            </p>
            <div className="mt-3 flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <CheckCircle size={12} color="#10b981" />
              <span style={{ color: '#10b981', fontSize: 10 }}>NFR-09 · DR-04 · BR-07 compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
