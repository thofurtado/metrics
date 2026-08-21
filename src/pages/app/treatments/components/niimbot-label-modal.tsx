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
import { Badge } from '@/components/ui/badge'
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
  const identification = equipment?.identification || 'Computador'
  const clientName = equipment?.clientName || 'Cliente'
  const targetUrl = `https://app.metrics.dev.br/equipamento/${equipmentId}`

  // Função dedicada de desenho garantido no Canvas (240x120px @ 203 DPI)
  const renderLabel = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 240
    canvas.height = 120

    // Fundo branco inicial
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Textos informativos no lado direito
    ctx.fillStyle = '#000000'
    ctx.textBaseline = 'top'

    // 1. Título METRICS TI
    ctx.font = 'bold 15px sans-serif'
    ctx.fillText('METRICS TI', 118, 12)

    // 2. Linha divisória
    ctx.fillRect(118, 30, 114, 1.5)

    // 3. Identificação do Equipamento
    ctx.font = 'bold 12px sans-serif'
    const truncatedId =
      identification.length > 14
        ? identification.substring(0, 14) + '..'
        : identification
    ctx.fillText(truncatedId, 118, 36)

    // 4. Nome do Cliente
    ctx.font = '10px sans-serif'
    const truncatedClient =
      clientName.length > 18
        ? clientName.substring(0, 18) + '..'
        : clientName
    ctx.fillText(truncatedClient, 118, 54)

    // 5. Data de Emissão
    ctx.font = '9px sans-serif'
    ctx.fillText(
      `Data: ${new Date().toLocaleDateString('pt-BR')}`,
      118,
      72,
    )

    // 6. Chamada para Ação
    ctx.font = 'italic 9px sans-serif'
    ctx.fillText('Consulte o Laudo ↗', 118, 92)

    // Gerar e estampar o QR Code de 106x106px no lado esquerdo
    QRCode.toDataURL(targetUrl, {
      width: 106,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then((qrDataUrl) => {
        const img = new Image()
        img.onload = () => {
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, 116, 120)
          ctx.drawImage(img, 7, 7, 106, 106)
        }
        img.src = qrDataUrl
      })
      .catch((err) => console.error('Erro QR Code:', err))
  }, [targetUrl, identification, clientName])

  // Callback ref para renderizar assim que o elemento Canvas montar no DOM
  const handleCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node
    if (node) {
      renderLabel(node)
    }
  }, [renderLabel])

  // Reforço via useEffect quando open mudar
  useEffect(() => {
    if (open && canvasRef.current) {
      renderLabel(canvasRef.current)
    }
  }, [open, renderLabel])

  // Impressão via Web Bluetooth
  const handlePrintBluetooth = async () => {
    if (!canvasRef.current) return
    setIsPrinting(true)
    setStatusMessage('Procurando Niimbot D110 via Bluetooth...')

    try {
      const printer = new NiimbotBluetooth()
      const deviceName = await printer.connect()
      setStatusMessage(`Conectado a ${deviceName}! Imprimindo etiqueta...`)

      await printer.printCanvas(canvasRef.current, 3, 1)
      printer.disconnect()

      toast.success('Etiqueta impressa com sucesso na Niimbot D110!')
      setStatusMessage('✓ Impressão concluída com sucesso!')
      setTimeout(() => onOpenChange(false), 2000)
    } catch (err: any) {
      console.error('Erro Bluetooth:', err)
      setStatusMessage('')
      if (err.name === 'NotFoundError') {
        toast.info('Seleção cancelada.')
      } else {
        toast.error(err.message || 'Falha ao comunicar com a impressora Bluetooth.')
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

  // Download do arquivo PNG da etiqueta
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
            Formato padrão <span className="font-mono font-bold text-slate-200">T15*30mm</span> com QR Code para consulta vitalícia do prontuário técnico da máquina.
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
              Tamanho: 30mm × 15mm • QR Code aponta para o Prontuário Web
            </p>
          </div>

          {/* DICA TÉCNICA SOBRE BLUETOOTH NO WINDOWS */}
          <div className="rounded-xl border border-blue-900/40 bg-blue-950/30 p-3 text-xs text-blue-300">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-blue-200">
                  Dica de Conexão Bluetooth:
                </p>
                <p className="text-[11px] text-blue-300/80 leading-relaxed">
                  No Windows, o painel exibe <em>"Driver indisponível"</em> porque a Niimbot usa conexão BLE direta (sem spooler). 
                  Basta ligar a impressora, clicar no botão azul abaixo e selecioná-la na janela do navegador!
                </p>
              </div>
            </div>
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
            {isPrinting ? 'Conectando...' : 'Imprimir via Bluetooth (D110)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
