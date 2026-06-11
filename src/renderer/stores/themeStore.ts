import { create } from 'zustand'
import { useTheme } from 'next-themes'

export type ThemeMode = 'dark' | 'light' | 'system'

interface ThemeStore {
  theme: ThemeMode
  _sync: (theme: ThemeMode) => void
}

export const useThemeStore = create<ThemeStore>()((set) => ({
  theme: (localStorage.getItem('theme') as ThemeMode) ?? 'system',
  _sync: (theme) => set({ theme }),
}))

// Hook unificado: sincroniza next-themes + Zustand em um único setTheme
export function useAppTheme(): { theme: ThemeMode; setTheme: (t: ThemeMode) => void } {
  const { theme: nextTheme, setTheme: setNextTheme } = useTheme()
  const _sync = useThemeStore((s) => s._sync)

  function setTheme(t: ThemeMode): void {
    setNextTheme(t)
    _sync(t)
  }

  return {
    theme: (nextTheme as ThemeMode) ?? 'system',
    setTheme,
  }
}
