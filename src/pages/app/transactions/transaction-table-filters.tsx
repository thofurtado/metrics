import { z } from 'zod'

export const transactionFiltersSchema = z.object({
  description: z.string().optional(),
  value: z.string().optional(),
  sectorId: z.string().optional(),
  accountId: z.string().optional(),
  supplierId: z.string().optional(),
})

export type TransactionFiltersSchema = z.infer<typeof transactionFiltersSchema>
