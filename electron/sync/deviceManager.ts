import { app } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { randomBytes, createHmac, timingSafeEqual, randomUUID } from 'crypto'
import * as os from 'os'

export const SYNC_PORT = 47821
const TOKEN_TTL_MS = 5 * 60 * 1000 // 5 min

export interface PairedDevice {
  deviceId: string
  name: string
  sharedSecret: string
  pairedAt: string
  lastSyncAt: string | null
}

export interface QRData {
  ip: string
  port: number
  token: string
  desktopDeviceId: string
  expiresAt: number
}

export class DeviceManager {
  private deviceId: string
  private devices = new Map<string, PairedDevice>()
  private activeToken: { token: string; expiresAt: number } | null = null
  private readonly dataPath: string

  constructor() {
    this.dataPath = app.getPath('userData')
    this.deviceId = this.loadOrCreateDeviceId()
    this.loadDevices()
  }

  private loadOrCreateDeviceId(): string {
    const file = join(this.dataPath, 'device_id.txt')
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim()
    const id = randomUUID()
    fs.writeFileSync(file, id, 'utf8')
    return id
  }

  private loadDevices(): void {
    const file = join(this.dataPath, 'sync_devices.json')
    if (!fs.existsSync(file)) return
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8')) as PairedDevice[]
      for (const d of data) this.devices.set(d.deviceId, d)
    } catch { /* arquivo corrompido, ignorar */ }
  }

  private persistDevices(): void {
    const file = join(this.dataPath, 'sync_devices.json')
    fs.writeFileSync(file, JSON.stringify([...this.devices.values()], null, 2), 'utf8')
  }

  getDeviceId(): string { return this.deviceId }

  generateQRData(): QRData {
    const token = randomBytes(32).toString('hex')
    const expiresAt = Date.now() + TOKEN_TTL_MS
    this.activeToken = { token, expiresAt }
    return {
      ip: this.getLocalIp(),
      port: SYNC_PORT,
      token,
      desktopDeviceId: this.deviceId,
      expiresAt,
    }
  }

  validateAndConsumeToken(token: string): boolean {
    if (!this.activeToken) return false
    if (Date.now() > this.activeToken.expiresAt) { this.activeToken = null; return false }
    const valid = this.activeToken.token === token
    if (valid) this.activeToken = null
    return valid
  }

  addDevice(deviceId: string, name: string): string {
    const sharedSecret = randomBytes(32).toString('hex')
    const device: PairedDevice = {
      deviceId, name, sharedSecret,
      pairedAt: new Date().toISOString(),
      lastSyncAt: null,
    }
    this.devices.set(deviceId, device)
    this.persistDevices()
    return sharedSecret
  }

  getDevices(): PairedDevice[] { return [...this.devices.values()] }

  revokeDevice(deviceId: string): boolean {
    const had = this.devices.delete(deviceId)
    if (had) this.persistDevices()
    return had
  }

  updateLastSync(deviceId: string): void {
    const d = this.devices.get(deviceId)
    if (d) { d.lastSyncAt = new Date().toISOString(); this.persistDevices() }
  }

  // HMAC-SHA256(key=sharedSecret, data="deviceId:timestamp")
  verifyHmac(deviceId: string, timestamp: string, signature: string): boolean {
    const device = this.devices.get(deviceId)
    if (!device) return false
    const ts = parseInt(timestamp, 10)
    if (isNaN(ts) || Math.abs(Date.now() - ts) > TOKEN_TTL_MS) return false
    const expected = createHmac('sha256', device.sharedSecret)
      .update(`${deviceId}:${timestamp}`)
      .digest('hex')
    try {
      return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
    } catch { return false }
  }

  private getLocalIp(): string {
    const nets = os.networkInterfaces()
    for (const ifaces of Object.values(nets)) {
      for (const net of ifaces ?? []) {
        if (net.family === 'IPv4' && !net.internal) return net.address
      }
    }
    return '127.0.0.1'
  }
}
