import { useQuery } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip, // 1. Importação do Tooltip
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
// 1. FUNÇÃO DE PROCESSAMENTO DE DADOS (Agregação e Formatação)
// --------------------------------------------------------
function processChartData(data: { day: string; revenue: number }[] | undefined) {
  if (!data) {
    return []
  }

  // Objeto para agregar as receitas por dia
  const aggregatedData: { [key: string]: number } = {}

  data.forEach((item) => {
    // Agrega (soma) a receita se o dia já existe, ou inicia se for o primeiro
    aggregatedData[item.day] = (aggregatedData[item.day] || 0) + item.revenue
  })

  // Transforma o objeto agregado de volta em um array de objetos
  const finalData = Object.entries(aggregatedData).map(([day, revenue]) => {
    // Formata a data de 'MM-DD' para 'DD-MM'
    // A data original está em 'MM-DD' (e.g., 11-01), pegamos o mês (index 0) e dia (index 1)
    const [month, dayOfMonth] = day.split('-')
    const formattedDay = `${dayOfMonth}-${month}`

    return {
      day: day, // Mantemos o 'day' original para ordenar, mas usamos a formatada para exibição
      formattedDay: formattedDay, // A nova chave para exibição no eixo X
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
    queryFn: getMonthIncomesByDay,
    queryKey: ['metrics', 'month-income-by-day'],
  })

  // Chama a função de processamento
  const chartData = processChartData(monthIncomeByDays)

  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between pb-8">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">
            Receita no período
          </CardTitle>
          <CardDescription>Receita diária no período</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length !== 0 ? ( // Usa chartData que já está processado
          <>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} style={{ fontSize: 12 }}>
                <XAxis
                  dataKey="formattedDay" // 2. Usa a chave de data formatada (DD-MM)
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
                
                {/* 3. Adiciona o Tooltip */}
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
                  dot={true} // Garante que os pontos são visíveis
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