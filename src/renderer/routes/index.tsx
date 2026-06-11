import React, { type ReactNode, Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { AppShell } from '../components/layout/AppShell'
import { CylonLoader } from '../components/ui/CylonLoader'
import { ErrorBoundary } from '../components/shared/ErrorBoundary'

const AuthPage = lazy(() => import('../pages/AuthPage').then((m) => ({ default: m.AuthPage })))
const DashboardPage = lazy(() =>
  import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
)
const TransacoesPage = lazy(() =>
  import('../pages/TransacoesPage').then((m) => ({ default: m.TransacoesPage }))
)
const CartaoPage = lazy(() =>
  import('../pages/CartaoPage').then((m) => ({ default: m.CartaoPage }))
)
const RelatorioPage = lazy(() =>
  import('../pages/RelatorioPage').then((m) => ({ default: m.RelatorioPage }))
)
const ConfigurarPage = lazy(() =>
  import('../pages/ConfigurarPage').then((m) => ({ default: m.ConfigurarPage }))
)

function PageLoader(): React.JSX.Element {
  return <CylonLoader />
}

function ProtectedRoute({ children }: { children: ReactNode }): React.JSX.Element {
  const currentUser = useAuthStore((s) => s.currentUser)
  if (!currentUser) return <Navigate to="/auth" replace />
  return <>{children}</>
}

export function AppRoutes(): React.JSX.Element {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/auth" element={<ErrorBoundary><AuthPage /></ErrorBoundary>} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
          <Route path="/transacoes" element={<ErrorBoundary><TransacoesPage /></ErrorBoundary>} />
          <Route path="/cartao" element={<ErrorBoundary><CartaoPage /></ErrorBoundary>} />
          <Route path="/relatorio" element={<ErrorBoundary><RelatorioPage /></ErrorBoundary>} />
          <Route path="/configurar" element={<ErrorBoundary><ConfigurarPage /></ErrorBoundary>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
