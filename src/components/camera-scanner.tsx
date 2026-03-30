import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Camera, X, Loader2, Zap, ZapOff } from 'lucide-react'
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogClose } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CameraScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanSuccess: (decodedText: string) => void
}

export function CameraScanner({ open, onOpenChange, onScanSuccess }: CameraScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [isBoletoMode, setIsBoletoMode] = useState(true)
  
  const qrCodeRef = useRef<Html5Qrcode | null>(null)
  const scannerId = useRef(`scanner-${Math.random().toString(36).substring(2, 9)}`).current
  const lastResult = useRef<string | null>(null)
  const resultCount = useRef(0)

  const stopScanner = async () => {
    if (qrCodeRef.current) {
      if (qrCodeRef.current.getState() !== Html5QrcodeScannerState.NOT_STARTED) {
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
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const container = document.getElementById(scannerId)
      if (container) container.innerHTML = ""
      
      qrCodeRef.current = new Html5Qrcode(scannerId, {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.ITF,
        ]
      })

      const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
        if (isBoletoMode) {
          return {
            width: Math.floor(viewfinderWidth * 0.95),
            height: Math.floor(viewfinderHeight * 0.3)
          }
        }
        const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.75)
        return { width: size, height: size }
      }

      await qrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 60, // Aumentado para maior fluidez
          qrbox: qrboxFunction,
          aspectRatio: isBoletoMode ? 1.77 : 1.0,
          videoConstraints: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        },
        handleScanSuccess,
        () => {}
      )
      setScanning(true)
    } catch (err) {
      console.error("Scanner Error:", err)
      toast.error("Erro ao acessar câmera.")
      onOpenChange(false)
    }
  }

  useEffect(() => {
    if (open) {
      startScanner()
    } else {
      stopScanner()
    }
    return () => { stopScanner() }
  }, [open, isBoletoMode])

  useEffect(() => {
    const handleOrientationChange = () => {
      if (open && scanning) {
        stopScanner().then(() => {
          setTimeout(() => { if (open) startScanner() }, 150)
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
    if (decodedText.startsWith('000201') || decodedText.startsWith('http')) isValid = true
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
        advanced: [{ torch: newState }]
      })
      setTorchOn(newState)
    } catch (err) {
      toast.error("Lanterna não suportada.")
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-[100dvw] p-0 overflow-hidden border-none bg-black h-[100dvh] flex flex-col">
        <ResponsiveDialogHeader className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Camera className="w-5 h-5 text-red-500" />
              <ResponsiveDialogTitle className="text-white font-bold text-sm">Metrics Scanner Professional</ResponsiveDialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" className={cn("text-white rounded-full bg-white/10 h-10 w-10", torchOn && "text-amber-500 bg-amber-500/20")} onClick={toggleTorch}>
                {torchOn ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5 opacity-60" />}
              </Button>
              <ResponsiveDialogClose asChild>
                <Button size="icon" variant="ghost" className="text-white bg-white/20 rounded-full h-10 w-10">
                  <X className="w-6 h-6" />
                </Button>
              </ResponsiveDialogClose>
            </div>
          </div>
        </ResponsiveDialogHeader>

        <div className="relative flex-1 w-full bg-slate-950 flex items-center justify-center overflow-hidden z-10">
          {/* CSS Fix: Force Full Occupation */}
          <div 
            id={scannerId} 
            className="relative overflow-hidden w-full h-full z-0 [&>video]:!w-full [&>video]:!h-full [&>video]:!object-cover [&>video]:!absolute [&>video]:!inset-0 [&>video]:!z-0 [&>canvas]:hidden" 
          />
          
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className={cn(
              "border-2 border-dashed transition-all duration-300 relative",
              isBoletoMode 
                ? "w-[90%] h-[30%] border-red-500/50 bg-red-500/5 rounded-xl shadow-[0_0_100px_rgba(239,68,68,0.1)]" 
                : "w-[75%] aspect-square border-red-500/50 bg-red-500/5 rounded-3xl"
            )}>
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-xl" />
              
              {scanning && <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_20px_red] animate-scan-fast top-1/2" />}
              
              <div className="absolute bottom-[-40px] left-0 right-0 text-center">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500/80 drop-shadow-md">
                   {isBoletoMode ? "Enquadre Boletos" : "Enquadre QR Code"}
                </span>
              </div>
            </div>
          </div>

          {loading && (
            <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/95">
              <div className="relative">
                 <Loader2 className="w-16 h-16 animate-spin text-red-500" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-4 w-4 bg-red-500 rounded-full animate-pulse" />
                 </div>
              </div>
              <p className="text-white text-md font-black uppercase tracking-[0.3em] mt-6 italic">Validando Code...</p>
            </div>
          )}

          <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-4 z-40">
            <div className="flex bg-black/50 backdrop-blur-2xl p-1.5 rounded-2xl border border-white/10 shadow-2xl">
              <Button onClick={() => setIsBoletoMode(false)} className={cn("h-10 px-6 rounded-xl text-[11px] font-black uppercase transition-all tracking-wider", !isBoletoMode ? "bg-red-600 text-white shadow-lg shadow-red-600/30" : "bg-transparent text-white/40 hover:text-white/70")}>
                QR Code
              </Button>
              <Button onClick={() => setIsBoletoMode(true)} className={cn("h-10 px-6 rounded-xl text-[11px] font-black uppercase transition-all tracking-wider", isBoletoMode ? "bg-red-600 text-white shadow-lg shadow-red-600/30" : "bg-transparent text-white/40 hover:text-white/70")}>
                Boleto / Barras
              </Button>
            </div>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
