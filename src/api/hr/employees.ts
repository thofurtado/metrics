
import { api } from '@/lib/axios'

export interface Employee {
    id: string
    name: string
    role: string
    registrationType: 'REGISTERED' | 'UNREGISTERED' | 'DAILY'
    isRegistered: boolean
    admissionDate: string
    pin: string
    salary: number | null
    dailyRate: number | null
    points: number
    transportAllowance: number
    hasCestaBasica: boolean
}

export interface CreateEmployeeInput {
    name: string
    role: string
    registrationType: 'REGISTERED' | 'UNREGISTERED' | 'DAILY'
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

export async function getEmployees() {
    const response = await api.get<Employee[]>('/hr/employees')
    return response.data
}

export async function createEmployee(data: CreateEmployeeInput) {
    const response = await api.post<Employee>('/hr/employees', data)
    return response.data
}

export async function updateEmployee({ id, ...data }: UpdateEmployeeInput) {
    const response = await api.put<Employee>(`/hr/employees/${id}`, data)
    return response.data
}
