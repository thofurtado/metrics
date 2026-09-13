import { api } from '@/lib/axios'

export interface SettleTermDebtBody {
  transactionId?: string | null
  transactionIds?: string[] | null
  targetAccountId?: string | null
  actualPaymentMethod?: string | null
  isWriteOff?: boolean
  amountPaid?: number | null
  isPayrollDeducted?: boolean
}

export async function settleTermDebt({
  transactionId,
  transactionIds,
  targetAccountId,
  actualPaymentMethod,
  isWriteOff,
  amountPaid,
  isPayrollDeducted,
}: SettleTermDebtBody) {
  const response = await api.post('/settle-term-debt', {
    transactionId,
    transactionIds,
    targetAccountId,
    actualPaymentMethod,
    isWriteOff,
    amountPaid,
    isPayrollDeducted,
  })

  return response.data
}
