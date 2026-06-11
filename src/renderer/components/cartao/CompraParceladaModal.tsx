import React, { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { CurrencyInput } from '../ui/CurrencyInput'
import { DatePicker } from '../ui/DatePicker'
import { useCartoes, useCreateParcelada } from '../../hooks/useCartao'
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
  numeroParcelas: z
    .number()
    .int()
    .min(2, 'Mínimo 2 parcelas')
    .max(48, 'Máximo 48 parcelas'),
  data: z.string().min(1, 'Data obrigatória'),
  categoria_id: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const DEFAULT_FORM: FormValues = {
  cartao_id: '',
  descricao: '',
  valorCentavos: 0,
  numeroParcelas: 2,
  data: new Date().toISOString().split('T')[0],
  categoria_id: '',
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CompraParceladaDefaults {
  cartaoId?: number
  valorTotal?: number
  numeroParcelas?: number
}

interface CompraParceladaModalProps {
  open: boolean
  onClose: () => void
  defaults?: CompraParceladaDefaults
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }): React.JSX.Element | null {
  if (!message) return null
  return <p className="text-xs text-red-500 mt-1">{message}</p>
}

const OPCOES_RAPIDAS = [2, 3, 4, 6, 8, 10, 12, 18, 24, 36, 48]

// ─── CompraParceladaModal ─────────────────────────────────────────────────────

export function CompraParceladaModal({
  open,
  onClose,
  defaults,
}: CompraParceladaModalProps): React.JSX.Element {
  const userId = useAuthStore((s) => s.currentUser?.id)
  const { data: cartoes = [] } = useCartoes()
  const { data: categorias = [] } = useCategorias('despesa')
  const createParcelada = useCreateParcelada()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_FORM,
    mode: 'onChange',
  })

  const valorCentavos = watch('valorCentavos')
  const numeroParcelas = watch('numeroParcelas')
  const valorParcela = numeroParcelas > 0 ? (valorCentavos / 100) / numeroParcelas : 0
  const isLoading = isSubmitting || createParcelada.isPending

  useEffect(() => {
    if (!open) return
    reset({
      ...DEFAULT_FORM,
      data: new Date().toISOString().split('T')[0],
      cartao_id: defaults?.cartaoId ? String(defaults.cartaoId) : '',
      valorCentavos: defaults?.valorTotal ? Math.round(defaults.valorTotal * 100) : 0,
      numeroParcelas: defaults?.numeroParcelas ?? 2,
    })
  }, [open, defaults, reset])

  async function onSubmit(values: FormValues): Promise<void> {
    if (!userId) return
    try {
      await createParcelada.mutateAsync({
        data: {
          usuario_id: userId,
          cartao_id: Number(values.cartao_id),
          descricao: values.descricao.trim(),
          valor: values.valorCentavos / 100,
          data: values.data,
          parcelas: values.numeroParcelas,
          categoria_id: values.categoria_id ? Number(values.categoria_id) : undefined,
        },
        numeroParcelas: values.numeroParcelas,
      })
      toast.success(`Compra parcelada em ${values.numeroParcelas}× lançada`)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao lançar compra parcelada')
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
        <Label htmlFor="desc-parcelada">Descrição</Label>
        <Input
          id="desc-parcelada"
          placeholder="Ex: iPhone, Notebook, TV..."
          autoFocus
          {...register('descricao')}
        />
        <FieldError message={errors.descricao?.message} />
      </div>

      {/* Valor + Data */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Valor total (R$)</Label>
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
          <Label>1ª parcela</Label>
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

      {/* Número de parcelas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Parcelas</Label>
          <span className="text-xs text-muted-foreground">mín. 2 · máx. 48</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {OPCOES_RAPIDAS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setValue('numeroParcelas', n, { shouldValidate: true })}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                numeroParcelas === n
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {n}×
            </button>
          ))}
          <input
            type="number"
            min={2}
            max={48}
            value={numeroParcelas}
            onChange={(e) => {
              const v = Math.min(48, Math.max(2, parseInt(e.target.value) || 2))
              setValue('numeroParcelas', v, { shouldValidate: true })
            }}
            className="w-14 px-2 py-1 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-center"
          />
        </div>
        <FieldError message={errors.numeroParcelas?.message} />
      </div>

      {/* Preview em tempo real */}
      {valorCentavos > 0 && numeroParcelas >= 2 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{numeroParcelas}× de</span>
            <span className="text-xl font-bold text-foreground">
              {formatCurrencyBRL(valorParcela)}
              <span className="text-sm font-normal text-muted-foreground ml-1">/mês</span>
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-primary/10">
            <span className="text-xs text-muted-foreground">Total da compra</span>
            <span className="text-sm font-semibold text-foreground">
              {formatCurrencyBRL(valorCentavos / 100)}
            </span>
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

      {/* Footer */}
      <div className="flex gap-2 justify-end pt-1 pb-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Lançando...' : 'Lançar parcelado'}
        </Button>
      </div>
    </form>
  )

  if (isDesktop()) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-120">
          <DialogHeader>
            <DialogTitle>Compra Parcelada</DialogTitle>
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
          <SheetTitle>Compra Parcelada</SheetTitle>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}
