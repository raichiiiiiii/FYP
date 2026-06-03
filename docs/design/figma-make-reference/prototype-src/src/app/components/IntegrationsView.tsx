import { useState } from 'react';
import {
  Zap, RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock,
  Database, Shield, FileSignature, CreditCard, Globe, ChevronDown,
  ChevronRight, Copy, ExternalLink, AlertOctagon, RotateCcw, Key
} from 'lucide-react';
import type { RoleEntry, ViewId } from './Sidebar';

interface Props {
  role: RoleEntry;
  onNavigate: (view: ViewId) => void;
}

type OutboxStatus = 'COMPLETED' | 'PROCESSING' | 'PENDING' | 'FAILED' | 'RETRYING' | 'DEAD_LETTERED';

interface OutboxEvent {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  status: OutboxStatus;
  attempts: number;
  nextRunAt: string | null;
  lastError: string | null;
  idempotencyKey: string;
  createdAt: string;
  adapter: string;
}

const OUTBOX: OutboxEvent[] = [
  {
    id: 'OBX-001', eventType: 'DISBURSEMENT_RECORDED', entityType: 'Disbursement', entityId: 'DSB-002',
    status: 'COMPLETED', attempts: 1, nextRunAt: null, lastError: null,
    idempotencyKey: 'dsb-002-finance-api-v1', createdAt: '2026-06-02 09:14', adapter: 'Finance API',
  },
  {
    id: 'OBX-002', eventType: 'ESIGNATURE_PACKAGE_REQUESTED', entityType: 'MudarabahContract', entityId: 'CTR-003',
    status: 'RETRYING', attempts: 3, nextRunAt: '2026-06-02 10:45', lastError: 'DocuSign webhook timeout 504',
    idempotencyKey: 'ctr-003-esign-pkg-v1', createdAt: '2026-06-02 09:30', adapter: 'E-Signature',
  },
  {
    id: 'OBX-003', eventType: 'ERP_SYNC_REQUESTED', entityType: 'PurchaseOrder', entityId: 'PO-2024-019',
    status: 'PENDING', attempts: 0, nextRunAt: '2026-06-02 10:00', lastError: null,
    idempotencyKey: 'po-019-erp-sync-v1', createdAt: '2026-06-02 09:55', adapter: 'ERP (SAP)',
  },
  {
    id: 'OBX-004', eventType: 'FABRIC_ANCHOR_SUBMITTED', entityType: 'EvidencePack', entityId: 'EVP-007',
    status: 'RETRYING', attempts: 2, nextRunAt: '2026-06-02 10:30', lastError: 'Network congestion — Fabric gateway timeout',
    idempotencyKey: 'evp-007-fabric-anchor-v1', createdAt: '2026-06-02 09:00', adapter: 'Hyperledger Fabric',
  },
  {
    id: 'OBX-005', eventType: 'WEBHOOK_DELIVERY_REQUESTED', entityType: 'MudarabahApplication', entityId: 'APP-2024-003',
    status: 'COMPLETED', attempts: 1, nextRunAt: null, lastError: null,
    idempotencyKey: 'app-003-webhook-approved-v1', createdAt: '2026-06-02 08:45', adapter: 'Webhook (IslamicFinance Bhd)',
  },
  {
    id: 'OBX-006', eventType: 'ERP_SYNC_REQUESTED', entityType: 'Invoice', entityId: 'INV-2024-044',
    status: 'DEAD_LETTERED', attempts: 5, nextRunAt: null, lastError: 'ERP endpoint returned 422: duplicate_invoice_reference',
    idempotencyKey: 'inv-044-erp-sync-v2', createdAt: '2026-06-01 14:22', adapter: 'ERP (SAP)',
  },
];

const RECONCILIATION = [
  { id: 'REC-001', entity: 'Disbursement DSB-002', externalRef: 'FINANCE-API-REF-78432', status: 'RECONCILED', adapter: 'Finance API', updatedAt: '2026-06-02 09:15' },
  { id: 'REC-002', entity: 'PO PO-2024-017', externalRef: 'SAP-PO-90234', status: 'ACKNOWLEDGED', adapter: 'ERP (SAP)', updatedAt: '2026-06-01 16:00' },
  { id: 'REC-003', entity: 'Invoice INV-2024-043', externalRef: 'SAP-INV-11923', status: 'SENT', adapter: 'ERP (SAP)', updatedAt: '2026-06-02 08:30' },
  { id: 'REC-004', entity: 'Contract CTR-003', externalRef: null, status: 'FAILED', adapter: 'E-Signature', updatedAt: '2026-06-02 09:35' },
];

