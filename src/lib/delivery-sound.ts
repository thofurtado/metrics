import { Howl, Howler } from 'howler'

// Gerador de som WAV puro em Base64 (Dois tons "Ding-Dong" estilo iFood/Anota AI)
function generateChimeWavBase64(): string {
  const sampleRate = 44100
  const duration = 1.1 // segundos
  const numSamples = Math.floor(sampleRate * duration)
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)

  // WAV Header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + numSamples * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // Format: PCM
  view.setUint16(22, 1, true) // Mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // Byte rate
  view.setUint16(32, 2, true) // Block align
  view.setUint16(34, 16, true) // Bits per sample
  writeString(36, 'data')
  view.setUint32(40, numSamples * 2, true)

  // Síntese harmônica do Chime de Pedido (Dois tons: 784Hz [G5] e 1046Hz [C6] com decaimento suave)
  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    let sample = 0

    // Primeiro Tom (0.0s até 0.45s) - G5
    if (t < 0.45) {
      const envelope = Math.exp(-t * 8)
      const tone1 = Math.sin(2 * Math.PI * 783.99 * t)
      const harmonic = 0.3 * Math.sin(2 * Math.PI * 1567.98 * t)
      sample += (tone1 + harmonic) * envelope
    }

    // Segundo Tom (0.25s até 1.1s) - C6
    if (t >= 0.25) {
      const t2 = t - 0.25
      const envelope2 = Math.exp(-t2 * 6)
      const tone2 = Math.sin(2 * Math.PI * 1046.50 * t2)
      const harmonic2 = 0.35 * Math.sin(2 * Math.PI * 2093.00 * t2)
      sample += (tone2 + harmonic2) * envelope2
    }

    // Normalização e clipping seguro
    const clamped = Math.max(-1, Math.min(1, sample * 0.7))
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
    offset += 2
  }

  // Converte ArrayBuffer para Base64
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return `data:audio/wav;base64,${btoa(binary)}`
}

let chimeHowl: Howl | null = null

function getChimeSound(): Howl {
  if (!chimeHowl) {
    const wavBase64 = generateChimeWavBase64()
    chimeHowl = new Howl({
      src: [wavBase64],
      format: ['wav'],
      volume: 0.85,
      html5: false,
      preload: true
    })
  }
  return chimeHowl
}

// Desbloqueia o contexto de áudio em navegadores com autoplay restrito (Safari, Chrome, iOS)
export function unlockAudioContext() {
  try {
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume()
    }
  } catch (e) {
    console.warn('Erro ao desbloquear áudio:', e)
  }
}

// Toca uma vez
export function playDeliveryOrderChime() {
  try {
    unlockAudioContext()
    const sound = getChimeSound()
    sound.play()
  } catch (e) {
    console.warn('Erro ao reproduzir som com Howler:', e)
  }
}

// Gerenciador de Alerta Contínuo (Toca periodicamente enquanto houver pedidos pendentes)
class DeliveryAlertManager {
  private intervalId: any = null
  private isMuted: boolean = false
  private isAlerting: boolean = false

  public startAlert() {
    if (this.isMuted) return
    if (this.isAlerting) return

    this.isAlerting = true
    // Toca imediatamente
    playDeliveryOrderChime()

    // E repete a cada 6 segundos enquanto houver pedidos pendentes a aceitar
    if (this.intervalId) clearInterval(this.intervalId)
    this.intervalId = setInterval(() => {
      if (!this.isMuted) {
        playDeliveryOrderChime()
      }
    }, 6000)
  }

  public stopAlert() {
    this.isAlerting = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted
    if (this.isMuted) {
      this.stopAlert()
    }
    return this.isMuted
  }

  public getIsMuted(): boolean {
    return this.isMuted
  }

  public getIsAlerting(): boolean {
    return this.isAlerting
  }
}

export const deliveryAlertManager = new DeliveryAlertManager()
