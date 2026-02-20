import { api } from '@/lib/axios'

export type PayrollType = 'SALARIO_60' | 'SALARIO_40' | 'PONTUACAO_10' | 'DIA_EXTRA' | 'BENEFICIO' | 'VALE' | 'ERRO' | 'CONSUMACAO' | 'OTHER' | 'CESTA_BASICA' | 'VALE_TRANSPORTE'

export interface PayrollEntry {
    id: string
    employee_id: string
    description: string
    amount: number
    type: PayrollType
    referenceDate: string
    status: 'PENDING' | 'PAID' | 'CANCELED'
    created_at?: string
    transaction?: {
        created_at: string
        confirmed: boolean
    }
    employee?: {
        name: string
        role: string
    }
}

export interface PayrollPreviewResponse {
    entries: PayrollEntry[]
    summary: {
        totalAmount: number
        byType: Record<string, number>
    }
}

export interface CalculateRateioInput {
    totalRevenue: number
    lostPercentage: number
    month: number
    year: number
    paymentDate: string
}

export interface CreatePayrollEntryInput {
    employee_id: string
    description: string
    amount: number
    type: PayrollType
    referenceDate: string
}

export async function calculateRateio(data: CalculateRateioInput) {
    const response = await api.post('/hr/payroll/rateio', data)
    return response.data
}

export async function generatePayrollBatch(type: PayrollType, referenceDate: string) {
    const response = await api.post('/hr/payroll/batch', { type, referenceDate })
    return response.data
}

export async function deletePayrollBatch(type: string, referenceDate: string) {
    const response = await api.delete('/hr/payroll/batch', { params: { type, referenceDate } })
    return response.data
}

export async function getPayrollPreview() {
    const response = await api.get<PayrollPreviewResponse>('/hr/payroll/preview')
    return response.data
}

export async function confirmPayroll(account_id: string) {
    const response = await api.post('/hr/payroll/confirm', { account_id })
    return response.data
}

export async function createPayrollEntry(data: CreatePayrollEntryInput) {
    const response = await api.post('/hr/payroll/entries', data)
    return response.data
}

export async function getEmployeePayrollEntries(employeeId: string) {
    const response = await api.get<PayrollEntry[]>(`/hr/employees/${employeeId}/payroll`)
    return response.data
}

export async function updatePayrollEntry(id: string, data: { amount?: number, description?: string }) {
    const response = await api.put(`/hr/payroll/entries/${id}`, data)
    return response.data
}

export async function listPendingDebts(employeeId: string) {
    const response = await api.get<PayrollEntry[]>(`/hr/employees/${employeeId}/pending-debts`)
    return response.data
}

export async function getExtrasPreview(month: number, year: number) {
    const response = await api.get('/hr/payroll/extras-preview', { params: { month, year } })
    return response.data
}

export async function getPayrollHistory(params?: { month?: number, year?: number, type?: string }) {
    const response = await api.get('/hr/payroll/history', { params })
    return response.data
}
