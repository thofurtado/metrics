import { useQuery } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { getBalanceProjectionData } from '@/api/get-balance-projection' // Substitua pela sua API real
import { getFinanceMetrics } from '@/api/get-finance-metrics'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

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
function processChartData(
  data: { projection: BalanceProjectionData } | undefined,
  overdueNet: number,
) {
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
      formattedDate,
      balance: item.balance,
      riskBalance: item.balance + overdueNet,
      isProjection: item.isProjection,
    }
  })

  // Garante que os dados estão ordenados por data
  finalData.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )

  return finalData
}
// --------------------------------------------------------

// Componente customizado para o ponto do gráfico

export function BalanceProjectionChart({ className }: { className?: string }) {
  const { data: balanceProjectionData, isLoading } = useQuery({
    queryFn: getBalanceProjectionData,
    queryKey: ['metrics', 'balance-projection'],
  })

  const { data: metricsData } = useQuery({
    queryKey: ['finance-metrics-overdue'],
    queryFn: () => getFinanceMetrics(),
  })

  const overdueNet =
    (metricsData?.receitaVencida ?? 0) - (metricsData?.despesaVencida ?? 0)

  const chartData = processChartData(balanceProjectionData, overdueNet)

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col justify-between gap-4 pb-6 sm:flex-row sm:items-center">
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
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>Saldo Real</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full border-2 border-indigo-500" />
            <span>Projeção</span>
          </div>
          {overdueNet !== 0 && (
            <div className="flex items-center gap-2">
              <div className="w-4 border-t-2 border-dashed border-amber-500" />
              <span className="text-amber-500">Projeção de Risco</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex h-[240px] w-full items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-indigo-600" />
          </div>
        ) : chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={chartData}
                style={{ fontSize: 11, fontWeight: 'bold' }}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  className="stroke-slate-100 dark:stroke-slate-800"
                />

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
                    value >= 1000
                      ? `${(value / 1000).toFixed(0)}k`
                      : value.toString()
                  }
                />

                <ReferenceLine
                  y={0}
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  strokeOpacity={0.7}
                  strokeDasharray="6 4"
                />

                <Tooltip
                  cursor={{
                    stroke: '#4f46e5',
                    strokeWidth: 2,
                    strokeDasharray: '4 4',
                  }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload
                      if (!data) return null
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-2xl ring-1 ring-black/5 backdrop-blur-md duration-200 animate-in zoom-in-95 dark:border-slate-800 dark:bg-slate-900/95">
                          <div className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                            <span
                              className={cn(
                                'h-2 w-2 rounded-full',
                                data.isProjection
                                  ? 'bg-indigo-500'
                                  : 'bg-emerald-500',
                              )}
                            />
                            <p className="text-sm font-extrabold uppercase tracking-widest text-slate-900 dark:text-slate-100">
                              {label}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase leading-none tracking-widest text-slate-500">
                              Saldo Projetado
                            </p>
                            <p className="text-xl font-black tabular-nums tracking-tighter text-indigo-600 dark:text-indigo-400">
                              {payload[0].value.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                            </p>
                            {data.isProjection && (
                              <p className="text-[9px] font-bold italic text-slate-400">
                                Estimativa com base em transações pendentes
                              </p>
                            )}
                          </div>
                          {overdueNet !== 0 && (
                            <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 dark:border-slate-800">
                              <p className="text-[10px] font-black uppercase leading-none tracking-widest text-amber-500">
                                Projeção de Risco
                              </p>
                              <p className="text-base font-black tabular-nums tracking-tighter text-amber-600 dark:text-amber-400">
                                {data.riskBalance.toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                })}
                              </p>
                              <p className="text-[9px] font-bold italic text-slate-400">
                                Considerando acerto das contas atrasadas hoje
                              </p>
                            </div>
                          )}
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
                        <circle
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill="white"
                          stroke="#6366f1"
                          strokeWidth={2}
                        />
                      )
                    }
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill="#10b981"
                        stroke="white"
                        strokeWidth={2}
                      />
                    )
                  }}
                  activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
                />
                {overdueNet !== 0 && (
                  <Line
                    type="monotone"
                    strokeWidth={2}
                    dataKey="riskBalance"
                    stroke="#f59e0b"
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 4, stroke: 'white', strokeWidth: 2 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </>
        ) : (
          <div className="flex h-[240px] w-full items-center justify-center space-x-2 text-blue-800">
            <Info className="h-4 w-4" />
            <span>Nenhuma transação futura encontrada para projeção.</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
