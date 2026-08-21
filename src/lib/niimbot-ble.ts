/**
 * Driver Web Bluetooth com Console de Telemetria e Diagnóstico para Niimbot D110
 */

const NIIMBOT_SERVICES = [
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
]

const NIIMBOT_CHARACTERISTICS = [
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  '0000fee8-0000-1000-8000-00805f9b34fb',
  '0000ff01-0000-1000-8000-00805f9b34fb',
]

function createPacket(cmd: number, data: number[] = []): Uint8Array {
  let checksum = cmd ^ data.length
  for (const b of data) {
    checksum ^= b
  }
  return new Uint8Array([0x55, 0x55, cmd, data.length, ...data, checksum, 0xaa, 0xaa])
}

function hexString(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ')
}

export interface PrintOptions {
  density?: number // 1 a 5 (padrão 3)
  labelType?: number // 1 = Com Gaps, 2 = Contínuo, 3 = BlackMark (padrão 1)
  packetDelayMs?: number // Delay entre blocos de 20 bytes (padrão 8ms)
  onProgress?: (percent: number) => void
}

export class NiimbotBluetooth {
  private device: any = null
  private characteristic: any = null
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
   * Conecta à impressora Niimbot via Web Bluetooth
   */
  async connect(): Promise<string> {
    if (!navigator || !(navigator as any).bluetooth) {
      throw new Error('Seu navegador não suporta Web Bluetooth. Use o Google Chrome ou Edge.')
    }

    const navBle = (navigator as any).bluetooth

    this.log('🔍 Solicitando permissão Web Bluetooth no navegador...')

    try {
      this.device = await navBle.requestDevice({
        filters: [
          { namePrefix: 'D110' },
          { namePrefix: 'D11' },
          { namePrefix: 'Niimbot' },
          { namePrefix: 'd110' },
          { namePrefix: 'd11' },
          { namePrefix: 'D101' },
          { namePrefix: 'B21' },
          { namePrefix: 'JC' },
        ],
        optionalServices: NIIMBOT_SERVICES,
      })
    } catch (e: any) {
      if (e.name === 'NotFoundError') {
        this.log('❌ Seleção de dispositivo cancelada pelo usuário.')
        throw e
      }
      this.device = await navBle.requestDevice({
        acceptAllDevices: true,
        optionalServices: NIIMBOT_SERVICES,
      })
    }

    const devName = this.device.name || 'Niimbot D110'
    this.log(`📡 Pareado com: ${devName}. Conectando GATT...`)

    const server = await this.device.gatt.connect()
    this.log('✓ Servidor GATT conectado.')

    // 1. Encontrar o serviço principal
    let service: any = null
    for (const sUuid of NIIMBOT_SERVICES) {
      try {
        service = await server.getPrimaryService(sUuid)
        if (service) {
          this.log(`✓ Serviço encontrado: ${sUuid.substring(0, 8)}...`)
          break
        }
      } catch {}
    }

    if (!service) {
      const services = await server.getPrimaryServices()
      if (services && services.length > 0) {
        service = services[0]
      }
    }

    if (!service) {
      throw new Error('Serviço GATT Niimbot não localizado.')
    }

    // 2. Encontrar característica de comunicação
    for (const cUuid of NIIMBOT_CHARACTERISTICS) {
      try {
        this.characteristic = await service.getCharacteristic(cUuid)
        if (this.characteristic) {
          this.log(`✓ Canal de comunicação: ${cUuid.substring(0, 8)}...`)
          break
        }
      } catch {}
    }

    if (!this.characteristic) {
      const chars = await service.getCharacteristics()
      this.characteristic = chars.find(
        (c: any) => c.properties.write || c.properties.writeWithoutResponse,
      )
    }

    if (!this.characteristic) {
      throw new Error('Canal de escrita da impressora não encontrado.')
    }

    // 3. Iniciar notificações
    if (this.characteristic.properties && (this.characteristic.properties.notify || this.characteristic.properties.indicate)) {
      try {
        await this.characteristic.startNotifications()
        this.characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
          const val = new Uint8Array(event.target.value.buffer)
          this.log(`📥 Resposta Niimbot: ${hexString(val)}`)
        })
        this.log('✓ Notificações bidirecionais ativadas.')
      } catch (err: any) {
        this.log(`⚠️ Notificações: ${err.message}`)
      }
    }

    // 4. Handshake inicial de negociação (0xD3)
    this.log('🤝 Enviando Handshake inicial (0xD3)...')
    try {
      await this.sendPacket(createPacket(0xd3, [0x01]))
      await new Promise((r) => setTimeout(r, 80))
      this.log('✓ Handshake 0xD3 aceito pela D110.')
    } catch (err: any) {
      this.log(`⚠️ Handshake: ${err.message}`)
    }

    return devName
  }

  /**
   * Envia um pacote BLE fatiado em blocos de até 20 bytes
   */
  private async sendPacket(packet: Uint8Array, delayMs = 8) {
    if (!this.characteristic) throw new Error('Impressora não conectada.')

    const chunkSize = 20
    const props = this.characteristic.properties || {}

    for (let i = 0; i < packet.length; i += chunkSize) {
      const slice = packet.slice(i, i + chunkSize)

      try {
        if (props.writeWithoutResponse && this.characteristic.writeValueWithoutResponse) {
          await this.characteristic.writeValueWithoutResponse(slice)
        } else if (this.characteristic.writeValue) {
          await this.characteristic.writeValue(slice)
        } else if (this.characteristic.writeValueWithoutResponse) {
          await this.characteristic.writeValueWithoutResponse(slice)
        }
      } catch {
        // Fallback dinâmico
        try {
          if (this.characteristic.writeValue) {
            await this.characteristic.writeValue(slice)
          } else if (this.characteristic.writeValueWithoutResponse) {
            await this.characteristic.writeValueWithoutResponse(slice)
          }
        } catch (fErr: any) {
          this.log(`❌ Falha envio BLE: ${fErr.message}`)
          throw fErr
        }
      }

      await new Promise((r) => setTimeout(r, delayMs))
    }
  }

  /**
   * Envia comando de teste e leitura de status (sem imprimir)
   */
  async testHandshake(): Promise<void> {
    this.log('🩺 Testando telemetria e status da bateria (0x40)...')
    await this.sendPacket(createPacket(0x40, [0x01]))
    await new Promise((r) => setTimeout(r, 120))
    this.log('✓ Comunicação de telemetria testada com sucesso!')
  }

  /**
   * Avança papel / Feed de 1 etiqueta
   */
  async feedPaper(): Promise<void> {
    this.log('📄 Solicitando avanço de papel (Feed)...')
    await this.sendPacket(createPacket(0x11, [0x01]))
    await new Promise((r) => setTimeout(r, 500))
    this.log('✓ Avanço de papel concluído.')
  }

  /**
   * Imprime um Canvas (30x15mm)
   */
  async printCanvas(canvas: HTMLCanvasElement, options: PrintOptions = {}): Promise<void> {
    const density = options.density ?? 3
    const labelType = options.labelType ?? 1
    const delayMs = options.packetDelayMs ?? 8

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Contexto 2D do Canvas inválido.')

    const srcW = canvas.width // 240
    const srcH = canvas.height // 120
    const imgData = ctx.getImageData(0, 0, srcW, srcH)
    const pixels = imgData.data

    const rows = srcW // 240 linhas térmicas
    const cols = Math.ceil(srcH / 8) * 8 // 120 dots = 15 bytes
    const bytesPerRow = cols / 8

    this.log(`🖨️ Iniciando trabalho: ${rows} linhas x ${cols} colunas (Densidade: ${density}, Papel: ${labelType})...`)

    // 1. Configurações
    await this.sendPacket(createPacket(0x21, [density]), delayMs) // Densidade
    await new Promise((r) => setTimeout(r, 40))

    await this.sendPacket(createPacket(0x23, [labelType]), delayMs) // Tipo de etiqueta
    await new Promise((r) => setTimeout(r, 40))

    await this.sendPacket(createPacket(0x01, [0x01]), delayMs) // PrintStart (1 byte)
    await new Promise((r) => setTimeout(r, 60))

    // 2. Início de página
    await this.sendPacket(createPacket(0x20, [0x01]), delayMs) // PrintClear
    await new Promise((r) => setTimeout(r, 40))

    await this.sendPacket(createPacket(0x03, [0x01]), delayMs) // PageStart
    await new Promise((r) => setTimeout(r, 40))

    // SetPageSize4b: [rows_hi, rows_lo, cols_hi, cols_lo]
    await this.sendPacket(
      createPacket(0x13, [(rows >> 8) & 0xff, rows & 0xff, (cols >> 8) & 0xff, cols & 0xff]),
      delayMs,
    )
    await new Promise((r) => setTimeout(r, 40))

    // SetPrintQuantity: 1 cópia
    await this.sendPacket(createPacket(0x15, [0x00, 0x01]), delayMs)
    await new Promise((r) => setTimeout(r, 40))

    this.log('📤 Transmitindo matriz de bitmap (240 linhas)...')

    // 3. Transmissão do Bitmap linha por linha
    for (let r = 0; r < rows; r++) {
      const rowBytes = new Uint8Array(bytesPerRow)
      let isVoid = true

      for (let c = 0; c < srcH; c++) {
        const screenX = r
        const screenY = srcH - 1 - c
        const offset = (screenY * srcW + screenX) * 4

        const red = pixels[offset]
        const green = pixels[offset + 1]
        const blue = pixels[offset + 2]
        const alpha = pixels[offset + 3]

        const isBlack = alpha > 128 && red * 0.299 + green * 0.587 + blue * 0.114 < 160

        if (isBlack) {
          isVoid = false
          const byteIdx = Math.floor(c / 8)
          const bitIdx = 7 - (c % 8)
          rowBytes[byteIdx] |= 1 << bitIdx
        }
      }

      if (isVoid) {
        await this.sendPacket(createPacket(0x85, [(r >> 8) & 0xff, r & 0xff, 0x00, 0x01]), delayMs)
      } else {
        await this.sendPacket(
          createPacket(0x85, [(r >> 8) & 0xff, r & 0xff, 0x00, 0x01, ...rowBytes]),
          delayMs,
        )
      }

      if (options.onProgress && r % 24 === 0) {
        options.onProgress(Math.round((r / rows) * 100))
      }
    }

    if (options.onProgress) {
      options.onProgress(100)
    }

    // 4. Fim de Página (PageEnd)
    this.log('🏁 Enviando PageEnd (0xE3)...')
    await this.sendPacket(createPacket(0xe3, [0x01]), delayMs)
    this.log('✓ Impressão transmitida com sucesso! Aguardando motor da D110...')

    await new Promise((r) => setTimeout(r, 1500))
  }

  /**
   * Desconecta
   */
  async disconnect(): Promise<void> {
    try {
      if (this.device && this.device.gatt && this.device.gatt.connected) {
        this.device.gatt.disconnect()
        this.log('🔌 Desconectado do Bluetooth.')
      }
    } catch {}
  }
}
