import { api } from '@/lib/axios'

export interface GetTreatmentsQuery {
  page?: number | null
  treatmentId?: string | null
  clientName?: string | null
  status?: string | null
}

export interface GetTreatmentsResponse {
  treatments: {
    id: string
    opening_date: Date
    ending_date: Date | null
    contact: string | null
    user_id: string | null
    client_id: string | null
    equipment_id: string | null
    request: string
    status:
    | 'pending'
    | 'in_progress'
    | 'on_hold'
    | 'resolved'
    | 'canceled'
    | 'follow_up'
    | 'in_workbench'
    amount: number
    observations: string | null
    clients: {
      name: string
    } | null
    items: {
      id: string
      name: string
    }[]
    interactions: {
      id: string
      currrent_status_date: Date
      previous_status_date: Date
    }[]
  }[]
  totalCount: number
  perPage: number
  pageIndex: number
}

export async function getTreatments({
  page,
  treatmentId,
  clientName,
  status,
}: GetTreatmentsQuery) {
  const response = await api.get<GetTreatmentsResponse>('/treatments', {
    params: {
      page,
      treatmentId,
      clientName,
      status,
    },
  })

  // Default values to prevent frontend crashes
  if (!response.data) {
    return {
      ...response,
      data: {
        treatments: [],
        totalCount: 0,
        perPage: 10,
        pageIndex: page || 0,
      }
    }
  }

  return response
}
