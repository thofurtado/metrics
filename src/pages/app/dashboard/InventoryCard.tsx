// ARQUIVO: InventoryCard.tsx - Integração com a nova API Operacional/Inventário

import { useQuery } from '@tanstack/react-query'
import { type ComponentProps } from 'react'
import { AlertTriangle, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// 💡 IMPORTAÇÃO DA NOVA API
import {
    getInventoryMetrics,
    type GetInventoryMetricsResponse
} from '@/api/get-inventory-metrics'

interface InventoryCardProps extends ComponentProps<'div'> {
    month: number
    year: number
}

// Componente auxiliar para formatar valores com a tipografia solicitada
const CurrencyValue = ({ value, className, size = "large" }: { value: number; className?: string; size?: "small" | "large" }) => {
    const formatted = value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const parts = formatted.split(/\s+/)
    const symbol = parts[0]
    const amount = parts[1]

    return (
        <span className={cn("tabular-nums font-manrope", className)}>
            <span className={cn("font-medium opacity-70 mr-0.5", size === "large" ? "text-sm" : "text-xs")}>
                {symbol}
            </span>
            <span className={cn("font-black tracking-tight", size === "large" ? "text-3xl" : "text-lg")}>
                {amount}
            </span>
        </span>
    )
}

export function InventoryCard({ className, month, year, ...props }: InventoryCardProps) {
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
        <Card className={cn("col-span-1 border-none bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm", className)} {...props}>
            <CardHeader className="p-8 pb-4 sm:p-10 sm:pb-6">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2.5">
                    <div className="h-2 w-2 rounded-full bg-indigo-500" />
                    Inventário e Vendas
                </CardTitle>
            </CardHeader>

            <CardContent className="p-8 pt-0 sm:p-10 sm:pt-0 space-y-10">

                {/* Patrimônio Principal */}
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">Patrimônio em Estoque</span>
                        <div className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5",
                            isCritical
                                ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/30'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30'
                        )}>
                            <AlertTriangle className="h-3 w-3" />
                            {criticalItemsCount} {criticalItemsCount === 1 ? 'Item Crítico' : 'Itens Críticos'}
                        </div>
                    </div>
                    {isLoading ? (
                        <div className="h-10 w-48 bg-slate-200 animate-pulse rounded-xl mt-2"></div>
                    ) : (
                        <CurrencyValue value={patrimonioAmount} className="text-slate-900 dark:text-slate-50" />
                    )}
                </div>

                {/* Grid de Receitas: Produtos e Serviços */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Produtos */}
                    <div className="space-y-6">
                        <div>
                             <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest block mb-3 flex items-center gap-2">
                                <TrendingUp className="h-3 w-3" />
                                Produtos
                             </span>
                            {isLoading ? (
                                <div className="h-8 w-32 bg-slate-100 animate-pulse rounded-lg"></div>
                            ) : (
                                <CurrencyValue value={productRevenue} size="large" className="text-emerald-600" />
                            )}
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                             <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-400">Orçamento aberto:</span>
                                <CurrencyValue value={metrics?.orcamentoProdutos ?? 0} size="small" className="text-amber-600" />
                             </div>
                        </div>
                    </div>

                    {/* Serviços */}
                    <div className="space-y-6">
                        <div>
                             <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest block mb-3 flex items-center gap-2">
                                <TrendingUp className="h-3 w-3" />
                                Serviços
                             </span>
                            {isLoading ? (
                                <div className="h-8 w-32 bg-slate-100 animate-pulse rounded-lg"></div>
                            ) : (
                                <CurrencyValue value={serviceRevenue} size="large" className="text-emerald-600" />
                            )}
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                             <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-400">Orçamento aberto:</span>
                                <CurrencyValue value={metrics?.orcamentoServicos ?? 0} size="small" className="text-amber-600" />
                             </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}