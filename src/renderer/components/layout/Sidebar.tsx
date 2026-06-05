import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  Sun
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
  { to: '/configurar', icon: Settings, label: 'Configurar' }
]

export function Sidebar(): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false)
  const logout = useAuthStore((s) => s.logout)
  const { theme, setTheme } = useTheme()

  return (
    <aside
      className={cn(
        'flex flex-col h-full border-r border-border bg-card transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="flex items-center justify-between px-4 h-14 border-b border-border">
        {!collapsed && (
          <span className="font-bold text-lg text-primary tracking-tight">GenFinds</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground',
            collapsed && 'mx-auto'
          )}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-border space-y-0.5">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={collapsed ? 'Alternar tema' : undefined}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium',
            'text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
            collapsed && 'justify-center px-2'
          )}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {!collapsed && <span>{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>}
        </button>

        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          title={collapsed ? 'Sair' : undefined}
          className={cn(
            'w-full justify-start gap-3 text-muted-foreground hover:text-destructive',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </div>
    </aside>
  )
}
