/**
 * Ajudantes do envio e do acompanhamento do pedido do cardápio online (Mergulho 06:C7 e 06:C8, 15/10/2026).
 */

/** Código único do pedido: o reenvio do mesmo pedido (internet caiu) não vira pedido em dobro na nuvem. */
export function novoUuidDoPedido(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch {
    /* navegador antigo: cai no gerador abaixo */
  }
  const bytes = new Uint8Array(16)
  try {
    crypto.getRandomValues(bytes)
  } catch {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** Pedido em andamento guardado no aparelho: fechar a aba ou recarregar não perde o acompanhamento ao vivo. */
export interface AcompanhamentoSalvo {
  id: string
  displayId: number | null
  fulfillmentType: 'DELIVERY' | 'TAKEOUT'
  paymentMethod: string
  total: number
  itemsCount: number
  itemsSummary: string
  text: string
  items: {
    id: string
    product: { id: string; name: string }
    displayName?: string
    unitPrice: number
    quantity: number
    observation?: string
    fractions?: string[]
    selectedOptions?: { groupId: string; groupName: string; optionId: string; optionName: string; price: number; quantity: number }[]
  }[]
  savedAt: number
}

const CHAVE = 'metrics_pedido_em_andamento'
const VALIDADE_MS = 12 * 60 * 60 * 1000

export function salvarAcompanhamento(dados: AcompanhamentoSalvo) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados))
  } catch {
    /* sem armazenamento (aba anônima): só não lembra depois de recarregar */
  }
}

export function lerAcompanhamento(): AcompanhamentoSalvo | null {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return null
    const dados = JSON.parse(bruto) as AcompanhamentoSalvo
    if (!dados?.id || !dados.savedAt || Date.now() - dados.savedAt > VALIDADE_MS) {
      localStorage.removeItem(CHAVE)
      return null
    }
    return dados
  } catch {
    return null
  }
}

export function apagarAcompanhamento() {
  try {
    localStorage.removeItem(CHAVE)
  } catch {
    /* nada a apagar */
  }
}

function normalizar(texto: string): string {
  return (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

function lerTaxa(valor: unknown): number {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor
  const limpo = String(valor ?? '').replace(/[^0-9,.-]/g, '').replace(',', '.')
  const numero = Number(limpo)
  return limpo !== '' && Number.isFinite(numero) ? numero : 0
}

/**
 * Taxa de entrega do bairro com a mesma regra do cardápio padrão e da nuvem (Mergulho 06:C6): o 1º setor com um bairro
 * igual ou contido, senão a taxa padrão da loja. Usada pelo cardápio do Marujo, que antes mostrava R$ 5 fixos.
 */
export function taxaDoBairro(profile: any, bairro: string): number {
  let setores: any = profile?.deliverySectors || profile?.delivery_sectors || []
  if (typeof setores === 'string') {
    try {
      setores = JSON.parse(setores)
    } catch {
      setores = []
    }
  }
  if (!Array.isArray(setores)) setores = []
  const alvo = normalizar(bairro)
  const setor = alvo
    ? setores.find(
        (s: any) =>
          !s?._type &&
          Array.isArray(s?.neighborhoods) &&
          s.neighborhoods.some((nome: unknown) => {
            const n = normalizar(String(nome ?? ''))
            return !!n && (n === alvo || n.includes(alvo) || alvo.includes(n))
          }),
      )
    : null
  return setor && setor.fee !== undefined ? lerTaxa(setor.fee) : lerTaxa(profile?.deliveryFee)
}

/** Situações em que o pedido acabou (o acompanhamento para de consultar a nuvem). */
export function statusFinal(status: string): boolean {
  const s = (status || '').toLowerCase().trim()
  return ['delivered', 'completed', 'finalizado', 'cancelled', 'canceled', 'cancelado'].includes(s)
}

/**
 * Intervalo entre as consultas do acompanhamento (06:C3): rápido nos primeiros 10 min, depois mais espaçado, e
 * mais lento com a aba escondida. Antes era a cada 2,5 s para sempre, mesmo com a aba esquecida aberta.
 */
export function intervaloDoAcompanhamento(minutosDesdeOPedido: number, abaEscondida: boolean): number {
  const base = minutosDesdeOPedido < 10 ? 2500 : minutosDesdeOPedido < 60 ? 10000 : 30000
  return abaEscondida ? Math.max(base, 30000) : base
}
