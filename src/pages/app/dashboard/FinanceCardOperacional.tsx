import { useQuery } from '@tanstack/react-query'
import { useState, type ComponentProps } from 'react'
import { Wallet, TrendingUp, AlertTriangle, CalendarClock, Target } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getOperationalSummary } from '@/api/get-operational-summary'
import { OverdueTransactionsModal } from './overdue-transactions-modal'
import { UpcomingTransactionsModal } from './upcoming-transactions-modal'

interface FinanceCardOperacionalProps extends ComponentProps<'div'> {
    month: number
    year: number
}

// Função auxiliar para formatar em Reais
const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function FinanceCardOperacional({ className, month, year, ...props }: FinanceCardOperacionalProps) {
    const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false)
    const [isUpcomingModalOpen, setIsUpcomingModalOpen] = useState(false)

    const { data: opData, isLoading } = useQuery({
        queryFn: () => getOperationalSummary({ month, year }),
        queryKey: ['metrics', 'operational-summary', month, year],
    })

    const totalDespesasMes = opData?.totalDespesasMes ?? 0
    const despesasPagasMes = opData?.despesasPagasMes ?? 0
    const totalVencido = opData?.totalVencido ?? 0
    const projecao14Dias = opData?.projecao14Dias ?? 0
    const receitaAcumulada = opData?.receitaAcumulada ?? 0
    const ticketMedio = opData?.ticketMedio ?? 0
    const numEntradas = opData?.numEntradas ?? 0
    const totalJurosPagos = opData?.totalJurosPagos ?? 0

    // Cálculo da porcentagem para a barra de progresso (evitando NaN/Infinity)
    const progressPercentage = totalDespesasMes > 0
        ? Math.min((despesasPagasMes / totalDespesasMes) * 100, 100)
        : 0

    return (
        <Card className={cn("col-span-1 flex flex-col", className)} {...props}>
            <CardHeader className="flex flex-row items-center justify-between pb-4 sm:pb-6">
                <CardTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 font-manrope tracking-tight">
                    <Wallet className="h-4 w-4 text-indigo-600" />
                    Fluxo e Saúde Financeira
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 space-y-4">
                {/* Topo: Receita e Despesa Mensal */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/50 col-span-2 sm:col-span-1 flex flex-col justify-between shadow-sm">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400">Receita Mensal</span>
                            </div>
                            {isLoading ? (
                                <div className="h-8 w-24 bg-emerald-200 animate-pulse rounded mt-1"></div>
                            ) : (
                                <span className="text-2xl font-black text-emerald-600 block tabular-nums tracking-tighter">
                                    {formatCurrency(receitaAcumulada)}
                                </span>
                            )}
                        </div>
                        {/* Sub-indicadores da Receita */}
                        {!isLoading && (
                            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-emerald-200/50 dark:border-emerald-800/30">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-emerald-800/60 uppercase">Ticket Médio</span>
                                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(ticketMedio)}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-emerald-800/60 uppercase">Vendas</span>
                                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">{numEntradas}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1 flex flex-col justify-between shadow-sm">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Wallet className="h-4 w-4 text-slate-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Despesa Mensal</span>
                            </div>
                            {isLoading ? (
                                <div className="h-8 w-24 bg-slate-200 animate-pulse rounded mt-1"></div>
                            ) : (
                                <span className="text-2xl font-black text-slate-800 dark:text-slate-200 block tabular-nums tracking-tighter">
                                    {formatCurrency(totalDespesasMes)}
                                </span>
                            )}
                        </div>
                        {/* Sub-indicadores da Despesa */}
                        {!isLoading && (
                            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-1.5 focus-within:ring-2">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase">Juros Pagos:</span>
                                    <span className="text-sm font-black text-rose-600 dark:text-rose-400">{formatCurrency(totalJurosPagos)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Corpo: Barra de Progresso (Ponto de Equilíbrio) */}
                <div className="space-y-4 py-4 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-indigo-600" />
                            <span className="text-xs font-black uppercase tracking-widest text-slate-600">Equilíbrio do Mês</span>
                        </div>
                        {isLoading ? (
                            <div className="h-5 w-16 bg-slate-200 animate-pulse rounded-full" />
                        ) : (
                            <span className={cn(
                                "px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                                progressPercentage >= 100 
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" 
                                    : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            )}>
                                {progressPercentage.toFixed(0)}% Pago
                            </span>
                        )}
                    </div>
                    
                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                        <div
                            className="bg-indigo-600 h-full transition-all duration-1000 ease-in-out"
                            style={{ width: `${isLoading ? 0 : progressPercentage}%` }}
                        />
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <div className="flex items-center gap-2">
                            <span>Liquidado:</span>
                            <span className="text-indigo-600 tabular-nums">
                                {isLoading ? "---" : formatCurrency(despesasPagasMes)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>Total:</span>
                            <span className="text-slate-800 dark:text-slate-200 tabular-nums">
                                {isLoading ? "---" : formatCurrency(totalDespesasMes)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Base: Restante das métricas em Grid */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    {/* Bloco Compromissos Vencidos */}
                    <div 
                        onClick={() => setIsOverdueModalOpen(true)}
                        className="bg-rose-50 dark:bg-rose-950/20 rounded-xl p-4 border border-rose-100 dark:border-rose-900/50 cursor-pointer hover:bg-rose-100 transition-all shadow-sm group"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-rose-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-800 dark:text-rose-400">Total Vencido</span>
                        </div>
                        {isLoading ? (
                            <div className="h-6 w-20 bg-rose-200 animate-pulse rounded"></div>
                        ) : (
                            <span className="text-xl font-black text-rose-600 block tabular-nums">
                                {formatCurrency(totalVencido)}
                            </span>
                        )}
                    </div>

                    {/* Bloco Projeção de 14 dias */}
                    <div 
                        onClick={() => setIsUpcomingModalOpen(true)}
                        className="bg-indigo-50 dark:bg-indigo-950/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900/50 cursor-pointer hover:bg-indigo-100 transition-all shadow-sm group"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <CalendarClock className="h-4 w-4 text-indigo-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-800 dark:text-indigo-400">A Vencer (14d)</span>
                        </div>
                        {isLoading ? (
                            <div className="h-6 w-20 bg-indigo-200 animate-pulse rounded"></div>
                        ) : (
                            <span className="text-xl font-black text-indigo-600 block tabular-nums">
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
