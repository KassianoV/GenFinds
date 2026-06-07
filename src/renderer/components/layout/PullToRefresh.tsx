import React, { useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { isDesktop } from '../../services/platform'

interface PullToRefreshProps {
  onRefresh: () => void | Promise<void>
  refreshing?: boolean
  children: React.ReactNode
  className?: string
}

const THRESHOLD = 80

export const PullToRefresh = React.forwardRef<HTMLDivElement, PullToRefreshProps>(
  function PullToRefreshInner({ onRefresh, refreshing = false, children, className = '' }, forwardedRef) {
    const [pullY, setPullY] = useState(0)
    const touchStartY = useRef(0)
    const internalRef = useRef<HTMLDivElement>(null)
    const pulling = useRef(false)

    function setRef(node: HTMLDivElement | null) {
      internalRef.current = node
      if (typeof forwardedRef === 'function') forwardedRef(node)
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node
    }

    function handleTouchStart(e: React.TouchEvent): void {
      if (isDesktop()) return
      if (internalRef.current && internalRef.current.scrollTop > 0) return
      touchStartY.current = e.touches[0].clientY
      pulling.current = true
    }

    function handleTouchMove(e: React.TouchEvent): void {
      if (!pulling.current || isDesktop()) return
      if (internalRef.current && internalRef.current.scrollTop > 0) {
        pulling.current = false
        setPullY(0)
        return
      }
      const delta = e.touches[0].clientY - touchStartY.current
      if (delta > 0) setPullY(Math.min(delta, THRESHOLD * 1.5))
    }

    function handleTouchEnd(): void {
      if (!pulling.current || isDesktop()) return
      if (pullY >= THRESHOLD) void onRefresh()
      setPullY(0)
      pulling.current = false
    }

    const progress = Math.min(pullY / THRESHOLD, 1)
    const ready = pullY >= THRESHOLD
    const show = pullY > 8 || refreshing

    return (
      <div
        ref={setRef}
        className={`relative overflow-auto ${className}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {show && (
          <div
            className="flex items-center justify-center transition-all"
            style={{ height: refreshing ? 44 : Math.max(pullY * 0.45, 0) }}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                ready || refreshing ? 'bg-primary/20' : 'bg-muted'
              }`}
            >
              <RefreshCw
                size={15}
                className={`transition-colors ${
                  ready || refreshing ? 'text-primary' : 'text-muted-foreground'
                } ${refreshing ? 'animate-spin' : ''}`}
                style={!refreshing ? { transform: `rotate(${progress * 360}deg)` } : undefined}
              />
            </div>
          </div>
        )}
        {children}
      </div>
    )
  }
)
