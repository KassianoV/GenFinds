import React, { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TrendingUp, TrendingDown } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { CurrencyInput } from '../ui/CurrencyInput'
import { DatePicker } from '../ui/DatePicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { useContas, useCategorias, useCreateTransacao, useUpdateTransacao } from '../../hooks/useTransacoes'
import { useAuthStore } from '../../stores/authStore'
import { isDesktop } from '../../services/platform'
import type { TransacaoCompleta } from '../../../types/database.types'
import { toast } from 'sonner'

// ─── Schema Zod ───────────────────────────────────────────────────────────────

const schema = z.object({
  tipo: z.enum(['receita', 'despesa']),
  descricao: z
    .string()
    .min(1, 'Descrição obrigatória')
    .max(100, 'Máximo 100 caracteres'),
  valorCentavos: z.number().int().min(1, 'Informe um valor maior que zero'),
  data: z.string().min(1, 'Data obrigatória'),
  conta_id: z.string().min(1, 'Selecione uma conta'),
  categoria_id: z.string().min(1, 'Selecione uma categoria'),
  observacoes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const DEFAULT_FORM: FormValues = {
  tipo: 'despesa',
  descricao: '',
  valorCentavos: 0,
  data: new Date().toISOString().split('T')[0],
  conta_id: '',
  categoria_id: '',
  observacoes: '',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TransacaoModalProps {
  open: boolean
  onClose: () => void
  editingTransacao?: TransacaoCompleta | null
}

// ─── Erro inline ──────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }): React.JSX.Element | null {
  if (!message) return null
  return <p className="text-xs text-red-500 mt-1">{message}</p>
}

// ─── TransacaoModal ───────────────────────────────────────────────────────────

export function TransacaoModal({ open, onClose, editingTransacao }: TransacaoModalProps): React.JSX.Element {
  const userId = useAuthStore((s) => s.currentUser?.id)

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

  const tipoValue = watch('tipo')

  const { data: contas = [] } = useContas()
  const { data: categorias = [] } = useCategorias(tipoValue)
  const createTransacao = useCreateTransacao()
  const updateTransacao = useUpdateTransacao()

  const isEdicao = !!editingTransacao
  const isLoading = isSubmitting || createTransacao.isPending || updateTransacao.isPending

  useEffect(() => {
    if (!open) return
    if (editingTransacao) {
      reset({
        tipo: editingTransacao.tipo,
        descricao: editingTransacao.descricao,
        valorCentavos: Math.round(editingTransacao.valor * 100),
        data: editingTransacao.data,
        conta_id: String(editingTransacao.conta_id),
        categoria_id: String(editingTransacao.categoria_id),
        observacoes: editingTransacao.observacoes ?? '',
      })
    } else {
      reset(DEFAULT_FORM)
    }
  }, [open, editingTransacao, reset])

  async function onSubmit(values: FormValues): Promise<void> {
    if (!userId) return
    const valor = values.valorCentavos / 100
    const payload = {
      usuario_id: userId,
      descricao: values.descricao.trim(),
      valor,
      tipo: values.tipo,
      data: values.data,
      conta_id: Number(values.conta_id),
      categoria_id: Number(values.categoria_id),
      observacoes: values.observacoes?.trim() || undefined,
    }
    try {
      if (isEdicao) {
        await updateTransacao.mutateAsync({ id: editingTransacao!.id, updates: payload })
        toast.success('Transação atualizada')
      } else {
        await createTransacao.mutateAsync(payload)
        toast.success('Transação criada')
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar transação')
    }
  }

  const title = isEdicao ? 'Editar Transação' : 'Nova Transação'

  const formBody = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
      {/* Tipo */}
      <Controller
        name="tipo"
        control={control}
        render={({ field }) => (
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-xl">
            <button
              type="button"
              onClick={() => { field.onChange('receita'); setValue('categoria_id', '') }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                field.value === 'receita'
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingUp size={15} />
              Receita
            </button>
            <button
              type="button"
              onClick={() => { field.onChange('despesa'); setValue('categoria_id', '') }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                field.value === 'despesa'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingDown size={15} />
              Despesa
            </button>
          </div>
        )}
      />

      {/* Descrição */}
      <div className="space-y-1.5">
        <Label htmlFor="descricao">Descrição</Label>
        <Input
          id="descricao"
          placeholder="Ex: Supermercado, Salário..."
          autoFocus
          {...register('descricao')}
        />
        <FieldError message={errors.descricao?.message} />
      </div>

      {/* Valor + Data */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="valor">Valor (R$)</Label>
          <Controller
            name="valorCentavos"
            control={control}
            render={({ field }) => (
              <CurrencyInput
                id="valor"
                valorEmCentavos={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <FieldError message={errors.valorCentavos?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="data">Data</Label>
          <Controller
            name="data"
            control={control}
            render={({ field }) => (
              <DatePicker
                id="data"
                value={field.value ? new Date(field.value + 'T12:00:00') : undefined}
                onChange={(date) => field.onChange(date.toISOString().split('T')[0])}
              />
            )}
          />
          <FieldError message={errors.data?.message} />
        </div>
      </div>

      {/* Conta */}
      <div className="space-y-1.5">
        <Label>Conta</Label>
        <Controller
          name="conta_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {contas.length === 0 ? (
                  <SelectItem value="_empty" disabled>Nenhuma conta cadastrada</SelectItem>
                ) : (
                  contas.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={errors.conta_id?.message} />
      </div>

      {/* Categoria */}
      <div className="space-y-1.5">
        <Label>Categoria</Label>
        <Controller
          name="categoria_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categorias.length === 0 ? (
                  <SelectItem value="_empty" disabled>
                    Nenhuma categoria de {tipoValue === 'receita' ? 'receita' : 'despesa'}
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
          )}
        />
        <FieldError message={errors.categoria_id?.message} />
      </div>

      {/* Observações */}
      <div className="space-y-1.5">
        <Label htmlFor="obs">
          Observações{' '}
          <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
        </Label>
        <Input
          id="obs"
          placeholder="Alguma nota adicional..."
          {...register('observacoes')}
        />
      </div>

      {/* Footer */}
      <div className="flex gap-2 justify-end pt-1 pb-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className={
            tipoValue === 'receita'
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }
        >
          {isLoading ? 'Salvando...' : isEdicao ? 'Salvar alterações' : 'Criar transação'}
        </Button>
      </div>
    </form>
  )

  if (isDesktop()) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-115">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {formBody}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl px-6 pt-4">
        <SheetHeader className="mb-2">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {formBody}
      </SheetContent>
    </Sheet>
  )
}
