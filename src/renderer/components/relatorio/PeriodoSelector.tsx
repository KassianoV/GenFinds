import React, { useState, useRef, useEffect } from 'react'
import { CalendarRange, ChevronDown, Check } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
import { Button } from '../ui/button'
import { DatePicker } from '../ui/DatePicker'
import { isDesktop } from '../../services/platform'
import {
  useRelatorioFilterStore,
  calcularPeriodo,
  type PeriodoPreset,
} from '../../stores/relatorioFilterStore'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PeriodoSelectorProps {
  onChange?: (dataInicio: string, dataFim: string) => void
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const PRESETS: { value: PeriodoPreset; label: string }[] = [
  { value: 'mes-atual', label: 'Mês atual' },
  { value: 'mes-anterior', label: 'Mês anterior' },
  { value: 'ultimos-3-meses', label: 'Últimos 3 meses' },
  { value: 'ano-atual', label: 'Ano atual' },
  { value: 'personalizado', label: 'Personalizado' },
]

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseISO(iso: string): Date | undefined {
  if (!iso) return undefined
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatTriggerLabel(preset: PeriodoPreset, dataInicio: string, dataFim: string): string {
  switch (preset) {
    case 'mes-atual': {
      const d = parseISO(dataInicio)
      return d ? `Mês atual · ${MESES[d.getMonth()]} ${d.getFullYear()}` : 'Mês atual'
    }
    case 'mes-anterior': {
      const d = parseISO(dataInicio)
      return d ? `Mês anterior · ${MESES[d.getMonth()]} ${d.getFullYear()}` : 'Mês anterior'
    }
    case 'ultimos-3-meses':
      return 'Últimos 3 meses'
    case 'ano-atual': {
      const d = parseISO(dataInicio)
      return d ? `Ano atual · ${d.getFullYear()}` : 'Ano atual'
    }
    case 'personalizado': {
      const fmt = (iso: string) => {
        const [y, m, dd] = iso.split('-')
        return `${dd}/${m}/${y}`
      }
      return dataInicio && dataFim ? `${fmt(dataInicio)} – ${fmt(dataFim)}` : 'Personalizado'
    }
  }
}

// ─── PeriodoContent ───────────────────────────────────────────────────────────

interface PeriodoContentProps {
  onClose: () => void
  onChange?: (dataInicio: string, dataFim: string) => void
}

function PeriodoContent({ onClose, onChange }: PeriodoContentProps): React.JSX.Element {
  const { preset, dataInicio, dataFim, setPreset, setPersonalizado } = useRelatorioFilterStore()

  const [localPreset, setLocalPreset] = useState<PeriodoPreset>(preset)
  const [localInicio, setLocalInicio] = useState<Date | undefined>(parseISO(dataInicio))
  const [localFim, setLocalFim] = useState<Date | undefined>(parseISO(dataFim))

  function handlePreset(p: PeriodoPreset): void {
    setLocalPreset(p)
    if (p !== 'personalizado') {
      const periodo = calcularPeriodo(p)
      setPreset(p)
      onChange?.(periodo.dataInicio, periodo.dataFim)
      onClose()
    }
  }

  function handleAplicar(): void {
    if (!localInicio || !localFim) return
    const inicio = toISO(localInicio)
    const fim = toISO(localFim)
    setPersonalizado(inicio, fim)
    onChange?.(inicio, fim)
    onClose()
  }

  const aplicarDisabled = !localInicio || !localFim || localInicio > localFim

  return (
    <div className="p-4 w-72">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Período</p>

      <div className="space-y-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => handlePreset(p.value)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
              localPreset === p.value
                ? 'bg-primary/10 text-primary font-medium'
                : 'hover:bg-accent text-foreground'
            }`}
          >
            <span>{p.label}</span>
            {localPreset === p.value && <Check size={14} />}
          </button>
        ))}
      </div>

      {localPreset === 'personalizado' && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">De</p>
            <DatePicker
              value={localInicio}
              onChange={setLocalInicio}
              maxDate={localFim}
              placeholder="Data inicial"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Até</p>
            <DatePicker
              value={localFim}
              onChange={setLocalFim}
              minDate={localInicio}
              placeholder="Data final"
            />
          </div>
          <Button
            type="button"
            className="w-full"
            onClick={handleAplicar}
            disabled={aplicarDisabled}
          >
            Aplicar
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── PeriodoSelector ──────────────────────────────────────────────────────────

export function PeriodoSelector({ onChange }: PeriodoSelectorProps): React.JSX.Element {
  const { preset, dataInicio, dataFim } = useRelatorioFilterStore()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const desktop = isDesktop()

  const label = formatTriggerLabel(preset, dataInicio, dataFim)

  useEffect(() => {
    if (!open || !desktop) return
    function onMouseDown(e: MouseEvent): void {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open, desktop])

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-accent transition-colors"
    >
      <CalendarRange size={15} className="text-muted-foreground shrink-0" />
      <span>{label}</span>
      <ChevronDown
        size={14}
        className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
      />
    </button>
  )

  if (desktop) {
    return (
      <div ref={wrapperRef} className="relative">
        {trigger}
        {open && (
          <div className="absolute top-full mt-1 right-0 z-50 rounded-xl border border-border bg-popover shadow-lg">
            <PeriodoContent onClose={() => setOpen(false)} onChange={onChange} />
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {trigger}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl px-0 pt-4">
          <SheetHeader className="px-4 mb-1">
            <SheetTitle>Selecionar Período</SheetTitle>
          </SheetHeader>
          <PeriodoContent onClose={() => setOpen(false)} onChange={onChange} />
        </SheetContent>
      </Sheet>
    </>
  )
}
