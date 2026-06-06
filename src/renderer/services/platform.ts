type WindowWithCapacitor = Window & { Capacitor?: { isNativePlatform?: () => boolean } }

const DEV_MOBILE_KEY = 'genfinds-dev-mobile'

function isDevMobile(): boolean {
  return (
    import.meta.env.DEV &&
    !('api' in window) &&
    localStorage.getItem(DEV_MOBILE_KEY) === '1'
  )
}

export const isCapacitor = (): boolean =>
  isDevMobile() || !!(window as WindowWithCapacitor).Capacitor?.isNativePlatform?.()

export const isElectron = (): boolean => !isDevMobile() && 'api' in window

export const isMobile = (): boolean => isCapacitor()

export const isDesktop = (): boolean => isElectron()

export function toggleDevMobile(): void {
  const next = localStorage.getItem(DEV_MOBILE_KEY) === '1' ? '0' : '1'
  localStorage.setItem(DEV_MOBILE_KEY, next)
  window.location.reload()
}

export function isDevMobileActive(): boolean {
  return isDevMobile()
}
