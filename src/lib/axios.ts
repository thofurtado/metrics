import axios from 'axios'
import { toast } from 'sonner'

/**
 * Agora usamos UMA ÚNICA URL de API (A do Coolify).
 * A separação de clientes é feita pelo header 'x-tenant-domain' que vamos enviar abaixo.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || ''
const BASE_URL = API_BASE_URL

export const api = axios.create({
  baseURL: BASE_URL,
})

// Fase 4 do Mergulho (17:U6): o token vale 7 dias e, ao vencer, a próxima chamada dava 401 e jogava o usuário para o
// login no meio do trabalho (perdendo o formulário). Renovar DEPOIS do 401 não adianta: a nuvem assina o token e o de
// renovação juntos, com o mesmo prazo. Então a web renova ANTES: quando faltam menos de 3 dias, uma chamada qualquer
// dispara PATCH /token/refresh (no máximo uma vez por hora) e guarda o token novo. Quem usa a web pelo menos a cada
// 4 dias não cai mais; o 401 continua levando ao login (token vencido ou usuário apagado).
const RENEW_WHEN_LESS_THAN_MS = 3 * 24 * 60 * 60 * 1000
const MIN_RENEW_INTERVAL_MS = 60 * 60 * 1000
let renewing = false
let lastRenewAttempt = 0

function tokenExpiresAt(token: string): number | null {
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
    )
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

function renewTokenIfNeeded(url: string | undefined) {
  if (
    renewing ||
    !url ||
    url.includes('/token/refresh') ||
    url.includes('/sessions')
  )
    return
  const token = localStorage.getItem('token')
  if (!token) return
  const expiresAt = tokenExpiresAt(token)
  const now = Date.now()
  if (
    !expiresAt ||
    expiresAt <= now ||
    expiresAt - now > RENEW_WHEN_LESS_THAN_MS
  )
    return
  if (now - lastRenewAttempt < MIN_RENEW_INTERVAL_MS) return
  lastRenewAttempt = now
  renewing = true
  api
    .patch<{ token?: string }>('/token/refresh')
    .then((response) => {
      const newToken = response.data?.token
      // Só troca se ninguém saiu ou entrou com outro usuário enquanto renovava
      if (newToken && localStorage.getItem('token') === token) {
        localStorage.setItem('token', newToken)
      }
    })
    .catch(() => {})
    .finally(() => {
      renewing = false
    })
}

// Interceptor para adicionar o token e o domínio DINAMICAMENTE em cada requisição
api.interceptors.request.use((config) => {
  renewTokenIfNeeded(config.url)
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
      return Promise.reject(error)
    }

    const isDev = import.meta.env.DEV

    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const message = error.message

      // Logs profissionais para desenvolvimento
      if (isDev) {
        console.error(
          `[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`,
          {
            status,
            message,
            data: error.response?.data,
            code: error.code,
          },
        )
      }

      // 401 Unauthorized: token inválido ou expirado → logout
      if (status === 401) {
        const url = error.config?.url || ''
        // Não desloga se o 401 veio de rotas de sincronização opcionais ou públicas
        if (!url.includes('/sync') && !url.includes('/public/')) {
          localStorage.clear()
          window.dispatchEvent(new Event('auth-change'))
          if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname
            if (currentPath.startsWith('/cashier')) {
              if (currentPath !== '/cashier/sign-in') {
                window.location.href = '/cashier/sign-in'
              }
            } else {
              window.location.href = '/sign-in'
            }
          }
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
