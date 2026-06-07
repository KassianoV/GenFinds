import React, { useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { isDesktop } from '../../services/platform'

interface SwipeToDeleteProps {
  onDelete: () => void
  children: React.ReactNode
}

const REVEAL_AT = 56
const MAX_SWIPE = 80

export function SwipeToDelete({ onDelete, children }: SwipeToDeleteProps): React.JSX.Element {
  const [offset, setOffset] = useState(0)
  const startX = useRef(0)
  const active = useRef(false)

  if (isDesktop()) return <>{children}</>

  function handleTouchStart(e: React.TouchEvent): void {
    startX.current = e.touches[0].clientX
    active.current = true
  }

  function handleTouchMove(e: React.TouchEvent): void {
    if (!active.current) return
    const delta = startX.current - e.touches[0].clientX
    if (delta < 0) {
      setOffset(0)
      return
    }
    setOffset(Math.min(delta, MAX_SWIPE))
  }

  function handleTouchEnd(): void {
    active.current = false
    if (offset >= REVEAL_AT) {
      setOffset(MAX_SWIPE)
    } else {
      setOffset(0)
    }
  }

  function handleClose(): void {
    setOffset(0)
  }

  return (
    <div className="relative overflow-hidden select-none">
      {/* Delete action revealed on swipe */}
      <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center">
        <button
          onClick={() => { handleClose(); onDelete() }}
          className="flex flex-col items-center gap-0.5 text-white px-2"
        >
          <Trash2 size={16} />
          <span className="text-[10px] font-medium">Excluir</span>
        </button>
      </div>

      {/* Row content slides left */}
      <div
        className="relative bg-card"
        style={{
          transform: `translateX(-${offset}px)`,
          transition: active.current ? 'none' : 'transform 200ms ease',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}
