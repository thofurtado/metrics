import { api } from '@/lib/axios'

// Fase 1 do Mergulho (16:A1): a nuvem já desfazia o fechamento da O.S. (PATCH /treatment/:id/reopen), mas a web não
// tinha botão para chamar.
export async function reopenTreatment(treatmentId: string) {
  const response = await api.patch(`/treatment/${treatmentId}/reopen`)
  return response.data
}
