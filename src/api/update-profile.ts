import { api } from '@/lib/axios'

interface UpdateProfileBody {
  name: string
  introduction: string | null
}

export async function updateProfile({ name, introduction }: UpdateProfileBody) {
  const updatedProfile = await api.put('/profile', { name, introduction })
  return updatedProfile
}
