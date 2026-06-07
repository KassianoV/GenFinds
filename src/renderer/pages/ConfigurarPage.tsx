import React, { useState, useMemo } from 'react'
import { User, Lock, Tag, Plus, Pencil, Trash2, Eye, EyeOff, Moon, Sun, LogOut, Wallet, Check, X } from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { useAuthStore } from '../stores/authStore'
import { useCategorias, useTransacoesMes } from '../hooks/useTransacoes'
import {
  useUpdateNome,
  useChangePassword,
  useCreateCategoria,
  useUpdateCategoria,
  useDeleteCategoria,
} from '../hooks/useConfigurar'
import {
  useOrcamentos,
  useCreateOrcamento,
  useUpdateOrcamento,
  useDeleteOrcamento,
} from '../hooks/useOrcamento'
import { formatCurrencyBRL } from '../../lib/format'
import type { Categoria, Orcamento } from '../../types/database.types'

// ─── Constantes ───────────────────────────────────────────────────────────────

const CORES = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#ec4899', '#f43f5e', '#64748b', '#a16207',
]

type Aba = 'perfil' | 'categorias' | 'orcamento'

// ─── ColorPicker ──────────────────────────────────────────────────────────────

interface ColorPickerProps {
  value: string
  onChange: (cor: string) => void
}

