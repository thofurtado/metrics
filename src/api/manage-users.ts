import { api } from '@/lib/axios'

export interface CreateUserBody {
  name: string
  email: string
  password?: string
  role?: 'ADMIN' | 'MEMBER'
  modules?: string[]
}

export async function createUser(data: CreateUserBody) {
  const response = await api.post('/admin/users', data)
  return response.data
}

export interface UpdateUserBody {
  id: string
  name?: string
  email?: string
  password?: string
  role?: 'ADMIN' | 'MEMBER'
  modules?: string[]
}

export async function updateUser(data: UpdateUserBody) {
  const { id, ...body } = data
  const response = await api.put(`/admin/users/${id}`, body)
  return response.data
}

export async function deleteUser(id: string) {
  const response = await api.delete(`/admin/users/${id}`)
  return response.data
}
