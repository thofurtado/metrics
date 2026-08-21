import { useState, useRef, useEffect, useCallback } from 'react'
import QRCode from 'qrcode'
import { 
  Printer, 
  Bluetooth, 
  Download, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  Layers,
  Info
} from 'lucide-react'
import { toast } from 'sonner'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { NiimbotBluetooth } from '@/lib/niimbot-ble'

interface NiimbotLabelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipment: {
    id: string
    identification?: string
    clientName?: string
    brand?: string
    type?: string
  } | null
}

export function NiimbotLabelModal({ open, onOpenChange, equipment }: NiimbotLabelModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const equipmentId = equipment?.id || ''
  const shortId = equipmentId.slice(0, 8)
  const identification = equipment?.identification || 'Computador'
  const clientName = equipment?.clientName || 'Cliente'

  // URL curta e ultra-leve para gerar QR Code de baixa densidade (Version 2, módulos 4x4px grossos)
  const targetUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/e/${shortId}`
    : `https://app.metrics.dev.br/e/${shortId}`

  // Renderizar o Canvas da etiqueta 30x15mm (240x120 pixels @ 203 DPI)
  const renderLabel = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 240
    canvas.height = 120

    // 1. Fundo branco puro
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 2. Textos no lado direito (alta nitidez)
    ctx.fillStyle = '#000000'
    ctx.textBaseline = 'top'

    // Cabeçalho
    ctx.font = '900 16px sans-serif'
    ctx.fillText('METRICS TI', 114, 10)

    // Linha divisória preta sólida
    ctx.fillRect(114, 30, 120, 2)

    // Identificação do Equipamento
    ctx.font = 'bold 13px sans-serif'
    const truncatedId =
      identification.length > 15
        ? identification.substring(0, 15) + '..'
        : identification
    ctx.fillText(truncatedId, 114, 36)

    // Nome do Cliente
    ctx.font = '11px sans-serif'
    const truncatedClient =
      clientName.length > 18
        ? clientName.substring(0, 18) + '..'
        : clientName
    ctx.fillText(truncatedClient, 114, 55)

    // Data de Emissão
    ctx.font = '10px sans-serif'
    ctx.fillText(
      `Data: ${new Date().toLocaleDateString('pt-BR')}`,
      114,
      74,
    )

    // Chamada para Ação
    ctx.font = 'italic 10px sans-serif'
    ctx.fillText('Consulte o Laudo ↗', 114, 94)

    // 3. Gerar QR Code de baixa densidade (Version 2 / Low error correction = módulos grossos e nítidos)
    QRCode.toDataURL(targetUrl, {
      width: 108,
      margin: 1,
      errorCorrectionLevel: 'L',
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then((qrDataUrl) => {
        const img = new Image()
        img.onload = () => {
          // Limpar área do QR Code
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, 112, 120)
          // Desenhar QR Code ocupando toda a altura
          ctx.drawImage(img, 4, 6, 108, 108)
        }
        img.src = qrDataUrl
      })
      .catch((err) => console.error('Erro ao gerar QR Code:', err))
  }, [targetUrl, identification, clientName])

  // Callback ref para pintar imediatamente
  const handleCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node
    if (node) {
      renderLabel(node)
    }
  }, [renderLabel])

  useEffect(() => {
    if (open && canvasRef.current) {
      renderLabel(canvasRef.current)
    }
  }, [open, renderLabel])

  // Impressão nativa via Bluetooth com o motor do niim.blue (@mmote/niimbluelib)
  const handlePrintBluetooth = async () => {
    if (!canvasRef.current) return
    setIsPrinting(true)
    setStatusMessage('Conectando à Niimbot D110 via Bluetooth...')

    try {
      const printer = new NiimbotBluetooth()
      const deviceName = await printer.connect()
      setStatusMessage(`Conectado a ${deviceName}! Imprimindo...`)

      await printer.printCanvas(canvasRef.current, 3, 1)
      await printer.disconnect()

      toast.success('Etiqueta impressa com sucesso na Niimbot D110!')
      setStatusMessage('✓ Impressão concluída!')
      setTimeout(() => onOpenChange(false), 2000)
    } catch (err: any) {
      console.error('Erro Bluetooth:', err)
      setStatusMessage('')
      if (err.name === 'NotFoundError') {
        toast.info('Seleção de Bluetooth cancelada.')
      } else {
        toast.error(err.message || 'Falha na comunicação Bluetooth.')
      }
    } finally {
      setIsPrinting(false)
    }
  }

  // Impressão nativa do Windows (Popup de Impressão)
  const handlePrintWindow = () => {
    if (!canvasRef.current) return
    const dataUrl = canvasRef.current.toDataURL('image/png')
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>Etiqueta ${identification}</title>
            <style>
              @page { size: 30mm 15mm; margin: 0; }
              body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; background: #fff; }
              img { width: 30mm; height: 15mm; image-rendering: pixelated; }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" onload="window.print();" />
          </body>
        </html>
      `)
      win.document.close()
    }
  }

  // Download do PNG da etiqueta
  const handleDownloadImage = () => {
    if (!canvasRef.current) return
    const dataUrl = canvasRef.current.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `etiqueta-${identification.toLowerCase().replace(/\s+/g, '-')}.png`
    a.click()
  }

  if (!equipment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-slate-800 bg-slate-950 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-white">
            <Printer className="h-5 w-5 text-indigo-400" />
            Imprimir Etiqueta Inteligente (Niimbot D110)
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Formato oficial <span className="font-mono font-bold text-slate-200">T15*30mm</span> com QR Code de alta leitura para o prontuário.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* PRÉ-VISUALIZAÇÃO DA ETIQUETA REALISTA */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="p-2 rounded-xl bg-white shadow-2xl border border-slate-300 transform hover:scale-105 transition-transform">
              <canvas
                ref={handleCanvasRef}
                style={{ width: '240px', height: '120px' }}
                className="rounded block"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-3 font-medium">
              Dimensões: 30mm × 15mm • QR Code de Alta Leitura
            </p>
          </div>

          {statusMessage && (
            <div className="p-2.5 rounded-lg bg-indigo-950/50 border border-indigo-500/30 text-xs text-indigo-300 font-medium text-center animate-pulse">
              {statusMessage}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadImage}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <Download className="mr-1.5 h-4 w-4" /> Baixar Imagem
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handlePrintWindow}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            Impressão Padrão
          </Button>

          <Button
            type="button"
            onClick={handlePrintBluetooth}
            disabled={isPrinting}
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 font-bold text-white shadow-lg shadow-blue-600/20 hover:from-blue-500 hover:to-indigo-500"
          >
            <Bluetooth className="h-4 w-4" />
            {isPrinting ? 'Imprimindo...' : 'Imprimir via Bluetooth (D110)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
