import { useState, useEffect } from 'react';
import { Shield, Users, ArrowRight, CheckCircle, Building2, Mail, ChevronRight, Zap, Lock, Globe } from 'lucide-react';
import type { RoleEntry } from './Sidebar';

interface Props {
  roles: RoleEntry[];
  onSignIn: (roleId: string) => void;
  onRegister: () => void;
  onInvite: () => void;
}

export function LandingView({ roles, onSignIn, onRegister, onInvite }: Props) {
  const [showSignIn, setShowSignIn] = useState(false);
  const [selectedRole, setSelectedRole] = useState('procurement-officer');
  // DLR-26: simulate detecting a prior valid session after brief delay
  const [sessionBannerVisible, setSessionBannerVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSessionBannerVisible(true), 2200);
    return () => clearTimeout(t);
  }, []);

  const chosenRole = roles.find(r => r.id === selectedRole) ?? roles[0];

  return (
    <div className="size-full overflow-y-auto" style={{ background: 'linear-gradient(150deg, #0f172a 0%, #1a2744 55%, #0a3328 100%)', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Top nav */}
      <div className="px-8 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#10b981' }}>
            <span style={{ color: 'white', fontSize: 16, fontWeight: 800 }}>M</span>
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>MEPN</p>
            <p style={{ color: '#475569', fontSize: 10 }}>Mudarabah-Enabled Procurement Network</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* DLR-28 environment badge */}
          <div className="px-3 py-1 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)' }}>
            <span style={{ color: '#f59e0b', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}>PROTOTYPE · NOT PRODUCTION READY</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10b981' }} />
            <span style={{ color: '#10b981', fontSize: 11 }}>All systems operational</span>
          </div>
        </div>
      </div>

      {/* DLR-26: Session discovery banner */}
      {sessionBannerVisible && (
        <div className="px-8 py-2.5 flex items-center gap-3" style={{ background: 'rgba(14,165,233,0.1)', borderBottom: '1px solid rgba(14,165,233,0.2)' }}>
          <Zap size={13} color="#0ea5e9" />
          <span style={{ color: '#7dd3fc', fontSize: 12 }}>
            <strong style={{ color: '#0ea5e9' }}>DLR-26 · Session found:</strong>{' '}
            {roles[0].org} · {roles[0].label} — last active 4 min ago
          </span>
          <button
            onClick={() => onSignIn(roles[0].id)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:opacity-80 transition-all"
            style={{ background: '#0ea5e9', color: 'white', fontSize: 11, fontWeight: 600 }}>
            Resume session <ArrowRight size={11} />
          </button>
          <button onClick={() => setSessionBannerVisible(false)} style={{ color: '#475569', fontSize: 16, marginLeft: 4 }}>✕</button>
        </div>
      )}

      {/* Hero section */}
      <div className="flex flex-col items-center px-8 py-14 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8"
          style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
          <Shield size={12} color="#10b981" />
          <span style={{ color: '#10b981', fontSize: 12 }}>Islamic Finance · Shariah-compliant · Hyperledger Fabric</span>
        </div>

        <h1 style={{ color: 'white', fontSize: 38, fontWeight: 800, lineHeight: 1.15, marginBottom: 14, maxWidth: 520 }}>
          Restricted Procurement,<br />Compliant Financing
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7, marginBottom: 10, maxWidth: 480 }}>
          A distributed network connecting SMEs, suppliers, Islamic financiers, and Shariah reviewers
          under auditable, evidence-linked mudarabah contracts.
        </p>

        {/* Trust chips */}
        <div className="flex items-center justify-center gap-8 mb-12">
          {[
            { icon: Lock, text: 'Role-bound access only' },
            { icon: Shield, text: 'Shariah-compliant instruments' },
            { icon: CheckCircle, text: 'Fabric-anchored audit trail' },
            { icon: Globe, text: 'Multi-org channel isolation' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-1.5">
                <Icon size={13} color="#10b981" />
                <span style={{ color: '#64748b', fontSize: 12 }}>{item.text}</span>
              </div>
            );
          })}
        </div>

        {/* CTA Cards */}
        <div className="flex gap-4 w-full max-w-2xl">
          {/* Sign In */}
          <CTACard
            color="#10b981"
            bgColor="#047857"
            icon={Users}
            title="Sign in"
            body="Access your organization's procurement, finance, compliance, and audit workspace."
            cta="Continue to sign in"
            onClick={() => setShowSignIn(true)}
          />
          {/* Register */}
          <CTACard
            color="#0ea5e9"
            bgColor="#0284c7"
            icon={Building2}
            title="Register organization"
            body="Set up a new MEPN node, create your admin account, and configure your deployment."
            cta="Start registration"
            onClick={onRegister}
          />
          {/* Invite */}
          <CTACard
            color="#8b5cf6"
            bgColor="#7c3aed"
            icon={Mail}
            title="Accept invitation"
            body="You have been invited to a workspace. Enter your token to accept and set up access."
            cta="Enter invitation token"
            onClick={onInvite}
          />
        </div>

        <p style={{ color: '#334155', fontSize: 12, marginTop: 28 }}>
          Procurement, finance, evidence, and audit records are visible only to authorized users within their organization context. No confidential data is shown before authentication.
        </p>
      </div>

      {/* Sign In Modal */}
      {showSignIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
            <div className="px-6 py-5" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <p style={{ color: '#0f172a', fontSize: 16, fontWeight: 600 }}>Sign in to MEPN</p>
              <p style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>
                Select a role to simulate authentication — prototype mode uses dev-login, not OIDC
              </p>
            </div>

            {/* Role picker */}
            <div className="p-4 max-h-80 overflow-y-auto space-y-1">
              {roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                  style={{
                    background: selectedRole === role.id ? `${role.color}10` : 'transparent',
                    border: `1px solid ${selectedRole === role.id ? role.color + '40' : 'transparent'}`,
                  }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: role.color }}>
                    <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>{role.avatar}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ color: '#0f172a', fontSize: 13, fontWeight: 500 }}>{role.label}</p>
                    <p style={{ color: '#94a3b8', fontSize: 11 }}>{role.org}</p>
                  </div>
                  {selectedRole === role.id && <CheckCircle size={15} color={role.color} />}
                </button>
              ))}
            </div>

            <div className="px-6 py-4 flex gap-2" style={{ borderTop: '1px solid #f1f5f9' }}>
              <button onClick={() => setShowSignIn(false)}
                className="flex-1 py-2.5 rounded-xl hover:opacity-80 transition-all"
                style={{ background: '#f1f5f9', color: '#475569', fontSize: 13 }}>
                Cancel
              </button>
              <button
                onClick={() => { setShowSignIn(false); onSignIn(selectedRole); }}
                className="flex-1 py-2.5 rounded-xl hover:opacity-80 transition-all flex items-center justify-center gap-2"
                style={{ background: chosenRole.color, color: 'white', fontSize: 13, fontWeight: 500 }}>
                Sign in as {chosenRole.label.split(' ')[0]}
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CTACard({ color, bgColor, icon: Icon, title, body, cta, onClick }: {
  color: string; bgColor: string; icon: any; title: string; body: string; cta: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 p-6 rounded-2xl text-left transition-all hover:scale-[1.02] hover:shadow-2xl"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: bgColor }}>
        <Icon size={18} color="white" />
      </div>
      <p style={{ color: 'white', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{title}</p>
      <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.55, marginBottom: 16 }}>{body}</p>
      <div className="flex items-center gap-1" style={{ color, fontSize: 13 }}>
        {cta} <ChevronRight size={14} />
      </div>
    </button>
  );
}
