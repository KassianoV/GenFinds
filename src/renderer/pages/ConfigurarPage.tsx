import React from 'react'
import { Moon, Sun, LogOut, Smartphone } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '../stores/authStore'
import { toggleDevMobile, isDevMobileActive } from '../services/platform'

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

        {import.meta.env.DEV && (
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Ferramentas de desenvolvimento</p>
            <Button
              variant="outline"
              onClick={toggleDevMobile}
              className="w-full justify-start gap-3"
            >
              <Smartphone size={18} />
              {isDevMobileActive() ? 'Desativar mock mobile' : 'Ativar mock mobile'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
