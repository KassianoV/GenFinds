import React, { useEffect, useState } from 'react'
import { Calculator } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { CurrencyInput } from '../ui/CurrencyInput'
import { useCartoes } from '../../hooks/useCartao'
import { formatCurrencyBRL } from '../../../lib/format'
import { isDesktop } from '../../services/platform'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SimuladorResult {
  valor: number
  numeroParcelas: number
  cartaoId?: number
}

interface SimuladorParcelasProps {
  open: boolean
  onClose: () => void
  onConfirmar: (result: SimuladorResult) => void
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const OPCOES_PARCELAS = [1, 2, 3, 4, 6, 8, 10, 12, 18, 24, 36, 48]

// ─── SimuladorParcelas ────────────────────────────────────────────────────────

export function SimuladorParcelas({
  open,
  onClose,
  onConfirmar,
}: SimuladorParcelasProps): React.JSX.Element {
  const [valorCentavos, setValorCentavos] = useState(0)
  const [parcelas, setParcelas] = useState(1)
  const [cartaoId, setCartaoId] = useState('')

  const { data: cartoes = [] } = useCartoes()

  useEffect(() => {
    if (!open) return
    setValorCentavos(0)
    setParcelas(1)
    setCartaoId('')
  }, [open])

  const valorTotal = valorCentavos / 100
  const valorParcela = parcelas > 0 ? valorTotal / parcelas : 0
  const cartaoSelecionado = cartoes.find((c) => String(c.id) === cartaoId)
  const novaFatura = (cartaoSelecionado?.valor ?? 0) + valorParcela

  function handleConfirmar(): void {
    if (valorCentavos <= 0) return
    onConfirmar({
      valor: valorTotal,
      numeroParcelas: parcelas,
      cartaoId: cartaoId ? Number(cartaoId) : undefined,
    })
  }

  const body = (
    <div className="space-y-5 pt-2">
      {/* Valor total */}
      <div className="space-y-1.5">
        <Label>Valor total (R$)</Label>
        <CurrencyInput
          valorEmCentavos={valorCentavos}
          onChange={setValorCentavos}
        />
      </div>

      {/* Número de parcelas */}
      <div className="space-y-2">
        <Label>Número de parcelas</Label>
        <div className="flex flex-wrap gap-1.5">
          {OPCOES_PARCELAS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setParcelas(n)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                parcelas === n
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {n === 1 ? 'À vista' : `${n}×`}
            </button>
          ))}
        </div>
      </div>

      {/* Preview de cálculo */}
      {valorCentavos > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {parcelas === 1 ? 'À vista' : `${parcelas}× de`}
            </span>
            <span className="text-xl font-bold text-foreground">
              {formatCurrencyBRL(valorParcela)}
              {parcelas > 1 && (
                <span className="text-sm font-normal text-muted-foreground ml-1">/mês</span>
              )}
            </span>
          </div>
          {parcelas > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrencyBRL(valorTotal)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Cartão — impacto na fatura */}
      <div className="space-y-1.5">
        <Label>
          Cartão{' '}
          <span className="text-muted-foreground font-normal text-xs">(impacto na fatura)</span>
        </Label>
        <Select value={cartaoId} onValueChange={setCartaoId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecionar cartão" />
          </SelectTrigger>
          <SelectContent>
            {cartoes.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {cartaoSelecionado && valorCentavos > 0 && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <span className="text-xs text-muted-foreground">Fatura atual → nova fatura</span>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              {formatCurrencyBRL(cartaoSelecionado.valor)} →{' '}
              {formatCurrencyBRL(novaFatura)}
            </span>
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex gap-2 justify-end pt-1 pb-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleConfirmar} disabled={valorCentavos <= 0}>
          Confirmar lançamento
        </Button>
      </div>
    </div>
  )

  if (isDesktop()) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator size={16} />
              Simulador de Parcelas
            </DialogTitle>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl px-6 pt-4">
        <SheetHeader className="mb-2">
          <SheetTitle className="flex items-center gap-2">
            <Calculator size={16} />
            Simulador de Parcelas
          </SheetTitle>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}
