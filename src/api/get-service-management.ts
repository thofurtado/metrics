// ARQUIVO: src/api/get-service-metrics.ts
import { api } from '@/lib/axios'

export interface GetServiceMetricsResponse {
  totalMes: number
  concluidos: number
  tmaSegundos: number
  naBancada: number
  externos: number
  ativosTotais: number
}

export async function getServiceMetrics(): Promise<GetServiceMetricsResponse> {
  const response = await api.get('/service-management')
  
  const apiData = response.data.serviceData
  
  // Mapeamento direto apenas dos campos que a API fornece
  return {
    totalMes: apiData.totalTreatments || 0,
    concluidos: apiData.completedTreatments || 0,
    tmaSegundos: apiData.averageTreatmentTime || 0,
    naBancada: apiData.inWorkbench || 0,
    externos: apiData.externalOpen || 0,
    ativosTotais: (apiData.inWorkbench || 0) + (apiData.externalOpen || 0),
  }
}