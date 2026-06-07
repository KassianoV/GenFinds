import React, { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { CurrencyInput } from '../ui/CurrencyInput'
import { DatePicker } from '../ui/DatePicker'
import { useCartoes, useCreateFatura } from '../../hooks/useCartao'
import { useCategorias } from '../../hooks/useTransacoes'
import { useAuthStore } from '../../stores/authStore'
import { formatCurrencyBRL } from '../../../lib/format'
import { isDesktop } from '../../services/platform'
import { toast } from 'sonner'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  cartao_id: z.string().min(1, 'Selecione um cartão'),
  descricao: z.string().min(1, 'Descrição obrigatória').max(100, 'Máximo 100 caracteres'),
  valorCentavos: z.number().int().min(1, 'Informe um valor maior que zero'),
  data: z.string().min(1, 'Data obrigatória'),
  categoria_id: z.string().optional(),
  observacoes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const DEFAULT_FORM: FormValues = {
  cartao_id: '',
  descricao: '',
  valorCentavos: 0,
  data: new Date().toISOString().split('T')[0],
  categoria_id: '',
  observacoes: '',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CompraVistaModalProps {
  open: boolean
  onClose: () => void
  defaultCartaoId?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }): React.JSX.Element | null {
  if (!message) return null
  return <p className="text-xs text-red-500 mt-1">{message}</p>
}

// ─── CompraVistaModal ─────────────────────────────────────────────────────────

export function CompraVistaModal({
  open,
  onClose,
  defaultCartaoId,
}: CompraVistaModalProps): React.JSX.Element {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const { data: cartoes = [] } = useCartoes()
  const { data: categorias = [] } = useCategorias('despesa')
  const createFatura = useCreateFatura()

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_FORM,
    mode: 'onChange',
  })

  const valorCentavos = watch('valorCentavos')
  const cartaoId = watch('cartao_id')
  const isLoading = isSubmitting || createFatura.isPending

  const cartaoSelecionado = cartoes.find((c) => String(c.id) === cartaoId)
  const faturaAtual = cartaoSelecionado?.valor ?? 0
  const novaFatura = faturaAtual + valorCentavos / 100
  const aumentoGrande = valorCentavos > 0 && cartaoSelecionado && novaFatura > faturaAtual * 2 && faturaAtual > 0

  useEffect(() => {
    if (!open) return
    reset({
      ...DEFAULT_FORM,
      data: new Date().toISOString().split('T')[0],
      cartao_id: defaultCartaoId ? String(defaultCartaoId) : '',
    })
  }, [open, defaultCartaoId, reset])

  async function onSubmit(values: FormValues): Promise<void> {
    if (!userId) return
    const valor = values.valorCentavos / 100
    try {
      await createFatura.mutateAsync({
        data: {
          usuario_id: userId,
          cartao_id: Number(values.cartao_id),
          descricao: values.descricao.trim(),
          valor,
          data: values.data,
          parcelas: 1,
          categoria_id: values.categoria_id ? Number(values.categoria_id) : undefined,
          observacoes: values.observacoes?.trim() || undefined,
        },
        numeroParcelas: 1,
      })
      toast.success('Compra lançada na fatura')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao lançar compra')
    }
  }

  const body = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
      {/* Cartão */}
      <div className="space-y-1.5">
        <Label>Cartão</Label>
        <Controller
          name="cartao_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
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
          )}
        />
        <FieldError message={errors.cartao_id?.message} />
      </div>

      {/* Descrição */}
      <div className="space-y-1.5">
        <Label htmlFor="desc-vista">Descrição</Label>
        <Input
          id="desc-vista"
          placeholder="Ex: Supermercado, Farmácia..."
          autoFocus
          {...register('descricao')}
        />
        <FieldError message={errors.descricao?.message} />
      </div>

      {/* Valor + Data */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Valor (R$)</Label>
          <Controller
            name="valorCentavos"
            control={control}
            render={({ field }) => (
              <CurrencyInput
                valorEmCentavos={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <FieldError message={errors.valorCentavos?.message} />
        </div>
        <div className="space-y-1.5">
          <Label>Data</Label>
          <Controller
            name="data"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value ? new Date(field.value + 'T12:00:00') : undefined}
                onChange={(d) => field.onChange(d.toISOString().split('T')[0])}
              />
            )}
          />
          <FieldError message={errors.data?.message} />
        </div>
      </div>

      {/* Impacto na fatura */}
      {cartaoSelecionado && valorCentavos > 0 && (
        <div
          className={`rounded-lg border px-3 py-2.5 space-y-1 ${
            aumentoGrande
              ? 'border-amber-500/30 bg-amber-500/10'
              : 'border-border bg-muted/30'
          }`}
        >
          {aumentoGrande && (
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle size={12} className="text-amber-500 shrink-0" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Compra significativa em relação à fatura atual
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Fatura atual</span>
            <span className="text-xs font-medium text-foreground">{formatCurrencyBRL(faturaAtual)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Esta compra</span>
            <span className="text-xs font-medium text-red-500">+ {formatCurrencyBRL(valorCentavos / 100)}</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <span className="text-xs font-medium text-foreground">Nova fatura</span>
            <span className="text-xs font-bold text-foreground">{formatCurrencyBRL(novaFatura)}</span>
          </div>
        </div>
      )}

      {/* Categoria */}
      <div className="space-y-1.5">
        <Label>
          Categoria{' '}
          <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
        </Label>
        <Controller
          name="categoria_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
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
          )}
        />
      </div>

      {/* Observações */}
      <div className="space-y-1.5">
        <Label htmlFor="obs-vista">
          Observações{' '}
          <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
        </Label>
        <Input
          id="obs-vista"
          placeholder="Alguma nota adicional..."
          {...register('observacoes')}
        />
      </div>

      {/* Footer */}
      <div className="flex gap-2 justify-end pt-1 pb-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Lançando...' : 'Lançar compra'}
        </Button>
      </div>
    </form>
  )

  if (isDesktop()) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Compra à Vista</DialogTitle>
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
          <SheetTitle>Compra à Vista</SheetTitle>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}
