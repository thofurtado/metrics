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
import colors from 'tailwindcss/colors'

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
const CustomDot = (props: any) => {
    const { cx, cy, payload } = props

    if (payload.isProjection) {
        // Ponto para Projeção: menor e vazado (tracejado)
        return (
            <circle
                cx={cx}
                cy={cy}
                r={4}
                fill="none"
                stroke={colors.blue['400']}
                strokeDasharray="4 4"
                strokeWidth={2}
                className="opacity-70"
            />
        )
    }
    // Ponto para Saldo Real (hoje): maior e preenchido
    return (
        <circle
            cx={cx}
            cy={cy}
            r={5}
            fill={colors.green['500']}
            stroke={colors.green['500']}
            strokeWidth={2}
        />
    )
}

export function BalanceProjectionChart({ className }: { className?: string }) {
    const { data: balanceProjectionData, isLoading } = useQuery({
        queryFn: getBalanceProjectionData,
        queryKey: ['metrics', 'balance-projection'],
    })

    const chartData = processChartData(balanceProjectionData)

    return (
        <Card className={className}>
            <CardHeader className="flex-row items-center justify-between pb-8">
                <div className="space-y-1">
                    <CardTitle className="text-base font-medium text-blue-500">
                        Previsão de Saldo (Próx. 30 Dias)
                    </CardTitle>
                    <CardDescription>
                        Saldo projetado dia a dia, baseado em transações futuras.
                    </CardDescription>
                </div>

                {/* Legenda personalizada */}
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                        Saldo Atual/Real
                    </div>
                    <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full border border-blue-400 mr-1" />
                        Projeção
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                {isLoading ? (
                    <div className="flex h-[240px] w-full items-center justify-center text-gray-500">
                        Carregando projeção...
                    </div>
                ) : chartData.length > 0 ? (
                    <>
                        <ResponsiveContainer width="100%" height={240}>
                            <LineChart data={chartData} style={{ fontSize: 12 }}>
                                <CartesianGrid vertical={false} className="stroke-muted" />

                                <XAxis
                                    dataKey="formattedDate"
                                    axisLine={false}
                                    tickLine={false}
                                    dy={16}
                                    interval={4}
                                />

                                <YAxis
                                    stroke="#888"
                                    axisLine={false}
                                    tickLine={false}
                                    width={80}
                                    tickFormatter={(value: number) =>
                                        value.toLocaleString('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                        })
                                    }
                                />

                                <Tooltip
                                    cursor={{ stroke: colors.blue['400'], strokeDasharray: 4 }}
                                    formatter={(value: number) =>
                                        value.toLocaleString('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                        })
                                    }
                                    labelFormatter={(label: string) => `Data: ${label}`}
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '0.5rem'
                                    }}
                                />

                                <Line
                                    type="monotone"
                                    strokeWidth={2}
                                    dataKey="balance"
                                    stroke={colors.blue['400']}
                                    dot={<CustomDot />}
                                    activeDot={{ r: 6 }}
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