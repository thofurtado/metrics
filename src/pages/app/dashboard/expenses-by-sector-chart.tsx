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
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#3b82f6', // blue-500
  '#22d3ee', // cyan-400
  '#2dd4bf', // teal-400
  '#f43f5e', // rose-500
  '#64748b', // slate-500
  '#475569', // slate-600
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
  const canShowValue = width > 70 && height > 50;

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
        rx={6}
        ry={6}
        style={{
          fill: color,
          stroke: 'rgba(255,255,255,0.1)',
          strokeWidth: 1,
        }}
        className="transition-all duration-300 hover:brightness-110"
      />
      {canShowLabel && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - (canShowValue ? 6 : 0)}
            textAnchor="middle"
            fill={textColor}
            fontSize={currentFontSize}
            fontWeight="700"
            style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
          >
            {displayedSectorName}
          </text>
          {canShowValue && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 12}
              textAnchor="middle"
              fill={textColor}
              fillOpacity={0.9}
              fontSize={currentFontSize - 1}
              fontWeight="500"
              style={{ pointerEvents: 'none' }}
            >
              {formattedValue}
            </text>
          )}
        </>
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
  const chartHeight = 320

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChartIcon className="h-4 w-4 text-minsk-600" />
            Despesas por Setor
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[320px] w-full flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-4 border-minsk-100 border-t-minsk-600 animate-spin" />
          </div>
        ) : hasData ? (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={chartHeight}>
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
                        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl animate-in zoom-in-95 duration-200">
                          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Setor</p>
                          <p className="font-bold text-sm text-foreground">{data.sector_name}</p>
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                             <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
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

            {/* Legenda para resolver o problema de itens 'escondidos' */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
               {monthExpenseBySector.map((entry, index) => (
                 <div key={index} className="flex items-center gap-1.5 transition-opacity hover:opacity-100 cursor-default">
                    <div 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                    />
                    <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-tighter">
                      {entry.sector_name}
                    </span>
                 </div>
               ))}
            </div>
          </div>
        ) : (
          <div className="h-[320px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Info className="h-8 w-8 text-slate-300" />
            <span className="text-sm font-medium">Sem dados de despesas para este período</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}