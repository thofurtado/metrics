import { z } from 'zod'

import { api } from '@/lib/axios'

const transactionForm = z.object({
  operation: z.string(),
  date: z.date().nullish(),
  description: z.string().nullish(),
  account: z.string().nullish(),
  destination_account: z.string().nullish(),
  sector: z.string().nullish(),
  amount: z.number().nullish(),
  confirmed: z.boolean().nullish(),
  supplier: z.string().nullish(),
  installments_count: z.number().nullish(),
  interval_frequency: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).nullish(),
  custom_installments: z.array(z.object({
    date: z.date(),
    amount: z.number()
  })).nullish(),
})

type TransactionForm = z.infer<typeof transactionForm>

export async function createTransaction({
  date,
  description,
  account,
  destination_account,
  sector,
  amount,
  confirmed,
  operation,
  supplier,
  installments_count,
  interval_frequency,
  custom_installments,
}: TransactionForm) {
  const response = await api.post(`/transaction`, {
    operation,
    amount,
    account_id: account,
    destination_account_id: destination_account,
    date,
    description: description || null,
    sector_id: sector || null,
    confirmed,
    supplier_id: supplier || null,
    installments_count,
    interval_frequency,
    custom_installments,
  })
  return response
}
