import { useState } from 'react';
import {
  LayoutDashboard, Network, ShoppingCart, FileText, Wallet, BarChart3,
  Shield, Settings, ChevronDown, ChevronRight, Layers, CheckSquare,
  Activity, Anchor, Users, LogOut, Bell, Zap, Server, TrendingUp,
  BookOpen, Globe, Database
} from 'lucide-react';

export type ViewId =
  | 'dashboard'
  | 'network'
  | 'procurement'
  | 'applications'
  | 'workspace'
  | 'opportunities'
  | 'ledger'
  | 'audit'
  | 'integrations'
  | 'operations'
  | 'admin'
  | 'reports';

export interface RoleEntry {
  id: string;
  label: string;
  org: string;
  color: string;
  avatar: string;
}

interface SidebarProps {
  currentView: ViewId;
  onNavigate: (view: ViewId, params?: { applicationId?: string }) => void;
  currentRole: RoleEntry;
  roles: RoleEntry[];
  onRoleChange: (roleId: string) => void;
  anchorPending: number;
  onSignOut?: () => void;
}

const NAV_ITEMS: { id: ViewId; label: string; icon: React.ElementType; section: string | null; badge?: string }[] = [
  { id: 'dashboard',     label: 'Dashboard',             icon: LayoutDashboard, section: null },
  { id: 'network',       label: 'Network Canvas',         icon: Network,         section: 'Visibility' },
  { id: 'procurement',   label: 'Procurement Hub',        icon: ShoppingCart,    section: 'Procurement' },
  { id: 'applications',  label: 'Applications',           icon: FileText,        section: 'Finance' },
  { id: 'opportunities', label: 'Opportunities',          icon: TrendingUp,      section: 'Finance' },
  { id: 'workspace',     label: 'Application Workspace',  icon: Layers,          section: 'Finance' },
  { id: 'ledger',        label: 'Ledger & P/L',           icon: BarChart3,       section: 'Finance' },
  { id: 'audit',         label: 'Audit & Verification',   icon: Shield,          section: 'Compliance' },
  { id: 'integrations',  label: 'Integrations',           icon: Zap,             section: 'Operations', badge: '3' },
  { id: 'operations',    label: 'Deployment Health',      icon: Server,          section: 'Operations' },
  { id: 'reports',       label: 'Reports',                icon: BookOpen,        section: 'Admin' },
  { id: 'admin',         label: 'Administration',         icon: Users,           section: 'Admin' },
];

const SECTIONS = ['Visibility', 'Procurement', 'Finance', 'Compliance', 'Operations', 'Admin'];

