import { useQuery } from '@tanstack/react-query'
import { useState, type ComponentProps } from 'react'
import { Wallet, TrendingUp, AlertTriangle, CalendarClock, Tag, Target } from 'lucide-react'

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
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-minsk-600" />
                    Fluxo e Saúde Financeira
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 space-y-4">
                {/* Topo: Receita e Despesa Mensal */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-vida-loca-50 dark:bg-vida-loca-900/20 rounded-lg p-3 border border-vida-loca-100 dark:border-vida-loca-800 col-span-2 sm:col-span-1 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-1.5 mb-1">
                                <TrendingUp className="h-3.5 w-3.5 text-vida-loca-600" />
                                <span className="text-xs font-semibold text-vida-loca-700">Receita Mensal</span>
                            </div>
                            {isLoading ? (
                                <div className="h-6 w-24 bg-vida-loca-200 animate-pulse rounded mt-1"></div>
                            ) : (
                                <span className="text-xl font-bold text-vida-loca-600 block tabular-nums">
                                    {formatCurrency(receitaAcumulada)}
                                </span>
                            )}
                        </div>
                        {/* Sub-indicadores da Receita */}
                        {!isLoading && (
                            <div className="flex items-center gap-3 mt-3 pt-2 border-t border-vida-loca-200 dark:border-vida-loca-800/50">
                                <div className="flex items-center gap-1.5">
                                    <Tag className="h-3.5 w-3.5 text-vida-loca-600/70" />
                                    <span className="text-xs font-medium text-vida-loca-700/80">Ticket Médio: <span className="font-bold text-vida-loca-800 dark:text-vida-loca-300">{formatCurrency(ticketMedio)}</span></span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-medium text-vida-loca-700/80 underline decoration-vida-loca-300 underline-offset-2">Qtd: <span className="font-bold text-vida-loca-800 dark:text-vida-loca-300">{numEntradas}</span></span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-3 border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-1.5 mb-1">
                                <Wallet className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Despesa Mensal</span>
                            </div>
                            {isLoading ? (
                                <div className="h-6 w-24 bg-slate-200 animate-pulse rounded mt-1"></div>
                            ) : (
                                <span className="text-xl font-bold text-slate-700 dark:text-slate-200 block tabular-nums">
                                    {formatCurrency(totalDespesasMes)}
                                </span>
                            )}
                        </div>
                        {/* Sub-indicadores da Despesa */}
                        {!isLoading && (
                            <div className="flex items-center mt-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-1.5">
                                    <AlertTriangle className="h-3.5 w-3.5 text-stiletto-500/70" />
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Total Juros: <span className="font-bold text-stiletto-600 dark:text-stiletto-400">{formatCurrency(totalJurosPagos)}</span></span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Corpo: Barra de Progresso (Ponto de Equilíbrio) */}
                <div className="space-y-3 py-2 bg-muted/20 dark:bg-muted/5 rounded-xl p-3 border border-dashed border-muted-foreground/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-vida-loca-100 dark:bg-vida-loca-900/30 rounded-lg">
                                <Target className="h-4 w-4 text-vida-loca-600" />
                            </div>
                            <span className="text-sm font-semibold text-foreground">Equilíbrio do Mês</span>
                        </div>
                        {isLoading ? (
                            <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
                        ) : (
                            <span className={cn(
                                "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border",
                                progressPercentage >= 100 
                                    ? "bg-vida-loca-100 text-vida-loca-700 border-vida-loca-200" 
                                    : "bg-muted text-muted-foreground border-muted-foreground/20"
                            )}>
                                {progressPercentage.toFixed(0)}% Concluído
                            </span>
                        )}
                    </div>
                    
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 relative shadow-inner">
                        <div
                            className="bg-gradient-to-r from-vida-loca-400 to-vida-loca-600 h-full transition-all duration-1000 ease-in-out shadow-[0_0_8px_rgba(22,163,74,0.4)]"
                            style={{ width: `${isLoading ? 0 : progressPercentage}%` }}
                        />
                    </div>
                    
                    <div className="flex items-center justify-between text-[11px] font-medium px-0.5">
                        <div className="flex items-center gap-1 text-muted-foreground">
                            <span>Pago:</span>
                            <span className="text-vida-loca-600 dark:text-vida-loca-400 font-bold tabular-nums">
                                {isLoading ? "---" : formatCurrency(despesasPagasMes)}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                            <span>Total:</span>
                            <span className="text-foreground dark:text-slate-200 font-bold tabular-nums">
                                {isLoading ? "---" : formatCurrency(totalDespesasMes)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Base: Restante das métricas em Grid */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    {/* Bloco Compromissos Vencidos */}
                    <div 
                        onClick={() => setIsOverdueModalOpen(true)}
                        className="bg-stiletto-50 dark:bg-stiletto-900/20 rounded-lg p-3 border border-stiletto-100 dark:border-stiletto-800 col-span-2 sm:col-span-1 cursor-pointer hover:bg-stiletto-100 hover:border-stiletto-300 dark:hover:bg-stiletto-900/40 transition-all shadow-sm group"
                    >
                        <div className="flex items-center gap-1.5 mb-1 group-hover:scale-[1.02] transition-transform">
                            <AlertTriangle className="h-3.5 w-3.5 text-stiletto-600" />
                            <span className="text-xs font-semibold text-stiletto-700">Total Vencido</span>
                        </div>
                        {isLoading ? (
                            <div className="h-5 w-20 bg-stiletto-200 animate-pulse rounded"></div>
                        ) : (
                            <span className="text-lg font-bold text-stiletto-600 block tabular-nums group-hover:scale-[1.02] transition-transform origin-left">
                                {formatCurrency(totalVencido)}
                            </span>
                        )}
                    </div>

                    {/* Bloco Projeção de 14 dias */}
                    <div 
                        onClick={() => setIsUpcomingModalOpen(true)}
                        className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-100 dark:border-amber-800 col-span-2 sm:col-span-1 cursor-pointer hover:bg-amber-100 hover:border-amber-300 dark:hover:bg-amber-900/40 transition-all shadow-sm group"
                    >
                        <div className="flex items-center gap-1.5 mb-1 group-hover:scale-[1.02] transition-transform">
                            <CalendarClock className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-xs font-semibold text-amber-700">A Vencer (14d)</span>
                        </div>
                        {isLoading ? (
                            <div className="h-5 w-20 bg-amber-200 animate-pulse rounded"></div>
                        ) : (
                            <span className="text-lg font-bold text-amber-600 block tabular-nums group-hover:scale-[1.02] transition-transform origin-left">
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

