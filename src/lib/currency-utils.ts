/**
 * Utilitários para manipulação e formatação de moeda brasileira (BRL)
 * Digitação contínua estilo PDV / Caixa / ATM:
 * Preenchimento automático dos centavos da direita para a esquerda.
 */

export function cleanCurrencyDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'number') {
    if (isNaN(value)) return ''
    return Math.round(value * 100).toString()
  }
  return value.toString().replace(/\D/g, '')
}

export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const digits = cleanCurrencyDigits(value)
  if (!digits) return ''
  const amount = Number(digits) / 100
  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function parseCurrencyToFloat(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return isNaN(value) ? 0 : value
  const str = value.toString().trim()
  if (!str) return 0

  if (str.includes(',')) {
    // Formato pt-BR: '1.250,50' ou '50,00'
    const clean = str.replace(/\./g, '').replace(',', '.')
    const num = parseFloat(clean)
    return isNaN(num) ? 0 : num
  }

  // Sem vírgula: pode ser float padrão '50.00' ou inteiro '50'
  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
}

export function formatCurrencyFromNumber(value: number): string {
  if (isNaN(value) || value === null || value === undefined) return '0,00'
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
