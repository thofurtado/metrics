/**
 * CSV da lista de vendas e dos produtos vendidos (decisão D10 do Thomás, 16/10/2026: "CSV e PDF na web agora").
 * Separador ";" e vírgula decimal (o Excel em português abre direto) e o BOM do UTF-8 (acentos certos no Excel).
 * Funções puras (testes em exportar-csv.test.ts, com `node --test`).
 */
import { dataCompleta, numeroDaVenda } from './formatos.ts'

export interface LinhaDeVendaParaCsv {
  codigo: string
  numero: number | null
  senha: number | null
  criadaEm: string
  origem: { rotulo: string }
  caixa: { nome: string; computador: string | null } | null
  cliente: string | null
  total: number
  formas: { forma: string; valor: number }[]
  nota: {
    rotulo: string | null
    numero: number | null
    serie: number | null
  } | null
  cancelada: boolean
  cancelamento: { motivo: string; quem: string | null } | null
}

export interface LinhaDeProdutoParaCsv {
  codigo: number | null
  nome: string
  unidade: 'kg' | 'un'
  quantidade: number
  vendas: number
  faturamento: number
  custo: number | null
  margem: number | null
  margemPercentual: number | null
  participacao: number
  semCusto: number | null
}

const BOM = '﻿'

/** Um campo do CSV: entre aspas quando tem ";", aspas ou quebra de linha. */
export function campo(valor: unknown): string {
  if (valor == null) return ''
  const t = String(valor)
  return /[;"\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

/** Número para planilha: "1234,56" (sem ponto de milhar); vazio = campo vazio. */
export function numeroCsv(valor: number | null | undefined, casas = 2): string {
  if (valor == null || Number.isNaN(Number(valor))) return ''
  return Number(valor).toFixed(casas).replace('.', ',')
}

const juntar = (linhas: string[][]) =>
  BOM + linhas.map((l) => l.map(campo).join(';')).join('\r\n') + '\r\n'

export function csvDasVendas(vendas: LinhaDeVendaParaCsv[]): string {
  const cabecalho = [
    'Dia e hora',
    'Venda',
    'Número',
    'Senha',
    'Código',
    'Origem',
    'Caixa',
    'Computador',
    'Cliente',
    'Formas de pagamento',
    'Nota fiscal',
    'Nº da nota',
    'Série',
    'Total (R$)',
    'Situação',
    'Motivo do cancelamento',
    'Cancelada por',
  ]
  const linhas = vendas.map((v) => [
    // Com o ano: o CSV pode juntar vários meses na planilha
    dataCompleta(v.criadaEm),
    numeroDaVenda(v),
    v.numero == null ? '' : String(v.numero),
    v.senha == null ? '' : String(v.senha),
    v.codigo,
    v.origem.rotulo,
    v.caixa?.nome ?? '',
    v.caixa?.computador ?? '',
    v.cliente ?? '',
    v.formas.map((f) => `${f.forma} ${numeroCsv(f.valor)}`).join(' + '),
    v.nota?.rotulo ?? '',
    v.nota?.numero == null ? '' : String(v.nota.numero),
    v.nota?.serie == null ? '' : String(v.nota.serie),
    numeroCsv(v.total),
    v.cancelada ? 'Cancelada' : 'Concluída',
    v.cancelamento?.motivo ?? '',
    v.cancelamento?.quem ?? '',
  ])
  return juntar([cabecalho, ...linhas])
}

export function csvDosProdutos(
  produtos: LinhaDeProdutoParaCsv[],
  veCusto: boolean,
): string {
  const cabecalho = [
    'Código',
    'Produto',
    'Unidade',
    'Quantidade',
    'Vendas',
    'Faturamento (R$)',
    'Participação (%)',
  ]
  if (veCusto)
    cabecalho.push(
      'Custo (R$)',
      'Margem (R$)',
      'Margem (%)',
      'Quantidade sem custo',
    )
  const linhas = produtos.map((p) => {
    const l = [
      p.codigo == null ? '' : String(p.codigo),
      p.nome,
      p.unidade,
      numeroCsv(
        p.quantidade,
        p.unidade === 'kg' ? 3 : Number.isInteger(p.quantidade) ? 0 : 3,
      ),
      String(p.vendas),
      numeroCsv(p.faturamento),
      numeroCsv(p.participacao),
    ]
    if (veCusto)
      l.push(
        numeroCsv(p.custo),
        numeroCsv(p.margem),
        numeroCsv(p.margemPercentual),
        numeroCsv(p.semCusto, 3),
      )
    return l
  })
  return juntar([cabecalho, ...linhas])
}

/** Nome do arquivo: "vendas-2026-10-01-a-2026-10-16.csv" (um dia só: "vendas-2026-10-16.csv"). */
export function nomeDoArquivo(
  base: string,
  periodo: { de: string; ate: string } | null,
  extensao: 'csv' | 'pdf',
): string {
  const p = !periodo
    ? ''
    : periodo.de === periodo.ate
      ? `-${periodo.de}`
      : `-${periodo.de}-a-${periodo.ate}`
  return `${base}${p}.${extensao}`
}
