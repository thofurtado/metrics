import { Howl, Howler } from 'howler'

export type SoundType = 'marimba' | 'glockenspiel' | 'zen_chord' | 'subtle_ping'

export interface SoundOption {
  id: SoundType
  name: string
  description: string
}

export const SOUND_OPTIONS: SoundOption[] = [
  {
    id: 'marimba',
    name: 'Marimba Suave (Padrão)',
    description: 'Acorde amigável de marimba, perfeito para ambiente de trabalho.'
  },
  {
    id: 'glockenspiel',
    name: 'Glockenspiel Harmonioso',
    description: 'Campainha sutil em notas musicais agudas e relaxantes.'
  },
  {
    id: 'zen_chord',
    name: 'Teclado Rhodes / Sino Zen',
    description: 'Toque moderno, quente e muito discreto.'
  },
  {
    id: 'subtle_ping',
    name: 'Ping Discreto de Notificação',
    description: 'Apenas 2 notas suaves e limpas para avisar com sutileza.'
  }
]

// ============================================================================
// SINTETIZADOR DE ÁUDIO WAV PURO (Sem dependência de arquivos externos / 404)
// ============================================================================

function writeWavHeader(view: DataView, numSamples: number, sampleRate: number = 44100) {
  // RIFF chunk
  view.setUint32(0, 0x52494646, false) // 'RIFF'
  view.setUint32(4, 36 + numSamples * 2, true) // Tamanho total - 8
  view.setUint32(8, 0x57415645, false) // 'WAVE'

  // fmt chunk (PCM 16 bits, Mono)
  view.setUint32(12, 0x666d7420, false) // 'fmt '
  view.setUint32(16, 16, true) // SubChunk1Size (16 para PCM)
  view.setUint16(20, 1, true) // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true) // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true) // SampleRate
  view.setUint32(28, sampleRate * 2, true) // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true) // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true) // BitsPerSample

  // data chunk
  view.setUint32(36, 0x64617461, false) // 'data'
  view.setUint32(40, numSamples * 2, true) // SubChunk2Size
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return `data:audio/wav;base64,${btoa(binary)}`
}

// 1. Marimba Suave: Acorde Maior F# -> A# -> C# -> F# (Suave e Acústico)
function generateMarimbaWav(): string {
  const sampleRate = 44100
  const duration = 1.6
  const numSamples = Math.floor(sampleRate * duration)
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)
  writeWavHeader(view, numSamples, sampleRate)

  const notes = [
    { freq: 369.99, start: 0.0, dur: 0.6 }, // F#4
    { freq: 466.16, start: 0.1, dur: 0.6 }, // A#4
    { freq: 554.37, start: 0.2, dur: 0.7 }, // C#5
    { freq: 739.99, start: 0.32, dur: 1.1 }  // F#5
  ]

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    let sample = 0

    for (const note of notes) {
      if (t >= note.start && t < note.start + note.dur) {
        const dt = t - note.start
        // Envelope percussivo de marimba (ataque rápido, decaimento exponencial suave)
        const env = Math.exp(-dt * 5.5) * (1 - Math.exp(-dt * 200))
        // Fundamental + 2º harmônico sutil (típico de barra de madeira)
        const tone =
          Math.sin(2 * Math.PI * note.freq * dt) * 0.75 +
          Math.sin(2 * Math.PI * note.freq * 2 * dt) * 0.18 +
          Math.sin(2 * Math.PI * note.freq * 3 * dt) * 0.07
        sample += tone * env * 0.45
      }
    }

    const clamped = Math.max(-1, Math.min(1, sample * 0.75))
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
    offset += 2
  }

  return arrayBufferToBase64(buffer)
}

// 2. Glockenspiel / Carrilhão de Cristal
function generateGlockenspielWav(): string {
  const sampleRate = 44100
  const duration = 1.8
  const numSamples = Math.floor(sampleRate * duration)
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)
  writeWavHeader(view, numSamples, sampleRate)

  const notes = [
    { freq: 587.33, start: 0.0 },  // D5
    { freq: 880.0, start: 0.12 },  // A5
    { freq: 1174.66, start: 0.25 } // D6
  ]

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    let sample = 0

    for (const note of notes) {
      if (t >= note.start) {
        const dt = t - note.start
        const env = Math.exp(-dt * 4.0)
        // Tom puro de metal / sino
        const tone =
          Math.sin(2 * Math.PI * note.freq * dt) * 0.8 +
          Math.sin(2 * Math.PI * note.freq * 2.76 * dt) * 0.15
        sample += tone * env * 0.4
      }
    }

    const clamped = Math.max(-1, Math.min(1, sample * 0.7))
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
    offset += 2
  }

  return arrayBufferToBase64(buffer)
}

