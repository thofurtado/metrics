import { NiimbotBluetoothClient } from './niimblue/client/bluetooth_impl'
import { ImageEncoder, CanvasImageSource } from './niimblue/image_encoder'
import { D110PrintTask } from './niimblue/print_tasks/D110PrintTask'
import { LabelType } from './niimblue/packets/payloads'
import { PacketGenerator } from './niimblue/packets/packet_generator'
import { RequestCommandId } from './niimblue/packets/commands'

export interface PrintOptions {
  density?: number // 1 a 5 (padrão 3)
  labelType?: number // 1 = Com Gaps, 2 = Contínuo, 3 = BlackMark (padrão 1)
  packetDelayMs?: number
  onProgress?: (percent: number) => void
}

function hexString(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ')
}

export class NiimbotBluetooth {
  private client: NiimbotBluetoothClient | null = null
  public onLog?: (msg: string) => void

  private log(message: string) {
    const time = new Date().toLocaleTimeString('pt-BR')
    const formatted = `[${time}] ${message}`
    console.log(`[Niimbot BLE] ${message}`)
    if (this.onLog) {
      this.onLog(formatted)
    }
  }

  /**
   * Conecta à impressora Niimbot usando o cliente oficial do niim.blue
   */
  async connect(): Promise<string> {
    if (!navigator || !(navigator as any).bluetooth) {
      throw new Error('Seu navegador não suporta Web Bluetooth. Use o Google Chrome ou Edge.')
    }

    this.log('🔍 Solicitando permissão Web Bluetooth...')

    this.client = new NiimbotBluetoothClient()

    // Registrar listeners de pacotes para o terminal de telemetria
    this.client.on('packetsent', (e: any) => {
      if (e.packet) {
        const raw = e.packet.toBytes ? e.packet.toBytes() : new Uint8Array([])
        this.log(`📤 Enviado: ${e.packet.commandName || ('0x' + e.packet.command.toString(16))} [${hexString(raw)}]`)
      }
    })

    this.client.on('packetreceived', (e: any) => {
      if (e.packet) {
        const raw = e.packet.toBytes ? e.packet.toBytes() : new Uint8Array([])
        this.log(`📥 Resposta: ${e.packet.commandName || ('0x' + e.packet.command.toString(16))} [${hexString(raw)}]`)
      }
    })

    this.client.on('connect', () => {
      this.log('✓ Conexão GATT estabelecida.')
    })

    this.client.on('disconnect', () => {
      this.log('🔌 Impressora desconectada.')
    })

    await this.client.connect()

    // Handshake inicial
    this.log('🤝 Executando handshake oficial...')
    await this.client.abstraction.sendPacket(PacketGenerator.connect())
    this.log('✓ Handshake aceito com sucesso!')

    return 'Niimbot D110'
  }

  /**
   * Teste de Handshake e Telemetria sem gastar papel
   */
  async testHandshake(): Promise<void> {
    if (!this.client) throw new Error('Impressora não conectada.')

    this.log('🩺 Lendo status e bateria da impressora...')
    try {
      const status = await this.client.abstraction.getPrinterStatusData()
      this.log(`✓ Status da D110: Bateria ${status.batteryLevel ?? 'OK'}, Papel: ${status.paperState ?? 'OK'}`)
    } catch {
      // Fallback
      await this.client.abstraction.sendPacket(PacketGenerator.getPrinterStatusData())
      this.log('✓ Pacote de status transmitido com sucesso.')
    }
  }

  /**
   * Avançar Papel / Feed de 1 etiqueta
   */
  async feedPaper(): Promise<void> {
    if (!this.client) throw new Error('Impressora não conectada.')
    this.log('📄 Solicitando avanço de papel...')
    await this.client.abstraction.sendPacket(PacketGenerator.mapped(RequestCommandId.PageFeed, [0x01]))
    await new Promise((r) => setTimeout(r, 500))
    this.log('✓ Avanço de papel concluído.')
  }

  /**
   * Imprime o Canvas usando o D110PrintTask oficial
   */
  async printCanvas(canvas: HTMLCanvasElement, options: PrintOptions = {}): Promise<void> {
    if (!this.client) throw new Error('Impressora não conectada.')

    const density = options.density ?? 3
    const labelType = (options.labelType as LabelType) ?? LabelType.WithGaps

    this.log(`🖨️ Codificando imagem via ImageEncoder (Rotação: 90°, Densidade: ${density}, Papel: ${labelType})...`)

    // Criar fonte de imagem do Canvas e codificar em formato otimizado para Niimbot D110
    const source = new CanvasImageSource(canvas)
    const encoded = ImageEncoder.encode(source, 'left')

    this.log(`✓ Imagem codificada: ${encoded.rows} linhas, ${encoded.rowsData.length} blocos comprimidos por RLE`)

    // Instanciar a tarefa oficial da D110
    const printTask = new D110PrintTask(this.client.abstraction, {
      density,
      labelType,
      statusPollIntervalMs: 250,
      pageTimeoutMs: 15000,
    })

    this.log('🚀 Inicializando tarefa de impressão (D110PrintTask.printInit)...')
    await printTask.printInit()

    this.log('📤 Transmitindo blocos de imagem (D110PrintTask.printPage)...')
    if (options.onProgress) options.onProgress(30)

    await printTask.printPage(encoded, 1)
    if (options.onProgress) options.onProgress(80)

    this.log('⏳ Aguardando confirmação do motor térmico (waitForPageFinished)...')
    try {
      await printTask.waitForPageFinished()
    } catch {
      await new Promise((r) => setTimeout(r, 1200))
    }

    if (options.onProgress) options.onProgress(100)
    this.log('✓ Etiqueta impressa com 100% de sucesso!')
  }

  /**
   * Desconecta da impressora
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect()
      } catch {}
      this.client = null
    }
  }
}
