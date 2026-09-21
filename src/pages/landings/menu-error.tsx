import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useRouteError } from 'react-router-dom'

/**
 * Telas de erro do CARDÁPIO ONLINE (área pública).
 * Regra: o cliente do restaurante NUNCA é mandado para dentro do sistema (login, dashboard) por causa de um erro.
 * Erro no cardápio = mensagem simples + "Recarregar". Nada de link para o Dashboard.
 */

const CHUNK_RETRY_KEY = 'menu-chunk-retry'

/** Erro de "arquivo novo do site" (o celular guardou a versão antiga): recarregar resolve. */
function isChunkError(err: unknown) {
  const msg = String((err as { message?: string })?.message ?? err ?? '')
  return /dynamically imported module|Loading chunk|Importing a module script failed|ChunkLoadError/i.test(msg)
}

/** Erro causado por tradução automática do navegador (o Chrome troca os textos da página e o React se perde). */
function isTranslationDomError(err: unknown) {
  const msg = String((err as { message?: string })?.message ?? err ?? '')
  return /removeChild|insertBefore|NotFoundError|not a child of this node/i.test(msg)
}

/** Recarrega UMA vez sozinho quando o erro é de versão antiga do site; evita laço de recarregamento. */
function tentarRecarregarUmaVez(err: unknown) {
  try {
    if ((isChunkError(err) || isTranslationDomError(err)) && !sessionStorage.getItem(CHUNK_RETRY_KEY)) {
      sessionStorage.setItem(CHUNK_RETRY_KEY, '1')
      window.location.reload()
      return true
    }
  } catch {
    /* sessionStorage bloqueado: segue para a tela de erro */
  }
  return false
}

export function MenuUnavailable({
  title = 'Não foi possível abrir o cardápio',
  message = 'Verifique sua conexão e toque em Recarregar.',
  showRetry = true,
}: {
  title?: string
  message?: string
  showRetry?: boolean
}) {
  return (
    <div
      translate="no"
      className="notranslate flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center"
    >
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="max-w-xs text-base text-slate-600">{message}</p>
      {showRetry && (
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.removeItem(CHUNK_RETRY_KEY)
            } catch {
              /* ignora */
            }
            window.location.reload()
          }}
          className="min-h-[48px] rounded-xl bg-slate-900 px-8 text-base font-semibold text-white active:opacity-80"
        >
          Recarregar
        </button>
      )}
    </div>
  )
}

/** errorElement das rotas do cardápio: substitui a antiga "Página não encontrada / Voltar para o Dashboard". */
export function MenuRouteError() {
  const error = useRouteError()
  console.error('[Cardápio] erro na tela:', error)
  if (tentarRecarregarUmaVez(error)) return null
  return <MenuUnavailable title="Algo deu errado" message="Toque em Recarregar para abrir o cardápio de novo." />
}

interface BoundaryState {
  hasError: boolean
}

/** Protege o cardápio inteiro: se algo quebrar por dentro, mostra "Recarregar" em vez de expulsar o cliente. */
export class MenuErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { hasError: false }

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Cardápio] erro capturado:', error, info)
    tentarRecarregarUmaVez(error)
  }

  render() {
    if (this.state.hasError) {
      return <MenuUnavailable title="Algo deu errado" message="Toque em Recarregar para abrir o cardápio de novo." />
    }
    return this.props.children
  }
}
