import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

interface CalculationMemory {
  base_salary: number
  divisor: number
  hourly_rate: number
  multiplier: number
  workload_minutes: number
}

interface OvertimeTooltipProps {
  memory: CalculationMemory | null
  overtimeMinutes: number
  calculatedValue: number
}

export function OvertimeTooltip({ memory, overtimeMinutes, calculatedValue }: OvertimeTooltipProps) {
  if (!memory || overtimeMinutes <= 0) return null

  // Formatador de moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Converter minutos para formato HH:mm
  const formatMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours.toString().padStart(2, '0')}h${minutes.toString().padStart(2, '0')}m`
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger className="flex items-center gap-1 cursor-help hover:text-vida-loca-600 transition-colors">
          <span>{formatCurrency(calculatedValue)}</span>
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent side="top" className="w-64 p-4 shadow-lg border border-border/50">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm border-b pb-2">Memória de Cálculo (HE)</h4>
            
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Salário Base:</span>
                <span className="font-medium text-foreground">{formatCurrency(memory.base_salary)}</span>
              </div>
              <div className="flex justify-between">
                <span>Divisor HR:</span>
                <span className="font-medium text-foreground">{memory.divisor}</span>
              </div>
              <div className="flex justify-between">
                <span>Valor Hora (Normal):</span>
                <span className="font-medium text-foreground">{formatCurrency(memory.hourly_rate)}</span>
              </div>
              <div className="flex justify-between">
                <span>Multiplicador (Taxa):</span>
                <span className="font-medium text-foreground">
                  {(memory.multiplier * 100) - 100}% ({memory.multiplier}x)
                </span>
              </div>
              
              <div className="border-t my-2 pt-2 flex justify-between font-semibold text-foreground">
                <span>Total Horas Extras:</span>
                <span>{formatMinutes(overtimeMinutes)}</span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
