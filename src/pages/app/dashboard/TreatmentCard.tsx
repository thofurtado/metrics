// ARQUIVO: TreatmentCard.tsx
import { useQuery } from '@tanstack/react-query'
import { Wrench, Bus, CheckCircle2, TrendingUp, Clock } from 'lucide-react'
import { type ComponentProps } from 'react'

import {
  getServiceMetrics,
} from '@/api/get-service-management'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MonthTreatmentAmountCardProps extends ComponentProps<'div'> {
  month: number
  year: number
}

// Função para formatar o TMA (em minutos e segundos)
const formatTime = (seconds: number) => {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}m ${sec.toString().padStart(2, '0')}s`
}

export function MonthTreatmentAmountCard({ className, month, year, ...props }: MonthTreatmentAmountCardProps) {
  const { data: serviceData, isLoading } = useQuery({
    queryFn: () => getServiceMetrics({ month, year }),
    queryKey: ['metrics', 'service-metrics', month, year],
  })

  // Mapeamento direto dos dados da API
  const totalMes = serviceData?.totalMes ?? 0
  const concluidos = serviceData?.concluidos ?? 0
  const tmaSegundos = serviceData?.tmaSegundos ?? 0
  const naBancada = serviceData?.naBancada ?? 0
  const externos = serviceData?.externos ?? 0
  const ativosTotais = serviceData?.ativosTotais ?? 0

  return (
    <Card className={cn("col-span-1 border-none bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm", className)} {...props}>
      <CardHeader className="p-8 pb-4 sm:p-10 sm:pb-6">
        <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-indigo-500" />
          Gestão de Serviços
        </CardTitle>
      </CardHeader>

      <CardContent className="p-8 pt-0 sm:p-10 sm:pt-0 space-y-10">
        {/* 1. Grid de Métricas Chave (3 Colunas) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* A. Atendimentos Totais Mês */}
          <div className='p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-2'>
            <span className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
              <TrendingUp className="mr-2 h-3.5 w-3.5 text-indigo-500" />
              Total Mês
            </span>
            {isLoading ? (
              <div className="h-10 w-16 bg-slate-200 animate-pulse rounded-lg"></div>
            ) : (
              <span className="text-4xl font-black font-manrope tracking-tighter block text-slate-900 dark:text-slate-50 tabular-nums">
                {totalMes.toLocaleString('pt-BR')}
              </span>
            )}
            <p className="text-[10px] font-medium text-slate-400">
              Atendimentos Registrados
            </p>
          </div>

          {/* B. Atendimentos Concluídos */}
          <div className='p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100 dark:border-emerald-800 space-y-2'>
            <span className="flex items-center text-[10px] font-black uppercase tracking-widest text-emerald-600">
              <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
              Concluídos
            </span>
            {isLoading ? (
              <div className="h-10 w-16 bg-emerald-100 animate-pulse rounded-lg"></div>
            ) : (
              <span className="text-4xl font-black font-manrope tracking-tighter block text-emerald-600 tabular-nums">
                {concluidos.toLocaleString('pt-BR')}
              </span>
            )}
            <p className="text-[10px] font-medium text-emerald-700/60">
              Finalizados no Período
            </p>
          </div>

          {/* C. Tempo Médio de Atendimento (TMA) */}
          <div className='p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-2'>
            <span className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
              <Clock className="mr-2 h-3.5 w-3.5 text-amber-500" />
              TMA (Média)
            </span>
            {isLoading ? (
              <div className="h-10 w-24 bg-slate-200 animate-pulse rounded-lg"></div>
            ) : (
              <span className="text-2xl font-black font-manrope tracking-tight block text-slate-900 dark:text-slate-50 tabular-nums uppercase">
                {formatTime(tmaSegundos)}
              </span>
            )}
            <p className="text-[10px] font-medium text-slate-400">
              Tempo Médio Global
            </p>
          </div>
        </div>

        {/* 2. Grid de Atendimentos Ativos (2 Colunas) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t border-slate-100 dark:border-slate-800">
          {/* A. Máquinas na Bancada */}
          <div className='flex items-center gap-6'>
            <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 flex-shrink-0">
               <Wrench className="h-8 w-8" />
            </div>
            <div className="space-y-1">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Na Bancada</span>
               {isLoading ? (
                 <div className="h-10 w-12 bg-slate-100 animate-pulse rounded-lg"></div>
               ) : (
                 <span className="text-4xl font-black font-manrope tracking-tighter block text-slate-900 dark:text-slate-50 tabular-nums">
                   {naBancada.toLocaleString('pt-BR')}
                 </span>
               )}
            </div>
          </div>

          {/* B. Atendimentos Externos */}
          <div className='flex items-center gap-6'>
            <div className="h-16 w-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 flex-shrink-0">
               <Bus className="h-8 w-8" />
            </div>
            <div className="space-y-1">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Externos</span>
               {isLoading ? (
                 <div className="h-10 w-12 bg-slate-100 animate-pulse rounded-lg"></div>
               ) : (
                 <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black font-manrope tracking-tighter block text-slate-900 dark:text-slate-50 tabular-nums text-emerald-600">
                        {externos.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-xs font-bold text-slate-400 tabular-nums">/ {ativosTotais} Ativos</span>
                 </div>
               )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}