import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL

if (!BASE_URL) {
  // Lança um erro se a variável não estiver configurada no ambiente de build/runtime.
  throw new Error('VITE_API_URL não está configurada nas variáveis de ambiente.')
}

const token = localStorage.getItem('token')

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${token}`,
  },
})
