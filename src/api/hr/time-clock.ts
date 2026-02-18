import { api } from '@/lib/axios'

export interface Employee {
    id: string
    name: string
    role: string
}

export interface TimeClock {
    id: string
    date: string
    clockIn: string | null
    breakStart: string | null
    breakEnd: string | null
    clockOut: string | null
    isExtraDay: boolean
    negotiatedValue: number | null
    isVerified: boolean
    notes: string | null
    employee_id: string
    employee: Employee
}

interface TimeClockStatusResponse {
    employee: Employee
    timeClock: TimeClock | null
    nextAction: 'clockIn' | 'breakStart' | 'breakEnd' | 'clockOut' | 'completed'
}

interface RegisterTimeClockResponse {
    employee: { name: string }
    action: string
    timestamp: string
}

export async function getTimeClockStatus(pin: string) {
    const response = await api.get<TimeClockStatusResponse>('/hr/time-clock/status', {
        params: { pin },
    })

    return response.data
}

export async function registerTimeClock(pin: string, action: string) {
    const response = await api.post<RegisterTimeClockResponse>('/hr/time-clock/register', {
        pin,
        action,
    })

    return response.data
}

// --- Admin ---

export interface TimeClockFilters {
    employee_id?: string
    startDate?: string
    endDate?: string
    page?: number
    per_page?: number
}

export interface ListTimeClocksResponse {
    timeClocks?: (TimeClock & { employee: Employee })[]
    data?: (TimeClock & { employee: Employee })[]
    summary?: {
        totalHours?: string
        totalMinutes?: number
        workedDays?: number
        extraDays?: number
    }
    meta: {
        page: number
        per_page: number
        total: number
        last_page: number
    }
}

export async function listTimeClocks(params: TimeClockFilters) {
    const response = await api.get<ListTimeClocksResponse>('/hr/time-clocks', {
        params
    })
    return response.data
}

export async function updateTimeClock(id: string, data: Partial<TimeClock> & { isExtraDay?: boolean, negotiatedValue?: number, isVerified?: boolean, notes?: string }) {
    const response = await api.put(`/hr/time-clocks/${id}`, data)
    return response.data
}

export interface UpsertTimeClockInput {
    employee_id: string
    date: string
    clockIn?: string | null
    breakStart?: string | null
    breakEnd?: string | null
    clockOut?: string | null
    isExtraDay?: boolean
    negotiatedValue?: number | null
    isVerified?: boolean
    notes?: string | null
}

export async function upsertTimeClock(data: UpsertTimeClockInput) {
    const response = await api.post('/hr/time-clocks/upsert', data)
    return response.data
}

export async function bulkUpsertTimeClock(entries: UpsertTimeClockInput[]) {
    const response = await api.post('/hr/time-clocks/bulk', { entries })
    return response.data
}
