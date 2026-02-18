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
  (response) => response,
  (error) => {
    // If request was cancelled (e.g. by React Query), silently reject without logging
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }

    const isDev = import.meta.env.DEV

    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const message = error.message

      // Professional logging for developers
      if (isDev) {
        console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, {
          status,
          message,
          data: error.response?.data,
          code: error.code,
        })
      }

      // 401 Unauthorized: Trigger logout and redirect
      if (status === 401) {
        localStorage.clear()
        if (typeof window !== 'undefined') {
          window.location.href = '/sign-in'
        }
      }

      return Promise.reject(error)
    }

    if (isDev) console.error('[Fatal Error]:', error)
    return Promise.reject(error)
  },
)