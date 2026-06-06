import React, { useState, useMemo } from 'react'
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
} from 'lucide-react'
import { ResumoCards } from '../components/dashboard/ResumoCards'
import { TransacaoModal } from '../components/transacoes/TransacaoModal'
import { useTransacoesMes, useDeleteTransacao } from '../hooks/useTransacoes'
import { useResumoMes, useSaldoContas } from '../hooks/useDashboard'
import { formatCurrencyBRL } from '../../lib/format'
import type { TransacaoCompleta } from '../../types/database.types'
import { toast } from 'sonner'

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MESES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const ANOS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

type FiltroTipo = 'todas' | 'receita' | 'despesa'

// ─── TransacaoRow ────────────────────────────────────────────────────────────

interface TransacaoRowProps {
  transacao: TransacaoCompleta
  onEdit: () => void
  onDelete: () => void
}

function TransacaoRow({ transacao, onEdit, onDelete }: TransacaoRowProps): React.JSX.Element {
  const isReceita = transacao.tipo === 'receita'
  const dataFormatada = new Date(transacao.data + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors group">
      {/* Ícone de tipo */}
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

      {/* Descrição + categoria */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{transacao.descricao}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {transacao.categoria_cor && (
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: transacao.categoria_cor }}
            />
          )}
          <span className="text-xs text-muted-foreground truncate">
            {transacao.categoria_nome ?? '—'} · {transacao.conta_nome}
          </span>
        </div>
      </div>

      {/* Data */}
      <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{dataFormatada}</span>

      {/* Valor */}
      <span
        className={`text-sm font-semibold shrink-0 ${
          isReceita ? 'text-green-600' : 'text-red-500'
        }`}
      >
        {isReceita ? '+' : '-'}{formatCurrencyBRL(transacao.valor)}
      </span>

      {/* Ações (visíveis no hover) */}
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Editar"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors"
          title="Excluir"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function TransacaoSkeleton(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-muted rounded w-36" />
        <div className="h-2.5 bg-muted rounded w-24" />
      </div>
      <div className="h-3 bg-muted rounded w-16 shrink-0" />
    </div>
  )
}

// ─── TransacoesPage ───────────────────────────────────────────────────────────

export function TransacoesPage(): React.JSX.Element {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todas')
  const [busca, setBusca] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTransacao, setEditingTransacao] = useState<TransacaoCompleta | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const transacoesQuery = useTransacoesMes(mes, ano)
  const resumoQuery = useResumoMes(mes, ano)
  const saldoContasQuery = useSaldoContas()
  const deleteTransacao = useDeleteTransacao()

  const transacoesFiltradas = useMemo(() => {
    let list = transacoesQuery.data ?? []
    if (filtroTipo !== 'todas') list = list.filter((t) => t.tipo === filtroTipo)
    if (busca.trim()) {
      const q = busca.toLowerCase()
      list = list.filter(
        (t) =>
          t.descricao.toLowerCase().includes(q) ||
          (t.categoria_nome ?? '').toLowerCase().includes(q) ||
          t.conta_nome.toLowerCase().includes(q),
      )
    }
    return [...list].sort((a, b) => b.data.localeCompare(a.data))
  }, [transacoesQuery.data, filtroTipo, busca])

  function abrirNova(): void {
    setEditingTransacao(null)
    setModalOpen(true)
  }

  function abrirEdicao(t: TransacaoCompleta): void {
    setEditingTransacao(t)
    setModalOpen(true)
  }

  async function confirmarDelete(id: number): Promise<void> {
    try {
      await deleteTransacao.mutateAsync(id)
      toast.success('Transação excluída')
    } catch {
      toast.error('Erro ao excluir transação')
    }
    setConfirmDeleteId(null)
  }

  const carregandoResumo = resumoQuery.isLoading || saldoContasQuery.isLoading

  return (
    <div className="flex flex-col h-full">
      {/* ── Cabeçalho ── */}
      <div className="px-6 pt-5 pb-4 flex items-start justify-between border-b border-border shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Transações Realizadas</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {MESES_FULL[mes - 1]} {ano}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-accent transition-colors text-muted-foreground">
            <Download size={13} />
            Exportar
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-accent transition-colors text-muted-foreground">
            <Upload size={13} />
            Importar
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
      <div className="flex-1 overflow-auto">
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

          {/* ── Barra de filtros ── */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Seletor de ano */}
              <select
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="px-2.5 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {ANOS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              {/* Pills de mês */}
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

              {/* Filtro de tipo */}
              <div className="flex gap-1 ml-auto">
                {(['todas', 'receita', 'despesa'] as const).map((tipo) => (
                  <button
                    key={tipo}
                    onClick={() => setFiltroTipo(tipo)}
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
            </div>

            {/* Busca */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por descrição, categoria ou conta..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-8 pr-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
              />
            </div>
          </div>

          {/* ── Lista de transações ── */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Cabeçalho da lista */}
            {!transacoesQuery.isLoading && transacoesFiltradas.length > 0 && (
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {transacoesFiltradas.length} transaç{transacoesFiltradas.length === 1 ? 'ão' : 'ões'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {MESES_FULL[mes - 1]} {ano}
                </span>
              </div>
            )}

            {/* Conteúdo */}
            {transacoesQuery.isLoading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 5 }).map((_, i) => (
                  <TransacaoSkeleton key={i} />
                ))}
              </div>
            ) : transacoesFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Receipt size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {busca || filtroTipo !== 'todas'
                    ? 'Nenhuma transação encontrada com os filtros aplicados'
                    : 'Nenhuma transação em ' + MESES_FULL[mes - 1]}
                </p>
                {!busca && filtroTipo === 'todas' && (
                  <button
                    onClick={abrirNova}
                    className="mt-3 text-xs text-primary hover:underline"
                  >
                    Adicionar primeira transação
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {transacoesFiltradas.map((t) => (
                  <TransacaoRow
                    key={t.id}
                    transacao={t}
                    onEdit={() => abrirEdicao(t)}
                    onDelete={() => setConfirmDeleteId(t.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal de criar/editar ── */}
      <TransacaoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingTransacao={editingTransacao}
      />

      {/* ── Confirmação de exclusão ── */}
      {confirmDeleteId !== null && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setConfirmDeleteId(null)}
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
                <h3 className="text-sm font-semibold text-foreground">Excluir transação?</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Esta ação removerá a transação permanentemente e não poderá ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-xs font-medium border border-border rounded-lg hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmarDelete(confirmDeleteId)}
                disabled={deleteTransacao.isPending}
                className="px-4 py-2 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleteTransacao.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
