import { api } from '@/lib/axios'

/**
 * Repasse das plataformas (iFood/99Food), 15/10/2026: a conferência do caixa cria, por plataforma e data do repasse, uma
 * receita (o que foi pago no app, valor cheio) e uma despesa (as comissões). A Liquidação baixa as duas juntas; pagar uma
 * sozinha na tela de Transações quebra o par. Rotas da nuvem em /platform-settlements (trava do Financeiro; baixar e
 * desfazer só ADMIN).
 */
export interface PlatformSettlementTransaction {
  id: string
  operation: 'income' | 'expense'
  amount: number
  totalValue: number | null
  confirmed: boolean
  account_id: string | null
  description: string | null
  data_vencimento: string
  platform_id: string | null
  platform_settlement_id: string | null
  cashier_session_id: string | null
}

export interface PlatformSettlementGroup {
  chave: string
  situacao: 'PENDENTE' | 'LIQUIDADO'
  settlement_id: string | null
  plataforma: {
    id: string
    code: string
    name: string
    account_id: string | null
  } | null
  payout_date: string // aaaa-mm-dd
  receitas: PlatformSettlementTransaction[]
  comissoes: PlatformSettlementTransaction[]
  ajustes: PlatformSettlementTransaction[]
  total_receitas: number
  total_comissoes: number
  /** total_receitas − total_comissoes: o que a plataforma deve depositar */
  previsto: number
  /** liquidado: previsto + ajustes; pendente: null */
  recebido: number | null
  caixas: string[]
}

export async function getPlatformSettlements(params: {
  status?: 'pending' | 'settled' | 'all'
  month?: number
  year?: number
  platform_id?: string
}) {
  const response = await api.get<{ data: PlatformSettlementGroup[] }>(
    '/platform-settlements',
    { params },
  )
  return Array.isArray(response.data?.data) ? response.data.data : []
}

export interface SettlePlatformPayoutBody {
  platform_id: string
  payout_date: string
  received_amount?: number
  reason?: string
  account_id?: string
}

export interface SettlePlatformPayoutResponse {
  message: string
  settlement_id: string
  account_id: string
  previsto: number
  recebido: number
  diferenca: number
}

export async function settlePlatformPayout(body: SettlePlatformPayoutBody) {
  const response = await api.post<SettlePlatformPayoutResponse>(
    '/platform-settlements',
    body,
  )
  return response.data
}

export async function revertPlatformSettlement(settlementId: string) {
  const response = await api.delete<{ message: string }>(
    `/platform-settlements/${settlementId}`,
  )
  return response.data
}
