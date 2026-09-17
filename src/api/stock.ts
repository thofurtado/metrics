import { api } from '@/lib/axios'

export interface StockOverviewItem {
  id: string
  name: string
  type: 'SUPPLY' | 'PRODUCT'
  category: string
  unit: string
  currentStock: number
  minStock: number
  cost: number
  price?: number
  situation: 'NORMAL' | 'WARNING' | 'CRITICAL'
  batchNumber?: string | null
  lastMovement?: string
}

export interface StockOverviewResponse {
  items: StockOverviewItem[]
  summary: {
    totalCount: number
    lowStockCount: number
    normalCount: number
  }
}

export async function getStockOverview(params?: {
  query?: string
  category?: string
  onlyLowStock?: boolean
  page?: number
  perPage?: number
}): Promise<StockOverviewResponse> {
  const response = await api.get<StockOverviewResponse>('/api/stock/overview', {
    params,
  })
  return response.data
}

export interface AdjustStockPayload {
  targetId: string
  targetType: 'SUPPLY' | 'PRODUCT'
  newStock: number
  reason:
    | 'AJUSTE_POSITIVO'
    | 'AJUSTE_NEGATIVO'
    | 'QUEBRA'
    | 'PERDA'
    | 'CONSUMO_INTERNO'
    | 'COMPRA'
    | 'DEVOLUCAO'
  notes?: string
}

export async function adjustStockBalance(payload: AdjustStockPayload) {
  const response = await api.post('/api/stock/adjust', payload)
  return response.data
}

export interface CreateSupplyPayload {
  name: string
  category?: string
  unit?: string
  cost?: number
  initialStock?: number
  description?: string
}

export async function createStockSupply(payload: CreateSupplyPayload) {
  const response = await api.post('/api/stock/supplies', payload)
  return response.data
}

// ─── INVENTÁRIO ───

export interface InventoryItemDTO {
  id: string
  name: string
  category: string
  unit: string
  systemQuantity: number
  countedQuantity: number
  difference: number
  unitCost: number
  totalDiffCost: number
  reason?: string
}

export interface ActiveInventoryResponse {
  sessionId: string
  status: string
  sector?: string
  openedAt?: string
  items: InventoryItemDTO[]
}

export async function getActiveInventorySession(): Promise<ActiveInventoryResponse> {
  const response = await api.get<ActiveInventoryResponse>('/api/stock/inventory/active')
  return response.data
}

export async function applyInventorySession(
  sessionId: string,
  counts: { itemId: string; countedQuantity: number }[],
) {
  const response = await api.post('/api/stock/inventory/apply', {
    sessionId,
    counts,
  })
  return response.data
}

// ─── FICHA TÉCNICA / RASTREABILIDADE ───

export interface DishUsageDTO {
  productId: string
  productName: string
  categoryName: string
  dose: number
  doseFormatted: string
  salesCount: number
  percentageUsage: number
  deductedQuantity: number
  costOfDeduction: number
}

export interface RecipeConsumptionItem {
  id: string
  name: string
  category: string
  unit: string
  currentStock: number
  unitCost: number
  situation: 'NORMAL' | 'WARNING' | 'CRITICAL'
  location?: string
  totalDeducted: number
  totalDeductedCost: number
  totalPortionsSold: number
  estimatedAutonomy: number
  linkedProductsCount: number
  dishUsages: DishUsageDTO[]
}

export interface RecipeConsumptionResponse {
  period: string
  mappedSuppliesCount: number
  isPdvIntegrated: boolean
  supplies: RecipeConsumptionItem[]
}

export async function getRecipeConsumption(params?: {
  period?: string
  category?: string
}): Promise<RecipeConsumptionResponse> {
  const response = await api.get<RecipeConsumptionResponse>(
    '/api/stock/recipe-consumption',
    { params },
  )
  return response.data
}

// ─── HISTÓRICO / EXTRATO ───

export interface StockMovementDTO {
  id: string
  date: string
  itemName: string
  category: string
  unit: string
  operation: 'IN' | 'OUT'
  description: string
  eventLabel: string
  eventBadgeColor: string
  quantity: number
  deltaFormatted: string
  unitCost: number
  totalValue: number
  currentBalance: number
  previousBalance: number
  originDetail: string
}

export interface StockMovementsResponse {
  movements: StockMovementDTO[]
  summary: {
    totalCount: number
    totalEntriesValue: number
    totalExitsValue: number
    page: number
    perPage: number
    totalPages: number
  }
}

export async function getStockMovements(params?: {
  period?: string
  eventType?: string
  query?: string
  page?: number
  perPage?: number
}): Promise<StockMovementsResponse> {
  const response = await api.get<StockMovementsResponse>(
    '/api/stock/movements',
    { params },
  )
  return response.data
}
