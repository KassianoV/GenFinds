import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useCreateCartao, useUpdateCartao } from '../../hooks/useCartao'
import { useAuthStore } from '../../stores/authStore'
import type { Cartao } from '../../../types/database.types'
import { toast } from 'sonner'

interface CartaoModalProps {
  open: boolean
  onClose: () => void
  editingCartao?: Cartao | null
}

const CORES_CARTAO = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#64748b', '#a855f7', '#0ea5e9',
]

interface FormState {
  nome: string
  valor: string
  vencimento: string
  status: Cartao['status']
  cor: string
}

const DEFAULT_FORM: FormState = {
  nome: '',
  valor: '0',
  vencimento: '',
  status: 'aberta',
  cor: CORES_CARTAO[0],
}

export function CartaoModal({ open, onClose, editingCartao }: CartaoModalProps): React.JSX.Element {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const createCartao = useCreateCartao()
  const updateCartao = useUpdateCartao()

  useEffect(() => {
    if (!open) return
    if (editingCartao) {
      setForm({
        nome: editingCartao.nome,
        valor: String(editingCartao.valor),
        vencimento: String(editingCartao.vencimento),
        status: editingCartao.status,
        cor: editingCartao.cor ?? CORES_CARTAO[0],
      })
    } else {
      setForm(DEFAULT_FORM)
    }
  }, [open, editingCartao])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!userId) return

    const valor = parseFloat(form.valor.replace(',', '.'))
    const vencimento = parseInt(form.vencimento)

    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return }
    if (isNaN(vencimento) || vencimento < 1 || vencimento > 31) {
      toast.error('Dia de vencimento deve ser entre 1 e 31')
      return
    }

    const payload = {
      usuario_id: userId,
      nome: form.nome.trim(),
      valor: isNaN(valor) ? 0 : valor,
      vencimento,
      status: form.status,
      cor: form.cor,
    }

    try {
      if (editingCartao) {
        await updateCartao.mutateAsync({ id: editingCartao.id, updates: payload })
        toast.success('Cartão atualizado')
      } else {
        await createCartao.mutateAsync(payload)
        toast.success('Cartão adicionado')
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar cartão')
    }
  }

  const isLoading = createCartao.isPending || updateCartao.isPending
  const isEdicao = !!editingCartao

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{isEdicao ? 'Editar Cartão' : 'Novo Cartão'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="nome-cartao">Nome do Cartão</Label>
            <Input
              id="nome-cartao"
              placeholder="Ex: Nubank Roxinho, Itaú Platinum..."
              value={form.nome}
              onChange={(e) => setField('nome', e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="valor-cartao">Valor da Fatura (R$)</Label>
              <Input
                id="valor-cartao"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={form.valor}
                onChange={(e) => setField('valor', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vencimento-cartao">Dia de Vencimento</Label>
              <Input
                id="vencimento-cartao"
                type="number"
                min="1"
                max="31"
                placeholder="1–31"
                value={form.vencimento}
                onChange={(e) => setField('vencimento', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor do Cartão</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {CORES_CARTAO.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  onClick={() => setField('cor', cor)}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ring-offset-background ring-offset-1 ${
                    form.cor === cor ? 'ring-2 ring-foreground scale-110' : ''
                  }`}
                  style={{ backgroundColor: cor }}
                />
              ))}
              <div className="flex items-center gap-1.5 ml-1">
                <input
                  type="color"
                  value={form.cor}
                  onChange={(e) => setField('cor', e.target.value)}
                  className="w-7 h-7 rounded-full cursor-pointer border border-border bg-transparent p-0"
                  title="Cor personalizada"
                />
                <span className="text-xs text-muted-foreground">Personalizada</span>
              </div>
            </div>
            <div
              className="h-1.5 rounded-full mt-1 transition-colors"
              style={{ backgroundColor: form.cor }}
            />
          </div>

          {isEdicao && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setField('status', v as Cartao['status'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="fechada">Fechada</SelectItem>
                  <SelectItem value="paga">Paga</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : isEdicao ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
