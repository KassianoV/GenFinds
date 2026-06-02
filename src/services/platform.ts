export const isCapacitor = (): boolean => 'Capacitor' in window

export const isElectron = (): boolean => 'electron' in window

export const isMobile = (): boolean => isCapacitor()

export const isDesktop = (): boolean => isElectron()
