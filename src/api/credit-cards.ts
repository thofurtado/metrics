import { api } from '@/lib/axios'

export interface CreditCard {
  id: string
  name: string
  bank: string
  credit_limit: number
  closing_day: number
  due_day: number
  last_four_digits?: string | null
  color?: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface CreateCreditCardBody {
  name: string
  bank: string
  credit_limit: number
  closing_day: number
  due_day: number
  last_four_digits?: string | null
  color?: string | null
}

export async function getCreditCards() {
  const response = await api.get<{ creditCards: CreditCard[] }>('/credit-cards')
  return response.data
}

export async function createCreditCard(data: CreateCreditCardBody) {
  const response = await api.post<CreditCard>('/credit-cards', data)
  return response.data
}

export async function updateCreditCard(id: string, data: Partial<CreateCreditCardBody> & { active?: boolean }) {
  const response = await api.put<CreditCard>(`/credit-cards/${id}`, data)
  return response.data
}

export async function deleteCreditCard(id: string) {
  await api.delete(`/credit-cards/${id}`)
}
