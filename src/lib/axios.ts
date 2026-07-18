import axios from 'axios'
import { toast } from 'sonner'

/**
 * Agora usamos UMA ÚNICA URL de API (A do Coolify).
 * A separação de clientes é feita pelo header 'x-tenant-domain' que vamos enviar abaixo.
 */
const BASE_URL = import.meta.env.VITE_API_URL

// Log para ajudar no debug se houver erro de conexão
console.log('DEBUG: Conectando na API central:', BASE_URL);

export const api = axios.create({
  baseURL: BASE_URL,
})

// Interceptor para adicionar o token e o domínio DINAMICAMENTE em cada requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Envia a URL de onde o cliente está acessando para o backend saber qual banco usar
  if (typeof window !== 'undefined') {
    let hostname = window.location.hostname
    
    // Se o desenvolvedor estiver testando localmente, força um domínio de teste
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      hostname = 'marujo.metrics.dev.br' // Troque se quiser testar outro cliente localmente
    }
    
    config.headers['x-tenant-domain'] = hostname
  }

  return config
})

// Interceptor de erro na resposta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Se a requisição foi cancelada (ex: pelo React Query), ignora silenciosamente
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }

    const isDev = import.meta.env.DEV

    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const message = error.message

      // Logs profissionais para desenvolvimento
      if (isDev) {
        console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, {
          status,
          message,
          data: error.response?.data,
          code: error.code,
        })
      }

      // 401 Unauthorized: token inválido ou expirado → logout
      if (status === 401) {
        localStorage.clear()
        window.dispatchEvent(new Event('auth-change'))
        if (typeof window !== 'undefined') {
          window.location.href = '/sign-in'
        }
      }

      // 403 Forbidden: autenticado mas sem permissão → só avisa, não faz logout
      if (status === 403) {
        toast.error('Você não tem permissão para realizar esta ação.')
      }

      return Promise.reject(error)
    }

    if (isDev) console.error('[Fatal Error]:', error)
    return Promise.reject(error)
  },
)