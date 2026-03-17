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

import { getMonthIncomesByDay } from '@/api/get-month-income-by-days'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

// --------------------------------------------------------
// FUNÇÃO DE PROCESSAMENTO DE DADOS (Agregação e Formatação)
// --------------------------------------------------------
function processChartData(data: { day: string; revenue: number }[] | undefined) {
  if (!data) {
    return []
  }

  const aggregatedData: { [key: string]: number } = {}

  data.forEach((item) => {
    aggregatedData[item.day] = (aggregatedData[item.day] || 0) + item.revenue
  })

  const finalData = Object.entries(aggregatedData).map(([day, revenue]) => {
    const [month, dayOfMonth] = day.split('-')
    const formattedDay = `${dayOfMonth}-${month}`

    return {
      day: day,
      formattedDay: formattedDay,
      revenue: revenue,
    }
  })

  // Opcional: Garante que os dados estão ordenados por data original
  finalData.sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());

  return finalData
}
// --------------------------------------------------------

export function RevenueChart({ className }: { className?: string }) {
  const { data: monthIncomeByDays } = useQuery({
    queryFn: () => getMonthIncomesByDay(),
    queryKey: ['metrics', 'month-income-by-day'],
  })

  const chartData = processChartData(monthIncomeByDays)

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-6">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">
            Receita no período
          </CardTitle>
          <CardDescription>Receita diária no período</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length !== 0 ? (
          <>
            {/* ResponsiveContainer garante que o gráfico ocupe 100% da largura do pai */}
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }} margin={{ top: 10, right: 10, left: 16, bottom: 10 }}>
                <XAxis
                  dataKey="formattedDay"
                  axisLine={false}
                  tickLine={false}
                  dy={16}
                  // 🚨 CORREÇÃO: Define o intervalo para 4. Isso reduz a densidade dos rótulos
                  // no eixo X, impedindo que eles se sobreponham e estourem a largura em telas pequenas.
                  interval={4}
                />
                <YAxis
                  stroke="#888"
                  axisLine={false}
                  tickLine={false}
                  width={88}
                  tickFormatter={(value: number) =>
                    value.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })
                  }
                />

                <Tooltip
                  cursor={{ stroke: colors.green['400'], strokeDasharray: 4 }}
                  formatter={(value: number) =>
                    value.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })
                  }
                  labelFormatter={(label: string) => `Data: ${label}`}
                />

                <Line
                  type="linear"
                  strokeWidth={2}
                  dataKey="revenue"
                  stroke={colors.green['400']}
                  dot={true}
                />
                <CartesianGrid vertical={false} className="stroke-muted" />
              </LineChart>
            </ResponsiveContainer>
          </>
        ) : (
          <>
            <div className="flex w-full justify-center space-x-2 text-blue-800">
              <Info />
              <span>Insira informações para carregar o gráfico</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}