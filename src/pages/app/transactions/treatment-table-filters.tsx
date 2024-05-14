import { SearchCodeIcon } from 'lucide-react'
import { z } from 'zod'

export const treatmentFiltersSchema = z.object({
  treatmentId: z.string().optional(),
  clientName: z.string().optional(),
  status: z.string().optional(),
})

export type TreatmentFiltersSchema = z.infer<typeof treatmentFiltersSchema>
