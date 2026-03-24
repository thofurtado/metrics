import { z } from 'zod'

import { api } from '@/lib/axios'

const signInForm = z.object({
  userId: z.string().uuid(),
  password: z.string(),
})

type SignInForm = z.infer<typeof signInForm>

export async function signIn({ userId, password }: SignInForm) {
  const response = await api.post('/sessions', { userId, password })
  return response
}
