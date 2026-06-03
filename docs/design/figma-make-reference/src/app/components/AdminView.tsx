import { useState } from 'react';
import {
  Users, Shield, Settings, Globe, Zap, Key, Plus, Edit3, Trash2,
  CheckCircle, XCircle, AlertTriangle, Database, HardDrive, Server,
  Lock, Eye, EyeOff, ToggleLeft, ToggleRight, ChevronRight
} from 'lucide-react';
import type { RoleEntry, ViewId } from './Sidebar';

interface Props {
  role: RoleEntry;
  onNavigate: (view: ViewId) => void;
}

const USERS = [
  { id: 'USR-001', name: 'Ahmad Rasyid', email: 'ahmad@techbuild.com.my', roles: ['SME Admin', 'Procurement Officer'], status: 'ACTIVE', lastLogin: '2026-06-02 09:10' },
  { id: 'USR-002', name: 'Siti Nur Aisyah', email: 'siti@techbuild.com.my', roles: ['Finance / Accountant'], status: 'ACTIVE', lastLogin: '2026-06-02 08:45' },
  { id: 'USR-003', name: 'Dr. Farouk Hassan', email: 'farouk@shariah-advisory.my', roles: ['Shariah Reviewer'], status: 'ACTIVE', lastLogin: '2026-06-01 14:30' },
  { id: 'USR-004', name: 'Dato\' Lim Eng Huat', email: 'lim@islamicfinance.com.my', roles: ['Financier User'], status: 'ACTIVE', lastLogin: '2026-06-01 11:00' },
  { id: 'USR-005', name: 'James Okafor', email: 'james@externalaudit.com', roles: ['Auditor'], status: 'ACTIVE', lastLogin: '2026-05-30 09:00' },
  { id: 'USR-006', name: 'Rafiq Othman', email: 'rafiq@techbuild.com.my', roles: ['Procurement Officer'], status: 'SUSPENDED', lastLogin: '2026-05-15 16:30' },
];

const ROLES_DATA = [
  { id: 'sme-admin', name: 'SME Admin', description: 'Full organizational administration', permissions: ['org:manage', 'users:manage', 'procurement:*', 'finance:*', 'audit:read'], members: 1 },
  { id: 'procurement-officer', name: 'Procurement Officer', description: 'Manage requisitions, RFQs, POs, receipts, invoices', permissions: ['procurement:*', 'suppliers:manage', 'evidence:create'], members: 2 },
  { id: 'finance-accountant', name: 'Finance / Accountant', description: 'Ledger entries, P/L, ERP reconciliation', permissions: ['finance:ledger', 'finance:pl', 'erp:sync'], members: 1 },
  { id: 'financier-user', name: 'Financier User', description: 'Due diligence, contract, disbursement', permissions: ['applications:review', 'contracts:manage', 'disbursements:create'], members: 1 },
  { id: 'shariah-reviewer', name: 'Shariah Reviewer', description: 'Shariah eligibility and contract review', permissions: ['shariah:review', 'applications:read', 'suppliers:restrict'], members: 1 },
  { id: 'auditor', name: 'Auditor', description: 'Read-only audit and evidence verification', permissions: ['audit:*', 'evidence:read', 'hashes:verify'], members: 1 },
];

const FEATURE_FLAGS = [
  { id: 'fabric-anchoring', label: 'Hyperledger Fabric Anchoring', enabled: true, risk: 'low', note: 'Anchor hash records to Fabric channel' },
  { id: 'esign-integration', label: 'E-Signature Integration', enabled: false, risk: 'medium', note: 'Requires DocuSign credentials in env' },
  { id: 'erp-sync', label: 'ERP Sync (SAP)', enabled: true, risk: 'low', note: 'SAP outbox adapter active' },
  { id: 'shariah-auto-check', label: 'Shariah Auto-Eligibility Check', enabled: true, risk: 'low', note: 'Policy engine validates categories on submit' },
  { id: 'uat-mode', label: 'UAT / Demo Mode', enabled: true, risk: 'medium', note: 'Demo data seeded; disable before production go-live' },
  { id: 'csv-import', label: 'CSV/XLSX Import Wizard (DLR-16)', enabled: false, risk: 'low', note: 'Planned — auto-maps procurement and ledger columns' },
];

// DLR-23: Data residency visualization
const DATA_CLASSES = [
  { class: 'Business Records', examples: 'Requisitions, POs, Invoices, Applications', storage: 'PostgreSQL (local)', region: 'Malaysia (Azure East Asia)', encryption: true },
  { class: 'Documents & Evidence', examples: 'Contracts, PO PDFs, Shariah opinions', storage: 'MinIO Object Storage', region: 'Malaysia (Azure East Asia)', encryption: true },
  { class: 'Audit Event Log', examples: 'All material audit events', storage: 'PostgreSQL (local)', region: 'Malaysia (Azure East Asia)', encryption: true },
  { class: 'Hash Records', examples: 'Canonical hashes of evidence packs', storage: 'PostgreSQL + Fabric', region: 'Malaysia + Fabric Channel', encryption: true },
  { class: 'Fabric Anchors', examples: 'Hash-only blockchain anchors', storage: 'Hyperledger Fabric', region: 'Fabric Channel (regional TBD)', encryption: false },
  { class: 'Backups', examples: 'Full database backups', storage: 'Azure Blob Storage', region: 'Malaysia (Azure East Asia)', encryption: true },
  { class: 'Session Tokens', examples: 'Dev/local session data', storage: 'Redis (in-memory)', region: 'Local node', encryption: false },
];

