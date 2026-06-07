import React, { useEffect, useRef, useState } from 'react'
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isDesktop } from '../../services/platform'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DatePickerProps {
  value: Date | undefined
  onChange: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  id?: string
  className?: string
  disabled?: boolean
  placeholder?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function formatDisplay(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${d}/${m}/${date.getFullYear()}`
}

function toInputValue(date: Date | undefined): string {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

const BASE_CLASS = [
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
  'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ')

// ─── MiniCalendar ─────────────────────────────────────────────────────────────

interface MiniCalendarProps {
  value: Date | undefined
  onChange: (date: Date) => void
  minDate?: Date
  maxDate?: Date
}

function MiniCalendar({ value, onChange, minDate, maxDate }: MiniCalendarProps): React.JSX.Element {
  const today = new Date()
  const [viewMonth, setViewMonth] = useState(value?.getMonth() ?? today.getMonth())
  const [viewYear, setViewYear] = useState(value?.getFullYear() ?? today.getFullYear())

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function prevMonth(): void {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }

  function nextMonth(): void {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  function dayDate(day: number): Date {
    return new Date(viewYear, viewMonth, day)
  }

  function isDayDisabled(day: number): boolean {
    const d = dayDate(day)
    if (minDate && d < minDate) return true
    if (maxDate && d > maxDate) return true
    return false
  }

  return (
    <div className="p-4 w-72 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-xs font-medium text-muted-foreground py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />
          const d = dayDate(day)
          const selected = value !== undefined && isSameDay(d, value)
          const isToday = isSameDay(d, today)
          const disabled = isDayDisabled(day)
          return (
            <div key={i} className="flex items-center justify-center">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(d)}
                className={cn(
                  'w-9 h-9 rounded-full text-sm font-normal transition-colors',
                  selected
                    ? 'bg-primary text-primary-foreground font-medium'
                    : isToday
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground text-foreground',
                  disabled && 'opacity-30 cursor-not-allowed pointer-events-none',
                )}
              >
                {day}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── DatePicker ───────────────────────────────────────────────────────────────

export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  id,
  className,
  disabled,
  placeholder = 'dd/mm/aaaa',
}: DatePickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent): void {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  // ── Mobile: input nativo ───────────────────────────────────────────────────
  if (!isDesktop()) {
    return (
      <input
        id={id}
        type="date"
        value={toInputValue(value)}
        min={toInputValue(minDate)}
        max={toInputValue(maxDate)}
        disabled={disabled}
        onChange={(e) => {
          if (!e.target.value) return
          const [y, mo, d] = e.target.value.split('-').map(Number)
          onChange(new Date(y, mo - 1, d))
        }}
        className={cn(BASE_CLASS, 'text-foreground', className)}
      />
    )
  }

  // ── Desktop: trigger + popover ─────────────────────────────────────────────
  return (
    <div ref={wrapperRef} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          BASE_CLASS,
          'flex items-center justify-between cursor-pointer',
          !value && 'text-muted-foreground',
          className,
        )}
      >
        <span>{value ? formatDisplay(value) : placeholder}</span>
        <CalendarIcon size={15} className="text-muted-foreground shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 rounded-xl border border-border bg-popover shadow-lg">
          <MiniCalendar
            value={value}
            onChange={(date) => { onChange(date); setOpen(false) }}
            minDate={minDate}
            maxDate={maxDate}
          />
        </div>
      )}
    </div>
  )
}
