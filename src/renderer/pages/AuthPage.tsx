import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Moon, Sun } from 'lucide-react'
import appIcon from '../assets/icon.png'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '../stores/authStore'
import { db } from '../services/database'

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

export function AuthPage(): React.JSX.Element {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.currentUser)
  const loginFn = useAuthStore((s) => s.login)
  const registerFn = useAuthStore((s) => s.register)
  const { theme, setTheme } = useTheme()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [checkingUser, setCheckingUser] = useState(true)

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard', { replace: true })
      return
    }
    db.auth.checkUserExists().then((result) => {
      if (result.success && !result.data) setMode('register')
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

  if (checkingUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
              {mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}
            </p>
          </div>
        </div>

        {mode === 'login' ? (
          <form onSubmit={onLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-nome">Nome</Label>
              <Input id="login-nome" placeholder="Seu nome" {...loginForm.register('nome')} />
              {loginForm.formState.errors.nome && (
                <p className="text-xs text-destructive">
                  {loginForm.formState.errors.nome.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-senha">Senha</Label>
              <Input
                id="login-senha"
                type="password"
                placeholder="Sua senha"
                {...loginForm.register('senha')}
              />
              {loginForm.formState.errors.senha && (
                <p className="text-xs text-destructive">
                  {loginForm.formState.errors.senha.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
              {loginForm.formState.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Entrar
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Não tem conta?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-primary hover:underline font-medium"
              >
                Criar conta
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={onRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-nome">Nome</Label>
              <Input id="reg-nome" placeholder="Seu nome" {...registerForm.register('nome')} />
              {registerForm.formState.errors.nome && (
                <p className="text-xs text-destructive">
                  {registerForm.formState.errors.nome.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-senha">Senha</Label>
              <Input
                id="reg-senha"
                type="password"
                placeholder="Mínimo 8 caracteres"
                {...registerForm.register('senha')}
              />
              {registerForm.formState.errors.senha && (
                <p className="text-xs text-destructive">
                  {registerForm.formState.errors.senha.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-confirmar">Confirmar senha</Label>
              <Input
                id="reg-confirmar"
                type="password"
                placeholder="Repita a senha"
                {...registerForm.register('confirmarSenha')}
              />
              {registerForm.formState.errors.confirmarSenha && (
                <p className="text-xs text-destructive">
                  {registerForm.formState.errors.confirmarSenha.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={registerForm.formState.isSubmitting}>
              {registerForm.formState.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Criar conta
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-primary hover:underline font-medium"
              >
                Entrar
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
