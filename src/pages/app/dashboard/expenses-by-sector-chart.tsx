import { useQuery } from '@tanstack/react-query'
import { Info, PieChart } from 'lucide-react'
import React, { useState } from 'react'
import {
  ResponsiveContainer,
  Tooltip,
  Treemap,
} from 'recharts'

import { getMonthExpenseBySector } from '@/api/get-month-expenses-by-sector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const COLORS = [
  '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57', '#ffc658'
]

const CustomizedContent: React.FC<any> = (props) => {
  const { x, y, width, height, sector_name, amount, index, activeSector } = props
  const color = COLORS[index % COLORS.length] || COLORS[0]

  if (!sector_name) return null

  const isHighlighted = activeSector === sector_name
  const showText = width > 60 && height > 40

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: color,
          stroke: '#fff',
          strokeWidth: isHighlighted ? 4 : 2,
          fillOpacity: activeSector && !isHighlighted ? 0.3 : 1,
        }}
        rx={8}
        ry={8}
        className="transition-all duration-300"
      />

      {showText && (
        <foreignObject x={x} y={y} width={width} height={height}>
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            className="w-full h-full p-2 flex flex-col justify-start items-start pointer-events-none"
            style={{
              fontFamily: 'sans-serif',
              // Usando CSS Text-Shadow para criar contraste sem borrar a letra
              textShadow: '0px 1px 2px rgba(255,255,255,0.5)'
            }}
          >
            <span className="text-[11px] font-black text-black leading-tight break-all uppercase tracking-tighter">
              {width > 120 ? sector_name : sector_name.substring(0, 8)}
            </span>

            {height > 50 && (
              <span className="text-[10px] font-bold text-black/70 mt-0.5 tabular-nums">
                {amount?.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  maximumFractionDigits: 0
                })}
              </span>
            )}
          </div>
        </foreignObject>
      )}
    </g>
  )
}

export function ExpensesBySectorChart({ className, month, year }: { className?: string; month: number; year: number }) {
  const [activeSector, setActiveSector] = useState<string | null>(null)
  const [hoveredData, setHoveredData] = useState<any>(null)

  const { data: monthExpenseBySector, isLoading } = useQuery({
    queryFn: () => getMonthExpenseBySector({ month, year }),
    queryKey: ['metrics', 'month-expense-by-sector', month, year],
  })

  const hasData = Array.isArray(monthExpenseBySector) && monthExpenseBySector.length > 0
  const totalAmount = hasData ? monthExpenseBySector.reduce((acc, curr) => acc + (curr.amount || 0), 0) : 0
  const smallSectors = hasData ? monthExpenseBySector.filter(item => (item.amount / totalAmount) < 0.07) : []

  return (
    <Card className={cn("col-span-1 border-none bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-visible", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-6">
        <CardTitle className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-3 font-manrope uppercase tracking-widest">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
            <PieChart className="h-4 w-4 text-indigo-600" />
          </div>
          Despesas por Setor
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-8 relative">
        {/* Tooltip Flutuante para a Legenda */}
        {activeSector && hoveredData && (
          <div
            className="absolute z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-2xl font-manrope transition-all"
            style={{ top: '10%', right: '5%', width: '200px' }}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Setor</p>
            <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{hoveredData.sector_name}</p>
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xl font-black text-indigo-600 tabular-nums">
                {hoveredData.amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="h-[340px] flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
          </div>
        ) : hasData ? (
          <div className="space-y-4">
            <div className="h-[370px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={monthExpenseBySector}
                  dataKey="amount"
                  aspectRatio={4 / 3}
                  stroke="#fff"
                  content={<CustomizedContent activeSector={activeSector} />}
                >
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-2xl font-manrope">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Setor</p>
                            <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{data.sector_name}</p>
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                              <p className="text-xl font-black text-indigo-600 tabular-nums">
                                {data.amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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

            {smallSectors.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-2 italic">Legenda de Apoio (Setores Menores)</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {smallSectors.map((item, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-1.5 cursor-pointer transition-all duration-200 px-1.5 py-0.5 rounded-md border border-transparent",
                        activeSector === item.sector_name ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 scale-105" : "opacity-70 hover:opacity-100"
                      )}
                      onMouseEnter={() => {
                        setActiveSector(item.sector_name)
                        setHoveredData(item)
                      }}
                      onMouseLeave={() => {
                        setActiveSector(null)
                        setHoveredData(null)
                      }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: COLORS[monthExpenseBySector.indexOf(item) % COLORS.length] }}
                      />
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 font-manrope uppercase tracking-tight">
                        {item.sector_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-[340px] flex items-center justify-center text-slate-300 uppercase text-xs font-bold tracking-widest">
            Sem dados
          </div>
        )}
      </CardContent>
    </Card>
  )
}