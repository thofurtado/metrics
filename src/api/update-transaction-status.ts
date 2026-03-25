import { api } from '@/lib/axios'

export interface UpdateStatusTransactionParams {
  id: string
  amount: number
  interest?: number
  discount?: number
  data_vencimento: Date
  remainingDate?: Date
  accountId?: string
}

export async function updateStatusTransaction({
  id,
  amount,
  interest,
  discount,
  data_vencimento,
  remainingDate,
  accountId,
}: UpdateStatusTransactionParams) {

  // CORREÇÃO: Converter as datas para ISO string
  const payload = {
    amount,
    interest,
    discount,
    data_vencimento: data_vencimento.toISOString(),
    remainingDate: remainingDate ? remainingDate.toISOString() : undefined,
    account_id: accountId, // Map accountId to account_id for backend
  }



  try {

    const response = await api.patch(`/switch-transaction/${id}`, payload)
    console.log("✅ RESPOSTA DA API:", response.data)
    return response.data
  } catch (error: any) {
    console.error("🔴 ERRO NA REQUISIÇÃO:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    })
    throw error
  }
}