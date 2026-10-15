import { api } from '@/lib/axios'

export interface GetServiceMetricsResponse {
  totalMes: number
  concluidos: number
  // Fase 4 do Mergulho (16:A6): a nuvem manda o tempo médio em MINUTOS (averageTreatmentTime =
  // média de (fim - abertura) / 60000); antes a web lia como segundos e 45 min viravam "0m 45s".
  tmaMinutos: number
  naBancada: number
  externos: number
  ativosTotais: number
}

export interface ServiceMetricsFilters {
  month?: number
  year?: number
}

export async function getServiceMetrics({
  month,
  year,
}: ServiceMetricsFilters = {}): Promise<GetServiceMetricsResponse> {
  const response = await api.get('/service-management', {
    params: { month, year },
  })

  const apiData = response.data.serviceData

  // Mapeamento direto apenas dos campos que a API fornece
  return {
    totalMes: apiData.totalTreatments || 0,
    concluidos: apiData.completedTreatments || 0,
    tmaMinutos: apiData.averageTreatmentTime || 0,
    naBancada: apiData.inWorkbench || 0,
    externos: apiData.externalOpen || 0,
    ativosTotais: (apiData.inWorkbench || 0) + (apiData.externalOpen || 0),
  }
}