export function Sidebar({ currentView, onNavigate, currentRole, roles, onRoleChange, anchorPending, onSignOut }: SidebarProps) {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    Visibility: true, Procurement: true, Finance: true, Compliance: true, Operations: false, Admin: false,
  });

  const toggleSection = (s: string) => setExpandedSections(p => ({ ...p, [s]: !p[s] }));

  return (
    <div className="flex flex-col h-full w-64 shrink-0 overflow-hidden" style={{ background: '#0f172a', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#047857' }}>
          <Anchor size={16} color="white" />
        </div>
        <div>
          <div style={{ color: 'white', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>MEPN</div>
          <div style={{ color: '#64748b', fontSize: 11 }}>Mudarabah E-Procurement</div>
        </div>
      </div>

      {/* Role Selector */}
      <div className="px-3 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => setRoleMenuOpen(!roleMenuOpen)}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white"
            style={{ background: currentRole.color, fontSize: 11, fontWeight: 600 }}>
            {currentRole.avatar}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div style={{ color: 'white', fontSize: 12, fontWeight: 500 }} className="truncate">{currentRole.label}</div>
            <div style={{ color: '#64748b', fontSize: 11 }} className="truncate">{currentRole.org}</div>
          </div>
          <ChevronDown size={14} color="#64748b" className={`shrink-0 transition-transform ${roleMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {roleMenuOpen && (
          <div className="mt-1.5 rounded-lg overflow-hidden" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)' }}>
            {roles.map(r => (
              <button
                key={r.id}
                onClick={() => { onRoleChange(r.id); setRoleMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-white/5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white"
                  style={{ background: r.color, fontSize: 10, fontWeight: 600 }}>
                  {r.avatar}
                </div>
                <div className="text-left min-w-0">
                  <div style={{ color: r.id === currentRole.id ? '#10b981' : 'white', fontSize: 12 }} className="truncate">{r.label}</div>
                  <div style={{ color: '#64748b', fontSize: 10 }} className="truncate">{r.org}</div>
                </div>
                {r.id === currentRole.id && <div className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#10b981' }} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV_ITEMS.filter(i => !i.section).map(item => (
          <NavItem key={item.id} item={item} currentView={currentView} onNavigate={onNavigate} />
        ))}

        {SECTIONS.map(section => {
          const items = NAV_ITEMS.filter(i => i.section === section);
          if (!items.length) return null;
          const expanded = expandedSections[section] !== false;
          return (
            <div key={section} className="mt-2">
              <button
                onClick={() => toggleSection(section)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded"
                style={{ color: '#475569' }}
              >
                <span style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{section}</span>
                <ChevronRight size={11} className={`ml-auto transition-transform ${expanded ? 'rotate-90' : ''}`} />
              </button>
              {expanded && (
                <div className="mt-0.5 space-y-0.5">
                  {items.map(item => (
                    <NavItem key={item.id} item={item} currentView={currentView} onNavigate={onNavigate} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Anchor Status Widget */}
      <div className="px-3 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
        <div className="rounded-lg p-3" style={{ background: anchorPending > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${anchorPending > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}` }}>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Anchor size={14} color={anchorPending > 0 ? '#f59e0b' : '#10b981'} />
              {anchorPending > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center"
                  style={{ background: '#f59e0b', fontSize: 8, color: 'white' }}>
                  {anchorPending}
                </span>
              )}
            </div>
            <div>
              <div style={{ color: 'white', fontSize: 11, fontWeight: 500 }}>
                {anchorPending > 0 ? `${anchorPending} anchors pending` : 'Fabric anchors synced'}
              </div>
              <div style={{ color: '#64748b', fontSize: 10 }}>
                {anchorPending > 0 ? 'Hyperledger queue processing...' : 'All events committed'}
              </div>
            </div>
            {anchorPending > 0 && (
              <div className="ml-auto w-2 h-2 rounded-full animate-pulse" style={{ background: '#f59e0b' }} />
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 px-2">
          <Bell size={13} color="#475569" />
          <span style={{ color: '#475569', fontSize: 11 }}>3 notifications</span>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
            <span style={{ color: '#475569', fontSize: 10 }}>v1.0 MVP</span>
          </div>
        </div>

        {onSignOut && (
          <button
            onClick={onSignOut}
            className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:opacity-80 transition-all"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171' }}>
            <LogOut size={13} />
            <span style={{ fontSize: 12 }}>Sign out</span>
          </button>
        )}
      </div>
    </div>
  );
}

function NavItem({ item, currentView, onNavigate }: {
  item: typeof NAV_ITEMS[number];
  currentView: ViewId;
  onNavigate: (v: ViewId) => void;
}) {
  const active = currentView === item.id;
  const Icon = item.icon;
  return (
    <button
      onClick={() => onNavigate(item.id)}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left"
      style={{
        background: active ? 'rgba(4,120,87,0.2)' : 'transparent',
        color: active ? '#10b981' : '#94a3b8',
      }}
    >
      <Icon size={15} />
      <span style={{ fontSize: 13, fontWeight: active ? 500 : 400 }}>{item.label}</span>
      {item.badge && !active && (
        <span className="ml-auto px-1.5 py-0.5 rounded-full" style={{ background: '#f59e0b', color: 'white', fontSize: 9, fontWeight: 700 }}>
          {item.badge}
        </span>
      )}
      {active && <div className="ml-auto w-1 h-4 rounded-full" style={{ background: '#10b981' }} />}
    </button>
  );
}
