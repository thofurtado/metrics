import { useQuery } from '@tanstack/react-query'
import { BarChart as BarChartIcon, Info } from 'lucide-react'
import React from 'react'
import {
  ResponsiveContainer,
  Tooltip,
  Treemap,
} from 'recharts'

import { getMonthExpenseBySector } from '@/api/get-month-expenses-by-sector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const COLORS = [
  '#1E40AF', // Blue 800 - Vibrante/Forte para maiores despesas
  '#2563EB', // Blue 600
  '#10B981', // Emerald 500 - Verde suave para itens estáveis
  '#3B82F6', // Blue 500
  '#64748B', // Slate 500 - Cinza azulado para categorias menores
  '#94A3B8', // Slate 400
  '#CBD5E1', // Slate 300
  '#E2E8F0', // Slate 200
]

// Função auxiliar para determinar a cor do texto baseada na cor de fundo
const getContrastColor = (hexColor: string) => {
  // Cores mais claras que devem ter texto escuro
  const lightColors = ['#CBD5E1', '#E2E8F0', '#94A3B8']
  if (lightColors.includes(hexColor.toUpperCase())) {
    return '#1E293B' // Slate 800
  }
  return '#FFFFFF'
}

const CustomizedContent: React.FC<any> = (props) => {
  const { x, y, width, height, index, sector_name, amount, COLORS } = props

  if (typeof amount !== 'number' || isNaN(amount)) {
    return null
  }

  const color = COLORS[index % COLORS.length]
  const textColor = getContrastColor(color)

  const formattedValue = amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  // Cálculo responsivo do tamanho da fonte
  const currentFontSize = Math.max(9, Math.min(13, width / 7, height / 5));

  const canShowLabel = width > 50 && height > 30;
  const canShowValue = width > 80 && height > 55;

  const maxCharsPerLine = Math.floor(width / (currentFontSize * 0.6));
  const displayedSectorName =
    sector_name && sector_name.length > maxCharsPerLine && width < 150
      ? `${sector_name.substring(0, Math.max(0, maxCharsPerLine - 3))}...`
      : sector_name;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={10}
        ry={10}
        style={{
          fill: color,
          stroke: '#fff',
          strokeWidth: 2,
        }}
        className="transition-all duration-300 hover:brightness-105 cursor-pointer"
      />
      {canShowLabel && (
        <g style={{ pointerEvents: 'none' }}>
          <text
            x={x + width / 2}
            y={y + height / 2 - (canShowValue ? 6 : 0)}
            textAnchor="middle"
            fill={textColor}
            fontSize={currentFontSize}
            fontWeight="700"
            className="tracking-tight"
          >
            {displayedSectorName}
          </text>
          {canShowValue && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 14}
              textAnchor="middle"
              fill={textColor}
              fillOpacity={0.9}
              fontSize={currentFontSize - 1}
              fontWeight="500"
            >
              {formattedValue}
            </text>
          )}
        </g>
      )}
    </g>
  )
}

export function ExpensesBySectorChart({ className, month, year }: { className?: string; month: number; year: number }) {
  const { data: monthExpenseBySector, isLoading } = useQuery({
    queryFn: () => getMonthExpenseBySector({ month, year }),
    queryKey: ['metrics', 'month-expense-by-sector', month, year],
  })

  const hasData = monthExpenseBySector && monthExpenseBySector.length > 0

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <BarChartIcon className="h-4 w-4 text-blue-600" />
            Despesas por Setor
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[350px] w-full flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin" />
          </div>
        ) : hasData ? (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={monthExpenseBySector}
                dataKey="amount"
                aspectRatio={4 / 3}
                stroke="#fff"
                fill="#3B82F6"
                content={<CustomizedContent COLORS={COLORS} />}      >
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Análise por Setor</p>
                          <p className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{data.sector_name}</p>
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-baseline gap-1">
                             <span className="text-sm font-medium text-slate-500">Total:</span>
                             <p className="text-xl font-black text-blue-600 dark:text-blue-400 tabular-nums tracking-tighter">
                               {data.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                             </p>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[350px] flex flex-col items-center justify-center text-slate-400 gap-3 border-2 border-dashed border-slate-100 rounded-2xl">
            <Info className="h-10 w-10 text-slate-200" />
            <span className="text-sm font-medium">Sem dados para exibição</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}