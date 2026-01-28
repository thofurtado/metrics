import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL
console.log('DEBUG: BASE_URL lida de VITE_API_URL:', BASE_URL);
if (!BASE_URL) {
  throw new Error('VITE_API_URL não está configurada nas variáveis de ambiente.')
}

export const api = axios.create({
  baseURL: BASE_URL,
})

// Interceptor para adicionar o token DINAMICAMENTE em cada requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de erro na resposta
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const code = error.code

      if (status === 401) {
        localStorage.clear()
        window.location.href = '/sign-in'
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  },
)