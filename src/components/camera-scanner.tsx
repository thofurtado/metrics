import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { Camera, X, Loader2 } from 'lucide-react'
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogClose } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface CameraScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanSuccess: (decodedText: string) => void
}

export function CameraScanner({ open, onOpenChange, onScanSuccess }: CameraScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(false)
  const qrCodeRef = useRef<Html5Qrcode | null>(null)
  
  // ID único por instância para evitar colisões no DOM
  const scannerId = useRef(`scanner-${Math.random().toString(36).substring(2, 9)}`).current

  useEffect(() => {
    if (open) {
      const startScanner = async () => {
        try {
          // Pequeno delay para garantir que o modal terminou a animação de entrada
          await new Promise(resolve => setTimeout(resolve, 300))
          
          // Limpa o container antes de começar para evitar resíduos de DOM (especialmente inputs de arquivo)
          const container = document.getElementById(scannerId)
          if (container) container.innerHTML = ""
          
          // Sempre cria uma nova instância para garantir o "Clean Slate"
          qrCodeRef.current = new Html5Qrcode(scannerId)

          const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
            // Ocupa quase toda a largura para capturar boletos longos (Code 128 / ITF)
            const width = Math.floor(viewfinderWidth * 0.9);
            const height = Math.floor(viewfinderHeight * 0.3);
            
            return {
              width: Math.max(width, 280),
              height: Math.max(height, 160)
            };
          }

          const config = {
            fps: 25, // Maior sensibilidade
            qrbox: qrboxFunction,
            videoConstraints: {
              facingMode: "environment",
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
          toast.error("Erro ao acessar câmera. Verifique as permissões.")
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
  }, [open])

  const stopScanner = async () => {
    if (qrCodeRef.current) {
      if (qrCodeRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
        try {
          await qrCodeRef.current.stop()
        } catch (err) {
          console.error("Erro ao parar scanner:", err)
        }
      }
      try {
        qrCodeRef.current.clear()
        qrCodeRef.current = null
      } catch (e) {}
      setScanning(false)
    }
  }

  const handleScanSuccess = async (decodedText: string) => {
    if (loading) return
    
    setLoading(true)
    await stopScanner()
    
    // Delay visual para o usuário perceber que a leitura foi feita
    await new Promise(resolve => setTimeout(resolve, 600))
    
    onScanSuccess(decodedText)
    setLoading(false)
    onOpenChange(false)
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md p-0 overflow-hidden border-none bg-black">
        <ResponsiveDialogHeader className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Camera className="w-5 h-5" />
              <ResponsiveDialogTitle className="text-white font-bold">Scanner Metrics</ResponsiveDialogTitle>
            </div>
            <ResponsiveDialogClose asChild>
              <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 rounded-full">
                <X className="w-6 h-6" />
              </Button>
            </ResponsiveDialogClose>
          </div>
        </ResponsiveDialogHeader>

        <div className="relative w-full h-[80vh] flex items-center justify-center bg-slate-900">
          <div id={scannerId} className="w-full h-full" />
          
          {loading && (
            <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white">
              <Loader2 className="w-12 h-12 animate-spin text-red-500 mb-4" />
              <p className="text-lg font-bold tracking-tight">Processando leitura...</p>
            </div>
          )}

          {!scanning && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-slate-500 mb-4" />
              <p>Iniciando câmera...</p>
            </div>
          )}
          
          <div className="absolute bottom-12 left-0 right-0 flex justify-center z-50">
            <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest text-center leading-relaxed">
              Enquadre o QR Code ou Boleto <br/>
              <span className="text-[9px] text-emerald-400 font-medium">(Posicione o código na área central)</span>
            </div>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
