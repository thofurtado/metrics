import { api } from '@/lib/axios'

/**
 * Motoboys (15/10/2026): o que o PDV mandou para a nuvem (motoboys e entregas/diárias a pagar), só leitura. Rotas em
 * /api/cashier/couriers, com a trava do Caixa (Caixa ou Financeiro).
 */

export interface CourierTotals {
  entregas: number
  diarias: number
  nao_pagas: number
  /** pago + pendente (sem as "não paga") */
  ganho: number
  pago: number
  pago_dinheiro: number
  pago_pix: number
  pago_outros: number
  pendente: number
}

export interface CourierDay extends CourierTotals {
  dia: string // aaaa-mm-dd
}

export interface CourierInReport extends CourierTotals {
  id: string
  nome: string
  ativo: boolean
  forma_ganho: string
  valor_por_entrega: number
  diaria: number
  /** true = as entregas chegaram e o cadastro do motoboy ainda não */
  sem_cadastro: boolean
  dias: CourierDay[]
}

export interface CouriersReport {
  periodo: { startDate: string; endDate: string }
  motoboys: CourierInReport[]
  totais: CourierTotals
}

export interface CourierPayable {
  id: string
  courier_uuid: string
  courier_id: string | null
  kind: 'ENTREGA' | 'DIARIA'
  order_uuid: string | null
  occurred_at: string
  day: string
  description: string | null
  fee_charged: number
  amount_due: number
  status: 'PENDENTE' | 'PAGA' | 'NAO_PAGA'
  reason: string | null
  settlement_uuid: string | null
  paid_at: string | null
  payment_method: 'Dinheiro' | 'Pix' | null
}

export async function getCouriersReport(params: {
  startDate?: string
  endDate?: string
}) {
  const response = await api.get<CouriersReport>(
    '/api/cashier/couriers/report',
    { params },
  )
  return response.data
}

export async function getCourierPayables(
  id: string,
  params: { startDate?: string; endDate?: string },
) {
  const response = await api.get<{
    periodo: { startDate: string; endDate: string }
    linhas: CourierPayable[]
  }>(`/api/cashier/couriers/${id}/payables`, { params })
  return Array.isArray(response.data?.linhas) ? response.data.linhas : []
}
