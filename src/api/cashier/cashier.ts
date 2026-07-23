import { api } from '@/lib/axios'

export interface CashierSession {
  id: string
  operator_id: string
  status: 'OPEN' | 'CLOSED' | 'AUDITED'
  opened_at: string
  closed_at?: string
  initial_balance: number
  calculated_total: number
  reported_total?: number
  difference?: number
  notes?: string
}

export interface CashierEntry {
  id: string
  session_id: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  payment_method_id?: number
  category_id?: number
  description?: string
  condition_id?: number
  created_at: string
}

export interface PaymentMethod {
  id: number
  name: string
  tax_rate: number
  active: boolean
}

export interface POSMachine {
  id: number
  name: string
  active: boolean
}

export interface PaymentCondition {
  id: number
  name: string
  active: boolean
}

export async function getActiveSession() {
  const response = await api.get<CashierSession>('/api/cashier/session/active')
  return response.data
}

export async function openSession(data: { initial_balance: number; period?: string; machine_ids?: number[] }) {
  const response = await api.post<CashierSession>('/api/cashier/session/open', data)
  return response.data
}

export async function closeSession(data: { reported_amounts: { payment_method_id: number; reported_amount: number }[]; notes?: string }) {
  const response = await api.post<CashierSession>('/api/cashier/session/close', data)
  return response.data
}

export async function createEntry(data: { type: 'INCOME' | 'EXPENSE'; amount: number; payment_method_id?: number; category_id?: number; description?: string; condition_id?: number }) {
  const response = await api.post<CashierEntry>('/api/cashier/entry', data)
  return response.data
}

export async function getSessions() {
  const response = await api.get<CashierSession[]>('/api/cashier/sessions')
  return response.data
}

export async function getSessionDetails(id: string) {
  const response = await api.get<{ session: CashierSession; entries: CashierEntry[]; summary: any }>('/api/cashier/session/' + id)
  return response.data
}

export async function auditSession(id: string) {
  const response = await api.post('/api/cashier/session/audit', { session_id: id })
  return response.data
}

// Config APIs
export async function getPaymentMethods() {
  const response = await api.get<PaymentMethod[]>('/api/payment-methods')
  return response.data
}
export async function createPaymentMethod(data: any) {
  const response = await api.post('/api/payment-methods', data)
  return response.data
}
export async function updatePaymentMethod(id: number, data: any) {
  const response = await api.put(`/api/payment-methods/${id}`, data)
  return response.data
}
export async function deletePaymentMethod(id: number) {
  const response = await api.delete(`/api/payment-methods/${id}`)
  return response.data
}

export async function getPOSMachines() {
  const response = await api.get<POSMachine[]>('/api/machines')
  return response.data
}
export async function createPOSMachine(data: any) {
  const response = await api.post('/api/machines', data)
  return response.data
}
export async function updatePOSMachine(id: number, data: any) {
  const response = await api.put(`/api/machines/${id}`, data)
  return response.data
}
export async function deletePOSMachine(id: number) {
  const response = await api.delete(`/api/machines/${id}`)
  return response.data
}

export async function getPaymentConditions() {
  const response = await api.get<PaymentCondition[]>('/api/conditions')
  return response.data
}
export async function createPaymentCondition(data: any) {
  const response = await api.post('/api/conditions', data)
  return response.data
}
export async function updatePaymentCondition(id: number, data: any) {
  const response = await api.put(`/api/conditions/${id}`, data)
  return response.data
}
export async function deletePaymentCondition(id: number) {
  const response = await api.delete(`/api/conditions/${id}`)
  return response.data
}
