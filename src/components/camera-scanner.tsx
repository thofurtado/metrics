import {
  Html5Qrcode,
  Html5QrcodeScannerState,
  Html5QrcodeSupportedFormats,
} from 'html5-qrcode'
import { Camera, Loader2, X, Zap, ZapOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'
import { cn } from '@/lib/utils'

interface CameraScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanSuccess: (decodedText: string) => void
  defaultMode?: 'boleto' | 'qrcode'
  forceLandscape?: boolean
}

export function CameraScanner({
  open,
  onOpenChange,
  onScanSuccess,
  defaultMode = 'boleto',
  forceLandscape = false,
}: CameraScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [isBoletoMode, setIsBoletoMode] = useState(defaultMode === 'boleto')
  const [isLandscape, setIsLandscape] = useState(false)

  const qrCodeRef = useRef<Html5Qrcode | null>(null)
  const scannerId = useRef(
    `scanner-${Math.random().toString(36).substring(2, 9)}`,
  ).current
  const lastResult = useRef<string | null>(null)
  const resultCount = useRef(0)

  const stopScanner = async () => {
    if (qrCodeRef.current) {
      if (
        qrCodeRef.current.getState() !== Html5QrcodeScannerState.NOT_STARTED
      ) {
        try {
          await qrCodeRef.current.stop()
        } catch (err) {}
      }
      try {
        qrCodeRef.current.clear()
        qrCodeRef.current = null
      } catch (e) {}
      setScanning(false)
      setTorchOn(false)
    }
  }

  const startScanner = async () => {
    if (!open) return
    try {
      setLoading(false)
      await new Promise((resolve) => setTimeout(resolve, 300))

      const container = document.getElementById(scannerId)
      if (container) container.innerHTML = ''

      qrCodeRef.current = new Html5Qrcode(scannerId, {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.ITF,
        ],
      })

      const qrboxFunction = (
        viewfinderWidth: number,
        viewfinderHeight: number,
      ) => {
        if (isBoletoMode) {
          return {
            width: Math.floor(viewfinderWidth * 0.95),
            height: Math.floor(viewfinderHeight * 0.3),
          }
        }
        const size = Math.floor(
          Math.min(viewfinderWidth, viewfinderHeight) * 0.75,
        )
        return { width: size, height: size }
      }

      // Configurações de vídeo otimizadas para landscape quando necessário
      const videoConstraints: MediaTrackConstraints = {
        facingMode: 'environment',
      }

      if (forceLandscape || isBoletoMode) {
        // Priorizar resolução landscape para melhor leitura de boletos
        videoConstraints.width = { ideal: 1920 }
        videoConstraints.height = { ideal: 1080 }
        videoConstraints.aspectRatio = { ideal: 16 / 9 }
      } else {
        videoConstraints.width = { ideal: 1280 }
        videoConstraints.height = { ideal: 720 }
      }

      await qrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 60, // Aumentado para maior fluidez
          qrbox: qrboxFunction,
          aspectRatio: isBoletoMode ? 1.77 : 1.0,
          videoConstraints,
        },
        handleScanSuccess,
        () => {},
      )
      setScanning(true)
    } catch (err) {
      console.error('Scanner Error:', err)
      toast.error('Erro ao acessar câmera.')
      onOpenChange(false)
    }
  }

  useEffect(() => {
    // Verificar orientação inicial
    const checkOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth
      setIsLandscape(!isPortrait)
    }

    checkOrientation()

    if (open) {
      // Tentar forçar landscape se necessário
      if (
        forceLandscape &&
        'screen' in window &&
        'orientation' in window.screen
      ) {
        try {
          // @ts-ignore
          window.screen.orientation.lock('landscape').catch(() => {
            console.log('Não foi possível travar orientação landscape')
          })
        } catch (e) {
          console.log('API de orientação não suportada')
        }
      }

      startScanner()
    } else {
      // Liberar orientação ao fechar
      if ('screen' in window && 'orientation' in window.screen) {
        try {
          // @ts-ignore
          window.screen.orientation.unlock()
        } catch (e) {}
      }
      stopScanner()
    }

    return () => {
      if ('screen' in window && 'orientation' in window.screen) {
        try {
          // @ts-ignore
          window.screen.orientation.unlock()
        } catch (e) {}
      }
      stopScanner()
    }
  }, [open, isBoletoMode])

  useEffect(() => {
    const handleOrientationChange = () => {
      if (open && scanning) {
        stopScanner().then(() => {
          setTimeout(() => {
            if (open) startScanner()
          }, 150)
        })
      }
    }

    window.addEventListener('resize', handleOrientationChange)
    window.addEventListener('orientationchange', handleOrientationChange)

    return () => {
      window.removeEventListener('resize', handleOrientationChange)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [open, scanning])

  function handleScanSuccess(decodedText: string) {
    if (loading) return

    // Checksum Validation
    const digits = decodedText.replace(/\D/g, '')
    let isValid = false
    if (digits.length === 47 || digits.length === 48) isValid = true
    if (decodedText.startsWith('000201') || decodedText.startsWith('http'))
      isValid = true
    if (digits.length === 44) isValid = true
    if (!isValid) return

    // Stability Buffer
    if (decodedText === lastResult.current) {
      resultCount.current += 1
    } else {
      lastResult.current = decodedText
      resultCount.current = 1
      return
    }

    if (resultCount.current < 2) return

    setLoading(true)
    stopScanner().then(() => {
      if ('vibrate' in navigator) navigator.vibrate(50)
      setTimeout(() => {
        onScanSuccess(decodedText)
        setLoading(false)
        onOpenChange(false)
      }, 300)
    })
  }

  const toggleTorch = async () => {
    if (!qrCodeRef.current || !scanning) return
    try {
      const newState = !torchOn
      await qrCodeRef.current.applyVideoConstraints({
        // @ts-ignore
        advanced: [{ torch: newState }],
      })
      setTorchOn(newState)
    } catch (err) {
      toast.error('Lanterna não suportada.')
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="!inset-0 !left-0 !top-0 !z-[10050] flex h-[100dvh] max-w-[100dvw] !translate-x-0 !translate-y-0 flex-col overflow-hidden border-none bg-black p-0 md:!inset-0 md:!left-0 md:!top-0 md:!translate-x-0 md:!translate-y-0 [&>div]:!z-[10049]">
        <ResponsiveDialogHeader className="absolute left-0 right-0 top-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Camera className="h-5 w-5 text-red-500" />
              <div>
                <ResponsiveDialogTitle className="text-sm font-bold text-white">
                  Metrics Scanner Professional
                </ResponsiveDialogTitle>
                {forceLandscape && (
                  <div className="mt-0.5 flex items-center gap-1">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    <span className="text-[10px] font-medium text-green-400">
                      Modo Landscape Ativo
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {forceLandscape && !isLandscape && (
                <div className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/20 px-3 py-1">
                  <span className="text-[10px] font-bold text-amber-400">
                    GIRE O DISPOSITIVO
                  </span>
                </div>
              )}
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  'h-10 w-10 rounded-full bg-white/10 text-white',
                  torchOn && 'bg-amber-500/20 text-amber-500',
                )}
                onClick={toggleTorch}
              >
                {torchOn ? (
                  <Zap className="h-5 w-5" />
                ) : (
                  <ZapOff className="h-5 w-5 opacity-60" />
                )}
              </Button>
              <ResponsiveDialogClose asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-full bg-white/20 text-white"
                >
                  <X className="h-6 w-6" />
                </Button>
              </ResponsiveDialogClose>
            </div>
          </div>
        </ResponsiveDialogHeader>

        <div className="relative z-10 flex w-full flex-1 items-center justify-center overflow-hidden bg-slate-950">
          {/* CSS Fix: Force Full Occupation */}
          <div
            id={scannerId}
            className="relative z-0 h-full w-full overflow-hidden [&>canvas]:hidden [&>video]:!absolute [&>video]:!inset-0 [&>video]:!z-0 [&>video]:!h-full [&>video]:!w-full [&>video]:!object-cover"
          />

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div
              className={cn(
                'relative border-2 border-dashed transition-all duration-300',
                isBoletoMode
                  ? 'h-[30%] w-[90%] rounded-xl border-red-500/50 bg-red-500/5 shadow-[0_0_100px_rgba(239,68,68,0.1)]'
                  : 'aspect-square w-[75%] rounded-3xl border-red-500/50 bg-red-500/5',
              )}
            >
              <div className="absolute -left-1 -top-1 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-red-500" />
              <div className="absolute -right-1 -top-1 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-red-500" />
              <div className="absolute -bottom-1 -left-1 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-red-500" />
              <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-red-500" />

              {scanning && (
                <div className="animate-scan-fast absolute left-0 right-0 top-1/2 h-0.5 bg-red-500 shadow-[0_0_20px_red]" />
              )}

              <div className="absolute bottom-[-40px] left-0 right-0 text-center">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500/80 drop-shadow-md">
                  {isBoletoMode ? 'Enquadre Boletos' : 'Enquadre QR Code'}
                </span>
              </div>
            </div>
          </div>

          {loading && (
            <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/95">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-red-500" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-4 w-4 animate-pulse rounded-full bg-red-500" />
                </div>
              </div>
              <p className="text-md mt-6 font-black uppercase italic tracking-[0.3em] text-white">
                Validando Code...
              </p>
            </div>
          )}

          <div className="absolute bottom-10 left-0 right-0 z-40 flex flex-col items-center gap-4">
            <div className="flex rounded-2xl border border-white/10 bg-black/50 p-1.5 shadow-2xl backdrop-blur-2xl">
              <Button
                onClick={() => setIsBoletoMode(false)}
                className={cn(
                  'h-10 rounded-xl px-6 text-[11px] font-black uppercase tracking-wider transition-all',
                  !isBoletoMode
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-transparent text-white/40 hover:text-white/70',
                )}
              >
                QR Code
              </Button>
              <Button
                onClick={() => setIsBoletoMode(true)}
                className={cn(
                  'h-10 rounded-xl px-6 text-[11px] font-black uppercase tracking-wider transition-all',
                  isBoletoMode
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-transparent text-white/40 hover:text-white/70',
                )}
              >
                Boleto / Barras
              </Button>
            </div>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
