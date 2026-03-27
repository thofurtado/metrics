import { useQuery } from '@tanstack/react-query'
import { useState, type ComponentProps } from 'react'
import { Wallet, TrendingUp, AlertTriangle, CalendarClock, Target, PiggyBank } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getOperationalSummary } from '@/api/get-operational-summary'
import { OverdueTransactionsModal } from './overdue-transactions-modal'
import { UpcomingTransactionsModal } from './upcoming-transactions-modal'

interface FinanceCardOperacionalProps extends ComponentProps<'div'> {
    month: number
    year: number
}

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

    const progressPercentage = totalDespesasMes > 0
        ? Math.min((despesasPagasMes / totalDespesasMes) * 100, 100)
        : 0

    return (
        <Card className={cn("col-span-1 flex flex-col p-2", className)} {...props}>
            <CardHeader className="flex flex-row items-center justify-between pb-8">
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Wallet className="h-5 w-5 text-primary" />
                    </div>
                    Fluxo Financeiro
                </CardTitle>
                <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-full">
                    <TrendingUp className="h-3 w-3" />
                    <span>+12.5%</span>
                </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-8 px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative group overflow-hidden bg-white dark:bg-slate-900 rounded-2xl p-6 border shadow-sm transition-all duration-300 hover:shadow-md">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                                <TrendingUp className="h-5 w-5 text-emerald-600" />
                            </div>
                            <span className="label-uppercase">Receita Total</span>
                        </div>
                        {isLoading ? (
                            <div className="h-10 w-40 bg-slate-100 animate-pulse rounded" />
                        ) : (
                            <h2 className="text-4xl font-extrabold text-emerald-600 tracking-tighter">
                                {formatCurrency(receitaAcumulada)}
                            </h2>
                        )}
                        <div className="mt-6 flex items-center gap-4 border-t pt-4">
                           <div className="flex flex-col">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg. Ticket</span>
                               <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatCurrency(ticketMedio)}</span>
                           </div>
                           <div className="flex flex-col border-l pl-4">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Orders</span>
                               <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{numEntradas}</span>
                           </div>
                        </div>
                    </div>

                    <div className="relative group overflow-hidden bg-white dark:bg-slate-900 rounded-2xl p-6 border shadow-sm transition-all duration-300 hover:shadow-md">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10">
                                <PiggyBank className="h-5 w-5 text-primary" />
                            </div>
                            <span className="label-uppercase">Despesa Mensal</span>
                        </div>
                        {isLoading ? (
                            <div className="h-10 w-40 bg-slate-100 animate-pulse rounded" />
                        ) : (
                            <h2 className="text-4xl font-extrabold text-primary tracking-tighter">
                                {formatCurrency(totalDespesasMes)}
                            </h2>
                        )}
                        <div className="mt-6 flex items-center gap-2 border-t pt-4">
                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Juros Acumulados:</span>
                            <span className="text-sm font-bold text-rose-600">{formatCurrency(totalJurosPagos)}</span>
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary text-white rounded-lg shadow-lg shadow-primary/20">
                                <Target className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-black uppercase tracking-widest text-slate-500">Break-even Progress</span>
                        </div>
                        <span className="px-4 py-1 bg-white dark:bg-slate-800 rounded-full text-xs font-black text-primary shadow-sm border">
                            {progressPercentage.toFixed(1)}% Completed
                        </span>
                    </div>

                    <div className="relative h-4 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                        <div 
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-indigo-500 to-cyan-400 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(98,0,238,0.3)]"
                            style={{ width: `${isLoading ? 0 : progressPercentage}%` }}
                        />
                    </div>

                    <div className="flex items-center justify-between mt-4">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Liquidated</span>
                            <span className="text-base font-extrabold text-primary">{formatCurrency(despesasPagasMes)}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Total</span>
                            <span className="text-base font-extrabold text-slate-700 dark:text-slate-300">{formatCurrency(totalDespesasMes)}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-4">
                    <button 
                        onClick={() => setIsOverdueModalOpen(true)}
                        className="bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-xl p-5 border border-rose-100 dark:border-rose-900/50 transition-all group flex flex-col gap-2"
                    >
                        <div className="flex items-center gap-2">
                             <div className="p-1.5 bg-rose-500 text-white rounded-md">
                                <AlertTriangle className="h-3 w-3" />
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-widest text-rose-800 dark:text-rose-400">Overdue Liabilities</span>
                        </div>
                        <span className="text-2xl font-black text-rose-600 tabular-nums tracking-tight">
                            {isLoading ? "---" : formatCurrency(totalVencido)}
                        </span>
                    </button>

                    <button 
                        onClick={() => setIsUpcomingModalOpen(true)}
                        className="bg-primary/5 hover:bg-primary/10 rounded-xl p-5 border border-primary/20 transition-all group flex flex-col gap-2"
                    >
                        <div className="flex items-center gap-2">
                             <div className="p-1.5 bg-primary text-white rounded-md">
                                <CalendarClock className="h-3 w-3" />
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-widest text-primary">Next 14 Days</span>
                        </div>
                        <span className="text-2xl font-black text-primary tabular-nums tracking-tight">
                            {isLoading ? "---" : formatCurrency(projecao14Dias)}
                        </span>
                    </button>
                </div>
            </CardContent>

            <OverdueTransactionsModal open={isOverdueModalOpen} onOpenChange={setIsOverdueModalOpen} />
            <UpcomingTransactionsModal open={isUpcomingModalOpen} onOpenChange={setIsUpcomingModalOpen} />
        </Card>
    )
}
