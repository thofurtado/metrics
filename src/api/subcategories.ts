import { api } from '@/lib/axios'

export interface Subcategory {
  id: string
  name: string
  category_id: string
  accepts_fractions: boolean
  max_fractions: number
  active: boolean
  category?: {
    id: string
    name: string
  }
  _count?: {
    products: number
  }
}

export interface CreateSubcategoryBody {
  name: string
  category_id: string
  accepts_fractions?: boolean
  max_fractions?: number
}

export interface UpdateSubcategoryBody {
  name?: string
  category_id?: string
  accepts_fractions?: boolean
  max_fractions?: number
  active?: boolean
}

export async function getSubcategories(categoryId?: string): Promise<{ subcategories: Subcategory[] }> {
  const response = await api.get('/subcategories', {
    params: { category_id: categoryId },
  })
  return response.data
}

export async function createSubcategory(data: CreateSubcategoryBody): Promise<{ subcategory: Subcategory }> {
  const response = await api.post('/subcategories', data)
  return response.data
}

export async function updateSubcategory(id: string, data: UpdateSubcategoryBody): Promise<{ subcategory: Subcategory }> {
  const response = await api.put(`/subcategories/${id}`, data)
  return response.data
}

export async function deleteSubcategory(id: string): Promise<void> {
  await api.delete(`/subcategories/${id}`)
}
