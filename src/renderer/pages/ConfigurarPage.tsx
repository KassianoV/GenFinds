import React from 'react'
import { Moon, Sun, LogOut } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '../stores/authStore'

export function ConfigurarPage(): React.JSX.Element {
  const { theme, setTheme } = useTheme()
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurar</h1>
        <p className="text-muted-foreground mt-1">Preferências do aplicativo</p>
      </div>

      <div className="space-y-3 max-w-sm">
        <Button
          variant="outline"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-full justify-start gap-3"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
        </Button>

        <Button variant="destructive" onClick={logout} className="w-full justify-start gap-3">
          <LogOut size={18} />
          Sair da conta
        </Button>
      </div>
    </div>
  )
}
