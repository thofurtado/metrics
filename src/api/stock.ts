import { api } from '@/lib/axios'

// Controle de Estoque (etapa 4 do Vendas e Estoque, 16/10/2026): só dado real. Sem dado, as telas mostram o vazio de verdade.

// ─── POSIÇÃO DE ESTOQUE ───

export type SituacaoDoSaldo = 'NORMAL' | 'WARNING' | 'CRITICAL'

export interface StockOverviewItem {
  id: string
  name: string
  type: 'SUPPLY' | 'PRODUCT'
  code: number | null
  category: string
  unit: string
  currentStock: number
  /** Estoque mínimo do cadastro (só produto); vazio = sem mínimo. */
  minStock: number | null
  cost: number
  price?: number
  situation: SituacaoDoSaldo
  lastMovement?: string | null
}

export interface StockOverviewResponse {
  items: StockOverviewItem[]
  categories: string[]
  summary: {
    totalCount: number
    lowStockCount: number
    normalCount: number
    filteredCount: number
    page: number
    perPage: number
    totalPages: number
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
  type: 'SUPPLY' | 'PRODUCT'
  category: string
  unit: string
  systemQuantity: number
  countedQuantity: number
  difference: number
  unitCost: number
  totalDiffCost: number
}

export interface ActiveInventoryResponse {
  sessionId: string | null
  status: string | null
  sector?: string
  openedAt?: string
  items: InventoryItemDTO[]
}

export type MotivoDaContagem =
  | 'AJUSTE_NEGATIVO'
  | 'AJUSTE_POSITIVO'
  | 'QUEBRA'
  | 'PERDA'
  | 'CONSUMO_INTERNO'

export async function getActiveInventorySession(): Promise<ActiveInventoryResponse> {
  const response = await api.get<ActiveInventoryResponse>(
    '/api/stock/inventory/active',
  )
  return response.data
}

export async function applyInventorySession(
  sessionId: string,
  counts: {
    itemId: string
    countedQuantity: number
    reason?: MotivoDaContagem | null
  }[],
): Promise<{ message: string; adjusted: number }> {
  const response = await api.post('/api/stock/inventory/apply', {
    sessionId,
    counts,
  })
  return response.data
}

// ─── FICHA TÉCNICA (de onde vieram as baixas dos insumos) ───

export interface RecipeUsage {
  /** FICHA = linha da ficha técnica de um produto; COMPLEMENTO = opção de complemento com o insumo ligado */
  kind: 'FICHA' | 'COMPLEMENTO'
  id: string
  name: string
  group: string | null
  /** Quantidade do insumo por unidade vendida, na unidade do insumo */
  dose: number
  active: boolean
}

export interface RecipeConsumptionByProduct {
  productId: string | null
  productName: string
  quantity: number
  cost: number
  itemsSold: number
  percentage: number
}

export interface RecipeConsumptionItem {
  id: string
  name: string
  unit: string
  category: string
  active: boolean
  currentStock: number
  unitCost: number
  consumed: number
  consumedCost: number
  usedIn: RecipeUsage[]
  byProduct: RecipeConsumptionByProduct[]
}

export interface RecipeConsumptionResponse {
  period: string
  recipesCount: number
  linkedOptionsCount: number
  supplies: RecipeConsumptionItem[]
}

export async function getRecipeConsumption(params?: {
  period?: string
}): Promise<RecipeConsumptionResponse> {
  const response = await api.get<RecipeConsumptionResponse>(
    '/api/stock/recipe-consumption',
    { params },
  )
  return response.data
}

// ─── HISTÓRICO DO ESTOQUE (D6: o mesmo no Controle de Estoque e na ficha do produto) ───

export type TipoDoHistorico =
  | 'VENDA'
  | 'COMPRA'
  | 'PERDA'
  | 'AJUSTE'
  | 'ESTORNO'
  | 'OUTRO'

export interface StockHistoryOrigin {
  tipo: 'VENDA' | 'NFE'
  id: string
  rotulo: string
}

export interface StockHistoryRow {
  id: string
  date: string
  item: {
    id: string | null
    type: 'PRODUCT' | 'SUPPLY' | null
    name: string
    code: number | null
    unit: string
  }
  kind: TipoDoHistorico
  label: string
  operation: 'IN' | 'OUT'
  quantity: number
  delta: number
  balanceBefore: number | null
  balanceAfter: number | null
  /** Movimento antigo (antes de 16/10/2026): o saldo foi calculado a partir do saldo atual. */
  balanceCalculated: boolean
  unitCost: number | null
  totalValue: number | null
  who: string | null
  detail: string
  origin: StockHistoryOrigin | null
  soldName: string | null
}

export interface StockHistoryItem {
  id: string
  type: 'PRODUCT' | 'SUPPLY'
  name: string
  code: number | null
  unit: string
  currentStock: number
  /** Produto com ficha técnica: as vendas baixam os insumos, não ele (D8) */
  hasRecipe: boolean
}

export interface StockHistoryResponse {
  item: StockHistoryItem | null
  movements: StockHistoryRow[]
  summary: {
    totalCount: number
    totalEntriesValue: number | null
    totalExitsValue: number | null
    page: number
    perPage: number
    totalPages: number
  }
}

export interface StockHistoryParams {
  period?: string
  from?: string
  to?: string
  eventType?: string
  query?: string
  itemId?: string
  page?: number
  perPage?: number
}

/** De onde vem o histórico: Controle de Estoque (módulo Estoque) ou a ficha do produto (Mercadorias). */
export type ViaDoHistorico = 'stock' | 'items'

export async function getStockHistory(
  params: StockHistoryParams,
  via: ViaDoHistorico = 'stock',
): Promise<StockHistoryResponse> {
  if (via === 'items' && params.itemId) {
    const { itemId, ...rest } = params
    const response = await api.get<StockHistoryResponse>(
      `/items/${itemId}/stock-history`,
      { params: rest },
    )
    return response.data
  }
  const response = await api.get<StockHistoryResponse>('/api/stock/movements', {
    params,
  })
  return response.data
}

export interface StockItemOption {
  id: string
  type: 'PRODUCT' | 'SUPPLY'
  name: string
  code: number | null
  unit: string
  currentStock: number
  active: boolean
}

export async function searchStockItems(
  query: string,
): Promise<StockItemOption[]> {
  const response = await api.get<{ items: StockItemOption[] }>(
    '/api/stock/items',
    { params: { query } },
  )
  return response.data.items
}

export interface SaleOrigin {
  id: string
  number: string
  date: string
  status: string
  origin: string
  total: number
  discount: number
  deliveryFee: number
  serviceFee: number
  coverCharge: number
  cashier: {
    name: string
    terminal: string | null
    operator: string | null
  } | null
  items: {
    id: string
    name: string
    code: number | null
    quantity: number
    unit: string
    unitPrice: number
    discount: number
    seller: string | null
    stock: {
      id: string
      name: string
      unit: string
      operation: 'IN' | 'OUT'
      quantity: number
      kind: string
      date: string
    }[]
  }[]
  payments: { method: string; amount: number; machine: string | null }[]
  cancellations: {
    item: string
    quantity: number
    reason: string
    who: string | null
    when: string
    stock: string | null
  }[]
}

export interface InvoiceOrigin {
  key: string
  number: string | null
  supplier: { cnpj: string | null; name: string | null }
  date: string
  who: string | null
  items: {
    id: string
    name: string
    unit: string
    quantity: number
    unitCost: number | null
    total: number | null
    kind: string
    batch: string | null
  }[]
}

export type StockOriginResponse =
  | { type: 'VENDA'; sale: SaleOrigin }
  | { type: 'NFE'; invoice: InvoiceOrigin }

export async function getStockOrigin(
  origin: StockHistoryOrigin,
  via: ViaDoHistorico = 'stock',
): Promise<StockOriginResponse> {
  const url = via === 'items' ? '/items/stock-origin' : '/api/stock/origin'
  const response = await api.get<StockOriginResponse>(url, {
    params: { type: origin.tipo, id: origin.id },
  })
  return response.data
}
