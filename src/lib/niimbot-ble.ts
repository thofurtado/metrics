/**
 * Driver Web Bluetooth para Impressoras Térmicas Niimbot (D11 / D110 / D101 / B21)
 * Compatível com Chrome / Edge no Windows, macOS e Android.
 */

// UUIDs de serviços BLE comumente usados pela Niimbot
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
          { namePrefix: 'D101' },
          { namePrefix: 'B21' },
          { namePrefix: 'JC' },
          { namePrefix: 'd110' },
          { namePrefix: 'd11' },
        ],
        optionalServices: NIIMBOT_SERVICES,
      })
    } catch (e: any) {
      if (e.name === 'NotFoundError') throw e
      // Fallback: show all nearby BLE devices
      this.device = await navBle.requestDevice({
        acceptAllDevices: true,
        optionalServices: NIIMBOT_SERVICES,
      })
    }

    const server = await this.device.gatt.connect()
    
    // Tentar encontrar o serviço compatível
    let service: any = null
    for (const sUuid of NIIMBOT_SERVICES) {
      try {
        service = await server.getPrimaryService(sUuid)
        if (service) break
      } catch {}
    }

    if (!service) {
      throw new Error('Não foi possível obter o serviço Bluetooth da Niimbot.')
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
      this.characteristic = chars.find((c: any) => c.properties.write || c.properties.writeWithoutResponse)
    }

    return this.device.name || 'Niimbot D110'
  }

  /**
   * Envia um pacote bruto para a Niimbot com delimitadores 0x55 0x55
   */
  private async sendPacket(type: number, data: number[] = []) {
    if (!this.characteristic) throw new Error('Impressora não conectada.')

    const len = data.length
    let checksum = type ^ len
    for (const b of data) {
      checksum ^= b
    }

    const packet = new Uint8Array([0x55, 0x55, type, len, ...data, checksum, 0xaa, 0xaa])

    // Enviar em blocos de até 20 bytes (padrão MTU BLE)
    const chunkSize = 20
    for (let i = 0; i < packet.length; i += chunkSize) {
      const slice = packet.slice(i, i + chunkSize)
      if (this.characteristic.writeValueWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(slice)
      } else {
        await this.characteristic.writeValue(slice)
      }
      await new Promise((r) => setTimeout(r, 10))
    }
  }

  /**
   * Imprime um Canvas (etiqueta 15x30mm) na Niimbot D110
   */
  async printCanvas(canvas: HTMLCanvasElement, density = 3, quantity = 1): Promise<void> {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Erro ao obter contexto do canvas.')

    const width = canvas.width
    const height = canvas.height
    const imgData = ctx.getImageData(0, 0, width, height)
    const pixels = imgData.data

    // 1. Início de Trabalho de Impressão (Start Print Job)
    await this.sendPacket(0x01, [0x00, 0x01])
    await new Promise((r) => setTimeout(r, 50))

    // 2. Definir Quantidade e Densidade
    await this.sendPacket(0x02, [0x00, quantity])
    await this.sendPacket(0x05, [density])
    await new Promise((r) => setTimeout(r, 50))

    // 3. Início de Página
    await this.sendPacket(0x03, [0x00, 0x01])
    await new Promise((r) => setTimeout(r, 50))

    // 4. Enviar linhas de bitmap (1 bit por pixel, invertido: 1 = preto, 0 = branco)
    const bytesPerRow = Math.ceil(width / 8)

    for (let y = 0; y < height; y++) {
      const rowBytes = new Array(bytesPerRow).fill(0)
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4
        // Calcular luminância
        const r = pixels[offset]
        const g = pixels[offset + 1]
        const b = pixels[offset + 2]
        const a = pixels[offset + 3]
        const isBlack = a > 128 && (r * 0.299 + g * 0.587 + b * 0.114 < 128)

        if (isBlack) {
          const byteIdx = Math.floor(x / 8)
          const bitIdx = 7 - (x % 8)
          rowBytes[byteIdx] |= 1 << bitIdx
        }
      }

      // Pacote de Linha de Impressão (0x85)
      // Formato: [y_high, y_low, ...rowBytes]
      const lineData = [(y >> 8) & 0xff, y & 0xff, ...rowBytes]
      await this.sendPacket(0x85, lineData)
    }

    // 5. Fim de Página e Avanço
    await this.sendPacket(0xf3, [0x00, 0x01])
    await new Promise((r) => setTimeout(r, 100))

    // 6. Fim do Trabalho de Impressão
    await this.sendPacket(0xf4, [0x00, 0x01])
  }

  disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect()
    }
  }
}
