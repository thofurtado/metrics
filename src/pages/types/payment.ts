// ARQUIVO: types/payment.ts
import { z } from 'zod'

// Interface para dados de pagamento
export interface PaymentData {
    paidAmount: number
    paymentDate: Date
    description?: string
    isPartial: boolean
    remainingAmount?: number
}

// Schema de validação para o formulário de pagamento
export const paymentSchema = z.object({
    paidAmount: z.string().min(1, "Valor é obrigatório").refine(
        (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
        "Valor deve ser maior que zero"
    ),
    paymentDate: z.date({
        required_error: "Data do pagamento é obrigatória",
    }),
    description: z.string().optional(),
    isPartial: z.boolean().default(false),
})

export type PaymentFormData = z.infer<typeof paymentSchema>