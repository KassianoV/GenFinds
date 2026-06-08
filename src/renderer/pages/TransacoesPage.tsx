import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  Plus,
  Download,
  Upload,
  Search,
  Pencil,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  Receipt,
  ChevronDown,
  Check,
  ChevronUp,
  X,
  ChevronsUpDown,
} from 'lucide-react'
import { ResumoCards } from '../components/dashboard/ResumoCards'
import { TransacaoModal } from '../components/transacoes/TransacaoModal'
import { ImportacaoOFX } from '../components/transacoes/ImportacaoOFX'
import { SwipeToDelete } from '../components/transacoes/SwipeToDelete'
import { PullToRefresh } from '../components/layout/PullToRefresh'
import { AlertDialog } from '../components/ui/AlertDialog'
import { SkeletonListRow } from '../components/ui/Skeleton'
import {
  useTransacoesMes,
  useDeleteTransacao,
  useContas,
  useCategorias,
} from '../hooks/useTransacoes'
import { useResumoMes, useSaldoContas } from '../hooks/useDashboard'
import { useTransacoesFilterStore } from '../stores/transacoesFilterStore'
import { isDesktop } from '../services/platform'
import { formatCurrencyBRL } from '../../lib/format'
import type { TransacaoCompleta, Conta, Categoria } from '../../types/database.types'
import { toast } from 'sonner'

// ─── Constantes ───────────────────────────────────────────────────────────────

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MESES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const ANOS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

type FiltroTipo = 'todas' | 'receita' | 'despesa'
type SortCol = 'data' | 'descricao' | 'categoria' | 'conta' | 'valor'
type SortDir = 'asc' | 'desc'

const ITEMS_PER_PAGE = 20

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

// ─── MultiSelectDropdown ──────────────────────────────────────────────────────

interface MultiSelectProps {
  label: string
  items: { id: number; nome: string; cor?: string | null }[]
  selectedIds: number[]
  onToggle: (id: number) => void
}

function MultiSelectDropdown({ label, items, selectedIds, onToggle }: MultiSelectProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = selectedIds.length > 0

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs border rounded-lg transition-colors ${
          active
            ? 'border-primary text-primary bg-primary/5'
            : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
        }`}
      >
        <span>{active ? `${label} (${selectedIds.length})` : label}</span>
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-44 max-h-52 overflow-auto">
          {items.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Nenhum item</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => onToggle(item.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors text-foreground"
              >
                <div
                  className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${
                    selectedIds.includes(item.id) ? 'bg-primary border-primary' : 'border-border'
                  }`}
                >
                  {selectedIds.includes(item.id) && <Check size={10} className="text-primary-foreground" />}
                </div>
                {item.cor && (
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.cor }} />
                )}
                <span className="truncate">{item.nome}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── SortHeader ───────────────────────────────────────────────────────────────

interface SortHeaderProps {
  col: SortCol
  label: string
  sortCol: SortCol
  sortDir: SortDir
  onSort: (col: SortCol) => void
  className?: string
}

function SortHeader({ col, label, sortCol, sortDir, onSort, className = '' }: SortHeaderProps): React.JSX.Element {
  const active = sortCol === col
  return (
    <button
      onClick={() => onSort(col)}
      className={`flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors ${className}`}
    >
      {label}
      {active ? (
        sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      ) : (
        <ChevronsUpDown size={12} className="opacity-40" />
      )}
    </button>
  )
}

// ─── TransacaoRow ─────────────────────────────────────────────────────────────

interface TransacaoRowProps {
  transacao: TransacaoCompleta
  isTable: boolean
  onEdit: () => void
  onDelete: () => void
}

