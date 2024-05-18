import { z } from 'zod'

import { api } from '@/lib/axios'

const transactionForm = z.object({
  operation: z.string(),
  date: z.date().nullish(),
  description: z.string().nullish(),
  account: z.string().nullish(),
  sector: z.string().nullish(),
  amount: z.number().nullish(),
  confirmed: z.boolean().nullish(),
})

type TransactionForm = z.infer<typeof transactionForm>

export async function createTransaction({
  date,
  description,
  account,
  sector,
  amount,
  confirmed,
  operation,
}: TransactionForm) {
  console.log(date, description, account, sector, amount, confirmed, operation)
  const response = await api.post(`/transaction`, {
    operation,
    amount,
    account_id: account,
    date,
    description: description || null,
    sector_id: sector || null,
    confirmed,
  })
  return response
}
