import { api } from '@/lib/axios'

interface SettleTermDebtBody {
  transactionId: string
  targetAccountId?: string | null
  actualPaymentMethod?: string | null
  isWriteOff?: boolean
}

export async function settleTermDebt({
  transactionId,
  targetAccountId,
  actualPaymentMethod,
  isWriteOff,
}: SettleTermDebtBody) {
  const response = await api.post('/settle-term-debt', {
    transactionId,
    targetAccountId,
    actualPaymentMethod,
    isWriteOff,
  })

  return response.data
}
