import { useState } from 'react';
import { Mail, CheckCircle, ArrowLeft, ArrowRight, Shield, Package, DollarSign, Search, AlertTriangle, Users } from 'lucide-react';

interface Props {
  onAccept: (roleId: string) => void;
  onDecline: () => void;
  onBack: () => void;
}

const MOCK_INVITE = {
  token: 'INV-2024-ABCD7F',
  role: 'supplier-user',
  roleLabel: 'Supplier User',
  workspace: 'Procurement Channel — TechBuild Sdn Bhd',
  invitedBy: 'Ahmad Razali',
  inviterRole: 'SME Admin',
  org: 'TechBuild Sdn Bhd',
  expiresAt: '2026-06-17',
  message: 'You have been invited to join the TechBuild Sdn Bhd procurement network as an approved supplier. You will be able to receive and respond to purchase orders and RFQs.',
};

// DLR-29: Role-specific redirect destinations after invitation acceptance
const ROLE_REDIRECTS: Record<string, { destination: string; route: string; icon: any; color: string; desc: string }> = {
  'supplier-user': {
    destination: 'Procurement Workspace → Open RFQs & POs',
    route: '/procurement',
    icon: Package,
    color: '#3b82f6',
    desc: 'You will land on the procurement workspace showing active RFQs and purchase orders awaiting your acknowledgement and quotation.',
  },
  'financier-user': {
    destination: 'Finance Applications → Due Diligence Queue',
    route: '/finance/applications',
    icon: DollarSign,
    color: '#059669',
    desc: 'You will land on the finance applications pipeline showing mudarabah applications ready for your due diligence review and decision.',
  },
  'shariah-reviewer': {
    destination: 'Compliance → Shariah Review Queue',
    route: '/compliance/shariah',
    icon: Shield,
    color: '#8b5cf6',
    desc: 'You will land on the Shariah/compliance review queue showing applications awaiting your eligibility assessment and decision.',
  },
  'auditor': {
    destination: 'Audit Trail → Evidence Pack Review',
    route: '/audit',
    icon: Search,
    color: '#64748b',
    desc: 'You will land on the audit trail and evidence pack view showing events and hashes awaiting your verification.',
  },
  'procurement-officer': {
    destination: 'Applications → Procurement Workspace',
    route: '/applications',
    icon: Package,
    color: '#0ea5e9',
    desc: 'You will land on the applications list showing mudarabah procurement applications you can manage and submit evidence for.',
  },
  'approver': {
    destination: 'Applications → Pending Approvals',
    route: '/applications',
    icon: CheckCircle,
    color: '#f59e0b',
    desc: 'You will land on the applications list filtered to items requiring your approval signature.',
  },
};

