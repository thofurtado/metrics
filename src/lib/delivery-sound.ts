import { Howl, Howler } from 'howler'

export type SoundType = 'marimba' | 'glockenspiel' | 'zen_chord' | 'subtle_ping'

export const SOUND_OPTIONS: { id: SoundType; name: string; description: string }[] = [
  { id: 'marimba', name: 'Marimba Suave (Recomendado)', description: 'Toque amadeirado, aveludado e zero estridente' },
  { id: 'glockenspiel', name: 'Glockenspiel Melódico', description: 'Sino delicado com harmônicos suaves' },
  { id: 'zen_chord', name: 'Acorde Piano Rhodes', description: 'Acorde relaxante de piano elétrico vintage' },
  { id: 'subtle_ping', name: 'Ping Discreto', description: 'Dois toques curtos e minimalistas' }
]

function writeWavHeader(view: DataView, numSamples: number, sampleRate = 44100) {
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + numSamples * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // Mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, numSamples * 2, true)
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

// 1. Marimba Acústica Suave (Frequências médias-graves 349Hz F4 -> 440Hz A4 -> 523Hz C5)
function generateMarimbaWav(): string {
  const sampleRate = 44100
  const duration = 1.3
  const numSamples = Math.floor(sampleRate * duration)
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)
  writeWavHeader(view, numSamples, sampleRate)

  let offset = 44
  const notes = [
    { freq: 349.23, start: 0.0, dur: 0.8 }, // F4
    { freq: 440.00, start: 0.16, dur: 0.8 }, // A4
    { freq: 523.25, start: 0.32, dur: 0.98 } // C5
  ]

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    let sample = 0

    for (const note of notes) {
      if (t >= note.start && t < note.start + note.dur) {
        const dt = t - note.start
        // Envelope de marimba de madeira com ataque suave e decaimento exponencial
        const env = Math.exp(-dt * 5.5) * (1 - Math.exp(-dt * 60))
        const fundamental = Math.sin(2 * Math.PI * note.freq * dt)
        // Harmônicos secundários suaves (madeira)
        const harm1 = 0.2 * Math.sin(2 * Math.PI * note.freq * 2 * dt) * Math.exp(-dt * 12)
        sample += (fundamental + harm1) * env * 0.45
      }
    }

    const clamped = Math.max(-1, Math.min(1, sample * 0.65))
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
    offset += 2
  }

  return arrayBufferToBase64(buffer)
}

// 2. Glockenspiel Melódico (587Hz D5 -> 880Hz A5 suave)
function generateGlockenspielWav(): string {
  const sampleRate = 44100
  const duration = 1.2
  const numSamples = Math.floor(sampleRate * duration)
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)
  writeWavHeader(view, numSamples, sampleRate)

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    let sample = 0

    if (t < 0.6) {
      const env = Math.exp(-t * 4.5)
      sample += Math.sin(2 * Math.PI * 587.33 * t) * env * 0.4
    }
    if (t >= 0.2) {
      const dt = t - 0.2
      const env = Math.exp(-dt * 4)
      sample += Math.sin(2 * Math.PI * 880.00 * dt) * env * 0.45
    }

    const clamped = Math.max(-1, Math.min(1, sample * 0.6))
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
    offset += 2
  }

  return arrayBufferToBase64(buffer)
}

// 3. Acorde Piano Rhodes (C4 261Hz, E4 329Hz, G4 392Hz, B4 493Hz)
function generateZenChordWav(): string {
  const sampleRate = 44100
  const duration = 1.6
  const numSamples = Math.floor(sampleRate * duration)
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)
  writeWavHeader(view, numSamples, sampleRate)

  let offset = 44
  const chord = [261.63, 329.63, 392.00, 493.88]

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    let sample = 0
    const env = Math.exp(-t * 2.8) * (1 - Math.exp(-t * 40))

    for (let idx = 0; idx < chord.length; idx++) {
      const freq = chord[idx]
      const tremolo = 1 + 0.05 * Math.sin(2 * Math.PI * 4 * t)
      sample += Math.sin(2 * Math.PI * freq * t) * env * tremolo * 0.22
    }

    const clamped = Math.max(-1, Math.min(1, sample * 0.7))
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
    offset += 2
  }

  return arrayBufferToBase64(buffer)
}

// 4. Ping Minimalista Discreto
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

// Gerenciador de Alerta com Espaçamento Ajustado (18s) e Seleção de Som
class DeliveryAlertManager {
  private intervalId: any = null
  private isMuted: boolean = false
  private isAlerting: boolean = false
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

  public startAlert() {
    if (this.isMuted) return
    if (this.isAlerting) return

    this.isAlerting = true
    // Toca imediatamente na entrada do pedido
    this.previewSound()

    // E repete a cada 18 segundos (espaçamento triplicado e confortável) enquanto houver pendentes
    if (this.intervalId) clearInterval(this.intervalId)
    this.intervalId = setInterval(() => {
      if (!this.isMuted) {
        this.previewSound()
      }
    }, 18000)
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