const ADAPTERS = [
  { id: 'erp', name: 'ERP (SAP)', icon: Database, configured: true, endpoint: 'https://erp.example.com/api/v2', lastSync: '2026-06-02 09:00', status: 'active' },
  { id: 'fabric', name: 'Hyperledger Fabric', icon: Shield, configured: true, endpoint: 'grpc://fabric-gw:7051', lastSync: '2026-06-02 09:00', status: 'degraded' },
  { id: 'esign', name: 'E-Signature (DocuSign)', icon: FileSignature, configured: false, endpoint: 'Not configured', lastSync: null, status: 'inactive' },
  { id: 'finance', name: 'Finance API', icon: CreditCard, configured: true, endpoint: 'https://finance.example.com/v1', lastSync: '2026-06-02 09:14', status: 'active' },
  { id: 'webhooks', name: 'Webhooks', icon: Globe, configured: true, endpoint: '3 subscriptions', lastSync: '2026-06-02 08:45', status: 'active' },
];

const STATUS_COLOR: Record<OutboxStatus, string> = {
  COMPLETED: '#10b981', PROCESSING: '#0ea5e9', PENDING: '#64748b',
  FAILED: '#ef4444', RETRYING: '#f59e0b', DEAD_LETTERED: '#7c3aed',
};
const STATUS_LABEL: Record<OutboxStatus, string> = {
  COMPLETED: 'Completed', PROCESSING: 'Processing', PENDING: 'Pending',
  FAILED: 'Failed', RETRYING: 'Retrying', DEAD_LETTERED: 'Dead-lettered',
};

