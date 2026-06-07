import React, { useState, useMemo, useCallback } from 'react'
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Receipt,
  CalendarDays,
  Layers,
  Check,
} from 'lucide-react'
import { CartaoModal } from '../components/cartao/CartaoModal'
import { FaturaModal } from '../components/cartao/FaturaModal'
import {
  useCartoes,
  useDeleteCartao,
  useUpdateCartao,
  useTransacoesCartao,
  useDeleteFatura,
  useTodasTransacoesCartao,
} from '../hooks/useCartao'
import { formatCurrencyBRL } from '../../lib/format'
import type { Cartao, TransacaoCartaoCompleta } from '../../types/database.types'
import { toast } from 'sonner'
import { PullToRefresh } from '../components/layout/PullToRefresh'
import { Skeleton, SkeletonListRow } from '../components/ui/Skeleton'

// ─── Constantes ───────────────────────────────────────────────────────────────

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MESES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const ANOS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

const CARD_GRADIENTS = [
  'from-blue-600 to-indigo-700',
  'from-violet-600 to-purple-700',
  'from-emerald-500 to-teal-700',
  'from-rose-500 to-pink-700',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-sky-700',
]

const STATUS_CONFIG: Record<Cartao['status'], { label: string; className: string }> = {
  aberta: { label: 'Aberta', className: 'bg-emerald-500/20 text-emerald-300' },
  fechada: { label: 'Fechada', className: 'bg-amber-500/20 text-amber-300' },
  paga: { label: 'Paga', className: 'bg-blue-500/20 text-blue-300' },
  pendente: { label: 'Pendente', className: 'bg-red-500/20 text-red-300' },
}

type Aba = 'cartoes' | 'fatura' | 'parcela'

// ─── CartaoCard ───────────────────────────────────────────────────────────────

interface CartaoCardProps {
  cartao: Cartao
  index: number
  onEdit: () => void
  onDelete: () => void
  onMarkAsPaid?: () => void
}

