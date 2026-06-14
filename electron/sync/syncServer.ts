import Fastify from 'fastify'
import cors from '@fastify/cors'
import { DeviceManager, SYNC_PORT } from './deviceManager'
import { DatabaseManager } from '../database'
import { logError, logInfo, logWarning } from '../logger'

export class SyncServer {
  private fastify = Fastify()
  private running = false

  constructor(
    private readonly devices: DeviceManager,
    private readonly db: DatabaseManager,
  ) {
    this.setupRoutes()
  }

  private setupRoutes(): void {
    this.fastify.register(cors, { origin: '*' })

    // Status do servidor
    this.fastify.get('/health', async () => ({
      ok: true,
      deviceId: this.devices.getDeviceId(),
    }))

    // Mobile apresenta o token do QR code e seu próprio deviceId
    this.fastify.post<{
      Body: { token: string; mobileDeviceId: string; deviceName: string }
    }>('/pair', async (req, reply) => {
      const { token, mobileDeviceId, deviceName } = req.body ?? {}
      if (!token || !mobileDeviceId || !deviceName) {
        return reply.status(400).send({ error: 'Campos obrigatórios: token, mobileDeviceId, deviceName' })
      }
      if (!this.devices.validateAndConsumeToken(token)) {
        logWarning('Pairing failed: token inválido ou expirado', { mobileDeviceId })
        return reply.status(401).send({ error: 'Token inválido ou expirado' })
      }
      const sharedSecret = this.devices.addDevice(mobileDeviceId, deviceName)
      const user = this.db.getUsuarioPrimario()
      logInfo('Dispositivo pareado com sucesso', { mobileDeviceId, deviceName })
      return { success: true, sharedSecret, desktopDeviceId: this.devices.getDeviceId(), user }
    })

    // Sync completo — autenticado via HMAC nos headers
    this.fastify.get<{
      Querystring: { userId: string }
      Headers: { 'x-device-id': string; 'x-timestamp': string; 'x-signature': string }
    }>('/sync/full', async (req, reply) => {
      const deviceId = req.headers['x-device-id']
      const timestamp = req.headers['x-timestamp']
      const signature = req.headers['x-signature']
      const userId = parseInt(req.query?.userId ?? '', 10)

      if (!deviceId || !timestamp || !signature || isNaN(userId)) {
        return reply.status(400).send({ error: 'Headers x-device-id, x-timestamp, x-signature e userId são obrigatórios' })
      }
      if (!this.devices.verifyHmac(deviceId, timestamp, signature)) {
        logWarning('Tentativa de sync não autorizada', { deviceId })
        return reply.status(401).send({ error: 'Não autorizado' })
      }

      try {
        const dump = this.db.getFullDump(userId)
        this.devices.updateLastSync(deviceId)
        logInfo('Full sync enviado', { deviceId, userId })
        return { success: true, syncedAt: Date.now(), data: dump }
      } catch (err) {
        logError('Erro em /sync/full', err)
        return reply.status(500).send({ error: 'Erro interno ao gerar dump' })
      }
    })
  }

  async start(): Promise<void> {
    if (this.running) return
    try {
      await this.fastify.listen({ port: SYNC_PORT, host: '0.0.0.0' })
      this.running = true
      logInfo(`Servidor de sync iniciado na porta ${SYNC_PORT}`)
    } catch (err) {
      logError('Falha ao iniciar servidor de sync', err)
    }
  }

  async stop(): Promise<void> {
    if (!this.running) return
    await this.fastify.close()
    this.running = false
    logInfo('Servidor de sync encerrado')
  }

  isRunning(): boolean { return this.running }
}