// 3. Sino Zen / Teclado Rhodes Quente
function generateZenChordWav(): string {
  const sampleRate = 44100
  const duration = 2.0
  const numSamples = Math.floor(sampleRate * duration)
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)
  writeWavHeader(view, numSamples, sampleRate)

  const freqs = [329.63, 440.0, 523.25, 659.25] // Am7 quente

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    let sample = 0

    for (const freq of freqs) {
      const env = Math.exp(-t * 2.8)
      const tone =
        Math.sin(2 * Math.PI * freq * t) * 0.6 +
        Math.sin(2 * Math.PI * freq * 2 * t) * 0.25 +
        Math.sin(2 * Math.PI * freq * 3 * t) * 0.1
      sample += tone * env * 0.3
    }

    const clamped = Math.max(-1, Math.min(1, sample * 0.7))
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
    offset += 2
  }

  return arrayBufferToBase64(buffer)
}

// 4. Ping Discreto de Notificação (2 notas)
function generateSubtlePingWav(): string {
  const sampleRate = 44100
  const duration = 0.8
  const numSamples = Math.floor(sampleRate * duration)
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)
  writeWavHeader(view, numSamples, sampleRate)

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    let sample = 0

    if (t < 0.3) {
      const env = Math.exp(-t * 12)
      sample += Math.sin(2 * Math.PI * 440 * t) * env * 0.4
    }
    if (t >= 0.15 && t < 0.6) {
      const dt = t - 0.15
      const env = Math.exp(-dt * 12)
      sample += Math.sin(2 * Math.PI * 659.25 * dt) * env * 0.45
    }

    const clamped = Math.max(-1, Math.min(1, sample * 0.6))
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
    offset += 2
  }

  return arrayBufferToBase64(buffer)
}

// Cache dos objetos Howl sintetizados
const soundCache: Partial<Record<SoundType, Howl>> = {}

function getHowlSound(type: SoundType): Howl {
  if (!soundCache[type]) {
    let base64 = ''
    switch (type) {
      case 'marimba':
        base64 = generateMarimbaWav()
        break
      case 'glockenspiel':
        base64 = generateGlockenspielWav()
        break
      case 'zen_chord':
        base64 = generateZenChordWav()
        break
      case 'subtle_ping':
        base64 = generateSubtlePingWav()
        break
      default:
        base64 = generateMarimbaWav()
    }

    soundCache[type] = new Howl({
      src: [base64],
      format: ['wav'],
      volume: 0.75,
      html5: false,
      preload: true
    })
  }
  return soundCache[type]!
}

// Desbloqueio seguro para Safari / iOS / Chrome
export function unlockAudioContext() {
  try {
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume()
    }
  } catch (e) {
    console.warn('Erro ao desbloquear áudio:', e)
  }
}

// Gerenciador de Alerta com Espaçamento Ajustado (18s) e Interrupção Imediata
class DeliveryAlertManager {
  private intervalId: any = null
  private isMuted: boolean = false
  private isAlerting: boolean = false
  private currentPendingCount: number = 0
  private soundType: SoundType = 'marimba'

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('delivery_sound_type') as SoundType
      if (saved && ['marimba', 'glockenspiel', 'zen_chord', 'subtle_ping'].includes(saved)) {
        this.soundType = saved
      }
    }
  }

  public getSoundType(): SoundType {
    return this.soundType
  }

  public setSoundType(type: SoundType) {
    this.soundType = type
    if (typeof window !== 'undefined') {
      localStorage.setItem('delivery_sound_type', type)
    }
    this.previewSound(type)
  }

  public previewSound(type?: SoundType) {
    try {
      unlockAudioContext()
      const snd = getHowlSound(type || this.soundType)
      snd.stop()
      snd.play()
    } catch (e) {
      console.warn('Erro ao reproduzir preview de som:', e)
    }
  }

  /**
   * Sincroniza a quantidade de pedidos pendentes.
   * Se for 0, interrompe o alarme imediatamente.
   * Se for > 0 e não estiver alertando, inicia o ciclo de alertas a cada 18s.
   */
  public syncPendingOrders(pendingCount: number) {
    this.currentPendingCount = pendingCount

    if (pendingCount <= 0) {
      this.stopAlert()
      return
    }

    if (this.isMuted) {
      this.stopAlert()
      return
    }

    if (!this.isAlerting) {
      this.startAlert()
    }
  }

  public startAlert() {
    if (this.isMuted) return
    if (this.currentPendingCount <= 0) {
      this.stopAlert()
      return
    }
    if (this.isAlerting) return

    this.isAlerting = true
    // Toca imediatamente
    this.previewSound()

    // E repete a cada 18 segundos enquanto houver pedidos pendentes
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    this.intervalId = setInterval(() => {
      // Checagem de segurança a cada disparo do timer:
      if (this.currentPendingCount <= 0 || this.isMuted) {
        this.stopAlert()
        return
      }
      this.previewSound()
    }, 18000)
  }

  public stopAlert() {
    this.isAlerting = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    try {
      Howler.stop()
    } catch (e) {}
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted
    if (this.isMuted) {
      this.stopAlert()
    } else if (this.currentPendingCount > 0) {
      this.startAlert()
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
