
import { api } from '@/lib/axios'

interface RegisterStockMovementBody {
    item_id: string
    quantity: number
    operation: 'IN' | 'OUT'
    description?: string // StockReason
    created_at?: Date
    unit_cost?: number
}

export async function registerStockMovement(body: RegisterStockMovementBody) {
    await api.post('/stock/movement', body)
}
