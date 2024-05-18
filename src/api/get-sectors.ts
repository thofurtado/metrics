import { api } from '@/lib/axios'

export interface GetSectorsResponse {
  sectors: {
    id: string
    name: string
    budget: number | null
  }[]
}

export async function getSectors() {
  const response = await api.get<GetSectorsResponse>('/sectors')

  return response
}
