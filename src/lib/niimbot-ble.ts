/**
 * Driver Web Bluetooth oficial para Impressoras Térmicas Niimbot
 * Utiliza o motor @mmote/niimbluelib (o mesmo que roda no niim.blue)
 */
import { 
  NiimbotBluetoothClient, 
  D110PrintTask, 
  ImageEncoder, 
  LabelType 
} from '@mmote/niimbluelib'

export class NiimbotBluetooth {
  private client: NiimbotBluetoothClient | null = null

  /**
   * Conecta à impressora Niimbot via Web Bluetooth
   */
  async connect(): Promise<string> {
    if (!navigator || !(navigator as any).bluetooth) {
      throw new Error('Seu navegador não suporta Web Bluetooth. Use o Google Chrome ou Microsoft Edge.')
    }

    this.client = new NiimbotBluetoothClient()
    await this.client.connect()
    await this.client.initialNegotiate()
    const info = await this.client.fetchPrinterInfo()

    return info?.serial ? `Niimbot D110 (${info.serial})` : 'Niimbot D110'
  }

  /**
   * Imprime o Canvas da etiqueta (30x15mm)
   */
  async printCanvas(canvas: HTMLCanvasElement, density = 3, quantity = 1): Promise<void> {
    if (!this.client) {
      throw new Error('Impressora não conectada.')
    }

    const printTask = new D110PrintTask(this.client, {
      density: density as any,
      labelType: LabelType.WithGaps,
    })

    await printTask.printInit()
    const encoded = ImageEncoder.encodeCanvas(canvas, 'left')
    await printTask.printPage(encoded, quantity)
    await printTask.waitForFinished()
  }

  /**
   * Desconecta
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.disconnect()
      }
    } catch {}
  }
}
