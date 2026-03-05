import axios from 'axios'

/**
 * Função para detectar dinamicamente a URL da API com base no domínio de acesso.
 */
const getDynamicBaseUrl = () => {
  // 1. Ambiente de Desenvolvimento (Localhost)
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL
  }

  // 2. Ambiente de Produção (Navegador)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname

    // Identifica Marujo Gastro Bar
    if (hostname.includes('marujo')) {
      return 'https://api.marujogastrobar.tech'
    }

    // Identifica Eureca Tech
    if (hostname.includes('eureca')) {
      return 'https://api.eurecatech.com.br'
    }
  }

  // Fallback: Usa a variável do .env se nada acima coincidir
  return import.meta.env.VITE_API_URL
}

const BASE_URL = getDynamicBaseUrl()

// Log para ajudar no debug se houver erro de conexão
console.log('DEBUG: Conectando na API:', BASE_URL);

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

      // 401 Unauthorized: Limpa sessão e redireciona para login
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