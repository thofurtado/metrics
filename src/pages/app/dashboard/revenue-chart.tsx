import { useQuery } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
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

export function RevenueChart() {
  const { data: monthIncomeByDays } = useQuery({
    queryFn: getMonthIncomesByDay,
    queryKey: ['metrics', 'month-income-by-day'],
  })
  console.log(monthIncomeByDays)
  return (
    <Card className="col-span-6">
      <CardHeader className="flex-row items-center justify-between pb-8">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">
            Receita no período
          </CardTitle>
          <CardDescription>Receita diária no período</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {(monthIncomeByDays && monthIncomeByDays.length !== 0 && (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthIncomeByDays} style={{ fontSize: 12 }}>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  dy={16}
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
                <Line
                  type="linear"
                  strokeWidth={2}
                  dataKey="revenue"
                  stroke={colors.green['400']}
                />
                <CartesianGrid vertical={false} className="stroke-muted" />
              </LineChart>
            </ResponsiveContainer>
          </>
        )) || (
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
