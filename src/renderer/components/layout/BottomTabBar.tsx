import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, CreditCard, BarChart2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Início' },
  { to: '/transacoes', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/cartao', icon: CreditCard, label: 'Cartões' },
  { to: '/relatorio', icon: BarChart2, label: 'Relatórios' },
  { to: '/configurar', icon: Settings, label: 'Configurar' },
]

export function BottomTabBar(): React.JSX.Element {
  return (
    <div
      className="fixed left-4 right-4 z-50"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
    >
      <nav className="flex rounded-2xl border border-border bg-card/80 backdrop-blur-md shadow-xl px-2 py-1">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'p-1.5 rounded-xl transition-all duration-200',
                    isActive ? 'bg-primary/15 scale-110' : 'scale-100',
                  )}
                >
                  <Icon size={20} />
                </span>
                <span className="transition-colors duration-200 text-[10px]">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
