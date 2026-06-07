import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useCartoes, useCreateParcela } from '../../hooks/useCartao'
import { useAuthStore } from '../../stores/authStore'
import { toast } from 'sonner'

interface ParcelaModalProps {
  open: boolean
  onClose: () => void
}

interface FormState {
  cartao_id: string
  descricao: string
  dia: string
  valor_parcela: string
  quantidade_parcelas: string
}

const DEFAULT_FORM: FormState = {
  cartao_id: '',
  descricao: '',
  dia: '',
  valor_parcela: '',
  quantidade_parcelas: '1',
}

export function ParcelaModal({ open, onClose }: ParcelaModalProps): React.JSX.Element {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const { data: cartoes = [] } = useCartoes()
  const createParcela = useCreateParcela()

  useEffect(() => {
    if (open) setForm(DEFAULT_FORM)
  }, [open])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const valorParcela = parseFloat(form.valor_parcela.replace(',', '.')) || 0
  const qtd = Math.max(1, parseInt(form.quantidade_parcelas) || 1)
  const total = valorParcela * qtd

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!userId) return

    const dia = parseInt(form.dia)
    if (!form.cartao_id) { toast.error('Selecione um cartão'); return }
    if (!form.descricao.trim()) { toast.error('Descrição é obrigatória'); return }
    if (isNaN(dia) || dia < 1 || dia > 31) { toast.error('Dia deve ser entre 1 e 31'); return }
    if (isNaN(valorParcela) || valorParcela <= 0) { toast.error('Valor inválido'); return }

    try {
      await createParcela.mutateAsync({
        usuario_id: userId,
        cartao_id: Number(form.cartao_id),
        descricao: form.descricao.trim(),
        dia,
        valor_parcela: valorParcela,
        quantidade_parcelas: qtd,
        total,
      })
      toast.success('Parcela adicionada')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar parcela')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Nova Parcela Fixa</DialogTitle>
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
            <Label htmlFor="desc-parcela">Descrição</Label>
            <Input
              id="desc-parcela"
              placeholder="Ex: Netflix, Spotify, Academia..."
              value={form.descricao}
              onChange={(e) => setField('descricao', e.target.value)}
              autoFocus
            />
          </div>

          {/* Dia + Valor + Qtd */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dia-parcela">Dia</Label>
              <Input
                id="dia-parcela"
                type="number"
                min="1"
                max="31"
                placeholder="1–31"
                value={form.dia}
                onChange={(e) => setField('dia', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valor-parcela">Valor (R$)</Label>
              <Input
                id="valor-parcela"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={form.valor_parcela}
                onChange={(e) => setField('valor_parcela', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qtd-parcela">Qtd.</Label>
              <Input
                id="qtd-parcela"
                type="number"
                min="1"
                max="120"
                placeholder="1"
                value={form.quantidade_parcelas}
                onChange={(e) => setField('quantidade_parcelas', e.target.value)}
              />
            </div>
          </div>

          {/* Preview total */}
          {valorParcela > 0 && (
            <div className="px-3 py-2.5 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                {qtd === 1 ? 'Recorrente sem fim' : `${qtd} parcelas`}
                {' · '}Total:{' '}
                <span className="font-semibold text-foreground">R$ {total.toFixed(2)}</span>
              </p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={createParcela.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createParcela.isPending}>
              {createParcela.isPending ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
