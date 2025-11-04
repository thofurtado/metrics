import { useQuery } from '@tanstack/react-query'
import { BarChart as BarChartIcon, Info } from 'lucide-react'
import React from 'react'
import {
  ResponsiveContainer,
  Tooltip,
  Treemap,
} from 'recharts'
import colors from 'tailwindcss/colors'

import { getMonthExpenseBySector } from '@/api/get-month-expenses-by-sector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const COLORS = [
  colors.violet[500],
  colors.amber[500],
  colors.emerald[500],
  colors.sky[500],
  colors.teal[500],
  colors.indigo[500],
  colors.rose[500],
]

const CustomizedContent: React.FC<any> = (props) => {
  const { x, y, width, height, index, sector_name, amount, depth, COLORS } = props

  if (typeof amount !== 'number' || isNaN(amount)) {
    return null
  }
  
  const color = COLORS[index % COLORS.length]

  const formattedValue = amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  const baseFontSize = 12;
  const currentFontSize = Math.max(9, Math.min(baseFontSize, width / 7, height / 4)); 
  
  const currentFontWeight = 'normal';
  const valueFontWeight = '500';

  const textColor = '#fff';

  const canShowLabel = width > 50 && height > 25; 
  const canShowValue = width > 65 && height > 40; 

  const maxCharsPerLine = Math.floor(width / (currentFontSize * 0.6));
  const displayedSectorName = 
    sector_name && sector_name.length > maxCharsPerLine && width < 150
      ? `${sector_name.substring(0, maxCharsPerLine - 3)}...`
      : sector_name;

  // Estilos de texto SVG
  const textStyle = {
      // 🚨 NOVO: Garante que não haja contorno preto (stroke) no texto.
      stroke: 'none', 
      strokeWidth: 0,
  };


  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: color,
          stroke: colors.gray[900], 
          strokeWidth: 2 / (depth + 1e-4),
        }}
      />
      {canShowLabel && ( 
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - (canShowValue ? 8 : 0)} 
            textAnchor="middle"
            fill={textColor}
            fontSize={currentFontSize} 
            fontWeight={currentFontWeight}
            style={textStyle}
          >
            {displayedSectorName}
          </text>
          {canShowValue && ( 
            <text
              x={x + width / 2}
              y={y + height / 2 + 10}
              textAnchor="middle"
              fill={textColor}
              fontSize={currentFontSize - 1} 
              fontWeight={valueFontWeight}
              style={textStyle}
            >
              {formattedValue}
            </text>
          )}
        </>
      )}
    </g>
  )
}

export function ExpensesBySectorChart({ className }: { className?: string }) {
  const { data: monthExpenseBySector } = useQuery({
    queryFn: getMonthExpenseBySector,
    queryKey: ['metrics', 'month-expense-by-sector'],
  })

  const hasData = monthExpenseBySector && monthExpenseBySector.length > 0
  const chartHeight = 350

  return (
    <Card className={className}>
      <CardHeader className="pb-8">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            Despesas por setor (mensal)
          </CardTitle>
          <BarChartIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <Treemap
              data={monthExpenseBySector}
              dataKey="amount"
              aspectRatio={4 / 3}
              stroke={colors.gray[900]} 
              fill="#8884d8"
              content={(props) => <CustomizedContent {...props} COLORS={COLORS} />} as any
            >
              <Tooltip
                contentStyle={{ 
                    backgroundColor: colors.gray[800], 
                    borderColor: colors.gray[700], 
                    color: '#fff' 
                }}
                itemStyle={{ color: '#fff' }}
                formatter={(value: number) =>
                  value.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })
                }
                labelFormatter={(label, payload) =>
                  payload[0]?.payload.sector_name || 'Setor'
                }
              />
            </Treemap>
          </ResponsiveContainer>
        ) : (
          <>
            <div className="flex w-full justify-center space-x-2 text-blue-800">
              <Info className="h-4 w-4" />
              <span>Insira informações para carregar o gráfico</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}