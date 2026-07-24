// ARQUIVO: InventoryCard.tsx - Integração com a nova API Operacional/Inventário

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, TrendingUp } from 'lucide-react'
import { type ComponentProps } from 'react'

// 💡 IMPORTAÇÃO DA NOVA API
import {
  getInventoryMetrics,
  type GetInventoryMetricsResponse,
} from '@/api/get-inventory-metrics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface InventoryCardProps extends ComponentProps<'div'> {
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

export function InventoryCard({
  className,
  month,
  year,
  ...props
}: InventoryCardProps) {
  const { data: metrics, isLoading } = useQuery<GetInventoryMetricsResponse>({
    queryFn: () => getInventoryMetrics({ month, year }),
    queryKey: ['metrics', 'inventory-metrics', month, year],
  })

  const patrimonioAmount = metrics?.patrimonioEstoque ?? 0
  const criticalItemsCount = metrics?.itensCriticos ?? 0
  const productRevenue = metrics?.receitaProdutos ?? 0
  const serviceRevenue = metrics?.receitaServicos ?? 0

  const isCritical = criticalItemsCount > 5

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
          Inventário e Vendas
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-10 p-8 pt-0 sm:p-10 sm:pt-0">
        {/* Patrimônio Principal */}
        <div className="flex flex-col gap-2 rounded-3xl border border-slate-100 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-tight text-slate-500">
              Patrimônio em Estoque
            </span>
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest',
                isCritical
                  ? 'border-rose-100 bg-rose-50 text-rose-700 dark:bg-rose-900/30'
                  : 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30',
              )}
            >
              <AlertTriangle className="h-3 w-3" />
              {criticalItemsCount}{' '}
              {criticalItemsCount === 1 ? 'Item Crítico' : 'Itens Críticos'}
            </div>
          </div>
          {isLoading ? (
            <div className="mt-2 h-10 w-48 animate-pulse rounded-xl bg-slate-200"></div>
          ) : (
            <CurrencyValue
              value={patrimonioAmount}
              className="text-slate-900 dark:text-slate-50"
            />
          )}
        </div>

        {/* Grid de Receitas: Produtos e Serviços */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Produtos */}
          <div className="space-y-6">
            <div>
              <span className="mb-3 block flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-600">
                <TrendingUp className="h-3 w-3" />
                Produtos
              </span>
              {isLoading ? (
                <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-100"></div>
              ) : (
                <CurrencyValue
                  value={productRevenue}
                  size="large"
                  className="text-emerald-600"
                />
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">
                  Orçamento aberto:
                </span>
                <CurrencyValue
                  value={metrics?.orcamentoProdutos ?? 0}
                  size="small"
                  className="text-amber-600"
                />
              </div>
            </div>
          </div>

          {/* Serviços */}
          <div className="space-y-6">
            <div>
              <span className="mb-3 block flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-600">
                <TrendingUp className="h-3 w-3" />
                Serviços
              </span>
              {isLoading ? (
                <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-100"></div>
              ) : (
                <CurrencyValue
                  value={serviceRevenue}
                  size="large"
                  className="text-emerald-600"
                />
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">
                  Orçamento aberto:
                </span>
                <CurrencyValue
                  value={metrics?.orcamentoServicos ?? 0}
                  size="small"
                  className="text-amber-600"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
