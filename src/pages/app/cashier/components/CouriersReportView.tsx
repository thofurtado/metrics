import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  ChevronDown,
  CircleSlash,
  Clock,
  Loader2,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  CourierDay,
  CourierInReport,
  CourierPayable,
  getCourierPayables,
  getCouriersReport,
} from '@/api/cashier/couriers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { diaOperacional } from '@/lib/dia-operacional'
import { cn } from '@/lib/utils'
import { diaCurto, diaDaSemana, moeda } from '@/utils/plataformas'

/**
 * Relatório dos motoboys (15/10/2026, plano 3): o que o PDV mandou (motoboys e entregas/diárias a pagar), só leitura. Por
 * motoboy no período: entregas, diárias, total ganho, pago em dinheiro, pago no Pix e pendente; abre o dia a dia e, em cada
 * dia, as entregas.
 */

type Periodo = { startDate: string; endDate: string }

function somarDias(dia: string, n: number): string {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d) + n * 86400000)
    .toISOString()
    .slice(0, 10)
}

function presets(hoje: string): { rotulo: string; periodo: Periodo }[] {
  const inicioMes = `${hoje.slice(0, 7)}-01`
  const mesPassadoFim = somarDias(inicioMes, -1)
  const mesPassadoInicio = `${mesPassadoFim.slice(0, 7)}-01`
  return [
    { rotulo: 'Hoje', periodo: { startDate: hoje, endDate: hoje } },
    {
      rotulo: 'Últimos 7 dias',
      periodo: { startDate: somarDias(hoje, -6), endDate: hoje },
    },
    { rotulo: 'Este mês', periodo: { startDate: inicioMes, endDate: hoje } },
    {
      rotulo: 'Mês passado',
      periodo: { startDate: mesPassadoInicio, endDate: mesPassadoFim },
    },
  ]
}

function textoDoGanho(m: CourierInReport): string {
  const partes: string[] = []
  if ((m.forma_ganho || '').toUpperCase() === 'PERCENTUAL')
    partes.push(
      `${Number(m.valor_por_entrega || 0).toLocaleString('pt-BR')}% da taxa`,
    )
  else if (m.valor_por_entrega > 0)
    partes.push(`${moeda(m.valor_por_entrega)} por entrega`)
  if (m.diaria > 0) partes.push(`diária ${moeda(m.diaria)}`)
  return partes.join(' · ')
}

