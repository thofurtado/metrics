import { api } from '@/lib/axios'

interface UpdateUserModulesParams {
  userId: string
  modules: string[]
}

export async function updateUserModules({ userId, modules }: UpdateUserModulesParams) {
  const response = await api.put(`/users/${userId}/modules`, { modules })
  return response.data
}
