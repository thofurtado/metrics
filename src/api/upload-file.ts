import { api } from '@/lib/axios'

export async function uploadFileTransaction(id: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post(`/uploads/transaction/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

export async function uploadFileProduct(
  id: string,
  file: File,
  method: 'POST' | 'PUT' = 'POST'
) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.request({
    method,
    url: `/uploads/product/${id}`,
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

export async function deleteFileProduct(id: string) {
  const response = await api.delete(`/uploads/product/${id}`)
  return response.data
}

export async function uploadFileEmployee(id: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post(`/uploads/employee/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

export async function deleteFileTransaction(id: string) {
  const response = await api.delete(`/uploads/transaction/${id}`)
  return response.data
}
