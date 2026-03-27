import { useQuery } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
} from 'recharts'
import { cn } from '@/lib/utils'

import { getBalanceProjectionData } from '@/api/get-balance-projection' // Substitua pela sua API real
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'

// Estruturas de dados baseadas na resposta do seu backend
interface DailyBalance {
    date: string
    balance: number
    isProjection: boolean
}

interface BalanceProjectionData {
    currentBalance: number
    dailyBalances: DailyBalance[]
}

// --------------------------------------------------------
// FUNÇÃO DE PROCESSAMENTO DE DADOS (Transformação)
// --------------------------------------------------------
function processChartData(data: { projection: BalanceProjectionData } | undefined) {
    if (!data || !data.projection || !data.projection.dailyBalances) {
        return []
    }

    // Mapeia os dados, formata a data para exibição (DD/MM) e inclui a flag de projeção
    const finalData = data.projection.dailyBalances.map((item) => {
        // Formata a data de YYYY-MM-DD para DD/MM
        const [, month, dayOfMonth] = item.date.split('-')
        const formattedDate = `${dayOfMonth}/${month}`

        return {
            date: item.date,
            formattedDate: formattedDate,
            balance: item.balance,
            isProjection: item.isProjection,
        }
    })

    // Garante que os dados estão ordenados por data
    finalData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return finalData
}
// --------------------------------------------------------

// Componente customizado para o ponto do gráfico

export function BalanceProjectionChart({ className }: { className?: string }) {
    const { data: balanceProjectionData, isLoading } = useQuery({
        queryFn: getBalanceProjectionData,
        queryKey: ['metrics', 'balance-projection'],
    })

    const chartData = processChartData(balanceProjectionData)

    return (
        <Card className={className}>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
                <div className="space-y-1">
                    <CardTitle className="text-base font-bold text-slate-800">
                        Previsão de Saldo (Próx. 30 Dias)
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                        Saldo projetado dia a dia, baseado em transações futuras.
                    </CardDescription>
                </div>

                {/* Legenda personalizada */}
                <div className="flex items-center space-x-6 text-[11px] font-black uppercase tracking-widest text-slate-400">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>Saldo Real</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-indigo-500" />
                        <span>Projeção</span>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                {isLoading ? (
                    <div className="flex h-[240px] w-full items-center justify-center">
                        <div className="h-10 w-10 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
                    </div>
                ) : chartData.length > 0 ? (
                    <>
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={chartData} style={{ fontSize: 11, fontWeight: "bold" }} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />

                                <XAxis
                                    dataKey="formattedDate"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8' }}
                                    dy={16}
                                    interval={4}
                                />

                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8' }}
                                    width={70}
                                    tickFormatter={(value: number) =>
                                        value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString()
                                    }
                                />

                                <Tooltip
                                    cursor={{ stroke: '#4f46e5', strokeWidth: 2, strokeDasharray: '4 4' }}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length > 0) {
                                            const data = payload[0].payload
                                            if (!data) return null
                                            return (
                                                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
                                                    <div className="flex items-center gap-2 mb-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                                        <span className={cn(
                                                            "h-2 w-2 rounded-full",
                                                            data.isProjection ? "bg-indigo-500" : "bg-emerald-500"
                                                        )} />
                                                        <p className="font-extrabold text-sm text-slate-900 dark:text-slate-100 uppercase tracking-widest">{label}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Saldo Projetado</p>
                                                        <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums tracking-tighter">
                                                            {payload[0].value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </p>
                                                        {data.isProjection && (
                                                            <p className="text-[9px] font-bold text-slate-400 italic">Estimativa com base em transações pendentes</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />

                                <Line
                                    type="monotone"
                                    strokeWidth={3}
                                    dataKey="balance"
                                    stroke="#4f46e5"
                                    strokeOpacity={0.8}
                                    dot={(props) => {
                                        const { cx, cy, payload } = props
                                        if (payload.isProjection) {
                                            return (
                                                <circle cx={cx} cy={cy} r={4} fill="white" stroke="#6366f1" strokeWidth={2} />
                                            )
                                        }
                                        return (
                                            <circle cx={cx} cy={cy} r={5} fill="#10b981" stroke="white" strokeWidth={2} />
                                        )
                                    }}
                                    activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </>
                ) : (
                    <div className="flex w-full justify-center space-x-2 text-blue-800 h-[240px] items-center">
                        <Info className="h-4 w-4" />
                        <span>Nenhuma transação futura encontrada para projeção.</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}