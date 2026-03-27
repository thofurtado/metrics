import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { CalendarDays, AlertCircle, ChevronRight } from 'lucide-react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getPaymentAgenda, PaymentAgendaItem } from '@/api/get-payment-agenda'

interface AgendaPagamentosCardProps extends React.ComponentProps<'div'> { }

export function AgendaPagamentosCard({ className, ...props }: AgendaPagamentosCardProps) {
    const [selectedData, setSelectedData] = useState<PaymentAgendaItem | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const { data: agendaData, isLoading, isError } = useQuery({
        queryFn: getPaymentAgenda,
        queryKey: ['metrics', 'payment-agenda'],
    })

    const totalPeriodo = agendaData?.reduce((acc, item) => acc + item.total, 0) ?? 0

    const handleBarClick = (data: PaymentAgendaItem) => {
        if (data.detalhes.length > 0) {
            setSelectedData(data)
            setIsModalOpen(true)
        }
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data: PaymentAgendaItem = payload[0].payload
            return (
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 ring-1 ring-black/5 font-manrope">
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <CalendarDays className="h-4 w-4" />
                        </div>
                        <p className="font-extrabold text-lg text-slate-900 dark:text-slate-100">{label}</p>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-8">
                            <span className="label-uppercase">Daily Total</span>
                            <span className="text-xl font-extrabold text-primary tabular-nums">
                                {payload[0].value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-8">
                            <span className="label-uppercase">Commitments</span>
                            <span className="text-xs font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                {data.detalhes.length} Items
                            </span>
                        </div>
                    </div>
                </div>
            )
        }
        return null
    }

    return (
        <Card className={cn("flex flex-col p-2", className)} {...props}>
            <CardHeader className="flex flex-row items-center justify-between pb-8">
                <CardTitle className="text-xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    Agenda de Pagamentos
                </CardTitle>
                {!isLoading && !isError && totalPeriodo > 0 && (
                    <div className="flex flex-col items-end">
                        <span className="label-uppercase mb-1 opacity-40">Estimate (10d)</span>
                        <span className="text-xl font-bold text-primary tabular-nums tracking-tighter">
                            {totalPeriodo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                )}
            </CardHeader>
            <CardContent className="flex-1 px-6 pb-6">
                {isLoading ? (
                    <div className="h-[240px] w-full flex items-center justify-center">
                        <div className="h-10 w-10 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
                    </div>
                ) : isError ? (
                    <div className="h-[240px] w-full flex flex-col items-center justify-center text-slate-400 gap-4 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/20">
                        <AlertCircle className="h-10 w-10 text-slate-200" />
                        <p className="text-sm font-bold uppercase tracking-widest opacity-60">Sync failure</p>
                    </div>
                ) : agendaData && agendaData.length > 0 ? (
                    <div className="h-[280px] w-full mt-2 font-manrope font-bold">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={agendaData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }} barGap={0} barCategoryGap="25%">
                                <defs>
                                    <linearGradient id="agendaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6200EE" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#7C4DFF" stopOpacity={0.8} />
                                    </linearGradient>
                                    <linearGradient id="agendaEmptyGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#CBD5E1" stopOpacity={0.2} />
                                        <stop offset="100%" stopColor="#94A3B8" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="data"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 10, fill: '#64748b', opacity: 0.6 }}
                                    dy={15}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 10, fill: '#64748b', opacity: 0.6 }}
                                    tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                                    width={40}
                                />
                                <Tooltip 
                                    cursor={{ fill: 'rgba(98, 0, 238, 0.04)', radius: 8 }} 
                                    content={<CustomTooltip />} 
                                    animationDuration={150}
                                />
                                <Bar 
                                    dataKey="total" 
                                    radius={[8, 8, 4, 4]} 
                                    onClick={handleBarClick}
                                    animationDuration={2000}
                                >
                                    {agendaData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.total > 0 ? 'url(#agendaGradient)' : 'url(#agendaEmptyGradient)'}
                                            className={cn(
                                                "transition-all duration-300",
                                                entry.total > 0 ? "cursor-pointer hover:brightness-125" : "opacity-30"
                                            )}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-[240px] w-full flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-2xl">
                        <p className="label-uppercase">No scheduled payments</p>
                    </div>
                )}
            </CardContent>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden font-manrope">
                    <DialogHeader className="p-8 pb-4 border-b bg-slate-50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-3 mb-2">
                             <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                <CalendarDays className="h-5 w-5" />
                             </div>
                             <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-white">Payments Schedule</DialogTitle>
                        </div>
                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">{selectedData?.data}</p>
                    </DialogHeader>
                    <div className="px-8 py-2 max-h-[50vh] overflow-y-auto divide-y">
                        {selectedData?.detalhes.map((det, index) => (
                            <div key={index} className="flex justify-between items-center py-5 group cursor-pointer">
                                <div className="min-w-0 flex-1">
                                    <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors truncate" title={det.descricao}>{det.descricao}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{det.categoria}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                     <span className="font-extrabold text-sm text-rose-500 tabular-nums">
                                        {det.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                     </span>
                                     <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-all group-hover:translate-x-1" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="m-8 mt-4 p-6 border bg-primary shadow-xl shadow-primary/20 rounded-2xl flex justify-between items-center transition-transform active:scale-[0.98]">
                        <span className="label-uppercase text-primary-foreground opacity-90">Daily Consolidation</span>
                        <span className="font-black text-2xl text-white tabular-nums tracking-tighter">
                            {selectedData?.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
