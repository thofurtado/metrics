import { api } from '@/lib/axios'

export interface OperationalSummary {
    saldoDisponivel: number
    totalVencido: number
    projecao14Dias: number
    receitaAcumulada: number
    totalDespesasMes: number
    despesasPagasMes: number
}

interface GetOperationalSummaryParams {
    month: number
    year: number
}

export async function getOperationalSummary({ month, year }: GetOperationalSummaryParams) {
    const response = await api.get<OperationalSummary>('/dashboard/operacional', {
        params: { month, year },
    })
    return response.data
}
