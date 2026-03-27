// ARQUIVO: FinanceCard.tsx
import { useQuery } from '@tanstack/react-query'
import { useState, type ComponentProps } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
    getFinanceMetrics,
} from '@/api/get-finance-metrics'
import { OverdueTransactionsModal } from './overdue-transactions-modal'

interface FinanceCardProps extends ComponentProps<'div'> {
    month: number
    year: number
}

// Componente auxiliar para formatar valores com a tipografia solicitada
const CurrencyValue = ({ value, className, size = "large" }: { value: number; className?: string; size?: "small" | "large" }) => {
    const formatted = value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    // Extrai o símbolo (R$) e o valor
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

export function FinanceCard({ className, month, year, ...props }: FinanceCardProps) {
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
        <Card className={cn("col-span-1 border-none bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm", className)} {...props}>
            <CardHeader className="p-8 pb-4 sm:p-10 sm:pb-6">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2.5">
                    <div className="h-2 w-2 rounded-full bg-indigo-500" />
                    Fluxo e Saúde Financeira
                </CardTitle>
            </CardHeader>

            <CardContent className="p-8 pt-0 sm:p-10 sm:pt-0 space-y-10">
                {/* Saldo Principal - Layout Premium */}
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">Saldo em Conta</span>
                        <div className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            isPositive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30'
                                : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/30'
                        )}>
                            {isPositive ? 'Estável' : 'Alerta'}
                        </div>
                    </div>
                    {isLoading ? (
                        <div className="h-10 w-48 bg-slate-200 animate-pulse rounded-xl mt-2"></div>
                    ) : (
                        <CurrencyValue 
                            value={saldoDisponivel} 
                            className={isPositive ? 'text-slate-900 dark:text-slate-50' : 'text-rose-600'} 
                        />
                    )}
                </div>

                {/* Grid de Receitas e Despesas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                    {/* Coluna de Receitas */}
                    <div className="space-y-6">
                        <div>
                            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest block mb-3">Receitas</span>
                            {isLoading ? (
                                <div className="h-8 w-32 bg-slate-100 animate-pulse rounded-lg"></div>
                            ) : (
                                <CurrencyValue value={receita} size="large" className="text-emerald-600" />
                            )}
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                             <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-400">Previsão:</span>
                                <CurrencyValue value={aReceber} size="small" className="text-emerald-500" />
                             </div>
                             <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-400">Vencido:</span>
                                <CurrencyValue value={receitaVencida} size="small" className="text-amber-600" />
                             </div>
                        </div>
                    </div>

                    {/* Coluna de Despesas */}
                    <div className="space-y-6">
                        <div>
                            <span className="text-xs font-bold text-rose-600 uppercase tracking-widest block mb-3">Despesas</span>
                            {isLoading ? (
                                <div className="h-8 w-32 bg-slate-100 animate-pulse rounded-lg"></div>
                            ) : (
                                <CurrencyValue value={despesa} size="large" className="text-rose-600" />
                            )}
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                             <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-400">A Pagar:</span>
                                <CurrencyValue value={aPagar} size="small" className="text-rose-500" />
                             </div>
                             <div 
                                onClick={() => setIsOverdueModalOpen(true)}
                                className="flex items-center justify-between cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-900/10 p-1.5 -mx-1.5 rounded-xl transition-all group"
                             >
                                <span className="text-xs font-bold text-rose-700 underline decoration-rose-200 underline-offset-4">Vencidos:</span>
                                <CurrencyValue value={despesaVencida} size="small" className="text-rose-600 group-hover:scale-110 transition-transform origin-right" />
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