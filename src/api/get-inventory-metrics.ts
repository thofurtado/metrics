// ARQUIVO: src/api/get-inventory-metrics.ts
import { api } from '@/lib/axios'

export interface GetInventoryMetricsResponse {
    patrimonioEstoque: number
    receitaProdutos: number
    receitaServicos: number
    orcamentoProdutos: number
    orcamentoServicos: number
    itensCriticos: number
}

export interface InventoryMetricsFilters {
    month?: number
    year?: number
}

export async function getInventoryMetrics({ month, year }: InventoryMetricsFilters = {}): Promise<GetInventoryMetricsResponse> {
    const response = await api.get('/inventory-summary', {
        params: { month, year }
    })
    console.log('📦 Dados recebidos da API de Inventário:', response.data)

    const apiData = response.data?.inventorySummary || {}

    return {
        patrimonioEstoque: apiData.patrimony || 0,
        receitaProdutos: apiData.productsSold || 0,
        receitaServicos: apiData.servicesSold || 0,
        orcamentoProdutos: apiData.productsBudget || 0,
        orcamentoServicos: apiData.servicesBudget || 0,
        itensCriticos: 0
    }
}