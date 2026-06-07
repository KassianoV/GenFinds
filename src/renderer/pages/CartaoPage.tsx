import React, { useState, useMemo, useCallback } from 'react'
import {
  CreditCard,
  Plus,
  Trash2,
  Receipt,
  CalendarDays,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { CartaoModal } from '../components/cartao/CartaoModal'
import { CartaoCard } from '../components/cartao/CartaoCard'
import { CompraVistaModal } from '../components/cartao/CompraVistaModal'
import { SimuladorParcelas, type SimuladorResult } from '../components/cartao/SimuladorParcelas'
import { CompraParceladaModal, type CompraParceladaDefaults } from '../components/cartao/CompraParceladaModal'
import { isDesktop } from '../services/platform'
import {
  useCartoes,
  useDeleteCartao,
  useUpdateCartao,
  useTransacoesCartao,
  useDeleteFatura,
  useParcelasAbertas,
  useQuitarParcelamento,
  type CompraParcelada,
} from '../hooks/useCartao'
import { formatCurrencyBRL } from '../../lib/format'
import type { Cartao, TransacaoCartaoCompleta } from '../../types/database.types'
import { toast } from 'sonner'
import { PullToRefresh } from '../components/layout/PullToRefresh'
import { Skeleton, SkeletonListRow } from '../components/ui/Skeleton'

// ─── Constantes ───────────────────────────────────────────────────────────────

const MESES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatDataGrupo(dataStr: string): string {
  const d = new Date(dataStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
}

type Aba = 'cartoes' | 'fatura' | 'parcela'

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
  title?: string
  description?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

function ConfirmDeleteDialog({
  title = 'Confirmar exclusão',
  description = 'Esta ação não pode ser desfeita.',
  confirmLabel = 'Excluir',
  onConfirm,
  onCancel,
  loading,
}: ConfirmDeleteProps): React.JSX.Element {
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
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
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
            {loading ? 'Aguarde...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
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
  const [compraVistaOpen, setCompraVistaOpen] = useState(false)
  const [simuladorOpen, setSimuladorOpen] = useState(false)
  const [compraParceladaOpen, setCompraParceladaOpen] = useState(false)
  const [compraParceladaDefaults, setCompraParceladaDefaults] = useState<CompraParceladaDefaults>({})

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
  const { data: comprasParceladas, isLoading: parcelasLoading, refetch: refetchParcelas } = useParcelasAbertas()

  const deleteCartao = useDeleteCartao()
  const updateCartao = useUpdateCartao()
  const deleteFatura = useDeleteFatura()
  const quitarParcelamento = useQuitarParcelamento()

  const [quitarGrupo, setQuitarGrupo] = useState<CompraParcelada | null>(null)

  function navMes(delta: number): void {
    let novoMes = mes + delta
    let novoAno = ano
    if (novoMes < 1) { novoMes = 12; novoAno-- }
    if (novoMes > 12) { novoMes = 1; novoAno++ }
    setMes(novoMes)
    setAno(novoAno)
  }

  // Agrupa faturas por data (para mobile)
  const faturasAgrupadas = useMemo(() => {
    const sorted = [...faturas].sort((a, b) => b.data.localeCompare(a.data))
    const grupos = new Map<string, TransacaoCartaoCompleta[]>()
    sorted.forEach((f) => {
      if (!grupos.has(f.data)) grupos.set(f.data, [])
      grupos.get(f.data)!.push(f)
    })
    return Array.from(grupos.entries())
  }, [faturas])

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
    else if (aba === 'parcela') setCompraParceladaOpen(true)
    else setCompraVistaOpen(true)
  }

  function handleSimuladorConfirmar(result: SimuladorResult): void {
    setSimuladorOpen(false)
    setCompraParceladaDefaults({
      cartaoId: result.cartaoId,
      valorTotal: result.valor,
      numeroParcelas: result.numeroParcelas,
    })
    setCompraParceladaOpen(true)
  }

  async function confirmarQuitarParcelamento(grupo: CompraParcelada): Promise<void> {
    try {
      await quitarParcelamento.mutateAsync(grupo.ids_abertas)
      toast.success(`${grupo.parcelas_abertas} parcela(s) quitada(s) antecipadamente`)
    } catch {
      toast.error('Erro ao quitar parcelas')
    }
    setQuitarGrupo(null)
  }

  const totalFatura = faturas.reduce((acc, f) => acc + f.valor, 0)
  const totalParcelado = comprasParceladas.reduce((acc, p) => acc + p.valor_parcela, 0)

  const refreshing = cartoesLoading || faturasLoading || parcelasLoading

  const refetchAll = useCallback(() => {
    void refetchCartoes()
    void refetchFaturas()
    void refetchParcelas()
  }, [refetchCartoes, refetchFaturas, refetchParcelas])

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
              isDesktop() ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-36 rounded-2xl" />
                  ))}
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-36 rounded-2xl shrink-0 w-72" />
                  ))}
                </div>
              )
            ) : cartoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <CreditCard size={22} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Nenhum cartão cadastrado</p>
                <p className="text-xs text-muted-foreground mt-1">Adicione seu primeiro cartão de crédito</p>
                <button onClick={abrirNovoCartao} className="mt-4 flex items-center gap-1.5 px-4 py-2 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
                  <Plus size={13} />
                  Adicionar cartão
                </button>
              </div>
            ) : isDesktop() ? (
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
            ) : (
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 -mx-6 px-6 scrollbar-none">
                {cartoes.map((cartao, i) => (
                  <div key={cartao.id} className="snap-start shrink-0 w-72">
                    <CartaoCard
                      cartao={cartao}
                      index={i}
                      onEdit={() => { setEditingCartao(cartao); setCartaoModalOpen(true) }}
                      onDelete={() => setDeleteCartaoId(cartao.id)}
                      onMarkAsPaid={() => marcarComoPago(cartao)}
                    />
                  </div>
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
                {/* Controles: filtro de cartão + navegação mês/ano */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
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

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navMes(-1)}
                      className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-semibold w-36 text-center select-none">
                      {MESES_FULL[mes - 1]} {ano}
                    </span>
                    <button
                      onClick={() => navMes(1)}
                      className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Resumo da fatura */}
                {!faturasLoading && faturas.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-card rounded-xl border border-border p-3.5">
                      <p className="text-xs text-muted-foreground mb-1">Total da fatura</p>
                      <p className="text-lg font-bold text-red-500">-{formatCurrencyBRL(totalFatura)}</p>
                    </div>
                    <div className="bg-card rounded-xl border border-border p-3.5">
                      <p className="text-xs text-muted-foreground mb-1">Parcelas em aberto</p>
                      <p className="text-lg font-bold text-foreground">
                        {faturas.filter((f) => f.parcelas > 1).length}
                      </p>
                    </div>
                  </div>
                )}

                {/* Lista / Tabela */}
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  {faturasLoading ? (
                    <div className="divide-y divide-border">
                      {Array.from({ length: 4 }).map((_, i) => <SkeletonListRow key={i} />)}
                    </div>
                  ) : faturas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CalendarDays size={20} className="text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-foreground">
                        Nenhum lançamento em {MESES_FULL[mes - 1]}
                      </p>
                      <button onClick={() => setCompraVistaOpen(true)} className="mt-2 text-xs text-primary hover:underline">
                        Lançar agora
                      </button>
                    </div>
                  ) : isDesktop() ? (
                    /* ── Desktop: tabela ── */
                    <>
                      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-6 px-4 py-2.5 border-b border-border bg-muted/30">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Descrição</span>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Data</span>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Parcela</span>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Categoria</span>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Valor</span>
                      </div>
                      <div className="divide-y divide-border">
                        {[...faturas].sort((a, b) => b.data.localeCompare(a.data)).map((f) => (
                          <div
                            key={f.id}
                            className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-6 px-4 py-3 hover:bg-accent/40 transition-colors items-center group"
                          >
                            <div className="min-w-0 flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground truncate">{f.descricao}</p>
                              <button
                                onClick={() => setDeleteFaturaId(f.id)}
                                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-all shrink-0"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            <span className="text-xs text-muted-foreground text-right whitespace-nowrap">
                              {new Date(f.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </span>
                            <span className="text-xs text-right whitespace-nowrap">
                              {f.parcelas > 1 ? (
                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                                  {f.parcela_atual}/{f.parcelas}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground text-right whitespace-nowrap">
                              {f.categoria_nome ?? '—'}
                            </span>
                            <span className="text-sm font-semibold text-red-500 text-right whitespace-nowrap">
                              -{formatCurrencyBRL(f.valor)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    /* ── Mobile: lista agrupada por data ── */
                    <div>
                      {faturasAgrupadas.map(([dataStr, items]) => (
                        <div key={dataStr}>
                          <div className="px-4 py-2 bg-muted/30 border-b border-border">
                            <span className="text-xs font-semibold text-muted-foreground capitalize">
                              {formatDataGrupo(dataStr)}
                            </span>
                          </div>
                          <div className="divide-y divide-border">
                            {items.map((f) => (
                              <FaturaRow key={f.id} transacao={f} onDelete={() => setDeleteFaturaId(f.id)} />
                            ))}
                          </div>
                        </div>
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
            {/* Resumo */}
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
                    {formatCurrencyBRL(comprasParceladas.reduce((acc, p) => acc + p.valor_restante, 0))}
                  </p>
                </div>
              </div>
            )}

            {/* Tabela de compras parceladas */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {parcelasLoading ? (
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
                    onClick={() => setCompraParceladaOpen(true)}
                    className="mt-3 text-xs text-primary hover:underline"
                  >
                    Lançar compra parcelada
                  </button>
                </div>
              ) : (
                <>
                  {/* Cabeçalho da tabela */}
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 px-4 py-2.5 border-b border-border bg-muted/30">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Descrição</span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Cartão</span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Valor/mês</span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Progresso</span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Restante</span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right" />
                  </div>

                  {/* Linhas */}
                  <div className="divide-y divide-border">
                    {comprasParceladas.map((p) => {
                      const progresso = (p.parcelas_pagas / p.total_parcelas) * 100
                      const concluida = p.parcelas_abertas === 0

                      return (
                        <div
                          key={p.grupo}
                          className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 px-4 py-3 hover:bg-accent/40 transition-colors items-center"
                        >
                          {/* Descrição + barra de progresso */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground truncate">{p.descricao}</p>
                              {concluida && (
                                <span className="shrink-0 text-xs px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full font-medium">
                                  Quitado
                                </span>
                              )}
                            </div>
                            {p.categoria_nome && (
                              <p className="text-xs text-muted-foreground mt-0.5">{p.categoria_nome}</p>
                            )}
                            <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden w-full max-w-48">
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

                          {/* Valor/mês */}
                          <span className="text-sm font-semibold text-foreground text-right whitespace-nowrap">
                            {formatCurrencyBRL(p.valor_parcela)}
                          </span>

                          {/* Progresso: X/Y */}
                          <span className="text-sm font-medium text-right whitespace-nowrap">
                            <span className={concluida ? 'text-emerald-600' : 'text-primary'}>
                              {p.parcelas_pagas}
                            </span>
                            <span className="text-muted-foreground">/{p.total_parcelas}</span>
                          </span>

                          {/* Valor restante */}
                          <span className="text-sm font-semibold text-right whitespace-nowrap text-muted-foreground">
                            {concluida ? '—' : formatCurrencyBRL(p.valor_restante)}
                          </span>

                          {/* Botão quitar */}
                          <div className="flex justify-end">
                            {!concluida && (
                              <button
                                onClick={() => setQuitarGrupo(p)}
                                className="px-2.5 py-1 text-xs font-medium border border-border rounded-lg text-muted-foreground hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors whitespace-nowrap"
                              >
                                Quitar
                              </button>
                            )}
                          </div>
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
      <CompraVistaModal
        open={compraVistaOpen}
        onClose={() => setCompraVistaOpen(false)}
        defaultCartaoId={cartaoFiltroId ? Number(cartaoFiltroId) : undefined}
      />
      <SimuladorParcelas
        open={simuladorOpen}
        onClose={() => setSimuladorOpen(false)}
        onConfirmar={handleSimuladorConfirmar}
      />
      <CompraParceladaModal
        open={compraParceladaOpen}
        onClose={() => { setCompraParceladaOpen(false); setCompraParceladaDefaults({}) }}
        defaults={compraParceladaDefaults}
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
      {quitarGrupo !== null && (
        <ConfirmDeleteDialog
          title="Quitar antecipadamente"
          description={`Remove ${quitarGrupo.parcelas_abertas} parcela(s) restante(s) (${formatCurrencyBRL(quitarGrupo.valor_restante)}). Registre o pagamento à vista separadamente.`}
          confirmLabel="Quitar"
          onConfirm={() => confirmarQuitarParcelamento(quitarGrupo)}
          onCancel={() => setQuitarGrupo(null)}
          loading={quitarParcelamento.isPending}
        />
      )}
    </div>
  )
}