type TabId = 'users' | 'roles' | 'residency' | 'flags' | 'api-clients';

export function AdminView({ role, onNavigate }: Props) {
  const [tab, setTab] = useState<TabId>('users');
  const [flags, setFlags] = useState<Record<string, boolean>>(
    Object.fromEntries(FEATURE_FLAGS.map(f => [f.id, f.enabled]))
  );

  const isAdmin = role.id === 'sme-admin' || role.id === 'developer';

  const tabs: { id: TabId; label: string }[] = [
    { id: 'users', label: 'Users' },
    { id: 'roles', label: 'Roles & Permissions' },
    { id: 'residency', label: 'Data Residency' },
    { id: 'flags', label: 'Feature Flags' },
    { id: 'api-clients', label: 'API Clients' },
  ];

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#f1f5f9' }}>
      {/* Header */}
      <div className="px-8 py-5" style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ color: '#0f172a' }}>Administration</h1>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 2 }}>Users · roles · data residency · feature flags</p>
          </div>
          {!isAdmin && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
              <Lock size={14} color="#c2410c" />
              <span style={{ color: '#c2410c', fontSize: 13 }}>SME Admin access required</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-4 mt-4">
          {[
            { label: 'Total Users', value: USERS.length, color: '#3b82f6' },
            { label: 'Active', value: USERS.filter(u => u.status === 'ACTIVE').length, color: '#10b981' },
            { label: 'Roles Defined', value: ROLES_DATA.length, color: '#8b5cf6' },
            { label: 'Flags Enabled', value: Object.values(flags).filter(Boolean).length, color: '#f59e0b' },
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

      {/* Tabs */}
      <div className="px-8 pt-4 flex gap-1" style={{ borderBottom: '1px solid #e2e8f0', background: 'white' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2.5 rounded-t-lg transition-all"
            style={{
              background: tab === t.id ? '#f1f5f9' : 'transparent',
              color: tab === t.id ? '#0f172a' : '#64748b',
              fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              borderBottom: tab === t.id ? '2px solid #047857' : '2px solid transparent',
              marginBottom: -1,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-8 py-6">
        {tab === 'users' && (
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
            <div className="px-5 py-4 flex items-center" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h4 style={{ color: '#0f172a', flex: 1 }}>Organization Members</h4>
              {isAdmin && (
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:opacity-80 transition-all"
                  style={{ background: '#047857', color: 'white', fontSize: 12 }}>
                  <Plus size={13} /> Invite User
                </button>
              )}
            </div>
            <div className="divide-y" style={{ borderColor: '#e2e8f0' }}>
              {USERS.map(u => (
                <div key={u.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0"
                    style={{ background: u.status === 'ACTIVE' ? '#047857' : '#94a3b8', fontSize: 12, fontWeight: 700 }}>
                    {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ color: '#0f172a', fontSize: 13, fontWeight: 500 }}>{u.name}</div>
                    <div style={{ color: '#94a3b8', fontSize: 11 }}>{u.email}</div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map(r => (
                      <span key={r} className="px-2 py-0.5 rounded-full" style={{ background: '#f1f5f9', color: '#475569', fontSize: 10, border: '1px solid #e2e8f0' }}>{r}</span>
                    ))}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full shrink-0" style={{
                    background: u.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2',
                    color: u.status === 'ACTIVE' ? '#059669' : '#dc2626',
                    fontSize: 10,
                  }}>{u.status}</span>
                  <div style={{ color: '#94a3b8', fontSize: 10, width: 120, textAlign: 'right' }}>{u.lastLogin}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'roles' && (
          <div className="space-y-3">
            {ROLES_DATA.map(r => (
              <div key={r.id} className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <Shield size={16} color="#047857" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 style={{ color: '#0f172a' }}>{r.name}</h4>
                      <span style={{ color: '#94a3b8', fontSize: 11 }}>{r.members} member{r.members !== 1 ? 's' : ''}</span>
                    </div>
                    <p style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>{r.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.permissions.map(p => (
                        <code key={p} style={{ background: '#f8fafc', color: '#334155', fontSize: 10, padding: '2px 8px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                          {p}
                        </code>
                      ))}
                    </div>
                  </div>
                  {isAdmin && (
                    <button className="px-3 py-1.5 rounded-lg hover:opacity-80 transition-all shrink-0"
                      style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', fontSize: 12 }}>
                      <Edit3 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'residency' && (
          <>
            {/* DLR-23: Data residency visualization */}
            <div className="mb-4 px-4 py-3 rounded-xl flex items-start gap-3" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <Globe size={15} color="#1d4ed8" className="shrink-0 mt-0.5" />
              <div>
                <span style={{ color: '#1d4ed8', fontSize: 12, fontWeight: 600 }}>Data Residency — Malaysia (Azure East Asia) </span>
                <span style={{ color: '#1e40af', fontSize: 12 }}>All personally identifiable data, financial records, and documents are stored in-region. Fabric anchors are hash-only (no confidential payload). Configure Fabric channel region policy before cross-border expansion.</span>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <h4 style={{ color: '#0f172a' }}>Sensitive Data Class Map</h4>
                <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>Where each data class lives, what region it occupies, and whether it is encrypted at rest</p>
              </div>
              <div className="divide-y" style={{ borderColor: '#e2e8f0' }}>
                {DATA_CLASSES.map((d, i) => (
                  <div key={i} className="px-5 py-4 grid grid-cols-4 gap-4 items-start">
                    <div>
                      <div style={{ color: '#0f172a', fontSize: 12, fontWeight: 600 }}>{d.class}</div>
                      <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>{d.examples}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: 11, marginBottom: 2 }}>Storage</div>
                      <div style={{ color: '#0f172a', fontSize: 12 }}>{d.storage}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: 11, marginBottom: 2 }}>Region</div>
                      <div style={{ color: '#0f172a', fontSize: 12 }}>{d.region}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.encryption
                        ? <><CheckCircle size={13} color="#10b981" /><span style={{ color: '#10b981', fontSize: 11 }}>Encrypted at rest</span></>
                        : <><AlertTriangle size={13} color="#f59e0b" /><span style={{ color: '#f59e0b', fontSize: 11 }}>Not encrypted</span></>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'flags' && (
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h4 style={{ color: '#0f172a' }}>Feature Flags</h4>
              <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>Enable planned modules — changes take effect after session refresh</p>
            </div>
            <div className="divide-y" style={{ borderColor: '#e2e8f0' }}>
              {FEATURE_FLAGS.map(f => (
                <div key={f.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1">
                    <div style={{ color: '#0f172a', fontSize: 13 }}>{f.label}</div>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 1 }}>{f.note}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full" style={{
                    background: f.risk === 'low' ? '#d1fae5' : '#fef3c7',
                    color: f.risk === 'low' ? '#059669' : '#d97706',
                    fontSize: 9, fontWeight: 600,
                  }}>
                    {f.risk} risk
                  </span>
                  <button
                    onClick={() => isAdmin && setFlags(p => ({ ...p, [f.id]: !p[f.id] }))}
                    className="flex items-center gap-2 transition-all"
                    disabled={!isAdmin}
                  >
                    <div className="w-10 h-5 rounded-full relative transition-colors"
                      style={{ background: flags[f.id] ? '#047857' : '#e2e8f0' }}>
                      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                        style={{ left: flags[f.id] ? 22 : 2 }} />
                    </div>
                    <span style={{ color: flags[f.id] ? '#047857' : '#94a3b8', fontSize: 12, width: 20 }}>
                      {flags[f.id] ? 'On' : 'Off'}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'api-clients' && (
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
            <div className="px-5 py-4 flex items-center" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h4 style={{ color: '#0f172a', flex: 1 }}>API Clients & Webhook Secrets</h4>
              {isAdmin && (
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:opacity-80 transition-all"
                  style={{ background: '#047857', color: 'white', fontSize: 12 }}>
                  <Plus size={13} /> Create Client
                </button>
              )}
            </div>
            <div className="divide-y" style={{ borderColor: '#e2e8f0' }}>
              {[
                { id: 'CLI-001', name: 'ERP Integration Adapter', scopes: ['procurement:read', 'erp:sync'], created: '2026-03-01', lastUsed: '2026-06-02 09:00', status: 'ACTIVE' },
                { id: 'CLI-002', name: 'Finance API Webhook Receiver', scopes: ['finance:read', 'disbursements:read'], created: '2026-04-15', lastUsed: '2026-06-02 09:14', status: 'ACTIVE' },
                { id: 'CLI-003', name: 'Audit Verification Client', scopes: ['audit:read', 'hashes:verify'], created: '2026-05-01', lastUsed: '2026-05-30', status: 'ACTIVE' },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <Key size={14} color="#047857" />
                  </div>
                  <div className="flex-1">
                    <div style={{ color: '#0f172a', fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.scopes.map(s => (
                        <code key={s} style={{ background: '#f8fafc', color: '#475569', fontSize: 10, padding: '1px 6px', borderRadius: 3, border: '1px solid #e2e8f0' }}>{s}</code>
                      ))}
                    </div>
                  </div>
                  <div className="text-right" style={{ color: '#94a3b8', fontSize: 11 }}>
                    <div>Last used: {c.lastUsed}</div>
                    <div>Created: {c.created}</div>
                  </div>
                  <span style={{ color: '#10b981', fontSize: 10 }}>{c.status}</span>
                </div>
              ))}
            </div>
            <div className="px-5 py-3" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <p style={{ color: '#94a3b8', fontSize: 11 }}>Client secrets are displayed only once at creation time. Rotate secrets immediately if compromised. All API calls are audited with client ID.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
