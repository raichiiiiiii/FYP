import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'

import { useAppSession } from './session'
import {
  AuditEntityScreen,
  AuditScreen,
  AuditSearchScreen,
} from '../features/audit/AuditScreen'
import { LoginPage } from '../features/auth/LoginPage'
import { InviteAcceptancePage } from '../features/auth/InviteAcceptancePage'
import { RequireAuth } from '../features/auth/RequireAuth'
import { Dashboard } from '../features/dashboard/Dashboard'
import { EvidenceRoute } from '../features/evidence/EvidenceRoute'
import { FinanceRoute } from '../features/finance/FinanceRoute'
import { GraphRoute } from '../features/graph/GraphRoute'
import { RolesAdmin } from '../features/identity/RolesAdmin'
import { IntegrationsRoute } from '../features/integrations/IntegrationsRoute'
import { OperationsRoute } from '../features/operations/OperationsRoute'
import { UsersAdmin } from '../features/identity/UsersAdmin'
import { OrgSetup } from '../features/organization/OrgSetup'
import { ProcurementRoute } from '../features/procurement/ProcurementRoute'
import { ReportsRoute } from '../features/reports/ReportsRoute'
import { AppShell } from '../layouts/AppShell'

function ProcurementRouteAdapter() {
  const { authorization, session } = useAppSession()
  const navigate = useNavigate()

  return (
    <ProcurementRoute
      session={session}
      navigate={(path) => navigate(path)}
      roleCodes={authorization.roleCodes}
    />
  )
}

function EvidenceRouteAdapter() {
  const { session } = useAppSession()

  return <EvidenceRoute session={session} />
}

function FinanceRouteAdapter() {
  const { session } = useAppSession()
  const navigate = useNavigate()

  return (
    <FinanceRoute
      session={session}
      navigate={(path) => navigate(path)}
    />
  )
}

function GraphRouteAdapter() {
  const { authorization, session } = useAppSession()

  return <GraphRoute session={session} roleCodes={authorization.roleCodes} />
}

function IntegrationsRouteAdapter() {
  const { authorization, session } = useAppSession()

  return (
    <IntegrationsRoute
      session={session}
      canRequestActions={
        authorization.roleCodes.includes('ORG_ADMIN') ||
        authorization.roleCodes.includes('DEVELOPER_INTEGRATOR')
      }
    />
  )
}

function OperationsRouteAdapter() {
  const { session } = useAppSession()

  return <OperationsRoute session={session} />
}

function ReportsRouteAdapter() {
  const { session } = useAppSession()

  return <ReportsRoute session={session} />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/login"
            element={
              <RequireAuth>
                <LoginPage />
              </RequireAuth>
            }
          />
          <Route
            path="/auth/invitations/accept"
            element={
              <RequireAuth>
                <InviteAcceptancePage />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/org/setup"
            element={
              <RequireAuth>
                <OrgSetup />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequireAuth>
                <UsersAdmin />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/roles"
            element={
              <RequireAuth>
                <RolesAdmin />
              </RequireAuth>
            }
          />
          <Route
            path="/procurement/*"
            element={
              <RequireAuth>
                <ProcurementRouteAdapter />
              </RequireAuth>
            }
          />
          <Route
            path="/evidence/*"
            element={
              <RequireAuth>
                <EvidenceRouteAdapter />
              </RequireAuth>
            }
          />
          <Route
            path="/finance/*"
            element={
              <RequireAuth>
                <FinanceRouteAdapter />
              </RequireAuth>
            }
          />
          <Route
            path="/graph/projects"
            element={
              <RequireAuth>
                <GraphRouteAdapter />
              </RequireAuth>
            }
          />
          <Route
            path="/integrations"
            element={
              <RequireAuth>
                <IntegrationsRouteAdapter />
              </RequireAuth>
            }
          />
          <Route
            path="/operations"
            element={
              <RequireAuth>
                <OperationsRouteAdapter />
              </RequireAuth>
            }
          />
          <Route
            path="/operations/health"
            element={
              <RequireAuth>
                <OperationsRouteAdapter />
              </RequireAuth>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireAuth>
                <ReportsRouteAdapter />
              </RequireAuth>
            }
          />
          <Route
            path="/audit"
            element={
              <RequireAuth>
                <AuditScreen />
              </RequireAuth>
            }
          />
          <Route
            path="/audit/search"
            element={
              <RequireAuth>
                <AuditSearchScreen />
              </RequireAuth>
            }
          />
          <Route
            path="/audit/entity/:entityType/:entityId"
            element={
              <RequireAuth>
                <AuditEntityScreen />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
