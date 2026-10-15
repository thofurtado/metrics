import { api } from '@/lib/axios'

export interface CashierUser {
  id: string
  name: string
  // Mergulho 14:X8: a rota aberta da tela de entrada não entrega mais o e-mail
  email?: string
  role: 'ADMIN' | 'CASHIER' | string
}

export async function getCashierUsers() {
  const response = await api.get<{ users: CashierUser[] }>('/api/cashier/users')
  return response.data.users
}
