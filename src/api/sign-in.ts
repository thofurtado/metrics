import { z } from 'zod'

import { api } from '@/lib/axios'

const signInForm = z.object({
  email: z.string().email(),
  password: z.string(),
})

type SignInForm = z.infer<typeof signInForm>

export async function signIn({ email, password }: SignInForm) {
  const response = await api.post('/sessions', { email, password })
  return response
}
