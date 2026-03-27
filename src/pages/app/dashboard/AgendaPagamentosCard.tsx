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
                <div className="bg-white/80 dark:bg-minsk-950/80 backdrop-blur-md border border-gray-200 dark:border-minsk-800 p-3 rounded-xl shadow-xl animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center gap-2 mb-2 border-b border-gray-100 dark:border-minsk-800 pb-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-minsk-500" />
                        <p className="font-bold text-xs">{label}</p>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total</span>
                            <span className="text-sm font-black text-stiletto-600 dark:text-rose-400">
                                {payload[0].value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Títulos</span>
                            <span className="text-xs font-bold">
                                {data.detalhes.length}
                            </span>
                        </div>
                    </div>
                    {data.detalhes.length > 0 && (
                        <div className="mt-2 pt-1 border-t border-gray-100 dark:border-minsk-800 flex items-center gap-1 justify-center">
                           <span className="text-[9px] text-minsk-500 font-bold uppercase animate-pulse">Clique para detalhar</span>
                        </div>
                    )}
                </div>
            )
        }
        return null
    }

    return (
        <Card className={cn("flex flex-col overflow-hidden", className)} {...props}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-minsk-600" />
                    Agenda de Pagamentos (10 Dias)
                </CardTitle>
                {!isLoading && !isError && totalPeriodo > 0 && (
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Previsão 10d</span>
                        <span className="text-sm font-black text-stiletto-600 dark:text-rose-500 tabular-nums">
                            {totalPeriodo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                )}
            </CardHeader>
            <CardContent className="flex-1 pb-4">
                {isLoading ? (
                    <div className="h-[240px] w-full flex items-center justify-center">
                        <div className="relative">
                            <div className="h-12 w-12 rounded-full border-4 border-minsk-100 dark:border-minsk-900 border-t-minsk-600 animate-spin" />
                        </div>
                    </div>
                ) : isError ? (
                    <div className="h-[240px] w-full flex flex-col items-center justify-center text-muted-foreground">
                        <AlertCircle className="h-8 w-8 text-stiletto-500 mb-2" />
                        <p className="font-medium">Erro ao carregar a agenda.</p>
                    </div>
                ) : agendaData && agendaData.length > 0 ? (
                    <div className="h-[240px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={agendaData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#e11d48" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#9f1239" stopOpacity={1} />
                                    </linearGradient>
                                    <linearGradient id="emptyBarGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f3f4f6" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#e5e7eb" stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="data"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                                    dy={10}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                                    tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                                    width={40}
                                />
                                <Tooltip 
                                    cursor={{ fill: 'currentColor', opacity: 0.05, radius: 8 }} 
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
                                            className={entry.total > 0 ? "cursor-pointer hover:filter hover:brightness-110 transition-all duration-300" : "opacity-30 dark:opacity-10"}
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
