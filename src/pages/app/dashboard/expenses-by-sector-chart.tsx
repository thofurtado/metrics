import { useQuery } from '@tanstack/react-query'
import { PieChart as PieChartIcon, Info } from 'lucide-react'
import React from 'react'
import {
  ResponsiveContainer,
  Tooltip,
  Treemap,
} from 'recharts'

import { getMonthExpenseBySector } from '@/api/get-month-expenses-by-sector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Paleta baseada na imagem de referência do usuário
const COLORS = [
  '#6366F1', // Indigo vibrante (Alimentos Variados)
  '#2C9E8B', // Teal/Verde água (Aquisições)
  '#7000FF', // Roxo profundo (Proteínas)
  '#334155', // Slate escuro (Bebidas/Pessoal)
  '#6D28D9', // Violeta intenso
  '#475569', // Slate médio
  '#818CF8', // Indigo suave
  '#1E293B', // Slate profundo
]

// Função de luminância atualizada para maior precisão de contraste
const getContrastColor = (hexColor: string) => {
  if (!hexColor || hexColor.length < 7) return '#FFFFFF';
  const r = parseInt(hexColor.substring(1, 3), 16);
  const g = parseInt(hexColor.substring(3, 5), 16);
  const b = parseInt(hexColor.substring(5, 7), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b);
  return luma > 180 ? '#1E293B' : '#FFFFFF';
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

  // Ajuste de legibilidade e hierarquia
  const isCompact = width < 100 || height < 60;
  const fontSize = Math.max(9, Math.min(isCompact ? 10 : 13, width / 10, height / 7));

  const canShowLabel = width > 45 && height > 30;
  const canShowValue = width > 80 && height > 55;

  const maxChars = Math.floor(width / (fontSize * 0.58));
  const sectorLabel = sector_name?.toUpperCase() || '';
  
  const label =
    sectorLabel.length > maxChars && width < 150
      ? `${sectorLabel.substring(0, Math.max(0, maxChars - 3))}..`
      : sectorLabel;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={12}
        ry={12}
        style={{
          fill: color,
          stroke: '#fff',
          strokeWidth: 3, // Maiores espaços entre blocos como na imagem
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
            fontSize={fontSize}
            fontWeight="700"
            className="tracking-tight select-none antialiased"
          >
            {label}
          </text>
          {canShowValue && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 14}
              textAnchor="middle"
              fill={textColor}
              fillOpacity={0.9}
              fontSize={fontSize - 1.5}
              fontWeight="800"
              className="select-none antialiased"
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
          <CardTitle className="text-base font-extrabold text-[#7000FF] flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-[#7000FF]" />
            Despesas por Setor
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[350px] w-full flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-4 border-slate-100 border-t-[#7000FF] animate-spin" />
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
                          <p className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{data.sector_name.toUpperCase()}</p>
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-baseline gap-1">
                             <span className="text-sm font-medium text-slate-500">Total:</span>
                             <p className="text-xl font-black text-[#7000FF] dark:text-indigo-400 tabular-nums tracking-tighter">
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

