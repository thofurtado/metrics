// ARQUIVO: api/get-service-metrics.ts

export interface GetServiceMetricsResponse {
    totalMes: number
    concluidos: number
    diffConcluidosPercent: number // Ex: 5%
    tmaSegundos: number // Tempo Médio de Atendimento em segundos (Ex: 1800s = 30m)
    diffTmaPercent: number // Ex: -10% (Melhoria)
    naBancada: number
    externos: number
    emEspera: number // Sub-métrica de Na Bancada
    ativosTotais: number // Sub-métrica de Externos
}

/**
 * Simula a busca de todas as métricas de Gestão de Serviços/Atendimento.
 */
export async function getServiceMetrics(): Promise<GetServiceMetricsResponse> {
    // Simulação de delay de rede
    await new Promise(resolve => setTimeout(resolve, 500))

    return {
        totalMes: 182,
        concluidos: 115,
        diffConcluidosPercent: 5,
        tmaSegundos: 1800, // 30m 00s
        diffTmaPercent: -10,
        naBancada: 45,
        externos: 22,
        emEspera: 15,
        // Cálculo: Na Bancada (45) + Externos (22) = 67
        ativosTotais: 67, 
    }
}