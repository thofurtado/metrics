import { api } from '@/lib/axios'

export interface PaymentAgendaDetail {
    descricao: string
    valor: number
    categoria: string
}

export interface PaymentAgendaItem {
    data: string
    total: number
    detalhes: PaymentAgendaDetail[]
}

export async function getPaymentAgenda() {
    const response = await api.get<PaymentAgendaItem[]>('/payment-agenda')
    return response.data
}
