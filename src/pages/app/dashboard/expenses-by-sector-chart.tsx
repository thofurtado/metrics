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
  '#4338CA', // Indigo 700
  '#4F46E5', // Indigo 600
  '#6366F1', // Indigo 500
  '#818CF8', // Indigo 400
  '#A5B4FC', // Indigo 300
  '#94A3B8', // Slate 400
  '#64748B', // Slate 500
  '#475569', // Slate 600
]

const CustomizedContent: React.FC<any> = (props) => {
  const { x, y, width, height, index, sector_name, amount, COLORS } = props

  if (typeof amount !== 'number' || isNaN(amount)) {
    return null
  }

  const color = COLORS[index % COLORS.length]

  const formattedValue = amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  // Cálculo responsivo do tamanho da fonte
  const currentFontSize = Math.max(9, Math.min(12, width / 7, height / 5));

  const textColor = '#fff';

  const canShowLabel = width > 50 && height > 30;
  const canShowValue = width > 75 && height > 55;

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
        rx={8}
        ry={8}
        style={{
          fill: color,
          stroke: '#fff',
          strokeWidth: 2,
        }}
        className="transition-all duration-300 hover:brightness-110 cursor-pointer"
      />
      {canShowLabel && (
        <g style={{ pointerEvents: 'none' }}>
          <text
            x={x + width / 2}
            y={y + height / 2 - (canShowValue ? 6 : 0)}
            textAnchor="middle"
            fill={textColor}
            fontSize={currentFontSize}
            fontWeight="bold"
            className="tracking-tight"
          >
            {displayedSectorName}
          </text>
          {canShowValue && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 12}
              textAnchor="middle"
              fill={textColor}
              fillOpacity={0.8}
              fontSize={currentFontSize - 1}
              fontWeight="medium"
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
            <BarChartIcon className="h-4 w-4 text-indigo-600" />
            Despesas por Setor
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[350px] w-full flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
          </div>
        ) : hasData ? (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={monthExpenseBySector}
                dataKey="amount"
                aspectRatio={4 / 3}
                stroke="#fff"
                fill="#8884d8"
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
                             <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums tracking-tighter">
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

}