// ARQUIVO: api/get-inventory-metrics.ts

export interface GetInventoryMetricsResponse {
    patrimonioEstoque: number
    itensCriticos: number
    receitaProdutos: number
    receitaServicos: number
    // Métricas removidas do card (Valor Parado e Giro Médio) não estão incluídas aqui.
}

/**
 * Simula a busca de todas as métricas Operacionais/Inventário.
 */
export async function getInventoryMetrics(): Promise<GetInventoryMetricsResponse> {
    // Simulação de delay de rede
    await new Promise(resolve => setTimeout(resolve, 500))

    return {
        patrimonioEstoque: 1256320.00,
        itensCriticos: 8,
        receitaProdutos: 485600.00,
        receitaServicos: 195420.00,
    }
}