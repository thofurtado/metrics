import { useQuery } from '@tanstack/react-query'
import { useState, type ComponentProps } from 'react'
import { Wallet, TrendingUp, AlertTriangle, CalendarClock, Target } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getOperationalSummary } from '@/api/get-operational-summary'
import { getFinanceMetrics } from '@/api/get-finance-metrics'
import { OverdueTransactionsModal } from './overdue-transactions-modal'
import { UpcomingTransactionsModal } from './upcoming-transactions-modal'

interface FinanceCardOperacionalProps extends ComponentProps<'div'> {
    month: number
    year: number
}

// Função auxiliar para formatar em Reais
const formatCurrency = (value: number, hideSymbol = false) => {
    if (hideSymbol) {
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function FinanceCardOperacional({ className, month, year, ...props }: FinanceCardOperacionalProps) {
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

    const totalDespesasMes = opData?.totalDespesasMes ?? 0
    const despesasPagasMes = opData?.despesasPagasMes ?? 0
    const totalVencido = opData?.totalVencido ?? 0
    const projecao14Dias = opData?.projecao14Dias ?? 0
    const receitaAcumulada = opData?.receitaAcumulada ?? 0
    const ticketMedio = opData?.ticketMedio ?? 0
    const numEntradas = opData?.numEntradas ?? 0
    const totalJurosPagos = opData?.totalJurosPagos ?? 0

    // Dados Financeiros
    const saldoDisponivel = financeData?.saldoDisponivel ?? 0
    const recebido = financeData?.receita ?? 0
    const aReceber = financeData?.aReceber ?? 0
    const receitaVencida = financeData?.receitaVencida ?? 0
    const pago = financeData?.despesa ?? 0
    const aPagar = financeData?.aPagar ?? 0
    const despesaVencida = financeData?.despesaVencida ?? 0

    const volumeTotal = recebido + aReceber + receitaVencida + pago + aPagar + despesaVencida
    const safeVolume = volumeTotal > 0 ? volumeTotal : 1

    const segments = [
        { label: 'Recebido', value: recebido, pct: (recebido / safeVolume) * 100, color: 'bg-emerald-500' },
        { label: 'A Receber', value: aReceber, pct: (aReceber / safeVolume) * 100, color: 'bg-emerald-300' },
        { label: 'Receita Vencida', value: receitaVencida, pct: (receitaVencida / safeVolume) * 100, color: 'bg-amber-400' },
        { label: 'Pago', value: pago, pct: (pago / safeVolume) * 100, color: 'bg-indigo-500' },
        { label: 'A Pagar', value: aPagar, pct: (aPagar / safeVolume) * 100, color: 'bg-sky-400' },
        { label: 'Despesa Vencida', value: despesaVencida, pct: (despesaVencida / safeVolume) * 100, color: 'bg-rose-500' },
    ]

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
                                <div className="flex items-baseline gap-1 overflow-hidden">
                                    <span className="text-sm font-bold text-emerald-600/70 shrink-0">R$</span>
                                    <span className="text-xl font-black text-emerald-600 block tabular-nums tracking-tighter truncate" title={formatCurrency(receitaAcumulada)}>
                                        {formatCurrency(receitaAcumulada, true)}
                                    </span>
                                </div>
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
                                <div className="flex items-baseline gap-1 overflow-hidden">
                                    <span className="text-sm font-bold text-slate-500 shrink-0">R$</span>
                                    <span className="text-xl font-black text-slate-800 dark:text-slate-200 block tabular-nums tracking-tighter truncate" title={formatCurrency(totalDespesasMes)}>
                                        {formatCurrency(totalDespesasMes, true)}
                                    </span>
                                </div>
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
                            <span className="text-xs font-black uppercase tracking-widest text-slate-600">Volume do Mês</span>
                        </div>
                        {isLoading ? (
                            <div className="h-5 w-16 bg-slate-200 animate-pulse rounded-full" />
                        ) : (
                            <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                {formatCurrency(volumeTotal)}
                            </span>
                        )}
                    </div>
                    
                    <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner flex">
                        {!isLoading && segments.map((seg, i) => (
                            seg.value > 0 && (
                                <div
                                    key={i}
                                    title={`${seg.label}: ${formatCurrency(seg.value)}`}
                                    className={`${seg.color} h-full transition-all duration-1000 ease-in-out cursor-pointer hover:opacity-80 hover:scale-y-110`}
                                    style={{ width: `${seg.pct}%` }}
                                />
                            )
                        ))}
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 pt-1">
                        <div className="flex flex-col items-start gap-1">
                            <span className="opacity-70">Liquidado</span>
                            <span className="text-emerald-600 dark:text-emerald-500 tabular-nums">
                                {isLoading ? "---" : formatCurrency(recebido + pago)}
                            </span>
                        </div>
                        <div className="flex flex-col items-center gap-1 border-x border-slate-200 dark:border-slate-800 px-4">
                            <span className="opacity-70">Em Carteira</span>
                            <span className="text-indigo-600 dark:text-indigo-400 tabular-nums font-extrabold text-xs">
                                {isLoading ? "---" : formatCurrency(saldoDisponivel)}
                            </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="opacity-70">Total Débitos</span>
                            <span className="text-rose-600 dark:text-rose-500 tabular-nums">
                                {isLoading ? "---" : formatCurrency(pago + aPagar + despesaVencida)}
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
