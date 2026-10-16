/**
 * Formatos e períodos do módulo Vendas (16/10/2026). Funções puras, sem import com "@/" (para rodar com `node --test`).
 * O dia vira às 05:00 de Brasília (dia operacional), como o caixa, o PDV e a nuvem.
 */

const HORA_MS = 60 * 60 * 1000
const DIA_MS = 24 * HORA_MS
// Brasília = UTC-3 (sem horário de verão desde 2019) e o dia vira às 05:00
const DESLOCAMENTO_DO_DIA = (-3 - 5) * HORA_MS

/** Dia operacional (AAAA-MM-DD) de um instante. */
export function diaDaVenda(instante: Date = new Date()): string {
  return new Date(instante.getTime() + DESLOCAMENTO_DO_DIA)
    .toISOString()
    .slice(0, 10)
}

const somarDias = (dia: string, n: number) => {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d) + n * DIA_MS).toISOString().slice(0, 10)
}

export type AtalhoDoPeriodo = 'hoje' | 'ontem' | '7dias' | 'mes' | 'mesPassado'

export const ATALHOS_DO_PERIODO: { id: AtalhoDoPeriodo; nome: string }[] = [
  { id: 'hoje', nome: 'Hoje' },
  { id: 'ontem', nome: 'Ontem' },
  { id: '7dias', nome: '7 dias' },
  { id: 'mes', nome: 'Este mês' },
  { id: 'mesPassado', nome: 'Mês passado' },
]

/** O período de um atalho ("Hoje" às 02:00 ainda é o dia anterior). */
export function periodoDoAtalho(
  atalho: AtalhoDoPeriodo,
  agora: Date = new Date(),
): { de: string; ate: string } {
  const hoje = diaDaVenda(agora)
  switch (atalho) {
    case 'ontem': {
      const ontem = somarDias(hoje, -1)
      return { de: ontem, ate: ontem }
    }
    case '7dias':
      return { de: somarDias(hoje, -6), ate: hoje }
    case 'mes':
      return { de: `${hoje.slice(0, 8)}01`, ate: hoje }
    case 'mesPassado': {
      const fimDoPassado = somarDias(`${hoje.slice(0, 8)}01`, -1)
      return { de: `${fimDoPassado.slice(0, 8)}01`, ate: fimDoPassado }
    }
    default:
      return { de: hoje, ate: hoje }
  }
}

/** O primeiro e o último dia de um mês (mes de 0 a 11), para o painel do mês. */
export function periodoDoMes(
  ano: number,
  mes: number,
): { de: string; ate: string } {
  const de = `${ano}-${String(mes + 1).padStart(2, '0')}-01`
  const ate = new Date(Date.UTC(ano, mes + 1, 0)).toISOString().slice(0, 10)
  return { de, ate }
}

/** Qual atalho é este período (para marcar o botão); nenhum = null. */
export function atalhoDoPeriodo(
  p: { de: string; ate: string },
  agora: Date = new Date(),
): AtalhoDoPeriodo | null {
  for (const a of ATALHOS_DO_PERIODO) {
    const q = periodoDoAtalho(a.id, agora)
    if (q.de === p.de && q.ate === p.ate) return a.id
  }
  return null
}

/** "16/10/2026" ou "01/10/2026 a 16/10/2026". */
export function textoDoPeriodo(p: { de: string; ate: string }): string {
  const br = (d: string) =>
    `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`
  return p.de === p.ate ? br(p.de) : `${br(p.de)} a ${br(p.ate)}`
}

/** R$ 1.234,56 (negativo com o sinal na frente). */
export function moeda(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(Number(valor))) return '—'
  const v = Math.round((Number(valor) + Number.EPSILON) * 100) / 100
  const [inteiro, decimais] = Math.abs(v).toFixed(2).split('.')
  return `${v < 0 ? '−' : ''}R$ ${inteiro.replace(/\B(?=(\d{3})+$)/g, '.')},${decimais}`
}

/** Número com vírgula: 3 → "3"; 0,604 kg → "0,604". */
export function quantidade(
  valor: number | null | undefined,
  unidade: 'kg' | 'un' = 'un',
): string {
  if (valor == null) return '—'
  const casas = unidade === 'kg' ? 3 : Number.isInteger(valor) ? 0 : 3
  const t = Number(valor).toFixed(casas).replace('.', ',')
  const limpo = casas > 0 && unidade !== 'kg' ? t.replace(/,?0+$/, '') : t
  return unidade === 'kg' ? `${limpo} kg` : limpo
}

/** "12,5%" (null = "—"). */
export function percentual(valor: number | null | undefined): string {
  if (valor == null) return '—'
  return `${(Math.round(valor * 10) / 10).toString().replace('.', ',')}%`
}

const fmtBrasilia = (iso: string, opcoes: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    ...opcoes,
  }).format(new Date(iso))

/** "16/10 19:42" (dia e hora de Brasília). */
export function diaEHora(iso: string | null | undefined): string {
  if (!iso) return '—'
  return `${fmtBrasilia(iso, { day: '2-digit', month: '2-digit' })} ${fmtBrasilia(iso, { hour: '2-digit', minute: '2-digit', hour12: false })}`
}

/** "16/10/2026 19:42". */
export function dataCompleta(iso: string | null | undefined): string {
  if (!iso) return '—'
  return `${fmtBrasilia(iso, { day: '2-digit', month: '2-digit', year: 'numeric' })} ${fmtBrasilia(iso, { hour: '2-digit', minute: '2-digit', hour12: false })}`
}

/** "Venda #1234 · Senha 7", só o que houver; sem nenhum dos dois, o código curto ("#1f9408ee"). */
export function numeroDaVenda(v: {
  numero: number | null
  senha: number | null
  codigo: string
}): string {
  const partes: string[] = []
  if (v.numero != null) partes.push(`#${v.numero}`)
  if (v.senha != null) partes.push(`Senha ${v.senha}`)
  return partes.length > 0 ? partes.join(' · ') : v.codigo
}
