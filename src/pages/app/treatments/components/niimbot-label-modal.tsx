import { useState, useRef, useEffect, useCallback } from 'react'
import QRCode from 'qrcode'
import { 
  Printer, 
  Bluetooth, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Settings2,
  Terminal,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sliders,
  Play
} from 'lucide-react'
import { toast } from 'sonner'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  const terminalBottomRef = useRef<HTMLDivElement | null>(null)

  const [isPrinting, setIsPrinting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [printProgress, setPrintProgress] = useState(0)

  // Configurações avançadas da impressora
  const [showSettings, setShowSettings] = useState(false)
  const [showTerminal, setShowTerminal] = useState(true)
  const [density, setDensity] = useState(3) // 1 a 5
  const [labelType, setLabelType] = useState(1) // 1 = Gap, 2 = Contínuo, 3 = BlackMark
  const [packetDelay, setPacketDelay] = useState(8) // ms

  // Terminal de Logs
  const [logs, setLogs] = useState<string[]>([])

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev.slice(-40), msg])
  }, [])

  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  const equipmentId = equipment?.id || ''
  const shortId = equipmentId.slice(0, 8)
  const identification = equipment?.identification || 'Computador'
  const clientName = equipment?.clientName || 'Cliente'

  const targetUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/e/${shortId}`
    : `https://app.metrics.dev.br/e/${shortId}`

    // Renderizar o Canvas da etiqueta 30x15mm (240x120 pixels @ 203 DPI) com margens seguras e alta nitidez
  const renderLabel = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 240
    canvas.height = 120

    // 1. Fundo branco puro
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 2. Textos no lado direito com fontes nítidas e posicionamento dentro da margem térmica
    ctx.fillStyle = '#000000'
    ctx.textBaseline = 'top'

    // Cabeçalho / Branding
    ctx.font = '900 13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText('METRICS TI', 118, 14)

    // Linha divisória preta sólida de 2px
    ctx.fillRect(118, 30, 106, 2)

    // Identificação do Equipamento (Bold destacado)
    ctx.font = 'bold 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    const truncatedId =
      identification.length > 14
        ? identification.substring(0, 14) + '..'
        : identification
    ctx.fillText(truncatedId, 118, 36)

    // Nome do Cliente
    ctx.font = '600 10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    const truncatedClient =
      clientName.length > 16
        ? clientName.substring(0, 16) + '..'
        : clientName
    ctx.fillText(truncatedClient, 118, 54)

    // Data de Emissão
    ctx.font = '500 10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 118, 70)

    // Chamada para Ação (Prontuário)
    ctx.font = 'bold 10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText('Prontuário ↗', 118, 88)

    // 3. Gerar QR Code perfeitamente enquadrado com margem de segurança (x=16, y=14, 92x92px)
    QRCode.toDataURL(targetUrl, {
      width: 92,
      margin: 0,
      errorCorrectionLevel: 'L',
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then((qrDataUrl) => {
        const img = new Image()
        img.onload = () => {
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(14, 12, 96, 96)
          ctx.drawImage(img, 16, 14, 92, 92)
        }
        img.src = qrDataUrl
      })
      .catch((err) => console.error('Erro ao gerar QR Code:', err))
  }, [targetUrl, identification, clientName])

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

  // Testar conexão / Handshake (sem gastar papel)
  const handleTestHandshake = async () => {
    setIsPrinting(true)
    addLog('--- Teste de Conexão Niimbot D110 ---')

    try {
      const printer = new NiimbotBluetooth()
      printer.onLog = addLog
      const deviceName = await printer.connect()
      await printer.testHandshake()
      await printer.disconnect()

      toast.success(`Conexão com ${deviceName} validada com sucesso!`)
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        toast.error(err.message || 'Falha no teste de conexão.')
      }
    } finally {
      setIsPrinting(false)
    }
  }

  // Avançar papel (Feed)
  const handleFeedPaper = async () => {
    setIsPrinting(true)
    try {
      const printer = new NiimbotBluetooth()
      printer.onLog = addLog
      await printer.connect()
      await printer.feedPaper()
      await printer.disconnect()
      toast.success('Avanço de papel executado!')
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        toast.error(err.message || 'Falha ao avançar papel.')
      }
    } finally {
      setIsPrinting(false)
    }
  }

  // Impressão nativa via Bluetooth
  const handlePrintBluetooth = async () => {
    if (!canvasRef.current) return
    setIsPrinting(true)
    setPrintProgress(0)
    setStatusMessage('Conectando à Niimbot D110...')
    addLog('--- Iniciando Impressão de Etiqueta ---')

    try {
      const printer = new NiimbotBluetooth()
      printer.onLog = addLog

      const deviceName = await printer.connect()
      setStatusMessage(`Conectado a ${deviceName}! Imprimindo...`)

      await printer.printCanvas(canvasRef.current, {
        density,
        labelType,
        packetDelayMs: packetDelay,
        onProgress: (p) => setPrintProgress(p),
      })

      await printer.disconnect()

      toast.success('Etiqueta impressa com sucesso!')
      setStatusMessage('✓ Impressão concluída com sucesso!')
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

  // Copiar Logs do Terminal
  const handleCopyLogs = () => {
    if (logs.length === 0) {
      toast.info('Nenhum log gravado ainda.')
      return
    }
    navigator.clipboard.writeText(logs.join('\n'))
    toast.success('Logs copiados para a área de transferência!')
  }

  // Impressão padrão do Windows
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
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto border-slate-800 bg-slate-950 text-slate-100 p-5 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-white">
            <Printer className="h-5 w-5 text-indigo-400" />
            Central de Impressão Niimbot D110
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Formato oficial <span className="font-mono font-bold text-slate-200">30 × 15 mm</span> com console de diagnóstico BLE em tempo real.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* PRÉ-VISUALIZAÇÃO DA ETIQUETA REALISTA */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="p-1.5 rounded-xl bg-white shadow-2xl border border-slate-300 transform hover:scale-105 transition-transform">
              <canvas
                ref={handleCanvasRef}
                style={{ width: '240px', height: '120px' }}
                className="rounded block"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              Dimensões: 30mm × 15mm • QR Code de Alta Leitura
            </p>
          </div>

          {/* BARRA DE PROGRESSO / STATUS */}
          {isPrinting && (
            <div className="space-y-1.5 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
              <div className="flex justify-between text-xs text-indigo-300 font-bold">
                <span>{statusMessage}</span>
                <span>{printProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-150"
                  style={{ width: `${printProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* TOGGLES: CONFIGURAÇÕES & TERMINAL */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="text-xs text-slate-300 hover:text-white hover:bg-slate-900 gap-1.5 font-bold h-8"
            >
              <Sliders className="h-3.5 w-3.5 text-indigo-400" />
              Ajustes de Impressão (Densidade/Papel)
              {showSettings ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
            </Button>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleTestHandshake}
                disabled={isPrinting}
                title="Testa conexão BLE sem gastar papel"
                className="text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/50 font-bold h-8 gap-1"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Testar Conexão
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFeedPaper}
                disabled={isPrinting}
                title="Avança 1 etiqueta"
                className="text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 font-bold h-8"
              >
                Avançar
              </Button>
            </div>
          </div>

          {/* PAINEL DE CONFIGURAÇÕES AVANÇADAS */}
          {showSettings && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-300">Densidade Térmica</Label>
                <select
                  value={density}
                  onChange={(e) => setDensity(Number(e.target.value))}
                  className="w-full h-8 rounded-lg bg-slate-950 border border-slate-800 text-xs px-2 text-white font-bold"
                >
                  <option value={1}>1 - Muito Clara</option>
                  <option value={2}>2 - Clara</option>
                  <option value={3}>3 - Média (Padrão)</option>
                  <option value={4}>4 - Escura</option>
                  <option value={5}>5 - Muito Escura</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-300">Tipo de Etiqueta</Label>
                <select
                  value={labelType}
                  onChange={(e) => setLabelType(Number(e.target.value))}
                  className="w-full h-8 rounded-lg bg-slate-950 border border-slate-800 text-xs px-2 text-white font-bold"
                >
                  <option value={1}>1 - Com Espaço / Gap (Padrão)</option>
                  <option value={2}>2 - Rolo Contínuo</option>
                  <option value={3}>3 - Marca Preta (BlackMark)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-300">Delay BLE (ms)</Label>
                <select
                  value={packetDelay}
                  onChange={(e) => setPacketDelay(Number(e.target.value))}
                  className="w-full h-8 rounded-lg bg-slate-950 border border-slate-800 text-xs px-2 text-white font-bold"
                >
                  <option value={6}>6 ms (Mais Rápido)</option>
                  <option value={8}>8 ms (Padrão Estável)</option>
                  <option value={12}>12 ms (Alta Confiabilidade)</option>
                  <option value={20}>20 ms (Lento / Seguro)</option>
                </select>
              </div>
            </div>
          )}

          {/* TERMINAL DE LOGS AO VIVO (SAÍDA DE ERROS E HANDSHAKE) */}
          <div className="rounded-2xl border border-slate-800 bg-black/90 p-3 font-mono text-[11px] text-slate-300 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <Terminal className="h-3.5 w-3.5" />
                <span>Console de Diagnóstico BLE</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLogs}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white font-sans bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
                >
                  <Copy className="h-3 w-3" /> Copiar Logs
                </button>
                <button
                  type="button"
                  onClick={() => setLogs([])}
                  className="text-slate-500 hover:text-rose-400"
                  title="Limpar logs"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="h-28 overflow-y-auto space-y-1 text-slate-300 pr-1 select-text scrollbar-thin scrollbar-thumb-slate-800">
              {logs.length === 0 ? (
                <span className="text-slate-600 italic">
                  Aguardando ação. Clique em &quot;Testar Conexão&quot; ou &quot;Imprimir&quot; para iniciar o handshake...
                </span>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="leading-tight">
                    {log}
                  </div>
                ))
              )}
              <div ref={terminalBottomRef} />
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800">
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
            {isPrinting ? 'Processando...' : 'Imprimir via Bluetooth (D110)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
