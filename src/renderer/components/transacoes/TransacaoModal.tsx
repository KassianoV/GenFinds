import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { useContas, useCategorias, useCreateTransacao, useUpdateTransacao } from '../../hooks/useTransacoes'
import { useAuthStore } from '../../stores/authStore'
import type { TransacaoCompleta } from '../../../types/database.types'
import { toast } from 'sonner'

interface TransacaoModalProps {
  open: boolean
  onClose: () => void
  editingTransacao?: TransacaoCompleta | null
}

interface FormState {
  tipo: 'receita' | 'despesa'
  descricao: string
  valor: string
  data: string
  conta_id: string
  categoria_id: string
  observacoes: string
}

const DEFAULT_FORM: FormState = {
  tipo: 'despesa',
  descricao: '',
  valor: '',
  data: new Date().toISOString().split('T')[0],
  conta_id: '',
  categoria_id: '',
  observacoes: '',
}

export function TransacaoModal({ open, onClose, editingTransacao }: TransacaoModalProps): React.JSX.Element {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  const { data: contas = [] } = useContas()
  const { data: categorias = [] } = useCategorias(form.tipo)
  const createTransacao = useCreateTransacao()
  const updateTransacao = useUpdateTransacao()

  useEffect(() => {
    if (!open) return
    if (editingTransacao) {
      setForm({
        tipo: editingTransacao.tipo,
        descricao: editingTransacao.descricao,
        valor: String(editingTransacao.valor),
        data: editingTransacao.data,
        conta_id: String(editingTransacao.conta_id),
        categoria_id: String(editingTransacao.categoria_id),
        observacoes: editingTransacao.observacoes ?? '',
      })
    } else {
      setForm(DEFAULT_FORM)
    }
  }, [open, editingTransacao])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'tipo' ? { categoria_id: '' } : {}),
    }))
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!userId) return

    const valor = parseFloat(form.valor.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) { toast.error('Informe um valor válido'); return }
    if (!form.descricao.trim()) { toast.error('Descrição é obrigatória'); return }
    if (!form.conta_id) { toast.error('Selecione uma conta'); return }
    if (!form.categoria_id) { toast.error('Selecione uma categoria'); return }

    const payload = {
      usuario_id: userId,
      descricao: form.descricao.trim(),
      valor,
      tipo: form.tipo,
      data: form.data,
      conta_id: Number(form.conta_id),
      categoria_id: Number(form.categoria_id),
      observacoes: form.observacoes.trim() || undefined,
    }

    try {
      if (editingTransacao) {
        await updateTransacao.mutateAsync({ id: editingTransacao.id, updates: payload })
        toast.success('Transação atualizada com sucesso')
      } else {
        await createTransacao.mutateAsync(payload)
        toast.success('Transação criada com sucesso')
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar transação')
    }
  }

  const isLoading = createTransacao.isPending || updateTransacao.isPending
  const isEdicao = !!editingTransacao

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{isEdicao ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Tipo toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-xl">
            <button
              type="button"
              onClick={() => setField('tipo', 'receita')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                form.tipo === 'receita'
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingUp size={15} />
              Receita
            </button>
            <button
              type="button"
              onClick={() => setField('tipo', 'despesa')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                form.tipo === 'despesa'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingDown size={15} />
              Despesa
            </button>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              placeholder="Ex: Supermercado, Salário..."
              value={form.descricao}
              onChange={(e) => setField('descricao', e.target.value)}
              autoFocus
            />
          </div>

          {/* Valor + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={form.valor}
                onChange={(e) => setField('valor', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={form.data}
                onChange={(e) => setField('data', e.target.value)}
              />
            </div>
          </div>

          {/* Conta */}
          <div className="space-y-1.5">
            <Label>Conta</Label>
            <Select value={form.conta_id} onValueChange={(v) => setField('conta_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {contas.length === 0 ? (
                  <SelectItem value="_empty" disabled>Nenhuma conta cadastrada</SelectItem>
                ) : (
                  contas.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Categoria */}
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={form.categoria_id} onValueChange={(v) => setField('categoria_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categorias.length === 0 ? (
                  <SelectItem value="_empty" disabled>
                    Nenhuma categoria de {form.tipo === 'receita' ? 'receita' : 'despesa'}
                  </SelectItem>
                ) : (
                  categorias.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      <span className="flex items-center gap-2">
                        {c.cor && (
                          <span
                            className="inline-block w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: c.cor }}
                          />
                        )}
                        {c.nome}
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="obs">
              Observações{' '}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="obs"
              placeholder="Alguma nota adicional..."
              value={form.observacoes}
              onChange={(e) => setField('observacoes', e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className={
                form.tipo === 'receita'
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }
            >
              {isLoading ? 'Salvando...' : isEdicao ? 'Salvar alterações' : 'Criar transação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
