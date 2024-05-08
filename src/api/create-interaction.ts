import { z } from 'zod'

import { api } from '@/lib/axios'

const interactionForm = z.object({
  id: z.string().uuid(),
  description: z.string(),
  date: z.date(),
})

type InteractionForm = z.infer<typeof interactionForm>

export async function createInteraction({
  id,
  description,
  date,
}: InteractionForm) {
  console.log(id, description, date)
  const response = await api.post(`/treatment/${id}/interaction`, {
    description,
    date,
  })
  return response
}
