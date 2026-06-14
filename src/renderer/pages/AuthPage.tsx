import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Moon, Sun, Eye, EyeOff, Wifi, UserPlus, ArrowLeft } from 'lucide-react'
import appIcon from '../assets/icon.png'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '../stores/authStore'
import { db } from '../services/database'
import { isMobile } from '../services/platform'
import { QRScanner } from '../components/shared/QRScanner'
import { pairAndSync, type QRPayload } from '../services/sync/mobileSyncService'

const loginSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  senha: z.string().min(1, 'Senha obrigatória')
})

const registerSchema = z
  .object({
    nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    senha: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
    confirmarSenha: z.string()
  })
  .refine((d) => d.senha === d.confirmarSenha, {
    message: 'Senhas não coincidem',
    path: ['confirmarSenha']
  })

type LoginData = z.infer<typeof loginSchema>
type RegisterData = z.infer<typeof registerSchema>
type Mode = 'login' | 'register' | 'welcome' | 'qr-scan' | 'syncing'

export function AuthPage(): React.JSX.Element {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.currentUser)
  const loginFn = useAuthStore((s) => s.login)
  const registerFn = useAuthStore((s) => s.register)
  const { theme, setTheme } = useTheme()
  const [mode, setMode] = useState<Mode>('login')
  const [checkingUser, setCheckingUser] = useState(true)
  const [showLoginSenha, setShowLoginSenha] = useState(false)
  const [showSenha, setShowSenha] = useState(false)
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard', { replace: true })
      return
    }
    db.auth.checkUserExists().then((result) => {
      if (result.success && !result.data) {
        // Sem usuário local: em mobile mostra a tela de boas-vindas,
        // no desktop vai direto para o cadastro
        setMode(isMobile() ? 'welcome' : 'register')
      }
      setCheckingUser(false)
    })
  }, [currentUser, navigate])

  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterData>({ resolver: zodResolver(registerSchema) })

  const onLogin = loginForm.handleSubmit(async ({ nome, senha }) => {
    const result = await loginFn(nome, senha)
    if (result.success) {
      navigate('/dashboard', { replace: true })
    } else {
      toast.error(result.error ?? 'Erro ao fazer login')
    }
  })

  const onRegister = registerForm.handleSubmit(async ({ nome, senha }) => {
    const result = await registerFn(nome, senha)
    if (result.success) {
      navigate('/dashboard', { replace: true })
    } else {
      toast.error(result.error ?? 'Erro ao criar conta')
    }
  })

  async function handleQRScan(raw: string): Promise<void> {
    setSyncError(null)
    setMode('syncing')
    try {
      const qrPayload = JSON.parse(raw) as QRPayload
      if (!qrPayload.ip || !qrPayload.port || !qrPayload.token) {
        throw new Error('QR code inválido')
      }
      const deviceName = 'Android · ' + (navigator.userAgent.match(/Android [0-9.]+/) ?? ['Android'])[0]
      const { userName, deviceToken } = await pairAndSync(qrPayload, deviceName)
      // Login automático com o token gerado durante o sync
      const result = await loginFn(userName, deviceToken)
      if (result.success) {
        toast.success('Sincronizado com sucesso!')
        navigate('/dashboard', { replace: true })
      } else {
        throw new Error('Erro ao autenticar após sincronização')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro na sincronização'
      setSyncError(msg)
      setMode('qr-scan')
    }
  }

  if (checkingUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Tela de câmera QR — ocupa tela inteira
  if (mode === 'qr-scan') {
    return (
      <div>
        {syncError && (
          <div className="fixed top-4 left-4 right-4 z-[60] bg-destructive text-destructive-foreground text-sm px-4 py-2 rounded-lg">
            {syncError}
          </div>
        )}
        <QRScanner
          onScan={handleQRScan}
          onCancel={() => { setSyncError(null); setMode('welcome') }}
        />
      </div>
    )
  }

  // Tela de aguardando sync
  if (mode === 'syncing') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-foreground font-medium">Sincronizando dados do desktop…</p>
        <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos</p>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="absolute top-4 right-4 p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src={appIcon} alt="GenFinds" className="h-16 w-16 rounded-2xl" />
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-bold text-primary">GenFinds</h1>
            <p className="text-muted-foreground text-sm">
              {mode === 'welcome' && 'Bem-vindo ao GenFinds'}
              {mode === 'login' && 'Entre na sua conta'}
              {mode === 'register' && 'Crie sua conta'}
            </p>
          </div>
        </div>

        {/* Tela de boas-vindas — mobile sem usuário */}
        {mode === 'welcome' && (
          <div className="space-y-3">
            <button
              onClick={() => setMode('qr-scan')}
              className="w-full flex items-center gap-4 p-4 bg-primary/10 border border-primary/30 rounded-xl hover:bg-primary/15 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Wifi size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Conectar ao desktop</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Já tenho conta — escanear QR do computador
                </p>
              </div>
            </button>

            <button
              onClick={() => setMode('register')}
              className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:bg-accent transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <UserPlus size={20} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Criar nova conta</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Primeiro uso — começar do zero no celular
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Login */}
        {mode === 'login' && (
          <form onSubmit={onLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-nome">Nome</Label>
              <Input id="login-nome" placeholder="Seu nome" {...loginForm.register('nome')} />
              {loginForm.formState.errors.nome && (
                <p className="text-xs text-destructive">{loginForm.formState.errors.nome.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-senha">Senha</Label>
              <div className="relative">
                <Input
                  id="login-senha"
                  type={showLoginSenha ? 'text' : 'password'}
                  placeholder="Sua senha"
                  className="pr-10"
                  {...loginForm.register('senha')}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showLoginSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {loginForm.formState.errors.senha && (
                <p className="text-xs text-destructive">{loginForm.formState.errors.senha.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
              {loginForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>

            {/* Em mobile, oferece opção de re-parear via QR */}
            {isMobile() && (
              <button
                type="button"
                onClick={() => setMode('qr-scan')}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-primary hover:underline"
              >
                <Wifi size={14} />
                Entrar via QR do desktop
              </button>
            )}

            <p className="text-center text-sm text-muted-foreground">
              Não tem conta?{' '}
              <button type="button" onClick={() => setMode('register')} className="text-primary hover:underline font-medium">
                Criar conta
              </button>
            </p>
          </form>
        )}

        {/* Cadastro */}
        {mode === 'register' && (
          <form onSubmit={onRegister} className="space-y-4">
            {isMobile() && (
              <button
                type="button"
                onClick={() => setMode('welcome')}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
              >
                <ArrowLeft size={13} /> Voltar
              </button>
            )}

            <div className="space-y-2">
              <Label htmlFor="reg-nome">Nome</Label>
              <Input id="reg-nome" placeholder="Seu nome" {...registerForm.register('nome')} />
              {registerForm.formState.errors.nome && (
                <p className="text-xs text-destructive">{registerForm.formState.errors.nome.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-senha">Senha</Label>
              <div className="relative">
                <Input
                  id="reg-senha"
                  type={showSenha ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  className="pr-10"
                  {...registerForm.register('senha')}
                />
                <button type="button" onClick={() => setShowSenha((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {registerForm.formState.errors.senha && (
                <p className="text-xs text-destructive">{registerForm.formState.errors.senha.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-confirmar">Confirmar senha</Label>
              <div className="relative">
                <Input
                  id="reg-confirmar"
                  type={showConfirmarSenha ? 'text' : 'password'}
                  placeholder="Repita a senha"
                  className="pr-10"
                  {...registerForm.register('confirmarSenha')}
                />
                <button type="button" onClick={() => setShowConfirmarSenha((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirmarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {registerForm.formState.errors.confirmarSenha && (
                <p className="text-xs text-destructive">{registerForm.formState.errors.confirmarSenha.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={registerForm.formState.isSubmitting}>
              {registerForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar conta
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{' '}
              <button type="button" onClick={() => setMode('login')} className="text-primary hover:underline font-medium">
                Entrar
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
