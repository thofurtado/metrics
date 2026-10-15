import { api } from '@/lib/axios'

export interface RecalculateAccountBalanceBody {
  id: string
}

export async function recalculateAccountBalance({
  id,
}: RecalculateAccountBalanceBody) {
  const response = await api.patch(`/account/${id}/recalculate`)
  return response.data
}

export interface PreviaDoRecalculo {
  saldo_atual: number
  saldo_novo: number
  /** Mergulho 13:D1: motivo de a conta não poder ser recalculada (acerto manual ou zeragem); nuvem antiga não manda. */
  bloqueado?: string | null
}

// Mostra o que o recálculo gravaria, sem gravar (Fase 1 do Mergulho, 13:D1).
export async function previewRecalculateAccountBalance({
  id,
}: RecalculateAccountBalanceBody) {
  const response = await api.get<PreviaDoRecalculo>(
    `/account/${id}/recalculate-preview`,
  )
  return response.data
}
