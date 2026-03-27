import { useQuery } from '@tanstack/react-query'
import { Info, BarChart3, TrendingUp } from 'lucide-react'
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

import { getBalanceProjectionData } from '@/api/get-balance-projection'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'

interface DailyBalance {
    date: string
    balance: number
    isProjection: boolean
}

interface BalanceProjectionData {
    currentBalance: number
    dailyBalances: DailyBalance[]
}

function processChartData(data: { projection: BalanceProjectionData } | undefined) {
    if (!data || !data.projection || !data.projection.dailyBalances) {
        return []
    }

    const finalData = data.projection.dailyBalances.map((item) => {
        const [, month, dayOfMonth] = item.date.split('-')
        const formattedDate = `${dayOfMonth}/${month}`

        return {
            date: item.date,
            formattedDate: formattedDate,
            balance: item.balance,
            isProjection: item.isProjection,
        }
    })

    finalData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return finalData
}

export function BalanceProjectionChart({ className }: { className?: string }) {
    const { data: balanceProjectionData, isLoading } = useQuery({
        queryFn: getBalanceProjectionData,
        queryKey: ['metrics', 'balance-projection'],
    })

    const chartData = processChartData(balanceProjectionData)

    return (
        <Card className={cn("p-2", className)}>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-10 px-8 pt-8">
                <div className="space-y-2">
                    <CardTitle className="text-xl font-bold flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-primary" />
                        </div>
                        Previsão de Saldo
                    </CardTitle>
                    <CardDescription className="label-uppercase opacity-40">
                        Projeção baseada em compromissos futuros (30 dias)
                    </CardDescription>
                </div>

                <div className="flex items-center space-x-8 px-4 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Saldo Real</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-primary bg-white dark:bg-slate-900 shadow-[0_0_8px_rgba(98,0,238,0.4)]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Projeção</span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-8 pb-8">
                {isLoading ? (
                    <div className="flex h-[280px] w-full items-center justify-center">
                        <div className="h-10 w-10 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
                    </div>
                ) : chartData.length > 0 ? (
                    <div className="font-manrope font-bold">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-slate-200/50 dark:stroke-slate-800/50" />

                                <XAxis
                                    dataKey="formattedDate"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, opacity: 0.7 }}
                                    dy={20}
                                    interval={4}
                                />

                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, opacity: 0.7 }}
                                    width={70}
                                    tickFormatter={(value: number) =>
                                        value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString()
                                    }
                                />

                                <Tooltip
                                    cursor={{ stroke: '#6200EE', strokeWidth: 2, strokeDasharray: '6 6' }}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length > 0) {
                                            const data = payload[0].payload
                                            if (!data) return null
                                            return (
                                                <div className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
                                                    <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                                                        <div className={cn(
                                                            "p-2 rounded-lg shadow-sm text-white",
                                                            data.isProjection ? "bg-primary" : "bg-emerald-500"
                                                        )}>
                                                            <BarChart3 className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <p className="label-uppercase mb-0.5 opacity-40">Timeline Point</p>
                                                            <p className="font-black text-lg text-slate-900 dark:text-slate-100 tracking-tighter">{label}</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="label-uppercase opacity-40">Estimated Balance</p>
                                                        <p className="text-2xl font-black text-primary tabular-nums tracking-tighter">
                                                            {payload[0].value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </p>
                                                        {data.isProjection && (
                                                            <div className="mt-3 px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10">
                                                                <p className="text-[9px] font-black text-primary uppercase tracking-widest leading-normal">
                                                                    Projection with unpaid transactions
                                                                </p>
                                                            </div>
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
                                    strokeWidth={4}
                                    dataKey="balance"
                                    stroke="url(#lineGradient)"
                                    dot={(props) => {
                                        const { cx, cy, payload } = props
                                        if (payload.isProjection) {
                                            return (
                                                <circle cx={cx} cy={cy} r={5} fill="white" stroke="#6200EE" strokeWidth={3} className="shadow-lg" />
                                            )
                                        }
                                        return (
                                            <circle cx={cx} cy={cy} r={6} fill="#10b981" stroke="white" strokeWidth={3} className="shadow-lg" />
                                        )
                                    }}
                                    activeDot={{ r: 8, stroke: 'white', strokeWidth: 3, className: "shadow-2xl" }}
                                    animationDuration={2500}
                                />
                                <defs>
                                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#10b981" />
                                        <stop offset="100%" stopColor="#6200EE" />
                                    </linearGradient>
                                </defs>
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="flex w-full justify-center flex-col h-[280px] items-center text-slate-400 gap-4 border-2 border-dashed rounded-2xl bg-slate-50/20 font-manrope">
                        <Info className="h-12 w-12 text-slate-200" />
                        <span className="text-sm font-bold uppercase tracking-widest opacity-60">No future data detected</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}