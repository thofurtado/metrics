/**
 * Hook e utilitário de cálculo de vencimento de fatura de cartão de crédito.
 *
 * Regras de negócio:
 * - Se a compra foi feita antes do dia de fechamento (closing_day), a fatura fecha no mês atual.
 * - Caso contrário, a fatura fecha no próximo mês.
 * - Se o vencimento (due_day) for menor ou igual ao fechamento (closing_day), o vencimento ocorre no mês seguinte ao fechamento.
 * - Caso contrário, o vencimento ocorre no mesmo mês do fechamento.
 * - Se o vencimento cair em sábado, domingo ou feriado → avança para o próximo dia útil.
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

  // 1. Determina o ano e mês em que a fatura fecha
  let closingMonth = purchaseMonth
  let closingYear = purchaseYear

  if (purchaseDay >= card.closing_day) {
    closingMonth += 1
    if (closingMonth > 11) {
      closingMonth = 0
      closingYear += 1
    }
  }

  // 2. Determina o ano e mês em que a fatura vence
  let billingMonth = closingMonth
  let billingYear = closingYear

  if (card.due_day <= card.closing_day) {
    billingMonth += 1
    if (billingMonth > 11) {
      billingMonth = 0
      billingYear += 1
    }
  }

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
