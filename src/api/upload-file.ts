import { api } from '@/lib/axios'

export async function uploadFileTransaction(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`/uploads/transaction/${id}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        }
    });
    
    return response.data;
}

export async function uploadFileProduct(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`/uploads/product/${id}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        }
    });
    
    return response.data;
}

export async function uploadFileEmployee(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`/uploads/employee/${id}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        }
    });
    
    return response.data;
}

export async function deleteFileTransaction(id: string) {
    const response = await api.delete(`/uploads/transaction/${id}`);
    return response.data;
}
