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
  '#6200EE', // Primary Purple
  '#7C4DFF', // Deep Purple
  '#9575CD', // Muted Purple
  '#B39DDB', // Light Purple
  '#334155', // Slate 700
  '#475569', // Slate 600
  '#64748B', // Slate 500
  '#94A3B8', // Slate 400
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
        x={x + 2} // Simulating gap-4 (2px each side)
        y={y + 2}
        width={width - 4}
        height={height - 4}
        rx={8}
        ry={8}
        style={{
          fill: color,
          stroke: 'rgba(255,255,255,0.1)',
          strokeWidth: 1,
        }}
        className="transition-all duration-300 hover:brightness-110 cursor-pointer shadow-sm"
      />
      {canShowLabel && (
        <g style={{ pointerEvents: 'none' }}>
          <text
            x={x + width / 2}
            y={y + height / 2 - (canShowValue ? 6 : 0)}
            textAnchor="middle"
            fill={textColor}
            fontSize={currentFontSize}
            className="font-bold tracking-tight"
          >
            {displayedSectorName}
          </text>
          {canShowValue && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 12}
              textAnchor="middle"
              fill={textColor}
              fillOpacity={0.7}
              fontSize={currentFontSize - 1}
              className="font-medium"
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
      <CardHeader className="pb-6 px-8 pt-8">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
                <BarChartIcon className="h-5 w-5 text-primary" />
            </div>
            Despesas por Setor
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        {isLoading ? (
          <div className="h-[350px] w-full flex items-center justify-center">
            <div className="h-10 w-10 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
          </div>
        ) : hasData ? (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={monthExpenseBySector}
                dataKey="amount"
                aspectRatio={4 / 3}
                stroke="transparent"
                fill="#8884d8"
                content={<CustomizedContent COLORS={COLORS} />}      >
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 ring-1 ring-black/5 font-manrope">
                          <p className="label-uppercase mb-2">Category Overview</p>
                          <p className="font-extrabold text-lg text-slate-900 dark:text-slate-100">{data.sector_name}</p>
                          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-baseline gap-2">
                             <span className="text-xs font-bold text-slate-400">Total Volume:</span>
                             <p className="text-2xl font-black text-primary tabular-nums tracking-tighter">
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
          <div className="h-[350px] flex flex-col items-center justify-center text-slate-400 gap-4 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
            <Info className="h-12 w-12 text-slate-200" />
            <span className="text-sm font-bold uppercase tracking-widest opacity-60">No data found</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}