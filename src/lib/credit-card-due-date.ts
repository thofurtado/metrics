/**
 * Hook e utilitário de cálculo de vencimento de fatura de cartão de crédito.
 *
 * Regras de negócio:
 * - Compra no dia < closing_day → fatura do próximo mês
 * - Compra no dia >= closing_day → fatura de dois meses à frente
 * - Se o vencimento cair em sábado, domingo ou feriado → avança para o próximo dia útil
 */

import type { CreditCard } from '@/api/credit-cards'

export interface DueDateResult {
  due_date: Date
  /** Mês da fatura no formato "MM/AAAA", para exibição ao usuário */
  billing_month_label: string
}

/** Formata Date para "YYYY-MM-DD" sem drift de timezone */
function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isBusinessDay(date: Date, holidayStrings: string[]): boolean {
  const dow = date.getDay()
  if (dow === 0 || dow === 6) return false
  return !holidayStrings.includes(toDateStr(date))
}

function nextBusinessDay(date: Date, holidayStrings: string[]): Date {
  const result = new Date(date)
  while (!isBusinessDay(result, holidayStrings)) {
    result.setDate(result.getDate() + 1)
  }
  return result
}

/**
 * Calcula a data de vencimento da fatura com base na data da compra.
 *
 * @param purchaseDate  Data da emissão/compra
 * @param card          Dados do cartão (closing_day, due_day)
 * @param holidays      Array de strings "YYYY-MM-DD" de feriados
 */
export function calculateCreditCardDueDate(
  purchaseDate: Date,
  card: Pick<CreditCard, 'closing_day' | 'due_day'>,
  holidays: string[] = []
): DueDateResult {
  const purchaseDay = purchaseDate.getDate()
  const purchaseMonth = purchaseDate.getMonth() // 0-indexed
  const purchaseYear = purchaseDate.getFullYear()

  // Determina o mês da fatura
  const monthOffset = purchaseDay < card.closing_day ? 1 : 2

  const rawBillingMonth = purchaseMonth + monthOffset
  const billingYear = purchaseYear + Math.floor(rawBillingMonth / 12)
  const billingMonth = rawBillingMonth % 12 // 0-indexed

  // Garante que o due_day não exceda os dias disponíveis no mês de vencimento
  const daysInMonth = new Date(billingYear, billingMonth + 1, 0).getDate()
  const effectiveDueDay = Math.min(card.due_day, daysInMonth)

  const baseDueDate = new Date(billingYear, billingMonth, effectiveDueDay, 12, 0, 0, 0)
  const finalDueDate = nextBusinessDay(baseDueDate, holidays)

  const billingMonthLabel = `${String(billingMonth + 1).padStart(2, '0')}/${billingYear}`

  return {
    due_date: finalDueDate,
    billing_month_label: billingMonthLabel,
  }
}
