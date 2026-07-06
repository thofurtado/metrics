import { api } from '@/lib/axios'

export interface PrintDepartment {
  id: string
  name: string
  products: {
    product_id: string
    product: {
      id: string
      name: string
    }
  }[]
}

export async function getPrintDepartments() {
  const response = await api.get<{ departments: PrintDepartment[] }>('/print-departments')
  return response.data
}

export async function createPrintDepartment({ name }: { name: string }) {
  const response = await api.post('/print-departments', { name })
  return response.data
}

export async function deletePrintDepartment({ id }: { id: string }) {
  await api.delete(`/print-departments/${id}`)
}

export async function updatePrintDepartmentProducts({
  id,
  productIds,
}: {
  id: string
  productIds: string[]
}) {
  await api.post(`/print-departments/${id}/products`, { productIds })
}
