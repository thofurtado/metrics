import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { API_BASE_URL } from './axios'

/**
 * Número de WhatsApp pronto para wa.me / api.whatsapp.com: só dígitos, com o código do país (55) uma única vez.
 * Aceita o número cadastrado com ou sem "55" e com máscara (ex.: "(12) 99629-3344" ou "5512996293344").
 */
export function toWhatsAppNumber(raw?: string | null): string {
  let digits = String(raw || '').replace(/D/g, '').replace(/^0+/, '')
  if (!digits) return ''
  if (!(digits.length >= 12 && digits.startsWith('55'))) digits = '55' + digits
  return digits
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/**
 * Resolve caminhos relativos de imagens (/uploads/...) para a URL completa da API,
 * garantindo que imagens carreguem perfeitamente no cardápio online e no painel administrativo.
 */
export function resolveImageUrl(url?: string | null): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }
  const base = (API_BASE_URL || 'https://api.metrics.dev.br').replace(/\/$/, '')
  const cleanPath = url.startsWith('/') ? url : `/${url}`
  return `${base}${cleanPath}`
}
