import { api } from '@/lib/axios'

export interface UserDTO {
  id: string
  name: string
}

export async function getPublicUsers() {
  const response = await api.get<{ users: UserDTO[] }>('/users/public')
  return response.data.users
}