function OutboxRow({ ev }: { ev: OutboxEvent }) {
  const [expanded, setExpanded] = useState(false);
  const color = STATUS_COLOR[ev.status];
  const isRetryable = ev.status === 'FAILED' || ev.status === 'RETRYING' || ev.status === 'DEAD_LETTERED';
  return (
    <div style={{ borderBottom: '1px solid #e2e8f0' }}>
      <div className="flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}>
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <div style={{ color: '#0f172a', fontSize: 12, fontWeight: 500 }}>{ev.eventType}</div>
          <div style={{ color: '#94a3b8', fontSize: 11 }}>{ev.entityType} {ev.entityId} · {ev.adapter}</div>
        </div>
        <div style={{ color: '#64748b', fontSize: 11, width: 72 }}>att. {ev.attempts}</div>
        <span className="px-2.5 py-0.5 rounded-full shrink-0" style={{ background: `${color}15`, color, fontSize: 10, fontWeight: 600, border: `1px solid ${color}30` }}>
          {STATUS_LABEL[ev.status]}
        </span>
        {ev.nextRunAt && <div style={{ color: '#94a3b8', fontSize: 10 }}>{ev.nextRunAt}</div>}
        <ChevronRight size={13} color="#94a3b8" className={`shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </div>
      {expanded && (
        <div className="px-5 pb-4 space-y-3">
          {/* DLR-08: Retry explanation with idempotency */}
          <div className="rounded-lg p-4 space-y-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div className="flex items-center gap-2">
              <Key size={13} color="#047857" />
              <span style={{ color: '#047857', fontSize: 12, fontWeight: 600 }}>Idempotency Key</span>
              <code style={{ color: '#334155', fontSize: 11, flex: 1 }}>{ev.idempotencyKey}</code>
              <button className="flex items-center gap-1" style={{ color: '#64748b', fontSize: 11 }}>
                <Copy size={11} /> Copy
              </button>
            </div>
            <p style={{ color: '#64748b', fontSize: 11 }}>
              Retrying this event is safe — the idempotency key prevents duplicate business effects at the adapter. Only the integration side effect will be re-attempted, not the underlying business record.
            </p>
            {ev.lastError && (
              <div className="flex items-start gap-2 mt-2 px-3 py-2 rounded" style={{ background: '#fee2e2', border: '1px solid #fecaca' }}>
                <XCircle size={13} color="#dc2626" className="shrink-0 mt-0.5" />
                <div>
                  <span style={{ color: '#dc2626', fontSize: 11, fontWeight: 600 }}>Last Error: </span>
                  <span style={{ color: '#991b1b', fontSize: 11 }}>{ev.lastError}</span>
                </div>
              </div>
            )}
            {ev.nextRunAt && (
              <div style={{ color: '#94a3b8', fontSize: 11 }}>Next retry scheduled: <strong style={{ color: '#f59e0b' }}>{ev.nextRunAt}</strong></div>
            )}
          </div>
          {isRetryable && (
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:opacity-80 transition-all"
                style={{ background: '#047857', color: 'white', fontSize: 12 }}>
                <RotateCcw size={12} /> Retry Now (safe)
              </button>
              {ev.status === 'DEAD_LETTERED' && (
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:opacity-80 transition-all"
                  style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 12 }}>
                  Investigate Manually
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function IntegrationsView({ role, onNavigate }: Props) {
  const [tab, setTab] = useState<'outbox' | 'reconciliation' | 'adapters' | 'webhooks'>('outbox');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredOutbox = OUTBOX.filter(e => statusFilter === 'all' || e.status === statusFilter);

  const pendingCount = OUTBOX.filter(e => e.status === 'PENDING' || e.status === 'RETRYING').length;
  const failedCount = OUTBOX.filter(e => e.status === 'FAILED' || e.status === 'DEAD_LETTERED').length;

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#f1f5f9' }}>
      {/* Header */}
      <div className="px-8 py-5" style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ color: '#0f172a' }}>Integrations</h1>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 2 }}>Outbox · reconciliation · webhooks · adapters</p>
          </div>
          <div className="flex items-center gap-3">
            {failedCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#fee2e2', border: '1px solid #fecaca' }}>
                <XCircle size={14} color="#dc2626" />
                <span style={{ color: '#dc2626', fontSize: 13 }}>{failedCount} failed / dead-lettered</span>
              </div>
            )}
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                <Clock size={14} color="#c2410c" />
                <span style={{ color: '#c2410c', fontSize: 13 }}>{pendingCount} pending / retrying</span>
              </div>
            )}
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-5 gap-3 mt-4">
          {[
            { label: 'Total Events', value: OUTBOX.length, color: '#3b82f6' },
            { label: 'Completed', value: OUTBOX.filter(e => e.status === 'COMPLETED').length, color: '#10b981' },
            { label: 'Retrying', value: OUTBOX.filter(e => e.status === 'RETRYING').length, color: '#f59e0b' },
            { label: 'Failed / Dead', value: failedCount, color: '#ef4444' },
            { label: 'Reconciled', value: RECONCILIATION.filter(r => r.status === 'RECONCILED').length, color: '#8b5cf6' },
          ].map((k, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: `${k.color}08`, border: `1px solid ${k.color}20` }}>
              <div>
                <p style={{ color: k.color, fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{k.value}</p>
                <p style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>{k.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 pt-4 flex gap-1" style={{ borderBottom: '1px solid #e2e8f0', background: 'white' }}>
        {(['outbox', 'reconciliation', 'adapters', 'webhooks'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2.5 rounded-t-lg transition-all capitalize"
            style={{
              background: tab === t ? '#f1f5f9' : 'transparent',
              color: tab === t ? '#0f172a' : '#64748b',
              fontSize: 13, fontWeight: tab === t ? 600 : 400,
              borderBottom: tab === t ? '2px solid #047857' : '2px solid transparent',
              marginBottom: -1,
            }}>
            {{ outbox: 'Outbox Queue', reconciliation: 'Reconciliation', adapters: 'Adapters', webhooks: 'Webhooks' }[t]}
          </button>
        ))}
      </div>

      <div className="px-8 py-6">
        {tab === 'outbox' && (
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h4 style={{ color: '#0f172a', flex: 1 }}>Outbox Events</h4>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg" style={{ border: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>
                <option value="all">All statuses</option>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {filteredOutbox.map(ev => <OutboxRow key={ev.id} ev={ev} />)}
          </div>
        )}

        {tab === 'reconciliation' && (
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h4 style={{ color: '#0f172a' }}>Integration Reconciliation Records</h4>
              <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>External system reference mapping — links MEPN events to ERP/Fabric/e-sign responses</p>
            </div>
            <div className="divide-y" style={{ borderColor: '#e2e8f0' }}>
              {RECONCILIATION.map((r, i) => {
                const sc = r.status === 'RECONCILED' ? '#10b981' : r.status === 'FAILED' ? '#ef4444' : r.status === 'ACKNOWLEDGED' ? '#059669' : '#f59e0b';
                return (
                  <div key={i} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-1">
                      <div style={{ color: '#0f172a', fontSize: 12 }}>{r.entity}</div>
                      <div style={{ color: '#94a3b8', fontSize: 11 }}>{r.adapter} · {r.updatedAt}</div>
                    </div>
                    <code style={{ color: '#475569', fontSize: 11, background: '#f8fafc', padding: '2px 6px', borderRadius: 4 }}>
                      {r.externalRef ?? 'No external ref yet'}
                    </code>
                    <span className="px-2.5 py-0.5 rounded-full" style={{ background: `${sc}15`, color: sc, fontSize: 10, fontWeight: 600 }}>
                      {r.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'adapters' && (
          <div className="space-y-4">
            {ADAPTERS.map(adapter => {
              const Icon = adapter.icon;
              const sc = adapter.status === 'active' ? '#10b981' : adapter.status === 'degraded' ? '#f59e0b' : '#94a3b8';
              return (
                <div key={adapter.id} className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${sc}15`, border: `1px solid ${sc}30` }}>
                      <Icon size={18} color={sc} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 style={{ color: '#0f172a' }}>{adapter.name}</h4>
                        <span className="px-2 py-0.5 rounded-full" style={{ background: `${sc}15`, color: sc, fontSize: 10 }}>
                          {adapter.status}
                        </span>
                      </div>
                      <div style={{ color: '#64748b', fontSize: 12 }}>
                        Endpoint: <code style={{ color: '#334155' }}>{adapter.endpoint}</code>
                      </div>
                      {adapter.lastSync && <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Last sync: {adapter.lastSync}</div>}
                      {!adapter.configured && (
                        <div className="mt-2 px-3 py-2 rounded-lg" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                          <span style={{ color: '#c2410c', fontSize: 12 }}>Not configured — set required environment variables to enable this adapter.</span>
                        </div>
                      )}
                    </div>
                    {adapter.configured && (
                      <button className="px-3 py-1.5 rounded-lg hover:opacity-80 transition-all"
                        style={{ background: '#f0fdf4', color: '#047857', border: '1px solid #a7f3d0', fontSize: 12 }}>
                        Test Connection
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'webhooks' && (
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
            <div className="px-5 py-4 flex items-center" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h4 style={{ color: '#0f172a', flex: 1 }}>Webhook Subscriptions</h4>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:opacity-80 transition-all"
                style={{ background: '#047857', color: 'white', fontSize: 12 }}>
                + New Subscription
              </button>
            </div>
            <div className="divide-y" style={{ borderColor: '#e2e8f0' }}>
              {[
                { id: 'WH-001', target: 'https://finance.example.com/mepn-events', events: 'APPLICATION_APPROVED, DISBURSEMENT_RECORDED', status: 'ACTIVE', deliveries: 12, failures: 0 },
                { id: 'WH-002', target: 'https://audit.example.com/hooks', events: 'AUDIT_ANCHOR_COMPLETED', status: 'ACTIVE', deliveries: 7, failures: 1 },
                { id: 'WH-003', target: 'https://erp.example.com/procurement-events', events: 'PURCHASE_ORDER_ISSUED, RECEIPT_RECORDED, INVOICE_RECORDED', status: 'PAUSED', deliveries: 3, failures: 3 },
              ].map((wh, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <code style={{ color: '#334155', fontSize: 11 }}>{wh.id}</code>
                        <span className="px-2 py-0.5 rounded-full" style={{
                          background: wh.status === 'ACTIVE' ? '#d1fae5' : '#f1f5f9',
                          color: wh.status === 'ACTIVE' ? '#059669' : '#64748b', fontSize: 10,
                        }}>{wh.status}</span>
                        {wh.failures > 0 && <span style={{ color: '#dc2626', fontSize: 11 }}>{wh.failures} recent failures</span>}
                      </div>
                      <div style={{ color: '#0f172a', fontSize: 12 }}>{wh.target}</div>
                      <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{wh.events}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div style={{ color: '#0f172a', fontSize: 13, fontWeight: 600 }}>{wh.deliveries}</div>
                      <div style={{ color: '#94a3b8', fontSize: 10 }}>deliveries</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
