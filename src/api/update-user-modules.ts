import { api } from '@/lib/axios'

interface UpdateUserModulesParams {
  userId: string
  modules: string[]
}

export async function updateUserModules({ userId, modules }: UpdateUserModulesParams) {
  try {
    const response = await api.put(`/users/${userId}/modules`, { modules })
    return response?.data
  } catch (error: any) {
    console.error("Erro na API ao atualizar módulos:", error)
    throw error?.response?.data || error
  }
}
