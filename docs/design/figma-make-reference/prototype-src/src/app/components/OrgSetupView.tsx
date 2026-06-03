import { useState } from 'react';
import { CheckCircle, ArrowLeft, ArrowRight, Building2, User, Settings, Eye, AlertTriangle } from 'lucide-react';

interface Props {
  onComplete: (adminRoleId: string) => void;
  onBack: () => void;
}

const STEPS = [
  { label: 'Org Profile',        icon: Building2 },
  { label: 'Compliance',         icon: Settings  },
  { label: 'Admin Account',      icon: User      },
  { label: 'Review & Create',    icon: Eye       },
];

const SECTORS = ['Manufacturing', 'Technology', 'Trading & Distribution', 'Construction', 'Agriculture', 'Services', 'Healthcare', 'Education'];
const DEPLOYMENT_MODES = [
  { value: 'standalone_sme',   label: 'Standalone SME Node',    desc: 'Self-contained deployment for a single SME organization. Recommended for prototype and pilot.' },
  { value: 'managed_cloud',    label: 'Managed Cloud (Azure)',  desc: 'Hosted deployment on Azure prototype endpoint. Suitable for multi-org pilot programs.' },
  { value: 'partner_hosted',   label: 'Partner-Hosted Node',   desc: 'Hosted by an integrator or technology partner on behalf of the SME.' },
];
const SHARIAH_PROFILES = [
  { value: 'mudarabah_restricted', label: 'Mudarabah – Restricted (Default)', desc: 'Capital restricted to named supplier procurement only. No cash to mudarib.' },
  { value: 'mudarabah_general',    label: 'Mudarabah – General',             desc: 'Capital may be deployed at mudarib discretion. Requires additional Shariah review.' },
  { value: 'pending_review',       label: 'Pending Shariah Review',          desc: 'Shariah profile not yet determined. Finance templates will be locked until reviewed.' },
];

