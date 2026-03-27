import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { CalendarDays, AlertCircle } from 'lucide-react'
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

    // Using react-query to fetch data
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
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
                    <div className="flex items-center gap-2 mb-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <CalendarDays className="h-4 w-4 text-indigo-500" />
                        <p className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{label}</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-6">
                            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Total</span>
                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                                {payload[0].value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-6">
                            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Compromissos</span>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                {data.detalhes.length}
                            </span>
                        </div>
                    </div>
                </div>
            )
        }
        return null
    }

    return (
        <Card className={cn("flex flex-col overflow-hidden", className)} {...props}>
            <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
                <CardTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 font-manrope tracking-tight">
                    <CalendarDays className="h-4 w-4 text-indigo-600" />
                    Calendário de Pagamentos
                </CardTitle>
                {!isLoading && !isError && totalPeriodo > 0 && (
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total 10d</span>
                        <span className="text-base font-black text-indigo-600 dark:text-indigo-400 tabular-nums tracking-tighter">
                            {totalPeriodo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                )}
            </CardHeader>
            <CardContent className="flex-1 pb-6 pt-0">
                {isLoading ? (
                    <div className="h-[240px] w-full flex items-center justify-center">
                        <div className="h-10 w-10 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
                    </div>
                ) : isError ? (
                    <div className="h-[240px] w-full flex flex-col items-center justify-center text-slate-400 gap-3 border-2 border-dashed border-slate-100 rounded-2xl">
                        <AlertCircle className="h-10 w-10 text-slate-200" />
                        <p className="text-sm font-medium">Erro ao carregar os dados</p>
                    </div>
                ) : agendaData && agendaData.length > 0 ? (
                    <div className="h-[250px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={agendaData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#4F46E5" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#4338CA" stopOpacity={1} />
                                    </linearGradient>
                                    <linearGradient id="emptyBarGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#F1F5F9" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#E2E8F0" stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="data"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 10, fontWeight: "bold", fill: '#94a3b8' }}
                                    dy={10}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 10, fontWeight: "bold", fill: '#94a3b8' }}
                                    tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                                    width={40}
                                />
                                <Tooltip 
                                    cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }} 
                                    content={<CustomTooltip />} 
                                />
                                <Bar 
                                    dataKey="total" 
                                    radius={[6, 6, 2, 2]} 
                                    onClick={handleBarClick}
                                    animationDuration={1500}
                                >
                                    {agendaData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.total > 0 ? 'url(#barGradient)' : 'url(#emptyBarGradient)'}
                                            className={entry.total > 0 ? "cursor-pointer hover:filter hover:brightness-110 transition-all duration-300" : "opacity-20"}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-[240px] w-full flex items-center justify-center text-muted-foreground">
                        <p>Nenhum pagamento nos próximos 10 dias.</p>
                    </div>
                )}
            </CardContent>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Pagamentos de {selectedData?.data}</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
                        {selectedData?.detalhes.map((det, index) => (
                            <div key={index} className="flex justify-between items-center py-4 border-b last:border-0 border-minsk-100 dark:border-minsk-800/60 gap-4">
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-sm truncate" title={det.descricao}>{det.descricao}</p>
                                    <p className="text-xs text-muted-foreground truncate">{det.categoria}</p>
                                </div>
                                <span className="font-bold text-stiletto-600 tabular-nums text-right min-w-[90px]">
                                    {det.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-minsk-200 dark:border-minsk-800 flex justify-between items-center bg-minsk-50 dark:bg-minsk-900/40 p-4 rounded-lg">
                        <span className="font-semibold text-minsk-900 dark:text-minsk-100">Total do Dia</span>
                        <span className="font-bold text-lg text-stiletto-600 tabular-nums">
                            {selectedData?.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
