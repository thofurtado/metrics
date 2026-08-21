/**
 * Driver Web Bluetooth para Impressoras Térmicas Niimbot (D110 / D11 / D101 / B21)
 * Baseado no protocolo padrão oficial NIIMBOT (niim.blue / niimprint).
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
  '0000ff02-0000-1000-8000-00805f9b34fb',
]

export class NiimbotBluetooth {
  private device: any = null
  private characteristic: any = null

  /**
   * Conecta à impressora Niimbot via Web Bluetooth BLE
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
      // Fallback: listar todos os dispositivos BLE
      this.device = await navBle.requestDevice({
        acceptAllDevices: true,
        optionalServices: NIIMBOT_SERVICES,
      })
    }

    const server = await this.device.gatt.connect()

    // Tentar obter o serviço principal
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

    // Obter característica de escrita
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

    return this.device.name || 'Niimbot D110'
  }

  /**
   * Envia um pacote bruto para a Niimbot com delimitação [0x55, 0x55, TYPE, LEN, DATA, CHECKSUM, 0xAA, 0xAA]
   */
  private async sendPacket(type: number, data: number[] = []) {
    if (!this.characteristic) throw new Error('Impressora não conectada.')

    const len = data.length
    let checksum = type ^ len
    for (const b of data) {
      checksum ^= b
    }

    const packet = new Uint8Array([0x55, 0x55, type, len, ...data, checksum, 0xaa, 0xaa])

    // Enviar em blocos de até 20 bytes (MTU padrão BLE)
    const chunkSize = 20
    for (let i = 0; i < packet.length; i += chunkSize) {
      const slice = packet.slice(i, i + chunkSize)
      if (this.characteristic.writeValueWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(slice)
      } else {
        await this.characteristic.writeValue(slice)
      }
      await new Promise((r) => setTimeout(r, 8))
    }
  }

  /**
   * Imprime um Canvas (etiqueta 15x30mm) na Niimbot D110
   */
  async printCanvas(canvas: HTMLCanvasElement, density = 3, quantity = 1): Promise<void> {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Erro ao obter contexto do canvas.')

    const srcW = canvas.width // 240px (largura visual)
    const srcH = canvas.height // 120px (altura visual)
    const imgData = ctx.getImageData(0, 0, srcW, srcH)
    const pixels = imgData.data

    // Cabeça térmica física D110: 120 dots de largura (15 bytes por linha)
    // Avanço do rolo: 240 dots (30mm)
    const printWidth = srcH // 120 dots
    const printHeight = srcW // 240 dots
    const bytesPerRow = Math.ceil(printWidth / 8) // 15 bytes

    // 1. Handshake de Conexão (Connect 0xD3)
    try {
      await this.sendPacket(0xd3, [0x01])
      await new Promise((r) => setTimeout(r, 80))
    } catch {}

    // 2. Definir Densidade de Impressão (0x21: SetDensity 1-5)
    await this.sendPacket(0x21, [density])
    await new Promise((r) => setTimeout(r, 50))

    // 3. Definir Tipo de Papel (0x23: SetLabelType 1 = With Gaps)
    await this.sendPacket(0x23, [0x01])
    await new Promise((r) => setTimeout(r, 50))

    // 4. Início de Trabalho de Impressão (0x01: PrintStart [totalPages_hi, totalPages_lo])
    await this.sendPacket(0x01, [0x00, quantity])
    await new Promise((r) => setTimeout(r, 80))

    // 5. Início de Página (0x03: PageStart [pageIndex_hi, pageIndex_lo])
    await this.sendPacket(0x03, [0x00, 0x01])
    await new Promise((r) => setTimeout(r, 80))

    // 6. Enviar as 240 linhas rotacionadas 90° (0x85: PrintBitmapRow)
    for (let py = 0; py < printHeight; py++) {
      const rowBytes = new Array(bytesPerRow).fill(0)

      for (let px = 0; px < printWidth; px++) {
        const screenX = py
        const screenY = (printWidth - 1) - px

        const offset = (screenY * srcW + screenX) * 4
        const r = pixels[offset]
        const g = pixels[offset + 1]
        const b = pixels[offset + 2]
        const a = pixels[offset + 3]

        // Identificar pixel preto
        const isBlack = a > 128 && (r * 0.299 + g * 0.587 + b * 0.114 < 160)

        if (isBlack) {
          const byteIdx = Math.floor(px / 8)
          const bitIdx = 7 - (px % 8)
          rowBytes[byteIdx] |= 1 << bitIdx
        }
      }

      // Linha D110: [y_high, y_low, 0x00, 0x01, ...15_bytes]
      const lineData = [(py >> 8) & 0xff, py & 0xff, 0x00, 0x01, ...rowBytes]
      await this.sendPacket(0x85, lineData)
    }

    // 7. Fim de Página (0xE3: PageEnd)
    await this.sendPacket(0xe3, [0x00, 0x01])
    await new Promise((r) => setTimeout(r, 200))

    // 8. Fim do Trabalho de Impressão / Avanço (0xF3: PrintEnd)
    await this.sendPacket(0xf3, [0x00, 0x01])

    // Aguardar 3 segundos para a impressora finalizar o avanço do papel antes de desconectar
    await new Promise((r) => setTimeout(r, 3000))
  }

  /**
   * Desconecta do GATT com segurança
   */
  disconnect() {
    try {
      if (this.device && this.device.gatt && this.device.gatt.connected) {
        this.device.gatt.disconnect()
      }
    } catch {}
  }
}
