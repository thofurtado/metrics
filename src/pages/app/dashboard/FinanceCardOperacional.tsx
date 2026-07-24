import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  CalendarClock,
  ShieldAlert,
  ShieldCheck,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { type ComponentProps, useState } from 'react'

import { getFinanceMetrics } from '@/api/get-finance-metrics'
import { getOperationalSummary } from '@/api/get-operational-summary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import { OverdueTransactionsModal } from './overdue-transactions-modal'
import { UpcomingTransactionsModal } from './upcoming-transactions-modal'

interface FinanceCardOperacionalProps extends ComponentProps<'div'> {
  month: number
  year: number
}

// Função auxiliar para formatar em Reais
const formatCurrency = (value: number, hideSymbol = false) => {
  if (hideSymbol) {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function FinanceCardOperacional({
  className,
  month,
  year,
  ...props
}: FinanceCardOperacionalProps) {
  const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false)
  const [isUpcomingModalOpen, setIsUpcomingModalOpen] = useState(false)

  const { data: opData, isLoading: isLoadingOp } = useQuery({
    queryFn: () => getOperationalSummary({ month, year }),
    queryKey: ['metrics', 'operational-summary', month, year],
  })

  const { data: financeData, isLoading: isLoadingFin } = useQuery({
    queryFn: () => getFinanceMetrics({ month, year }),
    queryKey: ['metrics', 'finance-metrics', month, year],
  })

  const isLoading = isLoadingOp || isLoadingFin

  const projecao14Dias = opData?.projecao14Dias ?? 0
  const receitaAcumulada = opData?.receitaAcumulada ?? 0
  const ticketMedio = opData?.ticketMedio ?? 0
  const numEntradas = opData?.numEntradas ?? 0
  const totalJurosPagos = opData?.totalJurosPagos ?? 0

  // Dados Financeiros Claros
  const saldoDisponivel = financeData?.saldoDisponivel ?? 0
  const aPagarMes = financeData?.aPagar ?? 0
  const despesaDoMes = financeData?.despesa ?? 0
  const despesaPagaMes = Math.max(0, despesaDoMes - aPagarMes)
  const despesaVencida =
    opData?.totalVencido ?? financeData?.despesaVencida ?? 0

  // Total de Compromissos = Despesas Pagas no Mês + A Pagar no Mês + Vencidos de Meses Anteriores
  const totalCompromissos = despesaPagaMes + aPagarMes + despesaVencida
  const safeCompromissos = totalCompromissos > 0 ? totalCompromissos : 1

  // Pendência de Caixa Restante e Porcentagem Quitada
  const pendenciaRestante = aPagarMes + despesaVencida
  const pctQuitado =
    totalCompromissos > 0 ? (despesaPagaMes / totalCompromissos) * 100 : 100

  // Cobertura de Caixa (Saldo em Carteira vs Pendências)
  const saldoAposPendencias = saldoDisponivel - pendenciaRestante
  const temCoberturaTotal = saldoAposPendencias >= 0

  const segmentsCompromissos = [
    {
      label: 'Pago Mês',
      value: despesaPagaMes,
      pct: (despesaPagaMes / safeCompromissos) * 100,
      color: 'bg-emerald-500',
    },
    {
      label: 'A Pagar Mês',
      value: aPagarMes,
      pct: (aPagarMes / safeCompromissos) * 100,
      color: 'bg-amber-400',
    },
    {
      label: 'Vencido',
      value: despesaVencida,
      pct: (despesaVencida / safeCompromissos) * 100,
      color: 'bg-rose-500',
    },
  ]

  return (
    <Card className={cn('col-span-1 flex flex-col', className)} {...props}>
      {/* Header: Título + Badge de Saldo em Carteira */}
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3 sm:pb-4">
        <CardTitle className="flex items-center gap-2 font-manrope text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          <Wallet className="h-4 w-4 text-indigo-600" />
          Saúde Financeira e Ponto de Equilíbrio
        </CardTitle>

        {/* Badge de Saldo em Carteira (Topo) */}
        {!isLoading && (
          <div className="shadow-xs flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 dark:border-slate-700/60 dark:bg-slate-800/80">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Em Carteira:
            </span>
            <span className="text-xs font-black tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatCurrency(saldoDisponivel)}
            </span>
            {temCoberturaTotal ? (
              <span
                title="Caixa Positivo para cobrir débitos pendentes"
                className="flex items-center text-emerald-600 dark:text-emerald-400"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
            ) : (
              <span
                title="Atenção: Déficit de Caixa para cobrir pendências"
                className="flex items-center text-rose-600 dark:text-rose-400"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Topo: Receita e Despesa Mensal */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col justify-between rounded-xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20 sm:col-span-1">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400">
                  Receita Mensal
                </span>
              </div>
              {isLoading ? (
                <div className="mt-1 h-8 w-24 animate-pulse rounded bg-emerald-200"></div>
              ) : (
                <div className="flex items-baseline gap-1 overflow-hidden">
                  <span className="shrink-0 text-sm font-bold text-emerald-600/70">
                    R$
                  </span>
                  <span
                    className="block truncate text-xl font-black tabular-nums tracking-tighter text-emerald-600"
                    title={formatCurrency(receitaAcumulada)}
                  >
                    {formatCurrency(receitaAcumulada, true)}
                  </span>
                </div>
              )}
            </div>
            {/* Sub-indicadores da Receita */}
            {!isLoading && (
              <div className="mt-4 flex items-center gap-4 border-t border-emerald-200/50 pt-3 dark:border-emerald-800/30">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase text-emerald-800/60">
                    Ticket Médio
                  </span>
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(ticketMedio)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase text-emerald-800/60">
                    Vendas
                  </span>
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                    {numEntradas}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="col-span-2 flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 sm:col-span-1">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-slate-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Despesa Mensal
                </span>
              </div>
              {isLoading ? (
                <div className="mt-1 h-8 w-24 animate-pulse rounded bg-slate-200"></div>
              ) : (
                <div className="flex items-baseline gap-1 overflow-hidden">
                  <span className="shrink-0 text-sm font-bold text-slate-500">
                    R$
                  </span>
                  <span
                    className="block truncate text-xl font-black tabular-nums tracking-tighter text-slate-800 dark:text-slate-200"
                    title={formatCurrency(despesaDoMes)}
                  >
                    {formatCurrency(despesaDoMes, true)}
                  </span>
                </div>
              )}
            </div>
            {/* Sub-indicadores da Despesa */}
            {!isLoading && (
              <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold uppercase text-slate-500">
                    Juros Pagos:
                  </span>
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                    {formatCurrency(totalJurosPagos)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bloco Central: Gestão de Compromissos (Débitos) */}
        <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 py-3.5 dark:border-slate-800 dark:bg-slate-900/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                Gestão de Compromissos (Débitos)
              </span>
            </div>

            {!isLoading && (
              <div className="flex items-center gap-2">
                {/* Total de Débitos destacado no topo do bloco */}
                <span className="rounded-full border border-rose-100 bg-rose-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/50 dark:text-rose-400">
                  Total: {formatCurrency(totalCompromissos)}
                </span>
                {/* Badge de % Quitado */}
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider',
                    pctQuitado >= 100
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400',
                  )}
                >
                  {pctQuitado.toFixed(0)}% Quitados
                </span>
              </div>
            )}
          </div>

          {/* Barra Tríplice de Compromissos (Pago vs A Pagar vs Vencido) */}
          <div className="relative flex h-4 w-full overflow-hidden rounded-full bg-slate-200 shadow-inner dark:bg-slate-800">
            {!isLoading &&
              segmentsCompromissos.map(
                (seg, i) =>
                  seg.value > 0 && (
                    <div
                      key={i}
                      title={`${seg.label}: ${formatCurrency(seg.value)} (${seg.pct.toFixed(1)}%)`}
                      className={`${seg.color} h-full cursor-pointer transition-all duration-1000 ease-in-out hover:scale-y-110 hover:opacity-85`}
                      style={{ width: `${seg.pct}%` }}
                    />
                  ),
              )}
          </div>

          {/* Legenda Explicativa Limpa e Direta */}
          {!isLoading && (
            <div className="flex items-center justify-between gap-2 pt-0.5 text-[10px] font-bold text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                <span>
                  Pago Mês:{' '}
                  <strong className="tabular-nums text-slate-800 dark:text-slate-200">
                    {formatCurrency(despesaPagaMes)}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                <span>
                  A Pagar Mês:{' '}
                  <strong className="tabular-nums text-slate-800 dark:text-slate-200">
                    {formatCurrency(aPagarMes)}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                <span>
                  Vencido:{' '}
                  <strong className="tabular-nums text-slate-800 dark:text-slate-200">
                    {formatCurrency(despesaVencida)}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Base: Restante das métricas em Grid */}
        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          {/* Bloco Compromissos Vencidos */}
          <div
            onClick={() => setIsOverdueModalOpen(true)}
            className="group cursor-pointer rounded-xl border border-rose-100 bg-rose-50 p-4 shadow-sm transition-all hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/20"
          >
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-800 dark:text-rose-400">
                Total Vencido
              </span>
            </div>
            {isLoading ? (
              <div className="h-6 w-20 animate-pulse rounded bg-rose-200"></div>
            ) : (
              <span className="block text-xl font-black tabular-nums text-rose-600">
                {formatCurrency(despesaVencida)}
              </span>
            )}
          </div>

          {/* Bloco Projeção de 14 dias */}
          <div
            onClick={() => setIsUpcomingModalOpen(true)}
            className="group cursor-pointer rounded-xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm transition-all hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/20"
          >
            <div className="mb-2 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-indigo-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-800 dark:text-indigo-400">
                A Vencer (14d)
              </span>
            </div>
            {isLoading ? (
              <div className="h-6 w-20 animate-pulse rounded bg-indigo-200"></div>
            ) : (
              <span className="block text-xl font-black tabular-nums text-indigo-600">
                {formatCurrency(projecao14Dias)}
              </span>
            )}
          </div>
        </div>
      </CardContent>

      <OverdueTransactionsModal
        open={isOverdueModalOpen}
        onOpenChange={setIsOverdueModalOpen}
      />
      <UpcomingTransactionsModal
        open={isUpcomingModalOpen}
        onOpenChange={setIsUpcomingModalOpen}
      />
    </Card>
  )
}
