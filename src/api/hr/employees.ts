
import { api } from '@/lib/axios'

export interface Employee {
    id: string
    name: string
    role: string
    registrationType: 'REGISTERED' | 'UNREGISTERED' | 'DAILY' | 'HOURLY'
    isRegistered: boolean
    admissionDate: string
    pin: string
    salary: number | null
    dailyRate: number | null
    points: number
    transportAllowance: number
    hasCestaBasica: boolean
    photo_url?: string | null
}

export interface CreateEmployeeInput {
    name: string
    role: string
    registrationType: 'REGISTERED' | 'UNREGISTERED' | 'DAILY' | 'HOURLY'
    isRegistered: boolean
    admissionDate: string
    pin: string
    salary?: number
    dailyRate?: number
    points: number
    transportAllowance: number
    hasCestaBasica: boolean
}

export interface UpdateEmployeeInput extends CreateEmployeeInput {
    id: string
}

export interface EmployeeSummary {
    total: number
    registered: number
    unregistered: number
    daily: number
    hourly: number
}

export interface PaginatedResponse<T> {
    data: T[]
    meta: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

export async function getEmployees(params?: { page?: number; limit?: number; name?: string; isRegistered?: boolean }) {
    const response = await api.get<PaginatedResponse<Employee>>('/hr/employees', { params })
    return response.data
}

export async function getEmployeeSummary() {
    const response = await api.get<EmployeeSummary>('/hr/employees/summary')
    return response.data
}

export async function createEmployee(data: CreateEmployeeInput) {
    console.log('[createEmployee] Payload enviado:', data)
    try {
        const response = await api.post<Employee>('/hr/employees', data)
        return response?.data
    } catch (error: any) {
        console.error('[createEmployee] Erro ao cadastrar:', error?.message)
        if (error?.response) {
            console.log('[createEmployee] Payload de Erro da API Completo:')
            console.dir(error.response.data, { depth: null })
        }
        throw error
    }
}

export async function updateEmployee({ id, ...data }: UpdateEmployeeInput) {
    console.log('[updateEmployee] Payload enviado (Update):', data)
    try {
        const response = await api.put<Employee>(`/hr/employees/${id}`, data)
        return response?.data
    } catch (error: any) {
        console.error('[updateEmployee] Erro ao atualizar:', error?.message)
        if (error?.response) {
            console.log('[updateEmployee] Payload de Erro da API Completo:')
            console.dir(error.response.data, { depth: null })
        }
        throw error
    }
}
