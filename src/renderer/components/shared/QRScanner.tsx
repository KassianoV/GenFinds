import React, { useEffect, useRef, useCallback } from 'react'
import jsQR from 'jsqr'
import { Camera, X } from 'lucide-react'

interface QRScannerProps {
  onScan: (data: string) => void
  onCancel: () => void
}

export function QRScanner({ onScan, onCancel }: QRScannerProps): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const foundRef = useRef(false)

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const tick = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || foundRef.current) return

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      })
      if (code) {
        foundRef.current = true
        stopCamera()
        onScan(code.data)
        return
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [onScan, stopCamera])

  useEffect(() => {
    let cancelled = false

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().then(() => {
            rafRef.current = requestAnimationFrame(tick)
          }).catch(() => {})
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [tick, stopCamera])

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 shrink-0">
        <div className="flex items-center gap-2">
          <Camera size={18} className="text-white" />
          <span className="text-white text-sm font-medium">Aponte para o QR code do desktop</span>
        </div>
        <button onClick={() => { stopCamera(); onCancel() }} className="p-2 rounded-full bg-white/10 text-white">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        {/* Moldura de scan */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <p className="text-center text-white/60 text-xs pb-8 pt-4 shrink-0">
        Abra o GenFins no desktop → Sincronizar → Gerar QR
      </p>
    </div>
  )
}
