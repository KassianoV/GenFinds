type WindowWithCapacitor = Window & { Capacitor?: { isNativePlatform?: () => boolean } }

export const isCapacitor = (): boolean =>
  !!(window as WindowWithCapacitor).Capacitor?.isNativePlatform?.()

export const isElectron = (): boolean => 'api' in window

export const isMobile = (): boolean => isCapacitor()

export const isDesktop = (): boolean => isElectron()