function TransacaoRow({ transacao, isTable, onEdit, onDelete }: TransacaoRowProps): React.JSX.Element {
  const isReceita = transacao.tipo === 'receita'
  const dataFormatada = new Date(transacao.data + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })

  if (isTable) {
    return (
      <div
        className="grid grid-cols-[110px_1fr_150px_150px_110px_72px] items-center px-4 py-3 hover:bg-accent/40 transition-colors group cursor-pointer border-b border-border last:border-0"
        onClick={onEdit}
      >
        <span className="text-xs text-muted-foreground">{dataFormatada}</span>
        <span className="text-sm font-medium text-foreground truncate pr-3">{transacao.descricao}</span>
        <div className="flex items-center gap-1.5">
          {transacao.categoria_cor && (
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: transacao.categoria_cor }} />
          )}
          <span className="text-xs text-muted-foreground truncate">{transacao.categoria_nome ?? '—'}</span>
        </div>
        <span className="text-xs text-muted-foreground truncate">{transacao.conta_nome}</span>
        <span className={`text-sm font-semibold ${isReceita ? 'text-green-600' : 'text-red-500'}`}>
          {isReceita ? '+' : '-'}{formatCurrencyBRL(transacao.valor)}
        </span>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
            title="Editar"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500"
            title="Excluir"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    )
  }

  // Mobile list layout
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors cursor-pointer border-b border-border last:border-0"
      onClick={onEdit}
    >
      <div
        className={`shrink-0 p-1.5 rounded-full ${
          isReceita ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
        }`}
      >
        {isReceita ? (
          <ArrowUpCircle size={16} className="text-green-600" />
        ) : (
          <ArrowDownCircle size={16} className="text-red-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{transacao.descricao}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {transacao.categoria_cor && (
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: transacao.categoria_cor }} />
          )}
          <span className="text-xs text-muted-foreground truncate">
            {transacao.categoria_nome ?? '—'} · {transacao.conta_nome}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className={`text-sm font-semibold ${isReceita ? 'text-green-600' : 'text-red-500'}`}>
          {isReceita ? '+' : '-'}{formatCurrencyBRL(transacao.valor)}
        </span>
        <span className="text-xs text-muted-foreground">{dataFormatada}</span>
      </div>
    </div>
  )
}

// ─── TransacoesPage ───────────────────────────────────────────────────────────

