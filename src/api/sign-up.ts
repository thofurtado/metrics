import { z } from 'zod'

import { api } from '@/lib/axios'

const signUpForm = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
})

type SignUpForm = z.infer<typeof signUpForm>

export async function signUp({ name, email, password }: SignUpForm) {
  const response = await api.post('/users', { name, email, password })
  return response
}
