import { useState, useRef, useEffect } from 'react'
import QRCode from 'qrcode'
import { 
  Printer, 
  Bluetooth, 
  Download, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  Layers 
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

  // Renderizar o Canvas da etiqueta 15x30mm (240x120 pixels @ 203 DPI)
  useEffect(() => {
    if (!open || !equipment) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Dimensões exatas: 240 largura x 120 altura
    canvas.width = 240
    canvas.height = 120

    // Fundo branco
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Gerar QR Code
    QRCode.toCanvas(targetUrl, {
      width: 106,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    }).then((qrCanvas) => {
      // Desenhar QR Code no lado esquerdo
      ctx.drawImage(qrCanvas, 7, 7, 106, 106)

      // Lado Direito - Textos
      ctx.fillStyle = '#000000'
      ctx.textBaseline = 'top'

      // Título da Empresa
      ctx.font = 'bold 15px sans-serif'
      ctx.fillText('METRICS TI', 118, 12)

      // Linha divisória fina
      ctx.fillRect(118, 30, 114, 1.5)

      // Identificação da Máquina
      ctx.font = 'bold 13px sans-serif'
      const truncatedId = identification.length > 14 ? identification.substring(0, 14) + '..' : identification
      ctx.fillText(truncatedId, 118, 36)

      // Nome do Cliente / Loja
      ctx.font = '10px sans-serif'
      const truncatedClient = clientName.length > 18 ? clientName.substring(0, 18) + '..' : clientName
      ctx.fillText(truncatedClient, 118, 54)

      // Data de Emissão e Chamada para Ação
      ctx.font = '9px sans-serif'
      ctx.fillText(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 118, 72)

      // Instrução do QR Code
      ctx.font = 'italic 9px sans-serif'
      ctx.fillText('Consulte o Laudo ↗', 118, 92)
    })
  }, [open, equipment, targetUrl, identification, clientName])

  // Impressão via Web Bluetooth
  const handlePrintBluetooth = async () => {
    if (!canvasRef.current) return
    setIsPrinting(true)
    setStatusMessage('Procurando Niimbot D110 via Bluetooth...')

    try {
      const printer = new NiimbotBluetooth()
      const deviceName = await printer.connect()
      setStatusMessage(`Conectado a ${deviceName}! Enviando etiqueta...`)

      await printer.printCanvas(canvasRef.current, 3, 1)
      printer.disconnect()

      toast.success('Etiqueta impressa com sucesso na Niimbot D110!')
      setStatusMessage('✓ Impressão concluída!')
      setTimeout(() => onOpenChange(false), 1500)
    } catch (err: any) {
      console.error(err)
      toast.error('Erro na impressão Bluetooth: ' + err.message)
      setStatusMessage('')
    } finally {
      setIsPrinting(false)
    }
  }

  // Baixar ou Imprimir via Janela do Navegador
  const handlePrintWindow = () => {
    if (!canvasRef.current) return
    const dataUrl = canvasRef.current.toDataURL('image/png')
    const win = window.open('')
    if (win) {
      win.document.write(`
        <html>
          <head><title>Imprimir Etiqueta</title></head>
          <body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;">
            <img src="${dataUrl}" style="width:30mm;height:15mm;" onload="window.print();window.close();" />
          </body>
        </html>
      `)
      win.document.close()
    }
  }

  if (!equipment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Imprimir Etiqueta Inteligente (Niimbot D110)
          </DialogTitle>
          <DialogDescription>
            Etiqueta permanente formato <span className="font-mono font-semibold text-foreground">T15*30mm</span> com QR Code para consulta vitalícia do laudo e histórico da máquina.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* PRÉ-VISUALIZAÇÃO DA ETIQUETA REALISTA */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-secondary/30 border border-dashed border-border/60">
            <div className="p-2 rounded-xl bg-white shadow-2xl border border-slate-300 transform hover:scale-105 transition-transform">
              <canvas
                ref={canvasRef}
                style={{ width: '240px', height: '120px' }}
                className="rounded"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 font-medium">
              Dimensões: 30mm × 15mm • QR Code aponta para o Prontuário Web
            </p>
          </div>

          {statusMessage && (
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/30 text-xs text-primary font-medium text-center animate-pulse">
              {statusMessage}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrintWindow}
            className="gap-2"
          >
            <Download className="h-4 w-4" /> Impressão Windows
          </Button>

          <Button
            type="button"
            onClick={handlePrintBluetooth}
            disabled={isPrinting}
            className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
          >
            <Bluetooth className="h-4 w-4" />
            {isPrinting ? 'Imprimindo...' : 'Imprimir via Bluetooth (D110)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
