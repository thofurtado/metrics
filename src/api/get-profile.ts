import { api } from '@/lib/axios'

export interface GetUserProfileResponse {
  id: string
  name: string
  role: string
  email: string
  introduction: string | null
  modules: string[] // slugs: ["finance", "hr", ...]
}

export async function getProfile(): Promise<GetUserProfileResponse> {
  const response = await api.get('/me')
  return response.data.user
}
