import { api } from '@/lib/axios'

export interface CashierUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'CASHIER' | string
}

export async function getCashierUsers() {
  const response = await api.get<{ users: CashierUser[] }>('/api/cashier/users')
  return response.data.users
}
