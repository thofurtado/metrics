import { api } from '@/lib/axios'

/**
 * Módulo Vendas (etapas 2 e 3, 16/10/2026; _claude-sync/relatorios/ESPEC-VENDAS-E-ESTOQUE.md). Tudo vem da nuvem
 * (metrics-node/src/modules/sales): a web só mostra. A "conta única" (D11) é a mesma no Dashboard, na Conferência de caixa e
 * no módulo Vendas.
 */

export interface FormaRecebida {
  forma: string
  total: number
  quantidade: number
  maquininhas: { nome: string; total: number }[]
}

export interface FormaSemContagem {
  tipo: 'PRAZO' | 'PLATAFORMA'
  forma: string
  total: number
  quantidade: number
}

export interface ContaDasVendas {
  vendido: {
    total: number
    vendas: number
    quantidade: number
    itens: number
    taxas: { entrega: number; servico: number; couvert: number; total: number }
    descontos: number
    lancadoSemVenda: number
    lancamentosSemVenda: number
    ticketMedio: number
  }
  recebido: {
    total: number
    dinheiro: number
    eletronico: number
    porForma: FormaRecebida[]
  }
  semContagem: {
    total: number
    aPrazo: number
    aplicativo: number
    porForma: FormaSemContagem[]
  }
  caixinha: number
  cancelados: { quantidade: number; total: number }
  diferenca: {
    valor: number
    aPrazo: number
    aplicativo: number
    caixinha: number
    semExplicacao: number
    linha: string
    canceladas: string
  }
}

export interface Periodo {
  de: string
  ate: string
}

export interface FiltrosDaConsulta {
  de?: string
  ate?: string
  caixa?: string
  origem?: string
  forma?: string
  vendedor?: string
  produto?: string
  busca?: string
  situacao?: 'todas' | 'concluidas' | 'canceladas'
}

/** Tira os filtros vazios (a nuvem trata ausente como "todos"). */
function parametros<T extends object>(f: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(f).filter(
      ([, v]) => v !== undefined && v !== null && String(v).trim() !== '',
    ),
  ) as Partial<T>
}

export async function getContaDasVendas(f: {
  de?: string
  ate?: string
  caixa?: string
}) {
  const { data } = await api.get<{
    periodo: Periodo | null
    caixa: string | null
    conta: ContaDasVendas
  }>('/api/vendas/conta', { params: parametros(f) })
  return data
}

export interface OrigemDaVenda {
  tipo:
    | 'BALCAO'
    | 'MESA'
    | 'COMANDA'
    | 'DELIVERY'
    | 'IFOOD'
    | '99FOOD'
    | 'OUTRA'
  rotulo: string
}

export interface CaixaDaVenda {
  id: string
  nome: string
  computador: string | null
  abertoEm: string | null
  status: string | null
}

export interface NotaDaLinha {
  situacao: string
  rotulo: string | null
  numero: number | null
  serie: number | null
}

export interface VendaDaLista {
  id: string
  codigo: string
  numero: number | null
  senha: number | null
  criadaEm: string
  origem: OrigemDaVenda
  caixa: CaixaDaVenda | null
  cliente: string | null
  total: number
  itens: number | null
  formas: { forma: string; valor: number }[]
  nota: NotaDaLinha | null
  cancelada: boolean
  cancelamento: { motivo: string; quem: string | null; quando: string } | null
}

export interface ListaDeVendas {
  periodo: Periodo | null
  pagina: number
  porPagina: number
  total: number
  totais: { vendas: number; canceladas: number; valor: number }
  vendas: VendaDaLista[]
}

export async function getListaDeVendas(
  f: FiltrosDaConsulta & { pagina?: number; porPagina?: number },
) {
  const { data } = await api.get<ListaDeVendas>('/api/vendas', {
    params: parametros(f),
  })
  return data
}

/** Todas as páginas da lista (para o CSV e o PDF), de 500 em 500, até 20 mil vendas. */
export async function getTodasAsVendas(f: FiltrosDaConsulta) {
  const todas: VendaDaLista[] = []
  let pagina = 1
  let total = 0
  do {
    const lista = await getListaDeVendas({ ...f, pagina, porPagina: 500 })
    todas.push(...lista.vendas)
    total = lista.total
    pagina++
    if (lista.vendas.length === 0) break
  } while (todas.length < total && todas.length < 20000)
  return todas
}

export interface ItemDoDetalhe {
  id: string
  produtoId: string | null
  codigo: number | null
  nome: string
  nomeVendido: string | null
  nomeNoCadastro: string | null
  unidade: 'kg' | 'un'
  quantidade: number
  precoUnitario: number
  desconto: number
  total: number
  complementos:
    | {
        grupo: string | null
        nome: string
        quantidade: number
        preco: number
        observacaoRapida: boolean
      }[]
    | null
  observacao: string | null
  vendedor: { nome: string | null; numero: number | null; chave: string } | null
  custo: number | null
  margem: number | null
  margemPercentual: number | null
  cancelado: boolean
}

