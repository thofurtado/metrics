import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { API_BASE_URL } from './axios'

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
