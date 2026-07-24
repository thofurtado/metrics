import { api } from '@/lib/axios'

export interface POSMachineRate {
  id?: string
  pos_machine_id?: string
  payment_category: string // DEBITO, CREDITO, VOUCHER, PIX
  installments: number
  tax_percentage: number
}

export interface POSMachine {
  id: string
  name: string
  account_id?: string | null
  active: boolean
  created_at: string
  rates?: POSMachineRate[]
}

export interface CreatePOSMachineParams {
  name: string
  account_id?: string | null
  rates?: POSMachineRate[]
}

export interface UpdatePOSMachineParams {
  id: string
  name?: string
  account_id?: string | null
  active?: boolean
  rates?: POSMachineRate[]
}

export async function getPOSMachines() {
  const response = await api.get<POSMachine[]>('/api/pos-machines')
  return response.data
}

export async function createPOSMachine(data: CreatePOSMachineParams) {
  const response = await api.post<POSMachine>('/api/pos-machines', data)
  return response.data
}

export async function updatePOSMachine({ id, ...data }: UpdatePOSMachineParams) {
  const response = await api.put<POSMachine>(`/api/pos-machines/${id}`, data)
  return response.data
}

export async function deletePOSMachine(id: string) {
  await api.delete(`/api/pos-machines/${id}`)
}