export function OrgSetupView({ onComplete, onBack }: Props) {
  const [step, setStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [form, setForm] = useState({
    legalName: '',
    regNumber: '',
    taxId: '',
    sector: 'Manufacturing',
    shariahProfile: 'mudarabah_restricted',
    deploymentMode: 'standalone_sme',
    adminName: '',
    adminEmail: '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const canNext = () => {
    if (step === 0) return form.legalName.trim().length > 1;
    if (step === 2) return form.adminName.trim().length > 1 && form.adminEmail.includes('@');
    return true;
  };

  const handleCreate = () => {
    setIsCreating(true);
    setTimeout(() => {
      setIsCreating(false);
      setCreated(true);
      setTimeout(() => onComplete('sme-admin'), 1400);
    }, 1800);
  };

  const deploymentMode = DEPLOYMENT_MODES.find(d => d.value === form.deploymentMode)!;
  const shariahProfile = SHARIAH_PROFILES.find(s => s.value === form.shariahProfile)!;

  return (
    <div className="size-full overflow-y-auto flex flex-col" style={{ background: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="px-8 py-4 flex items-center gap-4" style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <button onClick={onBack} className="flex items-center gap-2 hover:opacity-70 transition-all" style={{ color: '#64748b', fontSize: 13 }}>
          <ArrowLeft size={15} /> Back to landing
        </button>
        <div className="h-4 w-px" style={{ background: '#e2e8f0' }} />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#10b981' }}>
            <span style={{ color: 'white', fontSize: 13, fontWeight: 800 }}>M</span>
          </div>
          <span style={{ color: '#0f172a', fontSize: 14, fontWeight: 600 }}>Register Organization</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-10">
        <div className="w-full max-w-2xl">

          {/* Step indicator */}
          <div className="flex items-center gap-0 mb-10">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isDone = i < step;
              const isActive = i === step;
              return (
                <div key={i} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: isDone ? '#10b981' : isActive ? '#047857' : '#e2e8f0',
                        boxShadow: isActive ? '0 0 0 4px rgba(4,120,87,0.15)' : 'none',
                      }}>
                      {isDone ? <CheckCircle size={16} color="white" /> : <Icon size={15} color={isActive ? 'white' : '#94a3b8'} />}
                    </div>
                    <span style={{ fontSize: 11, color: isDone ? '#10b981' : isActive ? '#047857' : '#94a3b8', fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap' }}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2 mb-4 transition-all" style={{ background: isDone ? '#10b981' : '#e2e8f0' }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step panels */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>

            {/* ── Step 0: Organization Profile ── */}
            {step === 0 && (
              <div>
                <div className="px-7 py-5" style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                  <p style={{ color: '#0f172a', fontSize: 16, fontWeight: 600 }}>Organization Profile</p>
                  <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>Legal identity of the organization that will own this MEPN node.</p>
                </div>
                <div className="p-7 space-y-5">
                  <FormField label="Legal Organization Name" required hint="Full registered business name as it appears on incorporation documents.">
                    <input value={form.legalName} onChange={e => set('legalName', e.target.value)}
                      placeholder="e.g. TechBuild Sdn Bhd"
                      className="w-full px-3 py-2.5 rounded-xl" style={{ border: '1px solid #e2e8f0', fontSize: 14 }} />
                  </FormField>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Registration Number" hint="Business registration / company number.">
                      <input value={form.regNumber} onChange={e => set('regNumber', e.target.value)}
                        placeholder="e.g. 202001234567"
                        className="w-full px-3 py-2.5 rounded-xl" style={{ border: '1px solid #e2e8f0', fontSize: 14 }} />
                    </FormField>
                    <FormField label="Tax Identifier" hint="Tax registration number (optional at this stage).">
                      <input value={form.taxId} onChange={e => set('taxId', e.target.value)}
                        placeholder="e.g. C123456789"
                        className="w-full px-3 py-2.5 rounded-xl" style={{ border: '1px solid #e2e8f0', fontSize: 14 }} />
                    </FormField>
                  </div>
                  <FormField label="Primary Sector">
                    <select value={form.sector} onChange={e => set('sector', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl" style={{ border: '1px solid #e2e8f0', fontSize: 14 }}>
                      {SECTORS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </FormField>
                </div>
              </div>
            )}

            {/* ── Step 1: Compliance & Deployment ── */}
            {step === 1 && (
              <div>
                <div className="px-7 py-5" style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                  <p style={{ color: '#0f172a', fontSize: 16, fontWeight: 600 }}>Compliance & Deployment</p>
                  <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>Shariah profile and deployment configuration. These can be updated later by an authorized admin.</p>
                </div>
                <div className="p-7 space-y-6">
                  <FormField label="Shariah Profile" hint="Determines which mudarabah finance templates are available.">
                    <div className="space-y-2">
                      {SHARIAH_PROFILES.map(sp => (
                        <label key={sp.value} className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all"
                          style={{ background: form.shariahProfile === sp.value ? '#f0fdf4' : '#f8fafc', border: `1px solid ${form.shariahProfile === sp.value ? '#a7f3d0' : '#e2e8f0'}` }}>
                          <input type="radio" name="shariah" value={sp.value} checked={form.shariahProfile === sp.value}
                            onChange={() => set('shariahProfile', sp.value)} className="mt-0.5 shrink-0" />
                          <div>
                            <p style={{ color: '#0f172a', fontSize: 13, fontWeight: 500 }}>{sp.label}</p>
                            <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>{sp.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </FormField>
                  <FormField label="Deployment Mode" hint="How this MEPN node will be operated.">
                    <div className="space-y-2">
                      {DEPLOYMENT_MODES.map(dm => (
                        <label key={dm.value} className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all"
                          style={{ background: form.deploymentMode === dm.value ? '#eff6ff' : '#f8fafc', border: `1px solid ${form.deploymentMode === dm.value ? '#bfdbfe' : '#e2e8f0'}` }}>
                          <input type="radio" name="deploy" value={dm.value} checked={form.deploymentMode === dm.value}
                            onChange={() => set('deploymentMode', dm.value)} className="mt-0.5 shrink-0" />
                          <div>
                            <p style={{ color: '#0f172a', fontSize: 13, fontWeight: 500 }}>{dm.label}</p>
                            <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>{dm.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </FormField>
                </div>
              </div>
            )}

            {/* ── Step 2: Admin Account ── */}
            {step === 2 && (
              <div>
                <div className="px-7 py-5" style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                  <p style={{ color: '#0f172a', fontSize: 16, fontWeight: 600 }}>Admin Account</p>
                  <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>The first admin user is created as an ORG_ADMIN / SME Admin with full organization access.</p>
                </div>
                <div className="p-7 space-y-5">
                  <FormField label="Display Name" required>
                    <input value={form.adminName} onChange={e => set('adminName', e.target.value)}
                      placeholder="e.g. Ahmad Razali"
                      className="w-full px-3 py-2.5 rounded-xl" style={{ border: '1px solid #e2e8f0', fontSize: 14 }} />
                  </FormField>
                  <FormField label="Email Address" required hint="Used as the unique identity for this admin user. Must not already exist in the system.">
                    <input type="email" value={form.adminEmail} onChange={e => set('adminEmail', e.target.value)}
                      placeholder="e.g. admin@techbuild.my"
                      className="w-full px-3 py-2.5 rounded-xl" style={{ border: '1px solid #e2e8f0', fontSize: 14 }} />
                  </FormField>
                  <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: '#f0fdf4', border: '1px solid #a7f3d0' }}>
                    <CheckCircle size={14} color="#10b981" className="mt-0.5 shrink-0" />
                    <p style={{ color: '#047857', fontSize: 12 }}>
                      This account is created as an organization-scoped admin (ORG_ADMIN), not a global superuser.
                      Organization boundaries and workspace scopes are enforced from the first login.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Review & Create ── */}
            {step === 3 && !created && (
              <div>
                <div className="px-7 py-5" style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                  <p style={{ color: '#0f172a', fontSize: 16, fontWeight: 600 }}>Review & Create</p>
                  <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>Verify the configuration before creating the organization context.</p>
                </div>
                <div className="p-7 space-y-4">
                  <ReviewSection title="Organization">
                    <ReviewRow label="Legal name" value={form.legalName || '—'} />
                    <ReviewRow label="Reg number" value={form.regNumber || 'Not provided'} />
                    <ReviewRow label="Tax ID" value={form.taxId || 'Not provided'} />
                    <ReviewRow label="Sector" value={form.sector} />
                  </ReviewSection>
                  <ReviewSection title="Compliance & Deployment">
                    <ReviewRow label="Shariah profile" value={shariahProfile.label} />
                    <ReviewRow label="Deployment mode" value={deploymentMode.label} />
                  </ReviewSection>
                  <ReviewSection title="Admin Account">
                    <ReviewRow label="Name" value={form.adminName || '—'} />
                    <ReviewRow label="Email" value={form.adminEmail || '—'} />
                    <ReviewRow label="Role" value="ORG_ADMIN / SME Admin" />
                  </ReviewSection>

                  <div className="p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <p style={{ color: '#64748b', fontSize: 11, marginBottom: 6 }}>Records that will be created</p>
                    {['Organization', 'User', 'Role (ORG_ADMIN)', 'Membership', 'Default Workspace', 'AuditEvent · ORGANIZATION_CREATED', 'AuditEvent · USER_CREATED', 'AuditEvent · MEMBERSHIP_ASSIGNED'].map((r, i) => (
                      <div key={i} className="flex items-center gap-2 mb-1">
                        <div className="w-1 h-1 rounded-full" style={{ background: '#10b981' }} />
                        <span style={{ color: '#334155', fontSize: 12 }}>{r}</span>
                      </div>
                    ))}
                  </div>

                  {isCreating && (
                    <div className="flex items-center justify-center gap-3 py-4">
                      <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#10b981', borderTopColor: 'transparent' }} />
                      <span style={{ color: '#047857', fontSize: 13 }}>Creating organization context…</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Created success state ── */}
            {created && (
              <div className="p-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: '#f0fdf4', border: '2px solid #10b981' }}>
                  <CheckCircle size={32} color="#10b981" />
                </div>
                <p style={{ color: '#0f172a', fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Organization created</p>
                <p style={{ color: '#64748b', fontSize: 14 }}>{form.legalName} · Redirecting to dashboard…</p>
              </div>
            )}

            {/* Navigation footer */}
            {!created && (
              <div className="px-7 py-4 flex items-center justify-between" style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                <button
                  onClick={() => step > 0 ? setStep(s => s - 1) : onBack()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl hover:opacity-80 transition-all"
                  style={{ background: '#f1f5f9', color: '#475569', fontSize: 13 }}>
                  <ArrowLeft size={14} /> {step === 0 ? 'Back to landing' : 'Previous'}
                </button>
                {step < 3 ? (
                  <button
                    onClick={() => setStep(s => s + 1)}
                    disabled={!canNext()}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl hover:opacity-80 transition-all"
                    style={{ background: canNext() ? '#047857' : '#e2e8f0', color: canNext() ? 'white' : '#94a3b8', fontSize: 13, fontWeight: 500, cursor: canNext() ? 'pointer' : 'not-allowed' }}>
                    Next <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    onClick={handleCreate}
                    disabled={isCreating}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl hover:opacity-80 transition-all"
                    style={{ background: isCreating ? '#94a3b8' : '#047857', color: 'white', fontSize: 13, fontWeight: 500 }}>
                    {isCreating ? 'Creating…' : 'Create Organization'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ color: '#334155', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
      <div className="px-4 py-2.5" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <p style={{ color: '#64748b', fontSize: 12, fontWeight: 500 }}>{title}</p>
      </div>
      <div className="p-4 space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: '#94a3b8', fontSize: 13 }}>{label}</span>
      <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
