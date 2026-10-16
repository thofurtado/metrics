// Formatos do Controle de Estoque (quantidade, dinheiro, data e o arquivo CSV), num lugar só para as abas e a ficha do produto.

export function formatarQuantidade(
  valor: number | null | undefined,
  unidade?: string,
): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return '—'
  }
  const numero = valor.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
  return unidade ? `${numero} ${unidade}` : numero
}

/** Quantidade com sinal: "+ 2 un" / "− 0,18 kg". */
export function formatarDelta(delta: number, unidade?: string): string {
  const sinal = delta > 0 ? '+' : delta < 0 ? '−' : ''
  return `${sinal} ${formatarQuantidade(Math.abs(delta), unidade)}`.trim()
}

export function formatarDinheiro(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return '—'
  }
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatarDataHora(iso: string | Date): {
  data: string
  hora: string
} {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return {
    data: d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    hora: d.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

/** Número no CSV do jeito que o Excel em português lê (vírgula no decimal). */
export function numeroNoCsv(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return ''
  }
  return String(Number(valor.toFixed(4))).replace('.', ',')
}

/** Baixa um CSV com ";" (Excel em português) e o BOM do UTF-8 (para os acentos abrirem certos). */
export function baixarCsv(
  nomeDoArquivo: string,
  cabecalho: string[],
  linhas: (string | number | null | undefined)[][],
) {
  const celula = (v: string | number | null | undefined) =>
    `"${String(v ?? '').replace(/"/g, '""')}"`
  const texto = [cabecalho, ...linhas]
    .map((l) => l.map(celula).join(';'))
    .join('\r\n')
  const blob = new Blob(['﻿' + texto], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeDoArquivo
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const PERIODOS = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: '7days', label: 'Últimos 7 dias' },
  { value: '30days', label: 'Últimos 30 dias' },
  { value: 'month', label: 'Este mês' },
  { value: 'all', label: 'Tudo' },
] as const

/** A frase que a nuvem mandou no erro (ela já vem em português) ou a frase padrão da tela. */
export function mensagemDoErro(erro: unknown, padrao: string): string {
  const m = (erro as { response?: { data?: { message?: unknown } } } | null)
    ?.response?.data?.message
  return typeof m === 'string' && m.trim() ? m : padrao
}
