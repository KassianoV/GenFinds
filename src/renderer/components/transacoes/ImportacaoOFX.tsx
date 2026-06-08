import React, { useState, useCallback } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { parseOFX, type OFXTransacao } from '../../lib/ofx'
import { useCategorias, useContas } from '../../hooks/useTransacoes'
import { useAuthStore } from '../../stores/authStore'
import { db } from '../../services/database'
import { isDesktop } from '../../services/platform'
import { formatCurrencyBRL } from '../../../lib/format'
import { useQueryClient } from '@tanstack/react-query'

interface TransacaoPreview extends OFXTransacao {
  categoriaId: number | null
  duplicata: boolean
  selecionada: boolean
}

interface ImportacaoOFXProps {
  contaIdInicial?: number
  onClose: () => void
  onSuccess: (count: number) => void
}

export function ImportacaoOFX({ contaIdInicial, onClose, onSuccess }: ImportacaoOFXProps): React.JSX.Element {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const qc = useQueryClient()
  const { data: categorias = [] } = useCategorias()
  const { data: contas = [] } = useContas()

  const [contaId, setContaId] = useState<number>(contaIdInicial ?? (contas[0]?.id ?? 0))
  const [transacoes, setTransacoes] = useState<TransacaoPreview[]>([])
  const [carregando, setCarregando] = useState(false)
  const [importando, setImportando] = useState(false)

  const categoriasDespesa = categorias.filter((c) => c.tipo === 'despesa')
  const categoriasReceita = categorias.filter((c) => c.tipo === 'receita')

  const handleSelectFile = useCallback(async () => {
    if (!userId) return
    setCarregando(true)
    try {
      let content: string | null = null

      if (isDesktop()) {
        const result = await window.api.ofx.selectAndRead()
        if (!result.success) { toast.error(result.error ?? 'Erro ao abrir arquivo'); return }
        content = result.data
      } else {
        // Mobile: usar input file
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.ofx,.qfx'
        content = await new Promise<string | null>((resolve) => {
          input.onchange = () => {
            const file = input.files?.[0]
            if (!file) { resolve(null); return }
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target?.result as string ?? null)
            reader.readAsText(file, 'latin1')
          }
          input.click()
        })
      }

      if (!content) return

      const parsed = parseOFX(content)
      if (parsed.length === 0) { toast.error('Nenhuma transação encontrada no arquivo OFX'); return }

      // Checar duplicatas
      const dupResult = await window.api.ofx.checkDuplicates(userId)
      const existingIds = new Set(dupResult.success ? dupResult.data : [])

      setTransacoes(parsed.map((t) => ({
        ...t,
        categoriaId: null,
        duplicata: existingIds.has(t.fitid),
        selecionada: !existingIds.has(t.fitid),
      })))
    } catch (err) {
      toast.error('Erro ao processar arquivo OFX')
    } finally {
      setCarregando(false)
    }
  }, [userId])

  function setCategoriaId(fitid: string, categoriaId: number | null): void {
    setTransacoes((prev) => prev.map((t) => t.fitid === fitid ? { ...t, categoriaId } : t))
  }

  function toggleSelecionada(fitid: string): void {
    setTransacoes((prev) => prev.map((t) => t.fitid === fitid ? { ...t, selecionada: !t.selecionada } : t))
  }

  async function handleImportar(): Promise<void> {
    if (!userId || !contaId) return
    const paraImportar = transacoes.filter((t) => t.selecionada && !t.duplicata && t.categoriaId)
    if (paraImportar.length === 0) { toast.error('Selecione ao menos uma transação com categoria definida'); return }

    setImportando(true)
    let importadas = 0
    try {
      for (const t of paraImportar) {
        await db.transacao.create({
          usuario_id: userId,
          descricao: t.descricao,
          valor: t.valor,
          tipo: t.tipo,
          data: t.data,
          conta_id: contaId,
          categoria_id: t.categoriaId!,
          ofx_id: t.fitid,
        })
        importadas++
      }
      qc.invalidateQueries({ queryKey: ['transacoes'] })
      qc.invalidateQueries({ queryKey: ['transacoes-mes'] })
      qc.invalidateQueries({ queryKey: ['resumo'] })
      qc.invalidateQueries({ queryKey: ['contas'] })
      toast.success(`${importadas} transação(ões) importada(s)!`)
      onSuccess(importadas)
    } catch {
      toast.error('Erro ao importar transações')
    } finally {
      setImportando(false)
    }
  }

  const selecionadas = transacoes.filter((t) => t.selecionada && !t.duplicata)
  const semCategoria = selecionadas.filter((t) => !t.categoriaId).length
  const podImportar = selecionadas.length > 0 && semCategoria === 0

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <h2 className="text-base font-semibold text-foreground">Importação OFX</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Conta destino + Selecionar arquivo */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Conta de destino</label>
              <select
                value={contaId}
                onChange={(e) => setContaId(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSelectFile}
                disabled={carregando || !contaId}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {carregando ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {carregando ? 'Lendo arquivo...' : 'Selecionar arquivo OFX'}
              </button>
            </div>
          </div>

          {/* Tabela de preview */}
          {transacoes.length > 0 && (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{transacoes.length} transações encontradas · {transacoes.filter((t) => t.duplicata).length} duplicatas ignoradas</span>
                {semCategoria > 0 && (
                  <span className="flex items-center gap-1 text-amber-500">
                    <AlertCircle size={12} /> {semCategoria} sem categoria
                  </span>
                )}
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="w-8 px-3 py-2.5"></th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Data</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Descrição</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Tipo</th>
                        <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Valor</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground min-w-[160px]">Categoria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {transacoes.map((t) => (
                        <tr
                          key={t.fitid}
                          className={`transition-colors ${t.duplicata ? 'opacity-40 bg-muted/20' : t.selecionada ? '' : 'opacity-50'}`}
                        >
                          <td className="px-3 py-2.5">
                            {t.duplicata ? (
                              <span title="Duplicata — já importada">
                                <AlertCircle size={14} className="text-amber-500" />
                              </span>
                            ) : (
                              <input
                                type="checkbox"
                                checked={t.selecionada}
                                onChange={() => toggleSelecionada(t.fitid)}
                                className="rounded"
                              />
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {t.data.split('-').reverse().join('/')}
                          </td>
                          <td className="px-3 py-2.5 max-w-[200px] truncate text-xs" title={t.descricao}>
                            {t.descricao}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              t.tipo === 'receita'
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400'
                            }`}>
                              {t.tipo === 'receita' ? 'Receita' : 'Despesa'}
                            </span>
                          </td>
                          <td className={`px-3 py-2.5 text-right text-xs font-semibold whitespace-nowrap ${
                            t.tipo === 'receita' ? 'text-green-600' : 'text-red-500'
                          }`}>
                            {t.tipo === 'despesa' ? '- ' : '+ '}{formatCurrencyBRL(t.valor)}
                          </td>
                          <td className="px-3 py-2.5">
                            {!t.duplicata && (
                              <select
                                value={t.categoriaId ?? ''}
                                onChange={(e) => setCategoriaId(t.fitid, e.target.value ? Number(e.target.value) : null)}
                                className="w-full px-2 py-1 text-xs border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                              >
                                <option value="">Selecionar…</option>
                                {(t.tipo === 'receita' ? categoriasReceita : categoriasDespesa).map((c) => (
                                  <option key={c.id} value={c.id}>{c.nome}</option>
                                ))}
                              </select>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {transacoes.length === 0 && !carregando && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                <FileText size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Selecione um arquivo OFX</p>
              <p className="text-xs text-muted-foreground mt-1">O extrato bancário será exibido para revisão antes da importação</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <div className="text-xs text-muted-foreground">
            {selecionadas.length > 0 && (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-green-500" />
                {selecionadas.length} transação(ões) para importar
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-medium border border-border rounded-lg hover:bg-accent transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleImportar}
              disabled={!podImportar || importando}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {importando ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              {importando ? 'Importando...' : `Importar ${selecionadas.length > 0 ? selecionadas.length : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
