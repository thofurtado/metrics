// ARQUIVO: api/get-finance-metrics.ts

export interface GetFinanceMetricsResponse {
    saldoDisponivel: number
    receita: number
    despesa: number
    aReceber: number
    aPagar: number
}

/**
 * Simula a busca de todas as métricas financeiras do Dashboard.
 */
export async function getFinanceMetrics(): Promise<GetFinanceMetricsResponse> {
    // Simulação de delay de rede
    await new Promise(resolve => setTimeout(resolve, 500))

    return {
        saldoDisponivel: 15450.75,
        receita: 35000.00,
        despesa: 19500.00,
        aReceber: 4250.00,
        aPagar: 2800.00,
    }
}