function ColorPicker({ value, onChange }: ColorPickerProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {CORES.map((cor) => (
        <button
          key={cor}
          type="button"
          onClick={() => onChange(cor)}
          className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ring-offset-background ring-offset-2 ${
            value === cor ? 'ring-2 ring-foreground scale-110' : ''
          }`}
          style={{ backgroundColor: cor }}
        />
      ))}
      <div className="flex items-center gap-1.5 ml-1">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent p-0"
          title="Cor personalizada"
        />
        <span className="text-xs text-muted-foreground">Personalizada</span>
      </div>
    </div>
  )
}

// ─── CategoriaForm ────────────────────────────────────────────────────────────

interface CategoriaFormProps {
  initial?: { nome: string; tipo: 'receita' | 'despesa'; cor: string }
  onSubmit: (data: { nome: string; tipo: 'receita' | 'despesa'; cor: string }) => Promise<void>
  onCancel: () => void
  loading: boolean
  submitLabel: string
}

function CategoriaForm({
  initial,
  onSubmit,
  onCancel,
  loading,
  submitLabel,
}: CategoriaFormProps): React.JSX.Element {
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [tipo, setTipo] = useState<'receita' | 'despesa'>(initial?.tipo ?? 'despesa')
  const [cor, setCor] = useState(initial?.cor ?? CORES[5])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!nome.trim()) return
    await onSubmit({ nome: nome.trim(), tipo, cor })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-muted/40 rounded-xl border border-border p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Alimentação"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo</label>
          <div className="flex gap-2 h-[38px]">
            {(['despesa', 'receita'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`flex-1 text-xs font-medium rounded-lg border transition-colors ${
                  tipo === t
                    ? t === 'despesa'
                      ? 'bg-red-500/10 border-red-400/40 text-red-600 dark:text-red-400'
                      : 'bg-emerald-500/10 border-emerald-400/40 text-emerald-600 dark:text-emerald-400'
                    : 'border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                {t === 'despesa' ? 'Despesa' : 'Receita'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Cor</label>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-7 h-7 rounded-full border border-border shadow-sm" style={{ backgroundColor: cor }} />
          <span className="text-xs text-muted-foreground font-mono">{cor}</span>
        </div>
        <ColorPicker value={cor} onChange={setCor} />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-medium border border-border rounded-lg hover:bg-accent transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !nome.trim()}
          className="px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Salvando...' : submitLabel}
        </button>
      </div>
    </form>
  )
}

// ─── CategoriaRow ─────────────────────────────────────────────────────────────

interface CategoriaRowProps {
  categoria: Categoria
  onEdit: () => void
  onDelete: () => void
}

function CategoriaRow({ categoria, onEdit, onDelete }: CategoriaRowProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors group">
      <div
        className="w-4 h-4 rounded-full shrink-0 shadow-sm"
        style={{ backgroundColor: categoria.cor ?? '#64748b' }}
      />
      <p className="flex-1 text-sm font-medium text-foreground truncate">{categoria.nome}</p>
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
          categoria.tipo === 'receita'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-500/10 text-red-600 dark:text-red-400'
        }`}
      >
        {categoria.tipo === 'receita' ? 'Receita' : 'Despesa'}
      </span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── PerfilTab ────────────────────────────────────────────────────────────────

function PerfilTab(): React.JSX.Element {
  const user = useAuthStore((s) => s.currentUser)
  const logout = useAuthStore((s) => s.logout)
  const { theme, setTheme } = useTheme()
  const updateNome = useUpdateNome()
  const changePassword = useChangePassword()

  const [editingNome, setEditingNome] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [showSenhaAtual, setShowSenhaAtual] = useState(false)
  const [showNova, setShowNova] = useState(false)

  async function handleChangePassword(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (novaSenha !== confirmar) { toast.error('As senhas não coincidem'); return }
    if (novaSenha.length < 4) { toast.error('Nova senha deve ter ao menos 4 caracteres'); return }
    try {
      await changePassword.mutateAsync({ senhaAtual, novaSenha })
      toast.success('Senha alterada com sucesso')
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmar('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar senha')
    }
  }

  const initials = (user?.nome ?? 'GF').slice(0, 2).toUpperCase()

  async function handleSaveNome(): Promise<void> {
    if (!novoNome.trim() || novoNome.trim() === user?.nome) { setEditingNome(false); return }
    try {
      await updateNome.mutateAsync(novoNome.trim())
      toast.success('Nome atualizado')
      setEditingNome(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar nome')
    }
  }

  function startEditNome(): void {
    setNovoNome(user?.nome ?? '')
    setEditingNome(true)
  }

  return (
    <div className="p-6 space-y-5">
      {/* Avatar + info */}
      <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-primary">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          {editingNome ? (
            <div className="flex items-center gap-2">
              <input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNome(); if (e.key === 'Escape') setEditingNome(false) }}
                className="flex-1 px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
              <button
                onClick={handleSaveNome}
                disabled={updateNome.isPending}
                className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => setEditingNome(false)}
                className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/nome">
              <p className="text-base font-semibold text-foreground truncate">{user?.nome ?? '—'}</p>
              <button
                onClick={startEditNome}
                className="p-1 rounded-md opacity-0 group-hover/nome:opacity-100 hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
                title="Editar nome"
              >
                <Pencil size={13} />
              </button>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">Conta local · GenFins</p>
        </div>
      </div>

      {/* Trocar senha + Preferências lado a lado em telas grandes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Trocar senha */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Trocar senha</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Senha atual</label>
              <div className="relative">
                <input
                  type={showSenhaAtual ? 'text' : 'password'}
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-10 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowSenhaAtual((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSenhaAtual ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nova senha</label>
              <div className="relative">
                <input
                  type={showNova ? 'text' : 'password'}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-10 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowNova((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNova ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Confirmar nova senha
              </label>
              <input
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <button
              type="submit"
              disabled={changePassword.isPending || !senhaAtual || !novaSenha || !confirmar}
              className="w-full py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 mt-1"
            >
              {changePassword.isPending ? 'Alterando...' : 'Alterar senha'}
            </button>
          </form>
        </div>

        {/* Preferências */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-2.5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Preferências</h2>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm border border-border rounded-lg hover:bg-accent transition-colors text-foreground"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            {theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm border border-red-200 dark:border-red-900/40 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
          >
            <LogOut size={15} />
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CategoriasTab ────────────────────────────────────────────────────────────

function CategoriasTab(): React.JSX.Element {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const { data: categorias = [], isLoading } = useCategorias()
  const createCategoria = useCreateCategoria()
  const updateCategoria = useUpdateCategoria()
  const deleteCategoria = useDeleteCategoria()

  const [filtro, setFiltro] = useState<'todas' | 'receita' | 'despesa'>('todas')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const filtradas = categorias.filter((c) => filtro === 'todas' || c.tipo === filtro)

  async function handleCreate(data: {
    nome: string
    tipo: 'receita' | 'despesa'
    cor: string
  }): Promise<void> {
    if (!userId) return
    try {
      await createCategoria.mutateAsync({ ...data, usuario_id: userId })
      toast.success('Categoria criada')
      setShowForm(false)
    } catch {
      toast.error('Erro ao criar categoria')
    }
  }

  async function handleUpdate(data: {
    nome: string
    tipo: 'receita' | 'despesa'
    cor: string
  }): Promise<void> {
    if (!editingId) return
    try {
      await updateCategoria.mutateAsync({ id: editingId, updates: data })
      toast.success('Categoria atualizada')
      setEditingId(null)
    } catch {
      toast.error('Erro ao atualizar categoria')
    }
  }

  async function handleDelete(id: number): Promise<void> {
    try {
      await deleteCategoria.mutateAsync(id)
      toast.success('Categoria removida')
      setDeletingId(null)
    } catch {
      toast.error('Erro ao remover categoria')
    }
  }

  return (
    <div className="p-6 space-y-4">
      {/* Filtros + botão nova */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(['todas', 'despesa', 'receita'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filtro === f
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'todas' ? 'Todas' : f === 'despesa' ? 'Despesa' : 'Receita'}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setShowForm(true); setEditingId(null) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          <Plus size={13} />
          Nova categoria
        </button>
      </div>

      {/* Formulário de criação */}
      {showForm && !editingId && (
        <CategoriaForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          loading={createCategoria.isPending}
          submitLabel="Criar categoria"
        />
      )}

      {/* Contador */}
      {!isLoading && filtradas.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {filtradas.length} categoria{filtradas.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Lista */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="w-4 h-4 rounded-full bg-muted shrink-0" />
                <div className="flex-1 h-3 bg-muted rounded" />
                <div className="w-14 h-5 bg-muted rounded-full" />
              </div>
            ))}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Tag size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Nenhuma categoria</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filtro === 'todas'
                ? 'Crie sua primeira categoria'
                : `Nenhuma categoria de ${filtro}`}
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-xs text-primary hover:underline"
            >
              + Nova categoria
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtradas.map((cat) =>
              editingId === cat.id ? (
                <div key={cat.id} className="p-4">
                  <CategoriaForm
                    initial={{ nome: cat.nome, tipo: cat.tipo, cor: cat.cor ?? CORES[0] }}
                    onSubmit={handleUpdate}
                    onCancel={() => setEditingId(null)}
                    loading={updateCategoria.isPending}
                    submitLabel="Salvar"
                  />
                </div>
              ) : (
                <CategoriaRow
                  key={cat.id}
                  categoria={cat}
                  onEdit={() => { setEditingId(cat.id); setShowForm(false) }}
                  onDelete={() => setDeletingId(cat.id)}
                />
              ),
            )}
          </div>
        )}
      </div>

      {/* Confirm delete */}
      {deletingId !== null && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setDeletingId(null)}
        >
          <div
            className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <Trash2 size={16} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Remover categoria</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Transações vinculadas não serão apagadas.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs font-medium border border-border rounded-lg hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                disabled={deleteCategoria.isPending}
                className="px-4 py-2 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleteCategoria.isPending ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── OrcamentoTab ────────────────────────────────────────────────────────────

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface OrcamentoFormProps {
  categorias: Categoria[]
  idsUsados: number[]
  initial?: { categoriaId: string; valor: string }
  onSubmit: (categoriaId: number, valor: number) => Promise<void>
  onCancel: () => void
  loading: boolean
  submitLabel: string
}

function OrcamentoForm({
  categorias,
  idsUsados,
  initial,
  onSubmit,
  onCancel,
  loading,
  submitLabel,
}: OrcamentoFormProps): React.JSX.Element {
  const [catId, setCatId] = useState(initial?.categoriaId ?? '')
  const [valor, setValor] = useState(initial?.valor ?? '')

  const disponiveis = initial
    ? categorias
    : categorias.filter((c) => !idsUsados.includes(c.id))

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    const v = parseFloat(valor.replace(',', '.'))
    if (!catId) { toast.error('Selecione uma categoria'); return }
    if (isNaN(v) || v <= 0) { toast.error('Valor inválido'); return }
    await onSubmit(Number(catId), v)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-muted/40 rounded-xl border border-border p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Categoria</label>
          <select
            value={catId}
            onChange={(e) => setCatId(e.target.value)}
            disabled={!!initial}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          >
            <option value="">Selecionar…</option>
            {disponiveis.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.nome} ({c.tipo === 'despesa' ? 'Despesa' : 'Receita'})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Valor planejado (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus={!!initial}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-medium border border-border rounded-lg hover:bg-accent transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Salvando...' : submitLabel}
        </button>
      </div>
    </form>
  )
}

function OrcamentoTab(): React.JSX.Element {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const ANOS = [hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1]

  const { data: orcamentos = [], isLoading } = useOrcamentos(mes, ano)
  const { data: categorias = [] } = useCategorias()
  const { data: transacoes = [] } = useTransacoesMes(mes, ano)
  const createOrcamento = useCreateOrcamento()
  const updateOrcamento = useUpdateOrcamento()
  const deleteOrcamento = useDeleteOrcamento()

  // Soma de gastos reais por categoria_id no mês
  const gastosPorCategoria = useMemo(() => {
    const map = new Map<number, number>()
    for (const t of transacoes) {
      map.set(t.categoria_id, (map.get(t.categoria_id) ?? 0) + t.valor)
    }
    return map
  }, [transacoes])

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const idsUsados = orcamentos.map((o) => o.categoria_id)
  const totalPlanejado = orcamentos.reduce((acc, o) => acc + o.valor_planejado, 0)

  function getCategoria(id: number): Categoria | undefined {
    return categorias.find((c) => c.id === id)
  }

  async function handleCreate(categoriaId: number, valor: number): Promise<void> {
    if (!userId) return
    try {
      await createOrcamento.mutateAsync({
        usuario_id: userId,
        categoria_id: categoriaId,
        valor_planejado: valor,
        mes,
        ano,
      })
      toast.success('Orçamento criado')
      setShowForm(false)
    } catch { toast.error('Erro ao criar orçamento') }
  }

  async function handleUpdate(id: number, categoriaId: number, valor: number): Promise<void> {
    try {
      await updateOrcamento.mutateAsync({ id, updates: { valor_planejado: valor } })
      toast.success('Orçamento atualizado')
      setEditingId(null)
    } catch { toast.error('Erro ao atualizar orçamento') }
  }

  async function handleDelete(id: number): Promise<void> {
    try {
      await deleteOrcamento.mutateAsync(id)
      toast.success('Orçamento removido')
      setDeletingId(null)
    } catch { toast.error('Erro ao remover orçamento') }
  }

  return (
    <div className="p-6 space-y-4">
      {/* Seletor de período + botão novo */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="px-2.5 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <div className="flex gap-0.5 flex-wrap">
            {MESES_ABREV.map((m, i) => (
              <button
                key={m}
                onClick={() => setMes(i + 1)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  mes === i + 1
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null) }}
          disabled={categorias.length === 0 || idsUsados.length === categorias.length}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
        >
          <Plus size={13} />
          Novo orçamento
        </button>
      </div>

      {/* Formulário de criação */}
      {showForm && !editingId && (
        <OrcamentoForm
          categorias={categorias}
          idsUsados={idsUsados}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          loading={createOrcamento.isPending}
          submitLabel="Criar"
        />
      )}

      {/* Resumo total */}
      {!isLoading && orcamentos.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total planejado</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{formatCurrencyBRL(totalPlanejado)}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {orcamentos.length} categoria{orcamentos.length !== 1 ? 's' : ''} · {MESES_ABREV[mes - 1]} {ano}
          </p>
        </div>
      )}

      {/* Lista */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="w-4 h-4 rounded-full bg-muted shrink-0" />
                <div className="flex-1 h-3 bg-muted rounded" />
                <div className="w-20 h-3 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : orcamentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Wallet size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Nenhum orçamento para {MESES_ABREV[mes - 1]} {ano}</p>
            <p className="text-xs text-muted-foreground mt-1">Defina metas de gasto por categoria</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-xs text-primary hover:underline">
              + Novo orçamento
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {orcamentos.map((orc) => {
              const cat = getCategoria(orc.categoria_id)
              if (editingId === orc.id) {
                return (
                  <div key={orc.id} className="p-4">
                    <OrcamentoForm
                      categorias={categorias}
                      idsUsados={idsUsados}
                      initial={{ categoriaId: String(orc.categoria_id), valor: String(orc.valor_planejado) }}
                      onSubmit={(catId, valor) => handleUpdate(orc.id, catId, valor)}
                      onCancel={() => setEditingId(null)}
                      loading={updateOrcamento.isPending}
                      submitLabel="Salvar"
                    />
                  </div>
                )
              }
              const gasto = gastosPorCategoria.get(orc.categoria_id) ?? 0
              const pct = orc.valor_planejado > 0 ? (gasto / orc.valor_planejado) * 100 : 0
              const restante = orc.valor_planejado - gasto
              const barColor =
                pct >= 100 ? '#ef4444' : pct >= 90 ? '#f97316' : pct >= 70 ? '#eab308' : cat?.cor ?? '#22c55e'

              return (
                <div key={orc.id} className="px-4 py-4 hover:bg-accent/40 transition-colors group">
                  {/* Cabeçalho da linha */}
                  <div className="flex items-center gap-3 mb-2.5">
                    <div
                      className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: cat?.cor ?? '#64748b' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{cat?.nome ?? '—'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        <span className={pct >= 100 ? 'text-red-500 font-semibold' : 'text-foreground font-semibold'}>
                          {formatCurrencyBRL(gasto)}
                        </span>
                        {' / '}
                        {formatCurrencyBRL(orc.valor_planejado)}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(orc.id); setShowForm(false) }}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeletingId(orc.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="ml-7">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-xs text-muted-foreground">{pct.toFixed(0)}% utilizado</span>
                      <span className={`text-xs font-medium ${restante < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {restante < 0
                          ? `${formatCurrencyBRL(Math.abs(restante))} acima do limite`
                          : `${formatCurrencyBRL(restante)} restante`}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Confirm delete */}
      {deletingId !== null && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setDeletingId(null)}
        >
          <div
            className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <Trash2 size={16} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Remover orçamento</h3>
                <p className="text-xs text-muted-foreground mt-1">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs font-medium border border-border rounded-lg hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                disabled={deleteOrcamento.isPending}
                className="px-4 py-2 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleteOrcamento.isPending ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ConfigurarPage ───────────────────────────────────────────────────────────

export function ConfigurarPage(): React.JSX.Element {
  const [aba, setAba] = useState<Aba>('perfil')

  const TABS: { id: Aba; label: string; icon: React.ReactNode }[] = [
    { id: 'perfil', label: 'Perfil', icon: <User size={14} /> },
    { id: 'categorias', label: 'Categorias', icon: <Tag size={14} /> },
    { id: 'orcamento', label: 'Orçamento', icon: <Wallet size={14} /> },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-0 shrink-0">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-foreground tracking-tight">Configurações</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Gerencie seu perfil, categorias e orçamentos</p>
        </div>

        <div className="flex gap-0 border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAba(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                aba === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {aba === 'perfil' && <PerfilTab />}
        {aba === 'categorias' && <CategoriasTab />}
        {aba === 'orcamento' && <OrcamentoTab />}
      </div>
    </div>
  )
}
