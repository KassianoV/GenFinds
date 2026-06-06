import React, { type ReactNode, Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { AppShell } from '../components/layout/AppShell'
import { CylonLoader } from '../components/ui/CylonLoader'

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
        <Route path="/auth" element={<AuthPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/transacoes" element={<TransacoesPage />} />
          <Route path="/cartao" element={<CartaoPage />} />
          <Route path="/relatorio" element={<RelatorioPage />} />
          <Route path="/configurar" element={<ConfigurarPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