function CartaoCard({ cartao, index, onEdit, onDelete, onMarkAsPaid }: CartaoCardProps): React.JSX.Element {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length]
  const status = STATUS_CONFIG[cartao.status]

  const cardStyle = cartao.cor
    ? { background: `linear-gradient(135deg, ${cartao.cor}f0, ${cartao.cor}99)` }
    : undefined
  const cardClass = `relative rounded-2xl p-5 text-white overflow-hidden group select-none ${
    cartao.cor ? '' : `bg-gradient-to-br ${gradient}`
  }`

  return (
    <div className={cardClass} style={cardStyle}>
      <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-6 -left-4 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-white/70" />
            <p className="font-bold text-base leading-tight">{cartao.nome}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.className}`}>
            {status.label}
          </span>
        </div>

        <div className="mb-5">
          <p className="text-white/60 text-xs mb-0.5">Fatura atual</p>
          <p className="text-2xl font-bold tracking-tight">{formatCurrencyBRL(cartao.valor)}</p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs">Vence dia {cartao.vencimento} de cada mês</p>
            {cartao.status === 'fechada' && (
              <p className="text-amber-300 text-xs mt-0.5 font-medium">Fatura fechada · aguardando vencimento</p>
            )}
            {cartao.status === 'pendente' && (
              <p className="text-red-300 text-xs mt-0.5 font-medium">Pagamento pendente</p>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {cartao.status === 'pendente' && onMarkAsPaid && (
              <button
                onClick={onMarkAsPaid}
                className="p-1.5 rounded-lg bg-emerald-500/70 hover:bg-emerald-500 transition-colors"
                title="Marcar como pago"
              >
                <Check size={12} />
              </button>
            )}
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              title="Editar"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-red-500/60 transition-colors"
              title="Remover"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── FaturaRow ────────────────────────────────────────────────────────────────

interface FaturaRowProps {
  transacao: TransacaoCartaoCompleta
  onDelete: () => void
}

function FaturaRow({ transacao, onDelete }: FaturaRowProps): React.JSX.Element {
  const data = new Date(transacao.data + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
  const eParcela = transacao.parcelas > 1

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">{transacao.descricao}</p>
          {eParcela && (
            <span className="shrink-0 text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
              {transacao.parcela_atual}/{transacao.parcelas}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {transacao.categoria_nome ?? 'Sem categoria'} · {data}
        </p>
      </div>

      <span className="text-sm font-semibold text-red-500 shrink-0">
        -{formatCurrencyBRL(transacao.valor)}
      </span>

      <button
        onClick={onDelete}
        className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-all shrink-0"
        title="Excluir"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ─── ConfirmDeleteDialog ──────────────────────────────────────────────────────

interface ConfirmDeleteProps {
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

function ConfirmDeleteDialog({ onConfirm, onCancel, loading }: ConfirmDeleteProps): React.JSX.Element {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 mt-0.5">
            <Trash2 size={16} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Confirmar exclusão</h3>
            <p className="text-xs text-muted-foreground mt-1">Esta ação não pode ser desfeita.</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium border border-border rounded-lg hover:bg-accent transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tipo de compra parcelada agrupada ────────────────────────────────────────

interface CompraParcelada {
  grupo: string
  descricao: string
  cartao_nome: string
  categoria_nome?: string
  valor_parcela: number
  total_parcelas: number
  parcelas_pagas: number
  valor_total: number
  data: string
}

// ─── CartaoPage ───────────────────────────────────────────────────────────────

export function CartaoPage(): React.JSX.Element {
  const hoje = new Date()
  const [aba, setAba] = useState<Aba>('cartoes')

  // Filtros da aba Fatura
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [cartaoFiltroId, setCartaoFiltroId] = useState<string>('')

  // Modais
  const [cartaoModalOpen, setCartaoModalOpen] = useState(false)
  const [editingCartao, setEditingCartao] = useState<Cartao | null>(null)
  const [faturaModalOpen, setFaturaModalOpen] = useState(false)

  // Confirmações de exclusão
  const [deleteCartaoId, setDeleteCartaoId] = useState<number | null>(null)
  const [deleteFaturaId, setDeleteFaturaId] = useState<number | null>(null)

  // Dados
  const { data: cartoes = [], isLoading: cartoesLoading, refetch: refetchCartoes } = useCartoes()
  const { data: faturas = [], isLoading: faturasLoading, refetch: refetchFaturas } = useTransacoesCartao(
    cartaoFiltroId ? Number(cartaoFiltroId) : undefined,
    mes,
    ano,
  )
  const { data: todasTransacoes = [], isLoading: todasLoading, refetch: refetchTodas } = useTodasTransacoesCartao()

  const deleteCartao = useDeleteCartao()
  const updateCartao = useUpdateCartao()
  const deleteFatura = useDeleteFatura()

  // Agrupa compras parceladas por grupo_parcelamento
  const comprasParceladas = useMemo<CompraParcelada[]>(() => {
    const comParcelas = todasTransacoes.filter((t) => t.parcelas > 1)
    const grupos = new Map<string, TransacaoCartaoCompleta[]>()

    comParcelas.forEach((t) => {
      const key = t.grupo_parcelamento ?? `solo-${t.id}`
      if (!grupos.has(key)) grupos.set(key, [])
      grupos.get(key)!.push(t)
    })

    return Array.from(grupos.entries())
      .map(([grupo, items]) => {
        const sorted = [...items].sort((a, b) => a.parcela_atual - b.parcela_atual)
        const first = sorted[0]
        const parcelasPagas = Math.max(...items.map((i) => i.parcela_atual))
        return {
          grupo,
          descricao: first.descricao,
          cartao_nome: first.cartao_nome,
          categoria_nome: first.categoria_nome,
          valor_parcela: first.valor,
          total_parcelas: first.parcelas,
          parcelas_pagas: parcelasPagas,
          valor_total: first.valor * first.parcelas,
          data: first.data,
        }
      })
      .sort((a, b) => b.data.localeCompare(a.data))
  }, [todasTransacoes])

  function abrirNovoCartao(): void {
    setEditingCartao(null)
    setCartaoModalOpen(true)
  }

  async function marcarComoPago(cartao: Cartao): Promise<void> {
    try {
      await updateCartao.mutateAsync({ id: cartao.id, updates: { status: 'paga' } })
      toast.success(`${cartao.nome} marcado como pago`)
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  async function confirmarDeleteCartao(id: number): Promise<void> {
    try { await deleteCartao.mutateAsync(id); toast.success('Cartão removido') }
    catch { toast.error('Erro ao remover cartão') }
    setDeleteCartaoId(null)
  }

  async function confirmarDeleteFatura(id: number): Promise<void> {
    try { await deleteFatura.mutateAsync(id); toast.success('Lançamento excluído') }
    catch { toast.error('Erro ao excluir lançamento') }
    setDeleteFaturaId(null)
  }

  const TABS: { id: Aba; label: string; icon: React.ReactNode }[] = [
    { id: 'cartoes', label: 'Cartões', icon: <CreditCard size={14} /> },
    { id: 'fatura', label: 'Fatura', icon: <Receipt size={14} /> },
    { id: 'parcela', label: 'Parcelado', icon: <Layers size={14} /> },
  ]

  const actionLabel = { cartoes: 'Novo Cartão', fatura: 'Lançar', parcela: 'Lançar Parcelado' }[aba]
  function handleAction(): void {
    if (aba === 'cartoes') abrirNovoCartao()
    else setFaturaModalOpen(true)
  }

  const totalFatura = faturas.reduce((acc, f) => acc + f.valor, 0)
  const totalParcelado = comprasParceladas.reduce((acc, p) => acc + p.valor_parcela, 0)

  const refreshing = cartoesLoading || faturasLoading || todasLoading

  const refetchAll = useCallback(() => {
    void refetchCartoes()
    void refetchFaturas()
    void refetchTodas()
  }, [refetchCartoes, refetchFaturas, refetchTodas])

  return (
    <div className="flex flex-col h-full">
      {/* ── Cabeçalho ── */}
      <div className="px-6 pt-5 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Cartões de Crédito</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {cartoes.length} cartão{cartoes.length !== 1 ? 'ões' : ''} cadastrado{cartoes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={handleAction}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Plus size={13} />
            {actionLabel}
          </button>
        </div>

        {/* Abas */}
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
              {tab.id === 'parcela' && comprasParceladas.length > 0 && (
                <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                  {comprasParceladas.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Conteúdo ── */}
      <PullToRefresh onRefresh={refetchAll} refreshing={refreshing} className="flex-1">

        {/* ── ABA: CARTÕES ── */}
        {aba === 'cartoes' && (
          <div className="p-6">
            {cartoesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-36 rounded-2xl" />
                ))}
              </div>
            ) : cartoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <CreditCard size={22} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Nenhum cartão cadastrado</p>
                <p className="text-xs text-muted-foreground mt-1">Adicione seu primeiro cartão de crédito</p>
                <button onClick={abrirNovoCartao} className="mt-3 text-xs text-primary hover:underline">
                  + Adicionar cartão
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cartoes.map((cartao, i) => (
                  <CartaoCard
                    key={cartao.id}
                    cartao={cartao}
                    index={i}
                    onEdit={() => { setEditingCartao(cartao); setCartaoModalOpen(true) }}
                    onDelete={() => setDeleteCartaoId(cartao.id)}
                    onMarkAsPaid={() => marcarComoPago(cartao)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ABA: FATURA ── */}
        {aba === 'fatura' && (
          <div className="p-6 space-y-4">
            {cartoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Receipt size={22} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Nenhum cartão cadastrado</p>
                <p className="text-xs text-muted-foreground mt-1">Cadastre um cartão para lançar faturas</p>
                <button onClick={() => setAba('cartoes')} className="mt-3 text-xs text-primary hover:underline">
                  Ir para Cartões
                </button>
              </div>
            ) : (
              <>
                {/* Filtros */}
                <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={cartaoFiltroId}
                      onChange={(e) => setCartaoFiltroId(e.target.value)}
                      className="px-2.5 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                      <option value="">Todos os cartões</option>
                      {cartoes.map((c) => (
                        <option key={c.id} value={String(c.id)}>{c.nome}</option>
                      ))}
                    </select>

                    <select
                      value={ano}
                      onChange={(e) => setAno(Number(e.target.value))}
                      className="px-2.5 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                      {ANOS.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
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
                </div>

                {/* Lista */}
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  {!faturasLoading && faturas.length > 0 && (
                    <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {faturas.length} lançamento{faturas.length !== 1 ? 's' : ''} · {MESES_FULL[mes - 1]} {ano}
                      </span>
                      <span className="text-xs font-semibold text-red-500">
                        -{formatCurrencyBRL(totalFatura)}
                      </span>
                    </div>
                  )}

                  {faturasLoading ? (
                    <div className="divide-y divide-border">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <SkeletonListRow key={i} />
                      ))}
                    </div>
                  ) : faturas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CalendarDays size={20} className="text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-foreground">
                        Nenhum lançamento em {MESES_FULL[mes - 1]}
                      </p>
                      <button
                        onClick={() => setFaturaModalOpen(true)}
                        className="mt-2 text-xs text-primary hover:underline"
                      >
                        Lançar agora
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {[...faturas]
                        .sort((a, b) => b.data.localeCompare(a.data))
                        .map((f) => (
                          <FaturaRow key={f.id} transacao={f} onDelete={() => setDeleteFaturaId(f.id)} />
                        ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ABA: PARCELADO ── */}
        {aba === 'parcela' && (
          <div className="p-6 space-y-4">
            {/* Cabeçalho resumo */}
            {comprasParceladas.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-card rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Compras parceladas</p>
                  <p className="text-xl font-bold text-foreground mt-1">{comprasParceladas.length}</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Comprometido/mês</p>
                  <p className="text-xl font-bold text-red-500 mt-1">{formatCurrencyBRL(totalParcelado)}</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Total em aberto</p>
                  <p className="text-xl font-bold text-foreground mt-1">
                    {formatCurrencyBRL(
                      comprasParceladas.reduce(
                        (acc, p) => acc + p.valor_parcela * (p.total_parcelas - p.parcelas_pagas),
                        0,
                      ),
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Tabela de compras parceladas */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {todasLoading ? (
                <div className="divide-y divide-border">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-5 gap-4 px-4 py-3 animate-pulse">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <Skeleton key={j} className="h-3" />
                      ))}
                    </div>
                  ))}
                </div>
              ) : comprasParceladas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Layers size={20} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Nenhuma compra parcelada</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lance uma compra com mais de 1 parcela na aba Fatura
                  </p>
                  <button
                    onClick={() => setFaturaModalOpen(true)}
                    className="mt-3 text-xs text-primary hover:underline"
                  >
                    Lançar compra parcelada
                  </button>
                </div>
              ) : (
                <>
                  {/* Cabeçalho da tabela */}
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-4 py-2.5 border-b border-border bg-muted/30">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Descrição</span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Cartão</span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Valor/Parcela</span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Parcelas</span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Total</span>
                  </div>

                  {/* Linhas */}
                  <div className="divide-y divide-border">
                    {comprasParceladas.map((p) => {
                      const restantes = p.total_parcelas - p.parcelas_pagas
                      const progresso = (p.parcelas_pagas / p.total_parcelas) * 100
                      const concluida = restantes === 0

                      return (
                        <div
                          key={p.grupo}
                          className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-4 py-3 hover:bg-accent/40 transition-colors items-center"
                        >
                          {/* Descrição + barra de progresso */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground truncate">
                                {p.descricao}
                              </p>
                              {concluida && (
                                <span className="shrink-0 text-xs px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full font-medium">
                                  Quitado
                                </span>
                              )}
                            </div>
                            {p.categoria_nome && (
                              <p className="text-xs text-muted-foreground mt-0.5">{p.categoria_nome}</p>
                            )}
                            {/* Barra de progresso */}
                            <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden w-full max-w-45">
                              <div
                                className={`h-full rounded-full transition-all ${concluida ? 'bg-emerald-500' : 'bg-primary'}`}
                                style={{ width: `${progresso}%` }}
                              />
                            </div>
                          </div>

                          {/* Cartão */}
                          <span className="text-xs text-muted-foreground text-right whitespace-nowrap">
                            {p.cartao_nome}
                          </span>

                          {/* Valor/parcela */}
                          <span className="text-sm font-semibold text-foreground text-right whitespace-nowrap">
                            {formatCurrencyBRL(p.valor_parcela)}
                          </span>

                          {/* Progresso parcelas */}
                          <span className="text-sm font-medium text-right whitespace-nowrap">
                            <span className={concluida ? 'text-emerald-600' : 'text-primary'}>
                              {p.parcelas_pagas}
                            </span>
                            <span className="text-muted-foreground">/{p.total_parcelas}</span>
                          </span>

                          {/* Total */}
                          <span className="text-sm font-semibold text-muted-foreground text-right whitespace-nowrap">
                            {formatCurrencyBRL(p.valor_total)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </PullToRefresh>

      {/* ── Modais ── */}
      <CartaoModal
        open={cartaoModalOpen}
        onClose={() => setCartaoModalOpen(false)}
        editingCartao={editingCartao}
      />
      <FaturaModal
        open={faturaModalOpen}
        onClose={() => setFaturaModalOpen(false)}
        defaultCartaoId={cartaoFiltroId ? Number(cartaoFiltroId) : undefined}
      />

      {/* ── Confirmações ── */}
      {deleteCartaoId !== null && (
        <ConfirmDeleteDialog
          onConfirm={() => confirmarDeleteCartao(deleteCartaoId)}
          onCancel={() => setDeleteCartaoId(null)}
          loading={deleteCartao.isPending}
        />
      )}
      {deleteFaturaId !== null && (
        <ConfirmDeleteDialog
          onConfirm={() => confirmarDeleteFatura(deleteFaturaId)}
          onCancel={() => setDeleteFaturaId(null)}
          loading={deleteFatura.isPending}
        />
      )}
    </div>
  )
}
