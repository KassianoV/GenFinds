export const isCapacitor = (): boolean =>
  typeof (window as any).Capacitor !== 'undefined'

export const isElectron = (): boolean =>
  typeof (window as any).electron !== 'undefined'

export const isMobile = (): boolean => isCapacitor()

export const isDesktop = (): boolean => isElectron()