export function TransacoesPage(): React.JSX.Element {
  // ── Filter store ──
  const {
    mes, ano, filtroTipo, busca, contaIds, categoriaIds,
    setMes, setAno, setFiltroTipo, setBusca, toggleContaId, toggleCategoriaId, resetFiltros,
  } = useTransacoesFilterStore()

  const buscaDebounced = useDebounce(busca, 300)

  // ── UI state ──
  const [sortCol, setSortCol] = useState<SortCol>('data')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTransacao, setEditingTransacao] = useState<TransacaoCompleta | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [showImportOFX, setShowImportOFX] = useState(false)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [mobileVisibleCount, setMobileVisibleCount] = useState(ITEMS_PER_PAGE)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const desktop = isDesktop()

  // ── Queries ──
  const transacoesQuery = useTransacoesMes(mes, ano)
  const resumoQuery = useResumoMes(mes, ano)
  const saldoContasQuery = useSaldoContas()
  const contasQuery = useContas()
  const categoriasQuery = useCategorias()
  const deleteTransacao = useDeleteTransacao()

  const refreshing = transacoesQuery.isFetching || resumoQuery.isFetching
  const carregandoResumo = resumoQuery.isLoading || saldoContasQuery.isLoading

  const refetchAll = useCallback(() => {
    void transacoesQuery.refetch()
    void resumoQuery.refetch()
    void saldoContasQuery.refetch()
  }, [transacoesQuery, resumoQuery, saldoContasQuery])

  // ── Sort handler ──
  function handleSort(col: SortCol): void {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  // ── Filtered + sorted list ──
  const transacoesFiltradas = useMemo(() => {
    let list = transacoesQuery.data ?? []

    if (filtroTipo !== 'todas') list = list.filter((t) => t.tipo === filtroTipo)

    if (buscaDebounced.trim()) {
      const q = buscaDebounced.toLowerCase()
      list = list.filter(
        (t) =>
          t.descricao.toLowerCase().includes(q) ||
          (t.categoria_nome ?? '').toLowerCase().includes(q) ||
          t.conta_nome.toLowerCase().includes(q),
      )
    }

    if (contaIds.length > 0) list = list.filter((t) => contaIds.includes(t.conta_id))
    if (categoriaIds.length > 0) list = list.filter((t) => categoriaIds.includes(t.categoria_id))

    return [...list].sort((a, b) => {
      let cmp = 0
      switch (sortCol) {
        case 'data': cmp = a.data.localeCompare(b.data); break
        case 'descricao': cmp = a.descricao.localeCompare(b.descricao); break
        case 'categoria': cmp = (a.categoria_nome ?? '').localeCompare(b.categoria_nome ?? ''); break
        case 'conta': cmp = a.conta_nome.localeCompare(b.conta_nome); break
        case 'valor': cmp = a.valor - b.valor; break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [transacoesQuery.data, filtroTipo, buscaDebounced, contaIds, categoriaIds, sortCol, sortDir])

  // ── Scroll container ──
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── Reset pagination when filters change ──
  const filterKey = `${mes}-${ano}-${filtroTipo}-${buscaDebounced}-${contaIds.join(',')}-${categoriaIds.join(',')}`
  useEffect(() => {
    setPaginaAtual(1)
    setMobileVisibleCount(ITEMS_PER_PAGE)
  }, [filterKey])

  // ── Derived pagination values ──
  const totalPaginas = Math.max(1, Math.ceil(transacoesFiltradas.length / ITEMS_PER_PAGE))
  const transacoesVisiveis = desktop
    ? transacoesFiltradas.slice((paginaAtual - 1) * ITEMS_PER_PAGE, paginaAtual * ITEMS_PER_PAGE)
    : transacoesFiltradas.slice(0, mobileVisibleCount)

  // ── Intersection Observer (mobile infinite scroll) ──
  useEffect(() => {
    if (desktop || !sentinelRef.current) return
    const total = transacoesFiltradas.length
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMobileVisibleCount((v) => Math.min(v + ITEMS_PER_PAGE, total))
        }
      },
      { root: scrollRef.current, rootMargin: '150px' },
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [desktop, transacoesFiltradas.length])

  // ── Handlers ──
  function abrirNova(): void { setEditingTransacao(null); setModalOpen(true) }
  function abrirEdicao(t: TransacaoCompleta): void { setEditingTransacao(t); setModalOpen(true) }

  async function confirmarDelete(): Promise<void> {
    if (deleteId === null) return
    try {
      await deleteTransacao.mutateAsync(deleteId)
      toast.success('Transação excluída')
    } catch {
      toast.error('Erro ao excluir transação')
    }
    setDeleteId(null)
  }

  const temFiltrosAtivos = filtroTipo !== 'todas' || contaIds.length > 0 || categoriaIds.length > 0 || buscaDebounced

  const contas: Conta[] = contasQuery.data ?? []
  const categorias: Categoria[] = categoriasQuery.data ?? []

  return (
    <div className="flex flex-col h-full">
      {/* ── Cabeçalho ── */}
      <div className="px-6 pt-5 pb-4 flex items-start justify-between border-b border-border shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Transações Realizadas</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{MESES_FULL[mes - 1]} {ano}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportOFX(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-accent transition-colors text-muted-foreground"
          >
            <Upload size={13} />
            Importar OFX
          </button>
          <button
            onClick={abrirNova}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Plus size={13} />
            Nova
          </button>
        </div>
      </div>

      {/* ── Conteúdo rolável ── */}
      <PullToRefresh ref={scrollRef} onRefresh={refetchAll} refreshing={refreshing} className="flex-1">
        <div className="px-6 py-4 space-y-4">
          {/* Cards de resumo */}
          <ResumoCards
            receita={resumoQuery.data?.receita ?? 0}
            despesa={resumoQuery.data?.despesa ?? 0}
            saldo={resumoQuery.data?.saldo ?? 0}
            saldoContas={saldoContasQuery.data ?? 0}
            mes={mes}
            ano={ano}
            loading={carregandoResumo}
          />

          {/* ── Painel de filtros ── */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            {/* Linha 1: ano + mês */}
            <div className="flex flex-wrap items-center gap-2">
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

            {/* Linha 2: tipo + conta + categoria + busca + limpar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Tipo */}
              <div className="flex gap-1">
                {(['todas', 'receita', 'despesa'] as const).map((tipo) => (
                  <button
                    key={tipo}
                    onClick={() => setFiltroTipo(tipo as FiltroTipo)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      filtroTipo === tipo
                        ? tipo === 'receita'
                          ? 'bg-green-500 text-white shadow-sm'
                          : tipo === 'despesa'
                          ? 'bg-red-500 text-white shadow-sm'
                          : 'bg-primary text-primary-foreground shadow-sm'
                        : 'border border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    {tipo === 'todas' ? 'Todas' : tipo === 'receita' ? 'Receitas' : 'Despesas'}
                  </button>
                ))}
              </div>

              {/* Conta multi-select */}
              <MultiSelectDropdown
                label="Conta"
                items={contas}
                selectedIds={contaIds}
                onToggle={toggleContaId}
              />

              {/* Categoria multi-select */}
              <MultiSelectDropdown
                label="Categoria"
                items={categorias}
                selectedIds={categoriaIds}
                onToggle={toggleCategoriaId}
              />

              {/* Busca */}
              <div className="relative flex-1 min-w-36">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                />
                {busca && (
                  <button
                    onClick={() => setBusca('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Limpar filtros */}
              {temFiltrosAtivos && (
                <button
                  onClick={resetFiltros}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                >
                  <X size={11} />
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* ── Lista / Tabela ── */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Cabeçalho de tabela (desktop) */}
            {desktop && !transacoesQuery.isLoading && transacoesFiltradas.length > 0 && (
              <div className="grid grid-cols-[110px_1fr_150px_150px_110px_72px] items-center px-4 py-2.5 border-b border-border bg-muted/30">
                <SortHeader col="data" label="Data" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <SortHeader col="descricao" label="Descrição" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <SortHeader col="categoria" label="Categoria" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <SortHeader col="conta" label="Conta" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <SortHeader col="valor" label="Valor" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Ações</span>
              </div>
            )}

            {/* Cabeçalho de contagem */}
            {!transacoesQuery.isLoading && transacoesFiltradas.length > 0 && !desktop && (
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {transacoesFiltradas.length} transaç{transacoesFiltradas.length === 1 ? 'ão' : 'ões'}
                </span>
                <span className="text-xs text-muted-foreground">{MESES_FULL[mes - 1]} {ano}</span>
              </div>
            )}

            {/* Loading skeleton */}
            {transacoesQuery.isLoading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 7 }).map((_, i) => <SkeletonListRow key={i} />)}
              </div>
            ) : transacoesFiltradas.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Receipt size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {buscaDebounced || filtroTipo !== 'todas' || contaIds.length > 0 || categoriaIds.length > 0
                    ? 'Nenhuma transação com os filtros aplicados'
                    : 'Nenhuma transação em ' + MESES_FULL[mes - 1]}
                </p>
                {!buscaDebounced && filtroTipo === 'todas' && contaIds.length === 0 && categoriaIds.length === 0 && (
                  <button onClick={abrirNova} className="mt-3 text-xs text-primary hover:underline">
                    Adicionar primeira transação
                  </button>
                )}
              </div>
            ) : (
              /* List */
              <div>
                {transacoesVisiveis.map((t) => (
                  <SwipeToDelete key={t.id} onDelete={() => setDeleteId(t.id)}>
                    <TransacaoRow
                      transacao={t}
                      isTable={desktop}
                      onEdit={() => abrirEdicao(t)}
                      onDelete={() => setDeleteId(t.id)}
                    />
                  </SwipeToDelete>
                ))}
                {!desktop && <div ref={sentinelRef} className="h-px" />}
              </div>
            )}

            {/* Desktop pagination footer */}
            {desktop && !transacoesQuery.isLoading && transacoesFiltradas.length > 0 && (
              <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {transacoesFiltradas.length} transaç{transacoesFiltradas.length === 1 ? 'ão' : 'ões'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPaginaAtual((p) => p - 1)}
                    disabled={paginaAtual === 1}
                    className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {paginaAtual} / {totalPaginas}
                  </span>
                  <button
                    onClick={() => setPaginaAtual((p) => p + 1)}
                    disabled={paginaAtual >= totalPaginas}
                    className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>

      {/* ── Modais ── */}
      <TransacaoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingTransacao={editingTransacao}
      />

      {showImportOFX && (
        <ImportacaoOFX
          onClose={() => setShowImportOFX(false)}
          onSuccess={(count) => { setShowImportOFX(false) }}
        />
      )}

      <AlertDialog
        open={deleteId !== null}
        title="Excluir transação?"
        description="Esta ação removerá a transação permanentemente e não pode ser desfeita."
        actionLabel="Excluir"
        onConfirm={confirmarDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleteTransacao.isPending}
        destructive
      />
    </div>
  )
}
