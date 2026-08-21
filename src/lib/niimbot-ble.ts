/**
 * Driver Web Bluetooth oficial e puro para Niimbot D110
 * Implementação baseada na especificação do niim.blue / niimbluelib sem dependências nativas.
 */

// UUIDs de serviços BLE padrão Niimbot
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

export class NiimbotBluetooth {
  private device: any = null
  private characteristic: any = null

  /**
   * Conecta à impressora Niimbot via Web Bluetooth
   */
  async connect(): Promise<string> {
    if (!navigator || !(navigator as any).bluetooth) {
      throw new Error('Seu navegador não suporta Web Bluetooth. Use o Google Chrome ou Microsoft Edge.')
    }

    const navBle = (navigator as any).bluetooth

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
      if (e.name === 'NotFoundError') throw e
      this.device = await navBle.requestDevice({
        acceptAllDevices: true,
        optionalServices: NIIMBOT_SERVICES,
      })
    }

    const server = await this.device.gatt.connect()

    // Encontrar o serviço principal
    let service: any = null
    for (const sUuid of NIIMBOT_SERVICES) {
      try {
        service = await server.getPrimaryService(sUuid)
        if (service) break
      } catch {}
    }

    if (!service) {
      const services = await server.getPrimaryServices()
      if (services && services.length > 0) {
        service = services[0]
      }
    }

    if (!service) {
      throw new Error('Não foi possível estabelecer conexão de serviço com a Niimbot.')
    }

    // Encontrar característica de escrita
    for (const cUuid of NIIMBOT_CHARACTERISTICS) {
      try {
        this.characteristic = await service.getCharacteristic(cUuid)
        if (this.characteristic) break
      } catch {}
    }

    if (!this.characteristic) {
      const chars = await service.getCharacteristics()
      this.characteristic = chars.find(
        (c: any) => c.properties.write || c.properties.writeWithoutResponse,
      )
    }

    if (!this.characteristic) {
      throw new Error('Canal de comunicação de impressão não encontrado.')
    }

    // Handshake inicial
    await this.sendPacket(createPacket(0xd3, [0x01]))
    await new Promise((r) => setTimeout(r, 60))

    return this.device.name || 'Niimbot D110'
  }

  /**
   * Envia um pacote BLE fatiado em blocos de até 20 bytes
   */
  private async sendPacket(packet: Uint8Array) {
    if (!this.characteristic) throw new Error('Impressora não conectada.')

    const chunkSize = 20
    for (let i = 0; i < packet.length; i += chunkSize) {
      const slice = packet.slice(i, i + chunkSize)
      if (this.characteristic.writeValueWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(slice)
      } else {
        await this.characteristic.writeValue(slice)
      }
      await new Promise((r) => setTimeout(r, 6))
    }
  }

  /**
   * Imprime um Canvas (30x15mm) usando o pipeline do niim.blue
   */
  async printCanvas(canvas: HTMLCanvasElement, density = 3, quantity = 1): Promise<void> {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Erro ao obter contexto do canvas.')

    const srcW = canvas.width // 240
    const srcH = canvas.height // 120
    const imgData = ctx.getImageData(0, 0, srcW, srcH)
    const pixels = imgData.data

    // D110 orientada a 90°: 240 linhas x 120 colunas (15 bytes por linha)
    const rows = srcW // 240 linhas
    const cols = Math.ceil(srcH / 8) * 8 // 120 dots = 15 bytes
    const bytesPerRow = cols / 8 // 15 bytes

    // 1. Configuração inicial do trabalho de impressão
    await this.sendPacket(createPacket(0x21, [density])) // SetDensity (1-5)
    await new Promise((r) => setTimeout(r, 40))

    await this.sendPacket(createPacket(0x23, [0x01])) // SetLabelType (1 = WithGaps)
    await new Promise((r) => setTimeout(r, 40))

    await this.sendPacket(createPacket(0x01, [0x01])) // PrintStart (1 byte)
    await new Promise((r) => setTimeout(r, 60))

    // 2. Início de página e dimensões
    await this.sendPacket(createPacket(0x20, [0x01])) // PrintClear
    await new Promise((r) => setTimeout(r, 40))

    await this.sendPacket(createPacket(0x03, [0x01])) // PageStart
    await new Promise((r) => setTimeout(r, 40))

    // SetPageSize4b: [rows_hi, rows_lo, cols_hi, cols_lo]
    await this.sendPacket(createPacket(0x13, [(rows >> 8) & 0xff, rows & 0xff, (cols >> 8) & 0xff, cols & 0xff]))
    await new Promise((r) => setTimeout(r, 40))

    // SetPrintQuantity: [qty_hi, qty_lo]
    await this.sendPacket(createPacket(0x15, [(quantity >> 8) & 0xff, quantity & 0xff]))
    await new Promise((r) => setTimeout(r, 40))

    // 3. Transmissão das 240 linhas de bitmap
    for (let r = 0; r < rows; r++) {
      const rowBytes = new Uint8Array(bytesPerRow)
      let isVoid = true

      for (let c = 0; c < srcH; c++) {
        const screenX = r
        const screenY = (srcH - 1) - c
        const offset = (screenY * srcW + screenX) * 4

        const red = pixels[offset]
        const green = pixels[offset + 1]
        const blue = pixels[offset + 2]
        const alpha = pixels[offset + 3]

        const isBlack = alpha > 128 && (red * 0.299 + green * 0.587 + blue * 0.114 < 160)

        if (isBlack) {
          isVoid = false
          const byteIdx = Math.floor(c / 8)
          const bitIdx = 7 - (c % 8)
          rowBytes[byteIdx] |= 1 << bitIdx
        }
      }

      if (isVoid) {
        // Linha em branco / void: [row_hi, row_lo, 0x00, repeat_count]
        await this.sendPacket(createPacket(0x85, [(r >> 8) & 0xff, r & 0xff, 0x00, 0x01]))
      } else {
        // Linha com pixels: [row_hi, row_lo, 0x00, repeat_count, ...rowBytes]
        await this.sendPacket(createPacket(0x85, [(r >> 8) & 0xff, r & 0xff, 0x00, 0x01, ...rowBytes]))
      }
    }

    // 4. Fim de Página
    await this.sendPacket(createPacket(0xe3, [0x01]))
    await new Promise((r) => setTimeout(r, 200))

    // 5. Fim do Trabalho de Impressão / Avanço
    await this.sendPacket(createPacket(0xf3, [0x01]))
    await new Promise((r) => setTimeout(r, 2500))
  }

  /**
   * Desconecta
   */
  async disconnect(): Promise<void> {
    try {
      if (this.device && this.device.gatt && this.device.gatt.connected) {
        this.device.gatt.disconnect()
      }
    } catch {}
  }
}
