import { api } from '@/lib/axios'

export interface UpdateItemBody {
  id: string
  name?: string
  description?: string | null
  cost?: number | null
  price?: number | null
  min_stock?: number | null
  barcode?: string | null
  category?: string | null
  subcategory_id?: string | null
  active?: boolean | null
  display_id?: number | null
  ncm?: string | null
  cest?: string | null
  cfop?: string | null
  csosn?: string | null
  cst_icms?: string | null
  origem?: number | null
  cst_pis?: string | null
  aliquota_pis?: number | null
  cst_cofins?: string | null
  aliquota_cofins?: number | null
  estimated_time?: string | null
  unit?: string | null
  measureUnit?: 'UNITARY' | 'FRACTIONAL'
  show_on_menu?: boolean | null
  is_priority?: boolean | null
}

export async function updateItem({ id, ...body }: UpdateItemBody) {
  const response = await api.patch(`/item/${id}`, body)
  return response
}
