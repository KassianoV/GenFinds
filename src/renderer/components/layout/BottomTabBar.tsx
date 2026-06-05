import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, CreditCard, BarChart2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Início' },
  { to: '/transacoes', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/cartao', icon: CreditCard, label: 'Cartões' },
  { to: '/relatorio', icon: BarChart2, label: 'Relatórios' },
  { to: '/configurar', icon: Settings, label: 'Config' }
]

export function BottomTabBar(): React.JSX.Element {
  return (
    <nav
      className="flex border-t border-border bg-card shrink-0"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-13 text-xs font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )
          }
        >
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
