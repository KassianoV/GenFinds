import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useCartoes, useCreateFatura } from '../../hooks/useCartao'
import { useCategorias } from '../../hooks/useTransacoes'
import { useAuthStore } from '../../stores/authStore'
import { toast } from 'sonner'

interface FaturaModalProps {
  open: boolean
  onClose: () => void
  defaultCartaoId?: number
}

interface FormState {
  cartao_id: string
  descricao: string
  valor: string
  data: string
  categoria_id: string
  numeroParcelas: string
}

const DEFAULT_FORM: FormState = {
  cartao_id: '',
  descricao: '',
  valor: '',
  data: new Date().toISOString().split('T')[0],
  categoria_id: '',
  numeroParcelas: '1',
}

export function FaturaModal({ open, onClose, defaultCartaoId }: FaturaModalProps): React.JSX.Element {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const { data: cartoes = [] } = useCartoes()
  const { data: categorias = [] } = useCategorias('despesa')
  const createFatura = useCreateFatura()

  useEffect(() => {
    if (!open) return
    setForm({
      ...DEFAULT_FORM,
      data: new Date().toISOString().split('T')[0],
      cartao_id: defaultCartaoId ? String(defaultCartaoId) : '',
    })
  }, [open, defaultCartaoId])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const valor = parseFloat(form.valor.replace(',', '.')) || 0
  const numeroParcelas = Math.max(1, parseInt(form.numeroParcelas) || 1)
  const valorPorParcela = numeroParcelas > 1 ? valor / numeroParcelas : valor

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!userId) return

    if (!form.cartao_id) { toast.error('Selecione um cartão'); return }
    if (!form.descricao.trim()) { toast.error('Descrição é obrigatória'); return }
    if (isNaN(valor) || valor <= 0) { toast.error('Valor inválido'); return }

    try {
      await createFatura.mutateAsync({
        data: {
          usuario_id: userId,
          descricao: form.descricao.trim(),
          valor,
          data: form.data,
          cartao_id: Number(form.cartao_id),
          categoria_id: form.categoria_id ? Number(form.categoria_id) : undefined,
          parcelas: numeroParcelas,
          observacoes: undefined,
        },
        numeroParcelas,
      })
      toast.success(
        numeroParcelas > 1
          ? `Compra parcelada em ${numeroParcelas}x lançada`
          : 'Lançamento adicionado à fatura',
      )
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao lançar na fatura')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Lançar na Fatura</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Cartão */}
          <div className="space-y-1.5">
            <Label>Cartão</Label>
            <Select value={form.cartao_id} onValueChange={(v) => setField('cartao_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cartão" />
              </SelectTrigger>
              <SelectContent>
                {cartoes.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="desc-fatura">Descrição</Label>
            <Input
              id="desc-fatura"
              placeholder="Ex: Amazon, iFood, Netflix..."
              value={form.descricao}
              onChange={(e) => setField('descricao', e.target.value)}
              autoFocus
            />
          </div>

          {/* Valor + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="valor-fatura">Valor (R$)</Label>
              <Input
                id="valor-fatura"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={form.valor}
                onChange={(e) => setField('valor', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data-fatura">Data</Label>
              <Input
                id="data-fatura"
                type="date"
                value={form.data}
                onChange={(e) => setField('data', e.target.value)}
              />
            </div>
          </div>

          {/* Parcelas + Categoria */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="parcelas-fatura">Parcelas</Label>
              <Input
                id="parcelas-fatura"
                type="number"
                min="1"
                max="48"
                placeholder="1 = à vista"
                value={form.numeroParcelas}
                onChange={(e) => setField('numeroParcelas', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Categoria{' '}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Select value={form.categoria_id} onValueChange={(v) => setField('categoria_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview parcelamento */}
          {numeroParcelas > 1 && valor > 0 && (
            <div className="px-3 py-2.5 bg-primary/5 border border-primary/10 rounded-lg">
              <p className="text-xs text-muted-foreground">
                {numeroParcelas}x de{' '}
                <span className="font-semibold text-foreground">
                  R$ {valorPorParcela.toFixed(2)}
                </span>
                {' · '}Total:{' '}
                <span className="font-semibold text-foreground">R$ {valor.toFixed(2)}</span>
              </p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={createFatura.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createFatura.isPending}>
              {createFatura.isPending ? 'Lançando...' : 'Lançar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
