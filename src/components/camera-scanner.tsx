import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Camera, X, Loader2, Zap, ZapOff, ScanLine, Maximize } from 'lucide-react'
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
  const [isBoletoMode, setIsBoletoMode] = useState(true) // Padrão largo para Metrics
  
  const qrCodeRef = useRef<Html5Qrcode | null>(null)
  const scannerId = useRef(`scanner-${Math.random().toString(36).substring(2, 9)}`).current

  useEffect(() => {
    if (open) {
      const startScanner = async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 400))
          
          const container = document.getElementById(scannerId)
          if (container) container.innerHTML = ""
          
          // Suporte explícito a múltiplos formatos (especialmente i25 para Boletos)
          qrCodeRef.current = new Html5Qrcode(scannerId, {
            verbose: false,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.ITF, // Interleaved 2 of 5 (Muito usado em boletos)
            ]
          })

          const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
            if (isBoletoMode) {
              return {
                width: Math.floor(viewfinderWidth * 0.95),
                height: Math.floor(viewfinderHeight * 0.25)
              }
            }
            const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.75)
            return { width: size, height: size }
          }

          const config = {
            fps: 30, // Máxima sensibilidade
            qrbox: qrboxFunction,
            aspectRatio: isBoletoMode ? 1.777778 : 1.0, // 16:9 para Boletos, 1:1 para QR
            videoConstraints: {
              facingMode: "environment",
              // Se modo boleto, tenta forçar resolução maior para nitidez nas barras
              width: isBoletoMode ? { ideal: 1920 } : { ideal: 1280 },
              height: isBoletoMode ? { ideal: 1080 } : { ideal: 720 },
            }
          }

          await qrCodeRef.current.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              handleScanSuccess(decodedText)
            },
            () => {}
          )
          setScanning(true)
        } catch (err) {
          console.error("Erro ao iniciar câmera:", err)
          toast.error("Erro ao acessar câmera. Verifique as permissões ou se outra aba a utiliza.")
          onOpenChange(false)
        }
      }

      startScanner()
    } else {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
  }, [open, isBoletoMode])

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

  const toggleTorch = async () => {
    if (!qrCodeRef.current || !scanning) return
    try {
      const newState = !torchOn
      // @ts-ignore - html5-qrcode suporta via applyVideoConstraints
      await qrCodeRef.current.applyVideoConstraints({
        // @ts-ignore
        advanced: [{ torch: newState }]
      })
      setTorchOn(newState)
    } catch (err) {
      toast.error("Lanterna não suportada neste dispositivo.")
    }
  }

  const lastResult = useRef<string | null>(null)
  const resultCount = useRef(0)

  const validateChecksum = (code: string): boolean => {
    const digits = code.replace(/\D/g, '')
    if (digits.length === 47) {
      const blocks = [
        { data: digits.substring(0, 9), cd: digits.substring(9, 10) },
        { data: digits.substring(10, 20), cd: digits.substring(20, 21) },
        { data: digits.substring(21, 31), cd: digits.substring(31, 32) }
      ]
      return blocks.every(b => mod10(b.data) === parseInt(b.cd))
    }
    if (digits.length === 48) {
      const isMod10 = ['6', '7'].includes(digits[2])
      const blocks = [
        { data: digits.substring(0, 11), cd: digits.substring(11, 12) },
        { data: digits.substring(12, 23), cd: digits.substring(23, 24) },
        { data: digits.substring(24, 35), cd: digits.substring(35, 36) },
        { data: digits.substring(36, 47), cd: digits.substring(47, 48) }
      ]
      const validator = isMod10 ? mod10 : mod11
      return blocks.every(b => validator(b.data) === parseInt(b.cd))
    }
    return code.startsWith('000201') || code.startsWith('http') || digits.length === 44
  }

  const mod10 = (data: string): number => {
    let sum = 0; let weight = 2
    for (let i = data.length - 1; i >= 0; i--) {
      let res = parseInt(data[i]) * weight
      if (res > 9) res = Math.floor(res / 10) + (res % 10)
      sum += res; weight = weight === 2 ? 1 : 2
    }
    const digit = 10 - (sum % 10)
    return digit === 10 ? 0 : digit
  }

  const mod11 = (data: string): number => {
    let sum = 0; let weight = 2
    for (let i = data.length - 1; i >= 0; i--) {
      sum += parseInt(data[i]) * weight
      weight = weight === 9 ? 2 : weight + 1
    }
    const rem = sum % 11
    if (rem === 0 || rem === 1) return 0
    if (rem === 10) return 1
    return 11 - rem
  }

  const handleScanSuccess = async (decodedText: string) => {
    if (loading) return

    // 1. Validação Visual / Checksum
    if (!validateChecksum(decodedText)) return

    // 2. Estabilização (Quiet Zone / Repetição)
    if (decodedText === lastResult.current) {
      resultCount.current += 1
    } else {
      lastResult.current = decodedText
      resultCount.current = 1
      return // Espera a próxima leitura igual
    }

    if (resultCount.current < 3) return // Exige 3 leituras idênticas para confirmar

    setLoading(true)
    await stopScanner()
    
    // Pequeno feedback tátil (se disponível) ou visual antes de fechar
    if ('vibrate' in navigator) navigator.vibrate(50)
    
    await new Promise(resolve => setTimeout(resolve, 300))
    onScanSuccess(decodedText)
    setLoading(false)
    onOpenChange(false)
    
    // Reset para próxima vez
    lastResult.current = null
    resultCount.current = 0
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md p-0 overflow-hidden border-none bg-black h-[100dvh] flex flex-col">
        <ResponsiveDialogHeader className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <div className="bg-red-500/20 p-1.5 rounded-lg border border-red-500/30">
                <Camera className="w-4 h-4 text-red-500" />
              </div>
              <ResponsiveDialogTitle className="text-white font-bold text-sm tracking-tight">Metrics Scanner</ResponsiveDialogTitle>
            </div>
            <div className="flex items-center gap-2">
               <Button 
                size="icon" 
                variant="ghost" 
                className={cn("text-white rounded-full h-10 w-10", torchOn ? "bg-amber-500/20" : "bg-white/10")} 
                onClick={toggleTorch}
              >
                {torchOn ? <Zap className="w-5 h-5 text-amber-500" /> : <ZapOff className="w-5 h-5 text-white/60" />}
              </Button>
              <ResponsiveDialogClose asChild>
                <Button size="icon" variant="ghost" className="text-white bg-white/10 hover:bg-white/20 rounded-full h-10 w-10">
                  <X className="w-5 h-5" />
                </Button>
              </ResponsiveDialogClose>
            </div>
          </div>
        </ResponsiveDialogHeader>

        <div className="relative flex-1 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
          <div id={scannerId} className="w-full h-full object-cover" />
          
          {/* Overlay de Guia */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className={cn(
              "border-2 border-dashed transition-all duration-500 ease-in-out",
              isBoletoMode 
                ? "w-[95%] h-[25%] border-red-500/50 bg-red-500/5 rounded-lg shadow-[0_0_50px_rgba(239,68,68,0.2)]" 
                : "w-[75%] aspect-square border-red-500/50 bg-red-500/5 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.2)]"
            )}>
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-red-500 rounded-tl-md"></div>
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-red-500 rounded-tr-md"></div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-red-500 rounded-bl-md"></div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-red-500 rounded-br-md"></div>
              
              {/* Linha de Scan Animada */}
              {scanning && (
                 <div className="absolute left-0 right-0 h-0.5 bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,1)] animate-scan-fast top-1/2"></div>
              )}
            </div>
          </div>

          {loading && (
            <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md text-white">
              <div className="bg-red-500 h-16 w-16 rounded-full flex items-center justify-center animate-pulse mb-4 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
              <p className="text-xl font-black tracking-tighter uppercase italic">Extraindo Dados...</p>
              <p className="text-white/40 text-xs mt-2 font-mono">Processando Code 128 / ITF / QR</p>
            </div>
          )}

          {!scanning && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white backdrop-blur-sm">
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-red-500 opacity-50" />
                <Camera className="w-6 h-6 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] mt-4 text-white/50">Ligando Hardware...</p>
            </div>
          )}
          
          <div className="absolute bottom-24 left-0 right-0 flex flex-col items-center gap-4 z-50">
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-2xl">
              <Button 
                onClick={() => setIsBoletoMode(false)}
                className={cn(
                  "flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-bold uppercase transition-all",
                  !isBoletoMode ? "bg-red-600 text-white shadow-lg shadow-red-600/40" : "bg-transparent text-white/60 hover:text-white"
                )}
              >
                <Maximize className="w-4 h-4" />
                QR Code
              </Button>
              <Button 
                onClick={() => setIsBoletoMode(true)}
                className={cn(
                  "flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-bold uppercase transition-all",
                  isBoletoMode ? "bg-red-600 text-white shadow-lg shadow-red-600/40" : "bg-transparent text-white/60 hover:text-white"
                )}
              >
                <ScanLine className="w-4 h-4" />
                Boleto/Barras
              </Button>
            </div>

            <div className="bg-white/5 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-[0.3em] text-white/60 animate-pulse">
              {isBoletoMode ? "Otimizado para Code 128 / ITF" : "Otimizado para Pix / NFC-e"}
            </div>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
