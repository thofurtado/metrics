import { api } from '@/lib/axios'

export interface UpdateStatusTransactionParams {
  id: string
  amount: number
  date: Date
  remainingDate?: Date
}

export async function updateStatusTransaction({
  id,
  amount,
  date,
  remainingDate,
}: UpdateStatusTransactionParams) {

  // CORREÇÃO: Converter as datas para ISO string
  const payload = {
    amount,
    date: date.toISOString(),
    remainingDate: remainingDate ? remainingDate.toISOString() : undefined,
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