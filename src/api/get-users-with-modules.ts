import { api } from '@/lib/axios'

export interface UserWithModules {
  id: string
  name: string
  email: string
  modules: string[]
}

export async function getUsersWithModules() {
  const response = await api.get<{ users: UserWithModules[] }>('/users-with-modules')
  return response.data.users
}