export interface PagamentoDoDetalhe {
  id: string | null
  forma: string
  formaOriginal: string | null
  tipo: 'DINHEIRO' | 'CONTADA' | 'PRAZO' | 'PLATAFORMA'
  valor: number
  maquininha: string | null
  semMaquininha: boolean
  pessoa: string | null
  caixinha: number
  plataforma: string | null
}

export interface CancelamentoDaLista {
  id: string
  vendaId: string | null
  itemId: string | null
  tipo: string
  daVendaInteira: boolean
  produto: string
  produtoId: string | null
  quantidade: number
  valor: number
  motivo: string
  quem: string | null
  quando: string
  origem: string | null
  voltouAoEstoque: boolean
  venda?: {
    id: string
    codigo: string
    numero: number | null
    senha: number | null
  } | null
}

// No detalhe, "itens" é a lista dos itens (na linha da lista é só a quantidade)
export interface DetalheDaVenda extends Omit<VendaDaLista, 'itens' | 'nota'> {
  operador: string | null
  valores: {
    itens: number
    desconto: number
    entrega: number
    servico: number
    couvert: number
    total: number
    custo: number | null
    margem: number | null
  }
  itens: ItemDoDetalhe[]
  pagamentos: PagamentoDoDetalhe[]
  troco: number | null
  caixinha: number
  nota:
    | (NotaDaLinha & {
        ambiente: string | null
        chave: string | null
        contingencia: boolean | null
        motivo: string | null
      })
    | null
  estoque: {
    id: string
    itemId: string | null
    nome: string
    produtoId: string | null
    insumoId: string | null
    ehInsumo: boolean
    quantidade: number
    entrada: boolean
    motivo: string | null
    custoUnitario: number | null
    quando: string
  }[]
  cancelamentos: CancelamentoDaLista[]
  veCusto: boolean
}

export async function getDetalheDaVenda(id: string) {
  const { data } = await api.get<DetalheDaVenda>(`/api/vendas/${id}`)
  return data
}

export interface ProdutoVendido {
  chave: string
  produtoId: string | null
  codigo: number | null
  nome: string
  unidade: 'kg' | 'un'
  quantidade: number
  vendas: number
  faturamento: number
  custo: number | null
  margem: number | null
  margemPercentual: number | null
  semCusto: number | null
  participacao: number
}

export interface ProdutosVendidos {
  periodo: Periodo | null
  produtos: ProdutoVendido[]
  totais: {
    produtos: number
    faturamento: number
    custo: number | null
    margem: number | null
    margemPercentual: number | null
    itensSemCusto: number | null
  }
  veCusto: boolean
  conta: ContaDasVendas
}

export async function getProdutosVendidos(f: FiltrosDaConsulta) {
  const { data } = await api.get<ProdutosVendidos>('/api/vendas/produtos', {
    params: parametros(f),
  })
  return data
}

export interface VendedorDoPeriodo {
  chave: string
  nome: string
  numero: number | null
  semVendedor: boolean
  itens: number
  vendas: number
  faturamento: number
  participacao: number
  produtos: {
    nome: string
    codigo: number | null
    quantidade: number
    faturamento: number
  }[]
}

export async function getVendedoresDoPeriodo(f: FiltrosDaConsulta) {
  const { data } = await api.get<{
    periodo: Periodo | null
    vendedores: VendedorDoPeriodo[]
    totais: { faturamento: number; vendedores: number }
  }>('/api/vendas/vendedores', { params: parametros(f) })
  return data
}

export interface Cancelamentos {
  periodo: Periodo
  cancelamentos: CancelamentoDaLista[]
  totais: {
    quantidade: number
    valor: number
    vendasInteiras: number
    itens: number
    voltaramAoEstoque: number
    valorQueVoltou: number
  }
  motivos: string[]
  pessoas: string[]
}

export async function getCancelamentosDasVendas(f: {
  de?: string
  ate?: string
  motivo?: string
  pessoa?: string
  tipo?: string
}) {
  const { data } = await api.get<Cancelamentos>('/api/vendas/cancelamentos', {
    params: parametros(f),
  })
  return data
}

export interface FiltrosDisponiveis {
  periodo: Periodo
  caixas: CaixaDaVenda[]
  formas: string[]
  vendedores: { chave: string; nome: string; numero: number | null }[]
  origens: { tipo: string; nome: string }[]
}

export async function getFiltrosDasVendas(f: { de?: string; ate?: string }) {
  const { data } = await api.get<FiltrosDisponiveis>('/api/vendas/filtros', {
    params: parametros(f),
  })
  return data
}
