import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useCreateCartao, useUpdateCartao } from '../../hooks/useCartao'
import { useAuthStore } from '../../stores/authStore'
import { isDesktop } from '../../services/platform'
import type { Cartao } from '../../../types/database.types'
import { toast } from 'sonner'

// ─── Constantes ───────────────────────────────────────────────────────────────

const BANDEIRAS = ['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard', 'Cabal', 'Outra']

const CORES_CARTAO = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#64748b', '#a855f7', '#0ea5e9',
]

// ─── Schema ───────────────────────────────────────────────────────────────────

const numOpcional = z.preprocess(
  (v) => (typeof v === 'number' && isNaN(v)) ? undefined : v,
  z.number().optional(),
)

const schema = z.object({
  nome: z.string().min(1, 'Nome obrigatório').max(50, 'Máximo 50 caracteres'),
  bandeira: z.string(),
  limite: z.preprocess(
    (v) => (typeof v === 'number' && isNaN(v)) ? undefined : v,
    z.number().min(0, 'Inválido').optional(),
  ),
  dia_fechamento: numOpcional.pipe(
    z.number().int().min(1, 'Mín. 1').max(31, 'Máx. 31').optional(),
  ),
  vencimento: z
    .number({ invalid_type_error: 'Obrigatório' })
    .int()
    .min(1, 'Mín. 1')
    .max(31, 'Máx. 31'),
  cor: z.string().min(1),
  status: z.enum(['aberta', 'fechada', 'paga', 'pendente']),
})

type FormValues = z.infer<typeof schema>

const DEFAULT_VALUES: FormValues = {
  nome: '',
  bandeira: '',
  limite: undefined,
  dia_fechamento: undefined,
  vencimento: undefined as unknown as number,
  cor: CORES_CARTAO[0],
  status: 'aberta',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CartaoModalProps {
  open: boolean
  onClose: () => void
  editingCartao?: Cartao | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }): React.JSX.Element | null {
  if (!message) return null
  return <p className="text-xs text-red-500 mt-1">{message}</p>
}

// ─── CartaoModal ──────────────────────────────────────────────────────────────

export function CartaoModal({ open, onClose, editingCartao }: CartaoModalProps): React.JSX.Element {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const createCartao = useCreateCartao()
  const updateCartao = useUpdateCartao()
  const isEdicao = !!editingCartao

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  })

  const cor = watch('cor')
  const bandeiraSelecionada = watch('bandeira')
  const isLoading = isSubmitting || createCartao.isPending || updateCartao.isPending

  useEffect(() => {
    if (!open) return
    if (editingCartao) {
      reset({
        nome: editingCartao.nome,
        bandeira: editingCartao.bandeira ?? '',
        limite: editingCartao.limite ?? undefined,
        dia_fechamento: editingCartao.dia_fechamento ?? undefined,
        vencimento: editingCartao.vencimento,
        cor: editingCartao.cor ?? CORES_CARTAO[0],
        status: editingCartao.status,
      })
    } else {
      reset(DEFAULT_VALUES)
    }
  }, [open, editingCartao, reset])

  async function onSubmit(values: FormValues): Promise<void> {
    if (!userId) return
    const payload = {
      usuario_id: userId,
      nome: values.nome.trim(),
      valor: editingCartao?.valor ?? 0,
      vencimento: values.vencimento,
      limite: values.limite,
      dia_fechamento: values.dia_fechamento,
      bandeira: values.bandeira || undefined,
      status: values.status,
      cor: values.cor,
    }
    try {
      if (isEdicao) {
        await updateCartao.mutateAsync({ id: editingCartao!.id, updates: payload })
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

  const body = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
      {/* Nome */}
      <div className="space-y-1.5">
        <Label htmlFor="nome-cartao">Nome do Cartão</Label>
        <Input
          id="nome-cartao"
          placeholder="Ex: Nubank Roxinho, Itaú Platinum..."
          autoFocus
          {...register('nome')}
        />
        <FieldError message={errors.nome?.message} />
      </div>

      {/* Bandeira */}
      <div className="space-y-1.5">
        <Label>
          Bandeira{' '}
          <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
        </Label>
        <Select
          value={bandeiraSelecionada}
          onValueChange={(v) => setValue('bandeira', v === '__none__' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecionar bandeira" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Nenhuma</SelectItem>
            {BANDEIRAS.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Limite */}
      <div className="space-y-1.5">
        <Label htmlFor="limite-cartao">
          Limite (R$){' '}
          <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
        </Label>
        <Input
          id="limite-cartao"
          type="number"
          step="0.01"
          min="0"
          placeholder="Ex: 5000,00"
          {...register('limite', { valueAsNumber: true })}
        />
        <FieldError message={errors.limite?.message} />
      </div>

      {/* Dia de fechamento + vencimento */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="fechamento-cartao">
            Dia de Fechamento{' '}
            <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
          </Label>
          <Input
            id="fechamento-cartao"
            type="number"
            min="1"
            max="31"
            placeholder="1–31"
            {...register('dia_fechamento', { valueAsNumber: true })}
          />
          <FieldError message={errors.dia_fechamento?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vencimento-cartao">Dia de Vencimento</Label>
          <Input
            id="vencimento-cartao"
            type="number"
            min="1"
            max="31"
            placeholder="1–31"
            {...register('vencimento', { valueAsNumber: true })}
          />
          <FieldError message={errors.vencimento?.message} />
        </div>
      </div>

      {/* Cor */}
      <div className="space-y-2">
        <Label>Cor do Cartão</Label>
        <div className="flex items-center gap-2 flex-wrap">
          {CORES_CARTAO.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setValue('cor', c)}
              className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ring-offset-background ring-offset-1 ${
                cor === c ? 'ring-2 ring-foreground scale-110' : ''
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="flex items-center gap-1.5 ml-1">
            <input
              type="color"
              value={cor}
              onChange={(e) => setValue('cor', e.target.value)}
              className="w-7 h-7 rounded-full cursor-pointer border border-border bg-transparent p-0"
              title="Cor personalizada"
            />
            <span className="text-xs text-muted-foreground">Personalizada</span>
          </div>
        </div>
        <div className="h-1.5 rounded-full mt-1 transition-colors" style={{ backgroundColor: cor }} />
      </div>

      {/* Status (somente edição) */}
      {isEdicao && (
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={watch('status')}
            onValueChange={(v) => setValue('status', v as Cartao['status'])}
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

      {/* Footer */}
      <div className="flex gap-2 justify-end pt-1 pb-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : isEdicao ? 'Salvar' : 'Adicionar'}
        </Button>
      </div>
    </form>
  )

  if (isDesktop()) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-110">
          <DialogHeader>
            <DialogTitle>{isEdicao ? 'Editar Cartão' : 'Novo Cartão'}</DialogTitle>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl px-6 pt-4">
        <SheetHeader className="mb-2">
          <SheetTitle>{isEdicao ? 'Editar Cartão' : 'Novo Cartão'}</SheetTitle>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}
