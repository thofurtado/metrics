import { api } from '@/lib/axios'

export async function getGeneralBalance() {
  const response = await api.get<number>('/metrics/general-balance')
  return response.data
}
