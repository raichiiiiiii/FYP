import { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { ApplicationWorkspace } from './components/ApplicationWorkspace';
import { ApplicationsList } from './components/ApplicationsList';
import { ProcurementView } from './components/ProcurementView';
import { NetworkCanvas } from './components/NetworkCanvas';
import { LedgerView } from './components/LedgerView';
import { AuditView } from './components/AuditView';
import { OperationsView } from './components/OperationsView';
import { IntegrationsView } from './components/IntegrationsView';
import { AdminView } from './components/AdminView';
import { OpportunitiesView } from './components/OpportunitiesView';
import { ReportsView } from './components/ReportsView';
import { LandingView } from './components/LandingView';
import { OrgSetupView } from './components/OrgSetupView';
import { InviteView } from './components/InviteView';
import { PlatformDashboardView } from './components/PlatformDashboardView';
import type { ViewId, RoleEntry } from './components/Sidebar';

// Auth state machine — Section 26.3
type AuthState = 'session-checking' | 'anonymous' | 'no-org' | 'authorized';
type PreAuthScreen = 'landing' | 'org-setup' | 'invite';

const ROLES: RoleEntry[] = [
  { id: 'sme-admin',           label: 'SME Admin',              org: 'TechBuild Sdn Bhd',       color: '#0ea5e9', avatar: 'SA' },
  { id: 'procurement-officer', label: 'Procurement Officer',    org: 'TechBuild Sdn Bhd',       color: '#8b5cf6', avatar: 'PO' },
  { id: 'approver',            label: 'Approver',               org: 'TechBuild Sdn Bhd',       color: '#f59e0b', avatar: 'AP' },
  { id: 'supplier-user',       label: 'Supplier User',          org: 'PanelCo Industries',      color: '#10b981', avatar: 'SU' },
  { id: 'finance-accountant',  label: 'Finance / Accountant',   org: 'TechBuild Sdn Bhd',       color: '#ef4444', avatar: 'FA' },
  { id: 'financier-user',      label: 'Financier User',         org: 'IslamicFinance Bhd',      color: '#047857', avatar: 'FU' },
  { id: 'shariah-reviewer',    label: 'Shariah Reviewer',       org: 'Shariah Advisory Board',  color: '#7c3aed', avatar: 'SR' },
  { id: 'auditor',             label: 'Auditor',                org: 'External Audit Co.',      color: '#64748b', avatar: 'AU' },
  { id: 'developer',           label: 'Developer / Integrator', org: 'MEPN Platform',           color: '#0284c7', avatar: 'DI' },
];

// DLR-29: role-specific landing route after invitation acceptance
const INVITE_ROLE_ROUTES: Record<string, ViewId> = {
  'supplier-user':       'procurement',
  'financier-user':      'applications',
  'shariah-reviewer':    'applications',
  'auditor':             'audit',
  'procurement-officer': 'applications',
  'approver':            'applications',
};

export default function App() {
  // Pre-auth state
  const [authState, setAuthState]       = useState<AuthState>('session-checking');
  const [preAuthScreen, setPreAuthScreen] = useState<PreAuthScreen>('landing');

  // Post-auth state
  const [currentView, setCurrentView]               = useState<ViewId>('dashboard');
  const [currentRoleId, setCurrentRoleId]           = useState<string>('sme-admin');
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>('APP-2024-001');
  const [anchorPending] = useState<number>(3);

  const currentRole = ROLES.find(r => r.id === currentRoleId) ?? ROLES[0];

  // DLR-26: simulate session check — no valid session in prototype, fall back to landing
  useEffect(() => {
    if (authState !== 'session-checking') return;
    const t = setTimeout(() => setAuthState('anonymous'), 1500);
    return () => clearTimeout(t);
  }, [authState]);

  const navigate = useCallback((view: ViewId, params?: { applicationId?: string }) => {
    if (params?.applicationId) setSelectedApplicationId(params.applicationId);
    setCurrentView(view);
  }, []);

  const handleSignIn = (roleId: string) => {
    setCurrentRoleId(roleId);
    setCurrentView('dashboard');
    setAuthState('authorized');
  };

  const handleOrgSetupComplete = (adminRoleId: string) => {
    setCurrentRoleId(adminRoleId);
    setCurrentView('dashboard');
    setAuthState('authorized');
  };

  const handleInviteAccept = (roleId: string) => {
    setCurrentRoleId(roleId);
    setCurrentView(INVITE_ROLE_ROUTES[roleId] ?? 'dashboard');
    setAuthState('authorized');
  };

  const handleSignOut = () => {
    setAuthState('anonymous');
    setPreAuthScreen('landing');
  };

  // ── Session-checking spinner ───────────────────────────────────────────────
  if (authState === 'session-checking') {
    return (
      <div className="size-full flex flex-col items-center justify-center gap-5"
        style={{ background: 'linear-gradient(150deg,#0f172a 0%,#1a2744 55%,#0a3328 100%)', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#10b981' }}>
          <span style={{ color: 'white', fontSize: 28, fontWeight: 800 }}>M</span>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Verifying session…</p>
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: '#10b981', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <p style={{ color: '#334155', fontSize: 12 }}>DLR-26 · Checking for prior valid session and organization context</p>
      </div>
    );
  }

  // ── Pre-auth screens ───────────────────────────────────────────────────────
  if (authState === 'anonymous' || authState === 'no-org') {
    if (preAuthScreen === 'org-setup') {
      return (
        <OrgSetupView
          onComplete={handleOrgSetupComplete}
          onBack={() => setPreAuthScreen('landing')}
        />
      );
    }
    if (preAuthScreen === 'invite') {
      return (
        <InviteView
          onAccept={handleInviteAccept}
          onDecline={() => setPreAuthScreen('landing')}
          onBack={() => setPreAuthScreen('landing')}
        />
      );
    }
    return (
      <LandingView
        roles={ROLES}
        onSignIn={handleSignIn}
        onRegister={() => setPreAuthScreen('org-setup')}
        onInvite={() => setPreAuthScreen('invite')}
      />
    );
  }

  // ── Authorized: full app ───────────────────────────────────────────────────
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        // SME Admin gets Platform Manager Dashboard (Section 26.6, DLR-27, DLR-28)
        if (currentRole.id === 'sme-admin') {
          return <PlatformDashboardView role={currentRole} onNavigate={navigate} />;
        }
        return <DashboardView role={currentRole} onNavigate={navigate} />;
      case 'applications':
        return <ApplicationsList role={currentRole} onNavigate={navigate} />;
      case 'workspace':
        return <ApplicationWorkspace role={currentRole} applicationId={selectedApplicationId} onNavigate={navigate} />;
      case 'opportunities':
        return <OpportunitiesView role={currentRole} onNavigate={navigate} />;
      case 'procurement':
        return <ProcurementView role={currentRole} onNavigate={navigate} />;
      case 'network':
        return <NetworkCanvas role={currentRole} />;
      case 'ledger':
        return <LedgerView role={currentRole} applicationId={selectedApplicationId} />;
      case 'audit':
        return <AuditView role={currentRole} />;
      case 'integrations':
        return <IntegrationsView role={currentRole} onNavigate={navigate} />;
      case 'operations':
        return <OperationsView role={currentRole} onNavigate={navigate} />;
      case 'admin':
        return <AdminView role={currentRole} onNavigate={navigate} />;
      case 'reports':
        return <ReportsView role={currentRole} onNavigate={navigate} />;
      default:
        return <DashboardView role={currentRole} onNavigate={navigate} />;
    }
  };

  return (
    <div className="size-full flex overflow-hidden" style={{ background: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Sidebar
        currentView={currentView}
        onNavigate={navigate}
        currentRole={currentRole}
        roles={ROLES}
        onRoleChange={setCurrentRoleId}
        anchorPending={anchorPending}
        onSignOut={handleSignOut}
      />
      <main className="flex-1 flex overflow-hidden">
        {renderView()}
      </main>
    </div>
  );
}
