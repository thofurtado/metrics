import { api } from '@/lib/axios'

export interface ExtractTransactionRequest {
  code: string
}

export interface ExtractTransactionResponse {
  success: boolean
  payload: {
    amount: number
    dueDate?: string
    description: string
    type: 'PIX' | 'BOLETO' | 'NFCE'
    rawCode: string
  }
}

export async function extractTransaction({ code }: ExtractTransactionRequest) {
  const response = await api.post<ExtractTransactionResponse>('/extract', { code })
  return response.data
}
