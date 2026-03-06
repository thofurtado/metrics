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
                <div className="bg-white dark:bg-minsk-900 border border-gray-200 dark:border-minsk-800 p-3 rounded-md shadow-md">
                    <p className="font-semibold text-sm mb-1">{`Data: ${label}`}</p>
                    <p className="text-sm font-bold text-stiletto-600">
                        {`Total: ${payload[0].value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {data.detalhes.length} {data.detalhes.length === 1 ? 'pagamento' : 'pagamentos'} pendente(s)
                    </p>
                    {data.detalhes.length > 0 && (
                        <p className="text-xs text-minsk-500 mt-1 italic">Clique para ver os detalhes</p>
                    )}
                </div>
            )
        }
        return null
    }

    return (
        <Card className={cn("flex flex-col", className)} {...props}>
            <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-minsk-600" />
                    Agenda de Pagamentos (10 Dias)
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
                {isLoading ? (
                    <div className="h-[240px] w-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-minsk-600"></div>
                    </div>
                ) : isError ? (
                    <div className="h-[240px] w-full flex flex-col items-center justify-center text-muted-foreground">
                        <AlertCircle className="h-8 w-8 text-stiletto-500 mb-2" />
                        <p>Erro ao carregar a agenda.</p>
                    </div>
                ) : agendaData && agendaData.length > 0 ? (
                    <div className="h-[240px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={agendaData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <XAxis
                                    dataKey="data"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => `R$ ${value}`}
                                    dx={-10}
                                />
                                <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                                <Bar dataKey="total" radius={[4, 4, 0, 0]} onClick={handleBarClick}>
                                    {agendaData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.total > 0 ? '#b91c1c' : '#e5e7eb'}
                                            className={entry.total > 0 ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
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
                    <div className="mt-4 max-h-[60vh] overflow-y-auto">
                        {selectedData?.detalhes.map((det, index) => (
                            <div key={index} className="flex justify-between items-center py-3 border-b last:border-0 border-gray-100 dark:border-minsk-800">
                                <div>
                                    <p className="font-medium text-sm">{det.descricao}</p>
                                    <p className="text-xs text-muted-foreground">{det.categoria}</p>
                                </div>
                                <span className="font-bold text-stiletto-600">
                                    {det.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-minsk-800 flex justify-between items-center bg-gray-50 dark:bg-minsk-900/50 p-3 rounded-lg">
                        <span className="font-semibold">Total do Dia</span>
                        <span className="font-bold text-lg text-stiletto-700">
                            {selectedData?.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
