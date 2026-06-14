import React, { useState, useEffect, useCallback } from 'react'
import QRCode from 'react-qr-code'
import { Smartphone, RefreshCw, Trash2, Wifi, WifiOff, Shield } from 'lucide-react'

interface QRData {
  ip: string
  port: number
  token: string
  desktopDeviceId: string
  expiresAt: number
}

interface PairedDevice {
  deviceId: string
  name: string
  pairedAt: string
  lastSyncAt: string | null
}

export function SyncPage(): React.JSX.Element {
  const [qrData, setQrData] = useState<QRData | null>(null)
  const [devices, setDevices] = useState<PairedDevice[]>([])
  const [serverRunning, setServerRunning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [loadingQR, setLoadingQR] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    const res = await window.api.sync.getStatus()
    if (res.success) setServerRunning(res.data.running)
    const devRes = await window.api.sync.getDevices()
    if (devRes.success) setDevices(devRes.data)
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  // countdown até expirar o QR
  useEffect(() => {
    if (!qrData) return
    const update = (): void => {
      const left = Math.max(0, Math.ceil((qrData.expiresAt - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left === 0) setQrData(null)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [qrData])

  async function handleGenerateQR(): Promise<void> {
    setLoadingQR(true)
    const res = await window.api.sync.generateQR()
    setLoadingQR(false)
    if (res.success) setQrData(res.data)
  }

  async function handleRevoke(deviceId: string): Promise<void> {
    setRevoking(deviceId)
    await window.api.sync.revokeDevice(deviceId)
    setRevoking(null)
    loadStatus()
  }

  function formatDate(iso: string | null): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  }

  const qrValue = qrData ? JSON.stringify({
    ip: qrData.ip,
    port: qrData.port,
    token: qrData.token,
    desktopDeviceId: qrData.desktopDeviceId,
  }) : ''

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-0 shrink-0">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-foreground tracking-tight">Sincronização</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Parear dispositivos na mesma rede Wi-Fi</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-5">
        {/* Status do servidor */}
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          {serverRunning
            ? <Wifi size={16} className="text-emerald-500 shrink-0" />
            : <WifiOff size={16} className="text-red-400 shrink-0" />}
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Servidor de sync {serverRunning ? 'ativo' : 'inativo'}
            </p>
            <p className="text-xs text-muted-foreground">
              {serverRunning ? 'Aguardando conexões na rede local' : 'O app precisa estar aberto para sincronizar'}
            </p>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${serverRunning ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-500'}`}>
            {serverRunning ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* QR Code */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone size={14} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Parear novo dispositivo</h2>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Abra o app no celular, vá em <strong>Configurações → Sincronização</strong> e escaneie o QR code abaixo. Ambos devem estar na mesma rede Wi-Fi.
            </p>

            {qrData && secondsLeft > 0 ? (
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-xl flex items-center justify-center">
                  <QRCode value={qrValue} size={180} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Shield size={11} />
                    Token de uso único
                  </span>
                  <span className={`font-mono font-medium ${secondsLeft < 60 ? 'text-red-500' : 'text-foreground'}`}>
                    Expira em {secondsLeft}s
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border rounded-xl">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Smartphone size={20} className="text-muted-foreground" />
                </div>
                {qrData && secondsLeft === 0 && (
                  <p className="text-xs text-red-500 mb-2">QR code expirado</p>
                )}
                <p className="text-xs text-muted-foreground">Clique abaixo para gerar o QR code</p>
              </div>
            )}

            <button
              onClick={handleGenerateQR}
              disabled={loadingQR || !serverRunning}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loadingQR ? 'animate-spin' : ''} />
              {loadingQR ? 'Gerando...' : qrData && secondsLeft > 0 ? 'Gerar novo QR' : 'Gerar QR code'}
            </button>
          </div>

          {/* Dispositivos pareados */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi size={14} className="text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">Dispositivos pareados</h2>
              </div>
              {devices.length > 0 && (
                <span className="text-xs text-muted-foreground">{devices.length} dispositivo{devices.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {devices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                  <Smartphone size={16} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Nenhum dispositivo</p>
                <p className="text-xs text-muted-foreground mt-1">Escaneie o QR code no celular para parear</p>
              </div>
            ) : (
              <div className="space-y-2">
                {devices.map((d) => (
                  <div key={d.deviceId} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 group">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Smartphone size={14} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Pareado em {formatDate(d.pairedAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Último sync: {formatDate(d.lastSyncAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevoke(d.deviceId)}
                      disabled={revoking === d.deviceId}
                      className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-all disabled:opacity-50"
                      title="Revogar acesso"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Nota de segurança */}
        <div className="bg-muted/30 rounded-xl border border-border p-4 flex items-start gap-3">
          <Shield size={14} className="text-muted-foreground mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-foreground">Como funciona a segurança</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O QR code expira em 5 minutos e é de uso único. Após o pareamento, cada dispositivo recebe uma chave secreta única para autenticar as sincronizações. A comunicação acontece apenas dentro da sua rede local.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
