import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  BarChart2,
  Settings,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '@/components/ui/button'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transacoes', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/cartao', icon: CreditCard, label: 'Cartões' },
  { to: '/relatorio', icon: BarChart2, label: 'Relatórios' },
  { to: '/configurar', icon: Settings, label: 'Configurar' },
]

export function Sidebar(): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const logout = useAuthStore((s) => s.logout)
  const { theme, setTheme } = useTheme()

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={cn(
        'flex flex-col h-full border-r border-border bg-card transition-all duration-200 shrink-0 z-10',
        expanded ? 'w-56' : 'w-16',
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-14 border-b border-border px-4 overflow-hidden">
        <span className="font-bold text-lg text-primary tracking-tight shrink-0">
          {expanded ? 'GenFinds' : 'GF'}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={!expanded ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors overflow-hidden',
                !expanded && 'justify-center px-2',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            <Icon size={18} className="shrink-0" />
            <span
              className={cn(
                'whitespace-nowrap transition-all duration-200 overflow-hidden',
                expanded ? 'max-w-xs opacity-100' : 'max-w-0 opacity-0',
              )}
            >
              {label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border space-y-0.5 overflow-hidden">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={!expanded ? 'Alternar tema' : undefined}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium overflow-hidden',
            'text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
            !expanded && 'justify-center px-2',
          )}
        >
          {theme === 'dark' ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
          <span
            className={cn(
              'whitespace-nowrap transition-all duration-200 overflow-hidden',
              expanded ? 'max-w-xs opacity-100' : 'max-w-0 opacity-0',
            )}
          >
            {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          </span>
        </button>

        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          title={!expanded ? 'Sair' : undefined}
          className={cn(
            'w-full justify-start gap-3 text-muted-foreground hover:text-destructive overflow-hidden',
            !expanded && 'justify-center px-2',
          )}
        >
          <LogOut size={18} className="shrink-0" />
          <span
            className={cn(
              'whitespace-nowrap transition-all duration-200 overflow-hidden',
              expanded ? 'max-w-xs opacity-100' : 'max-w-0 opacity-0',
            )}
          >
            Sair
          </span>
        </Button>
      </div>
    </aside>
  )
}
