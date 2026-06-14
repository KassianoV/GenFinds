import { Preferences } from '@capacitor/preferences'
import { hashPassword } from '../auth/hashPassword'
import { populateFromSync } from '../database/mobile'

export interface QRPayload {
  ip: string
  port: number
  token: string
  desktopDeviceId: string
}

interface SyncConfig {
  mobileDeviceId: string
  deviceToken: string
  desktopDeviceId: string
  desktopIp: string
  desktopPort: number
  sharedSecret: string
  userId: number
  userName: string
}

const SYNC_CONFIG_KEY = 'genfinds-sync-config'

export async function getSyncConfig(): Promise<SyncConfig | null> {
  const { value } = await Preferences.get({ key: SYNC_CONFIG_KEY })
  if (!value) return null
  try { return JSON.parse(value) as SyncConfig } catch { return null }
}

async function saveSyncConfig(config: SyncConfig): Promise<void> {
  await Preferences.set({ key: SYNC_CONFIG_KEY, value: JSON.stringify(config) })
}

function generateId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// HMAC-SHA256 usando Web Crypto API (funciona em Capacitor webview)
async function signHmac(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function pairAndSync(
  qrPayload: QRPayload,
  deviceName: string
): Promise<{ userId: number; userName: string; deviceToken: string }> {
  const existingConfig = await getSyncConfig()
  const mobileDeviceId = existingConfig?.mobileDeviceId ?? generateId()
  const deviceToken = existingConfig?.deviceToken ?? generateId()

  const baseUrl = 'http://' + qrPayload.ip + ':' + String(qrPayload.port)

  // 1. Parear com o desktop
  const pairRes = await fetch(baseUrl + '/pair', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: qrPayload.token, mobileDeviceId, deviceName }),
  })

  if (!pairRes.ok) {
    const err = await pairRes.json() as { error?: string }
    throw new Error(err.error ?? 'Falha no pareamento')
  }

  const pairData = await pairRes.json() as {
    success: boolean
    sharedSecret: string
    desktopDeviceId: string
    user: { id: number; nome: string }
  }

  if (!pairData.success) throw new Error('Token inválido ou expirado')

  // 2. Sync completo
  const timestamp = String(Date.now())
  const signature = await signHmac(pairData.sharedSecret, mobileDeviceId + ':' + timestamp)

  const syncRes = await fetch(
    baseUrl + '/sync/full?userId=' + String(pairData.user.id),
    {
      headers: {
        'x-device-id': mobileDeviceId,
        'x-timestamp': timestamp,
        'x-signature': signature,
      },
    }
  )

  if (!syncRes.ok) throw new Error('Falha ao baixar dados do desktop')

  const syncData = await syncRes.json() as {
    success: boolean
    data: Record<string, Record<string, unknown>[]>
  }

  // 3. Popular banco local
  const passwordHash = await hashPassword(deviceToken)
  await populateFromSync(pairData.user.id, pairData.user.nome, passwordHash, syncData.data)

  // 4. Salvar config para syncs futuros
  await saveSyncConfig({
    mobileDeviceId,
    deviceToken,
    desktopDeviceId: pairData.desktopDeviceId,
    desktopIp: qrPayload.ip,
    desktopPort: qrPayload.port,
    sharedSecret: pairData.sharedSecret,
    userId: pairData.user.id,
    userName: pairData.user.nome,
  })

  return { userId: pairData.user.id, userName: pairData.user.nome, deviceToken }
}
