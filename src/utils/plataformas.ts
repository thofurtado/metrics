/**
 * Plataformas de entrega (iFood, 99Food), 15/10/2026. Mesmas regras da nuvem
 * (metrics-node/src/modules/cashier/services/plataformas.ts), para a tela mostrar igual ao que a conferência do caixa faz.
 */

const DIA_MS = 24 * 60 * 60 * 1000

/** Código de plataforma: só letras e números, em maiúsculas ("iFood" → IFOOD, "99 Food" → 99FOOD). */
export function codigoDePlataforma(texto: string | null | undefined): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

/**
 * Data do repasse: o dia operacional da venda → a semana de segunda a domingo que o contém → a quarta-feira logo depois
 * desse domingo + (semanas − 1) × 7 dias. Ex.: vendas de 12 a 18/10/2026 → 1 semana = 21/10; 4 semanas = 11/11.
 */
export function dataDoRepasse(dia: string, semanasDepois: number): string {
  const [a, m, d] = dia.split('-').map(Number)
  const instante = Date.UTC(a, m - 1, d)
  const diaDaSemana = new Date(instante).getUTCDay() // 0 = domingo, 1 = segunda ...
  const domingo = instante + ((7 - diaDaSemana) % 7) * DIA_MS
  const semanas = Math.max(1, Math.floor(Number(semanasDepois) || 1))
  return new Date(domingo + 3 * DIA_MS + (semanas - 1) * 7 * DIA_MS)
    .toISOString()
    .slice(0, 10)
}

/** Segunda e domingo da semana (segunda a domingo) que contém o dia. */
export function semanaDoDia(dia: string): { segunda: string; domingo: string } {
  const [a, m, d] = dia.split('-').map(Number)
  const instante = Date.UTC(a, m - 1, d)
  const diaDaSemana = new Date(instante).getUTCDay()
  const domingo = instante + ((7 - diaDaSemana) % 7) * DIA_MS
  const segunda = domingo - 6 * DIA_MS
  return {
    segunda: new Date(segunda).toISOString().slice(0, 10),
    domingo: new Date(domingo).toISOString().slice(0, 10),
  }
}

/** aaaa-mm-dd → dd/mm/aaaa (sem passar por Date, para não mudar o dia pelo fuso). */
export function diaBR(dia: string | null | undefined): string {
  if (!dia) return ''
  const [a, m, d] = dia.slice(0, 10).split('-')
  return a && m && d ? `${d}/${m}/${a}` : dia
}

/** aaaa-mm-dd → dd/mm */
export function diaCurto(dia: string | null | undefined): string {
  if (!dia) return ''
  const [, m, d] = dia.slice(0, 10).split('-')
  return m && d ? `${d}/${m}` : dia
}

const NOMES_DA_SEMANA = [
  'domingo',
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
]

/** Nome do dia da semana de um aaaa-mm-dd. */
export function diaDaSemana(dia: string): string {
  const [a, m, d] = dia.split('-').map(Number)
  return NOMES_DA_SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]
}

/** Lê um percentual digitado com vírgula ou ponto ("3,2" → 3.2). Vazio ou inválido = 0. */
export function lerNumero(texto: string | number | null | undefined): number {
  if (typeof texto === 'number') return Number.isFinite(texto) ? texto : 0
  const limpo = (texto ?? '').toString().trim().replace(/\s|%/g, '')
  if (!limpo) return 0
  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo
  const n = parseFloat(normalizado)
  return Number.isFinite(n) ? n : 0
}

/** Número para mostrar num campo de percentual (3.2 → "3,2"). */
export function numeroParaCampo(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return ''
  return String(valor).replace('.', ',')
}

export function moeda(valor: number | null | undefined): string {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function percentual(valor: number | null | undefined): string {
  return `${Number(valor || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
}

/**
 * O lançamento é do par repasse + comissão de uma plataforma (ou o ajuste da liquidação)? Esses só se baixam e se desfazem
 * juntos, em Liquidações > Plataformas: pagar um sozinho na tela de Transações quebra o par (aviso da nuvem, 15/10/2026).
 */
export function ehLancamentoDePlataforma(tx: {
  platform_id?: string | null
  platform_settlement_id?: string | null
  payment_method?: string | null
} | null | undefined): boolean {
  if (!tx) return false
  return (
    Boolean(tx.platform_id) ||
    Boolean(tx.platform_settlement_id) ||
    (tx.payment_method || '').toUpperCase() === 'PLATAFORMA'
  )
}

/** Onde se liquida o repasse das plataformas. */
export const CAMINHO_LIQUIDAR_PLATAFORMAS = '/transactions/settlements?aba=plataformas'

/** Valores iniciais decididos pelo Thomás (15/10/2026), para a loja não digitar do zero. */
export const MODELOS_DE_PLATAFORMA = [
  {
    code: 'IFOOD',
    name: 'iFood',
    commission_own_delivery_pct: 12,
    commission_platform_delivery_pct: 23,
    online_payment_fee_pct: 3.2,
    payout_weeks_after: 4,
  },
  {
    code: '99FOOD',
    name: '99Food',
    commission_own_delivery_pct: 10.9,
    commission_platform_delivery_pct: 8.9,
    online_payment_fee_pct: 3.2,
    payout_weeks_after: 1,
  },
] as const
