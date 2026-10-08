// Conta única do ponto e regra de hora extra da loja (08/10/2026). A conta mora no servidor (metrics-node,
// src/modules/hr/ponto): o espelho, o resumo do mês e o PDF só mostram o que ela devolve.
import { api } from '@/lib/axios'

export type ModoDomingo = 'EXCEDENTE_100' | 'NORMAL' | 'DIA_TODO_100'
export type ModoFeriado = 'DIA_TODO_100' | 'EXCEDENTE_100'
export type ModeloDeRegra =
  | 'CLT'
  | 'SP_BARES_RESTAURANTES'
  | 'LITORAL_NORTE'
  | 'PERSONALIZADO'
  | 'LEGADO'

export interface RegraDaLoja {
  id: string | null
  vigenteDesde: string
  modelo: ModeloDeRegra
  divisor: number
  multiplicadorExtra: number
  segundaFaixaAPartirMin: number | null
  multiplicadorSegundaFaixa: number | null
  multiplicadorEspecial: number
  jornadaDiariaMin: number
  jornadaSemanalMin: number
  contarSemana: boolean
  toleranciaMin: number
  domingo: ModoDomingo
  feriado: ModoFeriado
  noturnoLigado: boolean
  adicionalNoturno: number
  horaNoturnaReduzida: boolean
  diariaMin: number
  diaristaRecebeExtra: boolean
  observacao: string | null
}

export interface ModeloSugerido {
  chave: ModeloDeRegra
  nome: string
  paraQuem: string
  explicacao: string[]
  valores: Partial<RegraDaLoja>
  conferir: string[]
  fonte: { texto: string; link: string } | null
}

export interface RespostaDaRegra {
  atual: RegraDaLoja
  confirmada: boolean
  historico: RegraDaLoja[]
  padrao: RegraDaLoja
  modelos: ModeloSugerido[]
  abaixoDaLei: string[]
}

export type TipoDeAviso =
  | 'DIA_ACIMA_10H'
  | 'INTERVALO_MENOR_1H'
  | 'MENOS_DE_11H_ENTRE_JORNADAS'
  | 'BATIDA_INCOMPLETA'
  | 'BATIDA_FORA_DE_ORDEM'

export interface ApuracaoDoDia {
  data: string
  situacao:
    | 'TRABALHADO'
    | 'DOBRA'
    | 'FOLGA'
    | 'ATESTADO'
    | 'FALTA_JUSTIFICADA'
    | 'FALTA_INJUSTIFICADA'
  domingo: boolean
  feriado: boolean
  trabalhadosMin: number
  virtuaisMin: number
  intervaloMin: number | null
  jornadaMin: number
  extraMin: number
  extraSegundaFaixaMin: number
  extraEspecialMin: number
  extraSemanaMin: number
  noturnosMin: number
  noturnosPagosMin: number
  valorExtra: number
  valorNoturno: number
  valorDobra: number
  regra: ModeloDeRegra
  avisos: { tipo: TipoDeAviso; texto: string }[]
}

export interface TotaisDoPeriodo {
  trabalhadosMin: number
  virtuaisMin: number
  diasTrabalhados: number
  dobras: number
  atestados: number
  faltasJustificadas: number
  faltasInjustificadas: number
  extraMin: number
  extraSegundaFaixaMin: number
  extraEspecialMin: number
  extraSemanaMin: number
  noturnosMin: number
  noturnosPagosMin: number
  valorExtra: number
  valorExtraNormal: number
  valorExtraSegundaFaixa: number
  valorExtraEspecial: number
  valorNoturno: number
  valorDobras: number
  avisos: Record<TipoDeAviso, number>
}

export interface ResultadoDaApuracao {
  dias: ApuracaoDoDia[]
  totais: TotaisDoPeriodo
  valorHora: number
  valorHoraExtra: number
  regra: RegraDaLoja
}

/** Um dia do espelho ainda não salvo (as horas em ISO, com o fuso) */
export interface DiaEditado {
  data: string
  entrada: string | null
  saidaIntervalo: string | null
  voltaIntervalo: string | null
  saida: string | null
  entradaExtra: string | null
  saidaExtra: string | null
  dobra: boolean
  valorDobra: number | null
  ausencia: string | null
}

export async function obterRegraDoPonto() {
  const response = await api.get<RespostaDaRegra>('/hr/ponto/regra')
  return response.data
}

export type RegraParaSalvar = Omit<RegraDaLoja, 'id' | 'modelo'> & {
  modelo: Exclude<ModeloDeRegra, 'LEGADO'>
}

export async function salvarRegraDoPonto(regra: RegraParaSalvar) {
  const response = await api.post<{
    regra: RegraDaLoja
    abaixoDaLei: string[]
  }>('/hr/ponto/regra', regra)
  return response.data
}

export async function apurarPonto(params: {
  employee_id: string
  inicio: string
  fim: string
  dias?: DiaEditado[]
}) {
  const response = await api.post<ResultadoDaApuracao>(
    '/hr/ponto/apurar',
    params,
  )
  return response.data
}

export interface LinhaDoResumoDoPonto {
  employee: {
    id: string
    name: string
    role: string
    registrationType: string
    isRegistered: boolean
  }
  totais: TotaisDoPeriodo
  valorHora: number
  valorHoraExtra: number
}

export async function resumoDoPonto(params: { inicio: string; fim: string }) {
  const response = await api.get<{
    linhas: LinhaDoResumoDoPonto[]
    regra: RegraDaLoja
  }>('/hr/ponto/resumo', { params })
  return response.data
}

// ── Formatação comum às telas ─────────────────────────────────────────────

export const horas = (min: number) =>
  `${Math.floor(min / 60)}h${String(Math.round(min % 60)).padStart(2, '0')}`

/** Valor da hora pela regra da loja (igual a valorDaHora do servidor): horista = o valor dele; diarista = diária ÷ horas da
 *  diária; os outros = salário ÷ divisor. */
export function valorDaHoraPelaRegra(
  tipo: string,
  salario: number,
  diaria: number,
  regra: Pick<RegraDaLoja, 'divisor' | 'diariaMin'>,
) {
  if (tipo === 'HOURLY') return salario
  if (tipo === 'DAILY')
    return regra.diariaMin > 0 ? diaria / (regra.diariaMin / 60) : 0
  return regra.divisor > 0 ? salario / regra.divisor : 0
}

/** 1.5 → "50%" */
export const percentual = (multiplicador: number) =>
  `${Math.round((multiplicador - 1) * 100)}%`

export const NOMES_DOS_AVISOS: Record<TipoDeAviso, string> = {
  DIA_ACIMA_10H: 'Dias acima de 10 horas',
  INTERVALO_MENOR_1H: 'Intervalo menor que 1 hora',
  MENOS_DE_11H_ENTRE_JORNADAS: 'Menos de 11 horas entre jornadas',
  BATIDA_INCOMPLETA: 'Batida incompleta',
  BATIDA_FORA_DE_ORDEM: 'Batida fora de ordem',
}