function hora(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function Numero({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string
  valor: string
  destaque?: 'pendente' | 'ganho'
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{rotulo}</dt>
      <dd
        className={cn(
          'font-mono text-sm font-bold text-slate-900 dark:text-slate-100',
          destaque === 'ganho' && 'text-base font-black',
          destaque === 'pendente' && 'text-amber-700 dark:text-amber-400',
        )}
      >
        {valor}
      </dd>
    </div>
  )
}

export function CouriersReportView() {
  const hoje = diaOperacional()
  const atalhos = useMemo(() => presets(hoje), [hoje])
  const [periodo, setPeriodo] = useState<Periodo>(atalhos[2].periodo)
  const [aberto, setAberto] = useState<string | null>(null)

  const periodoValido =
    /^\d{4}-\d{2}-\d{2}$/.test(periodo.startDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(periodo.endDate)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['couriers-report', periodo.startDate, periodo.endDate],
    queryFn: () => getCouriersReport(periodo),
    enabled: periodoValido,
  })

  const motoboys = data?.motoboys || []
  const totais = data?.totais

  return (
    <div className="space-y-4">
      {/* Título e período */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
            <Bike className="h-5 w-5 text-blue-600" />
            Motoboys
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Entregas e diárias que o PDV mandou: quanto cada um ganhou e quanto
            falta pagar.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {atalhos.map((a) => {
              const ativo =
                a.periodo.startDate === periodo.startDate &&
                a.periodo.endDate === periodo.endDate
              return (
                <Button
                  key={a.rotulo}
                  type="button"
                  size="sm"
                  variant={ativo ? 'default' : 'outline'}
                  className="min-h-11"
                  aria-pressed={ativo}
                  onClick={() => setPeriodo(a.periodo)}
                >
                  {a.rotulo}
                </Button>
              )
            })}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="motoboys-de" className="text-xs">
                De
              </Label>
              <Input
                id="motoboys-de"
                type="date"
                value={periodo.startDate}
                max={periodo.endDate || undefined}
                onChange={(e) =>
                  setPeriodo((p) => ({ ...p, startDate: e.target.value }))
                }
                className="h-11 w-[11rem] text-base"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="motoboys-ate" className="text-xs">
                Até
              </Label>
              <Input
                id="motoboys-ate"
                type="date"
                value={periodo.endDate}
                min={periodo.startDate || undefined}
                onChange={(e) =>
                  setPeriodo((p) => ({ ...p, endDate: e.target.value }))
                }
                className="h-11 w-[11rem] text-base"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Totais do período */}
      {totais && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Entregas
            </dt>
            <dd className="mt-1 font-mono text-2xl font-black">
              {totais.entregas}
            </dd>
            <dd className="text-xs text-slate-500">
              {totais.diarias === 1 ? '1 diária' : `${totais.diarias} diárias`}
              {totais.nao_pagas > 0 && ` · ${totais.nao_pagas} não paga(s)`}
            </dd>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total ganho
            </dt>
            <dd className="mt-1 font-mono text-2xl font-black">
              {moeda(totais.ganho)}
            </dd>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pago em dinheiro
            </dt>
            <dd className="mt-1 font-mono text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {moeda(totais.pago_dinheiro)}
            </dd>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pago no Pix
            </dt>
            <dd className="mt-1 font-mono text-2xl font-black text-teal-700 dark:text-teal-400">
              {moeda(totais.pago_pix)}
            </dd>
            {totais.pago_outros > 0 && (
              <dd className="text-xs text-slate-500">
                + {moeda(totais.pago_outros)} sem forma
              </dd>
            )}
          </div>
          <div
            className={cn(
              'col-span-2 rounded-2xl border p-4 shadow-sm sm:col-span-1',
              totais.pendente > 0
                ? 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
            )}
          >
            <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pendente
            </dt>
            <dd
              className={cn(
                'mt-1 font-mono text-2xl font-black',
                totais.pendente > 0 && 'text-amber-700 dark:text-amber-400',
              )}
            >
              {moeda(totais.pendente)}
            </dd>
          </div>
        </dl>
      )}

      {/* Por motoboy */}
      {!periodoValido ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
          Escolha o período (de e até).
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border bg-white p-8 text-sm text-slate-500 dark:bg-slate-900">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando motoboys...
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          <p className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Não deu para carregar o
            relatório dos motoboys.
          </p>
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            Tentar de novo
          </Button>
        </div>
      ) : motoboys.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
          Nenhum motoboy neste período. Os motoboys e as entregas chegam do PDV
          quando ele sincroniza.
        </div>
      ) : (
        <div className="space-y-3">
          {motoboys.map((m) => (
            <CartaoDoMotoboy
              key={m.id}
              motoboy={m}
              periodo={periodo}
              aberto={aberto === m.id}
              onAlternar={() => setAberto((a) => (a === m.id ? null : m.id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CartaoDoMotoboy({
  motoboy: m,
  periodo,
  aberto,
  onAlternar,
}: {
  motoboy: CourierInReport
  periodo: Periodo
  aberto: boolean
  onAlternar: () => void
}) {
  const [diaAberto, setDiaAberto] = useState<string | null>(null)
  const ganho = textoDoGanho(m)
  const semMovimento = m.entregas + m.diarias + m.nao_pagas === 0

  // As entregas do período só quando a pessoa abre o motoboy
  const { data: linhas, isLoading: carregandoLinhas } = useQuery({
    queryKey: ['courier-payables', m.id, periodo.startDate, periodo.endDate],
    queryFn: () => getCourierPayables(m.id, periodo),
    enabled: aberto && !semMovimento,
  })

  const linhasPorDia = useMemo(() => {
    const mapa = new Map<string, CourierPayable[]>()
    for (const l of linhas || []) {
      const lista = mapa.get(l.day) || []
      lista.push(l)
      mapa.set(l.day, lista)
    }
    return mapa
  }, [linhas])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="break-words text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
              {m.nome}
            </p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              {m.sem_cadastro ? (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" /> Cadastro ainda não
                  chegou do PDV
                </span>
              ) : m.ativo ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Ativo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold">
                  <CircleSlash className="h-3.5 w-3.5" /> Inativo
                </span>
              )}
              {ganho && <span>{ganho}</span>}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950 sm:grid-cols-6">
          <Numero rotulo="Entregas" valor={String(m.entregas)} />
          <Numero rotulo="Diárias" valor={String(m.diarias)} />
          <Numero rotulo="Ganho" valor={moeda(m.ganho)} destaque="ganho" />
          <Numero rotulo="Dinheiro" valor={moeda(m.pago_dinheiro)} />
          <Numero rotulo="Pix" valor={moeda(m.pago_pix)} />
          <Numero
            rotulo="Pendente"
            valor={moeda(m.pendente)}
            destaque={m.pendente > 0 ? 'pendente' : undefined}
          />
        </dl>

        {m.nao_pagas > 0 && (
          <p className="text-xs text-slate-500">
            {m.nao_pagas === 1
              ? '1 entrega marcada como não paga'
              : `${m.nao_pagas} entregas marcadas como não pagas`}{' '}
            (fora do ganho).
          </p>
        )}

        {!semMovimento && (
          <button
            type="button"
            onClick={onAlternar}
            aria-expanded={aberto}
            className="inline-flex min-h-11 w-fit items-center gap-1 rounded-lg px-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40"
          >
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', aberto && 'rotate-180')}
            />
            {aberto ? 'Fechar dia a dia' : 'Ver dia a dia'}
          </button>
        )}
      </div>

      {aberto && (
        <div className="space-y-2 border-t border-slate-100 p-4 dark:border-slate-800">
          {m.dias.map((d) => (
            <LinhaDoDia
              key={d.dia}
              dia={d}
              aberto={diaAberto === d.dia}
              onAlternar={() =>
                setDiaAberto((x) => (x === d.dia ? null : d.dia))
              }
              linhas={linhasPorDia.get(d.dia) || []}
              carregando={carregandoLinhas}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LinhaDoDia({
  dia: d,
  aberto,
  onAlternar,
  linhas,
  carregando,
}: {
  dia: CourierDay
  aberto: boolean
  onAlternar: () => void
  linhas: CourierPayable[]
  carregando: boolean
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800">
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={aberto}
        className="flex min-h-11 w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60"
      >
        <span className="flex items-center gap-1 font-bold capitalize text-slate-900 dark:text-slate-100">
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', aberto && 'rotate-180')}
          />
          {diaDaSemana(d.dia).slice(0, 3)}, {diaCurto(d.dia)}
        </span>
        <span className="text-slate-600 dark:text-slate-400">
          {d.entregas} {d.entregas === 1 ? 'entrega' : 'entregas'}
          {d.diarias > 0 && ` · ${d.diarias} diária`}
        </span>
        <span className="font-mono font-semibold">Ganho {moeda(d.ganho)}</span>
        <span className="font-mono text-emerald-700 dark:text-emerald-400">
          Pago {moeda(d.pago)}
        </span>
        {d.pendente > 0 && (
          <span className="font-mono font-semibold text-amber-700 dark:text-amber-400">
            Pendente {moeda(d.pendente)}
          </span>
        )}
      </button>

      {aberto && (
        <div className="space-y-1.5 border-t border-slate-100 p-3 dark:border-slate-800">
          {carregando ? (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando entregas...
            </p>
          ) : linhas.length === 0 ? (
            <p className="text-sm text-slate-500">Sem detalhe deste dia.</p>
          ) : (
            linhas.map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950"
              >
                <div className="min-w-0">
                  <p className="break-words font-medium text-slate-800 dark:text-slate-200">
                    {hora(l.occurred_at) && (
                      <span className="mr-2 font-mono text-slate-500">
                        {hora(l.occurred_at)}
                      </span>
                    )}
                    {l.kind === 'DIARIA' ? 'Diária' : l.description || 'Entrega'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {l.kind !== 'DIARIA' && l.fee_charged > 0 && (
                      <>Taxa cobrada {moeda(l.fee_charged)} · </>
                    )}
                    <SituacaoDaLinha linha={l} />
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 font-mono font-bold',
                    l.status === 'NAO_PAGA' && 'text-slate-400 line-through',
                  )}
                >
                  {moeda(l.amount_due)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function SituacaoDaLinha({ linha: l }: { linha: CourierPayable }) {
  if (l.status === 'PAGA')
    return (
      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> Paga
        {l.payment_method ? ` no ${l.payment_method === 'Pix' ? 'Pix' : 'dinheiro'}` : ''}
      </span>
    )
  if (l.status === 'NAO_PAGA')
    return (
      <span className="inline-flex items-center gap-1 font-semibold">
        <CircleSlash className="h-3 w-3" /> Não paga
        {l.reason ? `: ${l.reason}` : ''}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
      <Clock className="h-3 w-3" /> Pendente
    </span>
  )
}
