// Dia operacional do restaurante (decisão do Thomás, 24-25/09/2026): o dia vira às 05:00 no horário de Brasília,
// igual para todos os clientes. Um caixa aberto às 18:00 do dia 24 e ainda aberto à 01:00 do dia 25 é do dia 24.
// Mesma regra do PDV (Metrics.Shared/Helpers/DiaOperacional.cs) e do backend (metrics-node/src/lib/dia-operacional.ts).
// O Ponto NÃO usa esta regra (vira às 07:00 no backend e às 04:00 na folha).
//
// O Brasil não tem horário de verão desde 2019, então Brasília é sempre UTC-3.

export const HORA_DA_VIRADA = 5
const OFFSET_BRASILIA_HORAS = -3
const HORA_MS = 60 * 60 * 1000
const DIA_MS = 24 * HORA_MS

/** Dia operacional (AAAA-MM-DD) de um instante: antes das 05:00 de Brasília conta para o dia anterior. */
export function diaOperacional(instante: Date = new Date()): string {
  const deslocado = new Date(instante.getTime() + (OFFSET_BRASILIA_HORAS - HORA_DA_VIRADA) * HORA_MS)
  return deslocado.toISOString().slice(0, 10)
}

/** Começo do dia operacional (05:00 de Brasília = 08:00 UTC). */
export function inicioDoDiaOperacional(dia: string): Date {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d, HORA_DA_VIRADA - OFFSET_BRASILIA_HORAS, 0, 0, 0))
}

/** Intervalo [início, fim) do dia operacional de um instante, para filtrar consultas ("de hoje"). */
export function intervaloDoDiaOperacional(instante: Date = new Date()): { dia: string; inicio: Date; fim: Date } {
  const dia = diaOperacional(instante)
  const inicio = inicioDoDiaOperacional(dia)
  return { dia, inicio, fim: new Date(inicio.getTime() + DIA_MS) }
}

/** Os dois instantes são do mesmo dia operacional? */
export function mesmoDiaOperacional(a: Date, b: Date): boolean {
  return diaOperacional(a) === diaOperacional(b)
}
