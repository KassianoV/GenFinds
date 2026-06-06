import React from 'react'

export function CylonLoader(): React.JSX.Element {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50 gap-6">
      <div className="relative w-48 h-1.5 bg-muted rounded-full overflow-hidden">
        <span
          className="absolute top-0 h-full w-12 rounded-full bg-primary"
          style={{
            animation: 'cylon-scan 1.4s ease-in-out infinite',
            boxShadow: '0 0 12px 4px var(--color-primary)',
          }}
        />
      </div>
      <span className="text-xs text-muted-foreground tracking-widest uppercase">
        GenFinds
      </span>
    </div>
  )
}