export function InviteView({ onAccept, onDecline, onBack }: Props) {
  const [tokenInput, setTokenInput] = useState('');
  const [tokenConfirmed, setTokenConfirmed] = useState(false);
  const [selectedInviteRole, setSelectedInviteRole] = useState(MOCK_INVITE.role);
  const [accepted, setAccepted] = useState(false);

  const redirect = ROLE_REDIRECTS[selectedInviteRole] ?? ROLE_REDIRECTS['supplier-user'];
  const RedirectIcon = redirect.icon;

  const handleTokenCheck = () => {
    if (tokenInput.trim().length > 4 || tokenInput === '') {
      setTokenConfirmed(true);
    }
  };

  const handleAccept = () => {
    setAccepted(true);
    setTimeout(() => onAccept(selectedInviteRole), 1600);
  };

  return (
    <div className="size-full overflow-y-auto flex flex-col" style={{ background: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="px-8 py-4 flex items-center gap-4" style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <button onClick={onBack} className="flex items-center gap-2 hover:opacity-70 transition-all" style={{ color: '#64748b', fontSize: 13 }}>
          <ArrowLeft size={15} /> Back to landing
        </button>
        <div className="h-4 w-px" style={{ background: '#e2e8f0' }} />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#8b5cf6' }}>
            <Mail size={13} color="white" />
          </div>
          <span style={{ color: '#0f172a', fontSize: 14, fontWeight: 600 }}>Accept Invitation</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-10">
        <div className="w-full max-w-lg space-y-4">

          {/* Token entry */}
          {!tokenConfirmed && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <div className="px-6 py-5" style={{ borderBottom: '1px solid #f1f5f9', background: '#f5f3ff' }}>
                <p style={{ color: '#5b21b6', fontSize: 15, fontWeight: 600 }}>Enter your invitation token</p>
                <p style={{ color: '#7c3aed', fontSize: 12, marginTop: 3 }}>Find this in your invitation email or use the link provided by your admin.</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label style={{ color: '#334155', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Invitation token</label>
                  <input
                    value={tokenInput}
                    onChange={e => setTokenInput(e.target.value)}
                    placeholder="e.g. INV-2024-ABCD7F"
                    className="w-full px-4 py-3 rounded-xl"
                    style={{ border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'monospace', background: '#f8fafc' }}
                  />
                  <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 6 }}>Leave blank to load the mock demo invitation.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleTokenCheck}
                    className="flex-1 py-2.5 rounded-xl hover:opacity-80 transition-all"
                    style={{ background: '#7c3aed', color: 'white', fontSize: 13, fontWeight: 500 }}>
                    Verify token
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Invitation card */}
          {tokenConfirmed && !accepted && (
            <>
              <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                <div className="px-6 py-5" style={{ borderBottom: '1px solid #f1f5f9', background: '#f5f3ff' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#8b5cf6' }}>
                      <Mail size={18} color="white" />
                    </div>
                    <div>
                      <p style={{ color: '#5b21b6', fontSize: 15, fontWeight: 600 }}>You have been invited</p>
                      <p style={{ color: '#7c3aed', fontSize: 12 }}>Token: {tokenInput || MOCK_INVITE.token}</p>
                    </div>
                    <div className="ml-auto px-2.5 py-1 rounded-full" style={{ background: '#f0fdf4', border: '1px solid #a7f3d0' }}>
                      <span style={{ color: '#047857', fontSize: 11, fontWeight: 500 }}>Valid · expires {MOCK_INVITE.expiresAt}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <InviteField label="From" value={`${MOCK_INVITE.invitedBy} (${MOCK_INVITE.inviterRole})`} />
                    <InviteField label="Organization" value={MOCK_INVITE.org} />
                    <InviteField label="Role granted" value={MOCK_INVITE.roleLabel} highlight="#8b5cf6" />
                    <InviteField label="Workspace" value={MOCK_INVITE.workspace} />
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <p style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>Message from inviter</p>
                    <p style={{ color: '#334155', fontSize: 13, lineHeight: 1.6 }}>{MOCK_INVITE.message}</p>
                  </div>

                  {/* Demo: change invite role to preview DLR-29 */}
                  <div className="p-3 rounded-xl" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                    <p style={{ color: '#1d4ed8', fontSize: 11, fontWeight: 500, marginBottom: 6 }}>Demo: preview DLR-29 redirect for different roles</p>
                    <select
                      value={selectedInviteRole}
                      onChange={e => setSelectedInviteRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg"
                      style={{ border: '1px solid #bfdbfe', fontSize: 13, background: 'white' }}>
                      {Object.entries(ROLE_REDIRECTS).map(([id, r]) => (
                        <option key={id} value={id}>{r.destination.split('→')[0].trim()}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* DLR-29: Role-specific redirect preview */}
              <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: `1px solid ${redirect.color}30`, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                <div className="px-6 py-4 flex items-center gap-3" style={{ background: `${redirect.color}08`, borderBottom: `1px solid ${redirect.color}20` }}>
                  <RedirectIcon size={16} color={redirect.color} />
                  <div>
                    <p style={{ color: redirect.color, fontSize: 13, fontWeight: 600 }}>DLR-29 · After acceptance, you will be sent to:</p>
                    <p style={{ color: '#0f172a', fontSize: 14, fontWeight: 600, marginTop: 1 }}>{redirect.destination}</p>
                  </div>
                </div>
                <div className="px-6 py-4">
                  <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>{redirect.desc}</p>
                  <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 8 }}>
                    Route: <span style={{ fontFamily: 'monospace' }}>{redirect.route}</span> · scoped to {MOCK_INVITE.org} only
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onDecline}
                  className="flex-1 py-3 rounded-xl hover:opacity-80 transition-all"
                  style={{ background: 'white', color: '#ef4444', border: '1px solid #fecaca', fontSize: 14 }}>
                  Decline invitation
                </button>
                <button
                  onClick={handleAccept}
                  className="flex-1 py-3 rounded-xl hover:opacity-80 transition-all flex items-center justify-center gap-2"
                  style={{ background: '#047857', color: 'white', fontSize: 14, fontWeight: 500 }}>
                  Accept & join workspace <ArrowRight size={15} />
                </button>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: '#fef9c3', border: '1px solid #fde047' }}>
                <AlertTriangle size={13} color="#ca8a04" className="mt-0.5 shrink-0" />
                <p style={{ color: '#92400e', fontSize: 12 }}>
                  Accepting this invitation creates a Membership binding you to {MOCK_INVITE.org}.
                  You will only be able to access data within that organization's scope.
                </p>
              </div>
            </>
          )}

          {/* Accepted state */}
          {accepted && (
            <div className="rounded-2xl p-10 flex flex-col items-center text-center" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: '#f0fdf4', border: '2px solid #10b981' }}>
                <CheckCircle size={32} color="#10b981" />
              </div>
              <p style={{ color: '#0f172a', fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Invitation accepted</p>
              <p style={{ color: '#64748b', fontSize: 14 }}>Membership created · Redirecting to {redirect.destination.split('→')[1]?.trim() ?? 'workspace'}…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InviteField({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div>
      <p style={{ color: '#94a3b8', fontSize: 11 }}>{label}</p>
      <p style={{ color: highlight ?? '#334155', fontSize: 13, fontWeight: highlight ? 600 : 400, marginTop: 2 }}>{value}</p>
    </div>
  );
}
