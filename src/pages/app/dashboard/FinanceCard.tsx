// ARQUIVO: FinanceCard.tsx
import { useQuery } from '@tanstack/react-query'
import { type ComponentProps, useState } from 'react'

import { getFinanceMetrics } from '@/api/get-finance-metrics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import { OverdueTransactionsModal } from './overdue-transactions-modal'

interface FinanceCardProps extends ComponentProps<'div'> {
  month: number
  year: number
}

// Componente auxiliar para formatar valores com a tipografia solicitada
const CurrencyValue = ({
  value,
  className,
  size = 'large',
}: {
  value: number
  className?: string
  size?: 'small' | 'large'
}) => {
  const formatted = value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
  // Extrai o símbolo (R$) e o valor
  const parts = formatted.split(/\s+/)
  const symbol = parts[0]
  const amount = parts[1]

  return (
    <span className={cn('font-manrope tabular-nums', className)}>
      <span
        className={cn(
          'mr-0.5 font-medium opacity-70',
          size === 'large' ? 'text-sm' : 'text-xs',
        )}
      >
        {symbol}
      </span>
      <span
        className={cn(
          'font-black tracking-tight',
          size === 'large' ? 'text-3xl' : 'text-lg',
        )}
      >
        {amount}
      </span>
    </span>
  )
}

export function FinanceCard({
  className,
  month,
  year,
  ...props
}: FinanceCardProps) {
  const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false)

  // Query para buscar todos os dados financeiros
  const { data: financeData, isLoading } = useQuery({
    queryFn: () => getFinanceMetrics({ month, year }),
    queryKey: ['metrics', 'finance-metrics', month, year],
  })

  const saldoDisponivel = financeData?.saldoDisponivel ?? 0
  const receita = financeData?.receita ?? 0
  const despesa = financeData?.despesa ?? 0
  const aReceber = financeData?.aReceber ?? 0
  const aPagar = financeData?.aPagar ?? 0
  const receitaVencida = financeData?.receitaVencida ?? 0
  const despesaVencida = financeData?.despesaVencida ?? 0

  const isPositive = saldoDisponivel >= 0

  return (
    <Card
      className={cn(
        'col-span-1 border-none bg-white/50 shadow-sm backdrop-blur-sm dark:bg-slate-900/50',
        className,
      )}
      {...props}
    >
      <CardHeader className="p-8 pb-4 sm:p-10 sm:pb-6">
        <CardTitle className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-widest text-slate-500">
          <div className="h-2 w-2 rounded-full bg-indigo-500" />
          Fluxo e Saúde Financeira
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-10 p-8 pt-0 sm:p-10 sm:pt-0">
        {/* Saldo Principal - Layout Premium */}
        <div className="flex flex-col gap-2 rounded-3xl border border-slate-100 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-tight text-slate-500">
              Saldo em Conta
            </span>
            <div
              className={cn(
                'rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest',
                isPositive
                  ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30'
                  : 'border-rose-100 bg-rose-50 text-rose-700 dark:bg-rose-900/30',
              )}
            >
              {isPositive ? 'Estável' : 'Alerta'}
            </div>
          </div>
          {isLoading ? (
            <div className="mt-2 h-10 w-48 animate-pulse rounded-xl bg-slate-200"></div>
          ) : (
            <CurrencyValue
              value={saldoDisponivel}
              className={
                isPositive
                  ? 'text-slate-900 dark:text-slate-50'
                  : 'text-rose-600'
              }
            />
          )}
        </div>

        {/* Grid de Receitas e Despesas */}
        <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Coluna de Receitas */}
          <div className="space-y-6">
            <div>
              <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-emerald-600">
                Receitas
              </span>
              {isLoading ? (
                <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-100"></div>
              ) : (
                <CurrencyValue
                  value={receita}
                  size="large"
                  className="text-emerald-600"
                />
              )}
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">
                  Previsão:
                </span>
                <CurrencyValue
                  value={aReceber}
                  size="small"
                  className="text-emerald-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">
                  Vencido:
                </span>
                <CurrencyValue
                  value={receitaVencida}
                  size="small"
                  className="text-amber-600"
                />
              </div>
            </div>
          </div>

          {/* Coluna de Despesas */}
          <div className="space-y-6">
            <div>
              <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-rose-600">
                Despesas
              </span>
              {isLoading ? (
                <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-100"></div>
              ) : (
                <CurrencyValue
                  value={despesa}
                  size="large"
                  className="text-rose-600"
                />
              )}
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">
                  A Pagar:
                </span>
                <CurrencyValue
                  value={aPagar}
                  size="small"
                  className="text-rose-500"
                />
              </div>
              <div
                onClick={() => setIsOverdueModalOpen(true)}
                className="group -mx-1.5 flex cursor-pointer items-center justify-between rounded-xl p-1.5 transition-all hover:bg-rose-50 dark:hover:bg-rose-900/10"
              >
                <span className="text-xs font-bold text-rose-700 underline decoration-rose-200 underline-offset-4">
                  Vencidos:
                </span>
                <CurrencyValue
                  value={despesaVencida}
                  size="small"
                  className="origin-right text-rose-600 transition-transform group-hover:scale-110"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <OverdueTransactionsModal
        open={isOverdueModalOpen}
        onOpenChange={setIsOverdueModalOpen}
      />
    </Card>
  )
}
