// ARQUIVO: TreatmentCard.tsx - Integração com a nova API de Serviços

import { useQuery } from '@tanstack/react-query'
// Incluímos todos os ícones necessários
import { Handshake, Wrench, Bus, CheckCircle2, TrendingUp, Clock } from 'lucide-react'
import { type ComponentProps } from 'react'

// 💡 IMPORTAÇÃO DA NOVA API
import {
    getServiceMetrics,
    type GetServiceMetricsResponse
} from '@/api/get-service-metrics'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Tipagem para aceitar className
type MonthTreatmentAmountCardProps = ComponentProps<'div'>

// Função para formatar o TMA (em minutos e segundos)
const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min}m ${sec.toString().padStart(2, '0')}s`
}

// Componente principal
export function MonthTreatmentAmountCard({ className, ...props }: MonthTreatmentAmountCardProps) {
    // 1. Query para buscar todos os dados de serviços
    const { data: serviceData, isLoading } = useQuery<GetServiceMetricsResponse>({
        queryFn: getServiceMetrics,
        queryKey: ['metrics', 'service-metrics'],
    })

    // Mapeamento dos dados da API
    const totalMes = serviceData?.totalMes ?? 0
    const concluidos = serviceData?.concluidos ?? 0
    const diffConcluidos = serviceData?.diffConcluidosPercent ?? 0
    const tmaSegundos = serviceData?.tmaSegundos ?? 0
    const diffTMA = serviceData?.diffTmaPercent ?? 0
    const naBancada = serviceData?.naBancada ?? 0
    const externos = serviceData?.externos ?? 0
    const emEspera = serviceData?.emEspera ?? 0
    const ativosTotais = serviceData?.ativosTotais ?? 0


    const isConcluidosCrescimento = diffConcluidos >= 0
    const diffConcluidosText = diffConcluidos >= 0 ? `+${diffConcluidos}%` : `${diffConcluidos}%`

    const isTMAmelhoria = diffTMA <= 0
    const diffTMAText = diffTMA <= 0 ? `${diffTMA}%` : `+${diffTMA}%`


    return (
        <Card className={cn('col-span-1', className)} {...props}>
            <CardHeader className="flex-row items-center justify-between space-y-0 !pb-2 px-4 pt-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Handshake className="h-4 w-4 text-minsk-600" />
                    Gestão de Serviços
                </CardTitle>

            </CardHeader>

            <CardContent className="space-y-4 pt-2 px-4 pb-4">

                {/* 1. Grid de Métricas Chave (3 Colunas) */}
                <div className="grid grid-cols-3 gap-x-3">

                    {/* A. Atendimentos Totais Mês */}
                    <div className='p-2 bg-minsk-50/50 dark:bg-minsk-900/30 rounded-lg'>
                        <span className="flex items-center text-xs font-semibold text-minsk-700 dark:text-minsk-300 mb-1">
                            <TrendingUp className="mr-1 h-3 w-3" />
                            Total Mês
                        </span>
                        {isLoading ? (
                            <div className="h-6 w-10 bg-gray-200 animate-pulse rounded block"></div>
                        ) : (
                            <span className="text-2xl font-bold tracking-tight block">
                                {totalMes.toLocaleString('pt-BR')}
                            </span>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            Atend. Registrados
                        </p>
                    </div>

                    {/* B. Atendimentos Concluídos */}
                    <div className='p-2 bg-vida-loca-50/50 dark:bg-vida-loca-900/20 rounded-lg'>
                        <span className="flex items-center text-xs font-semibold text-vida-loca-700 dark:text-vida-loca-400 mb-1">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Concluídos
                        </span>
                        {isLoading ? (
                            <div className="h-6 w-10 bg-vida-loca-200 animate-pulse rounded block"></div>
                        ) : (
                            <span className="text-2xl font-bold tracking-tight block">
                                {concluidos.toLocaleString('pt-BR')}
                            </span>
                        )}
                        {/* Comparação Concluídos (Crescimento é bom) */}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            <span className={`font-semibold ${isConcluidosCrescimento ? 'text-vida-loca-600' : 'text-stiletto-600'}`}>
                                {diffConcluidosText}
                            </span>{' '}
                            vs. Mês Ant.
                        </p>
                    </div>

                    {/* C. Tempo Médio de Atendimento (TMA) */}
                    <div className='p-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-lg'>
                        <span className="flex items-center text-xs font-semibold text-gray-700 dark:text-gray-400 mb-1">
                            <Clock className="mr-1 h-3 w-3" />
                            TMA (Média)
                        </span>
                        {isLoading ? (
                            <div className="h-6 w-14 bg-gray-200 animate-pulse rounded block"></div>
                        ) : (
                            <span className="text-2xl font-bold tracking-tight block">
                                {formatTime(tmaSegundos)}
                            </span>
                        )}
                        {/* Comparação TMA (Redução/Negativo é bom) */}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            <span className={`font-semibold ${isTMAmelhoria ? 'text-vida-loca-600' : 'text-stiletto-600'}`}>
                                {diffTMAText}
                            </span>{' '}
                            vs. Mês Ant.
                        </p>
                    </div>
                </div>

                {/* 2. Grid de Atendimentos Ativos (2 Colunas) */}
                <div className="grid grid-cols-2 gap-x-4 pt-2 border-t border-dashed">

                    {/* A. Máquinas na Bancada (Abertos de Reparo Interno) */}
                    <div className='text-center border-r dark:border-gray-700'>
                        <span className="flex items-center justify-center text-sm font-semibold text-minsk-700 dark:text-minsk-400 mb-1">
                            <Wrench className="mr-1 h-4 w-4" />
                            Na Bancada
                        </span>
                        {isLoading ? (
                            <div className="h-8 w-10 mx-auto bg-gray-200 animate-pulse rounded block"></div>
                        ) : (
                            <span className="text-3xl font-extrabold tracking-tight block">
                                {naBancada.toLocaleString('pt-BR')}
                            </span>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                            ({emEspera} em espera)
                        </p>
                    </div>

                    {/* B. Atendimentos Externos Abertos (Abertos de Deslocamento) */}
                    <div className='text-center'>
                        <span className="flex items-center justify-center text-sm font-semibold text-minsk-700 dark:text-minsk-400 mb-1">
                            <Bus className="mr-1 h-4 w-4" />
                            Externos
                        </span>
                        {isLoading ? (
                            <div className="h-8 w-10 mx-auto bg-gray-200 animate-pulse rounded block"></div>
                        ) : (
                            <span className="text-3xl font-extrabold tracking-tight block">
                                {externos.toLocaleString('pt-BR')}
                            </span>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                            ({ativosTotais} Ativos Totais)
                        </p>
                    </div>
                </div>

            </CardContent>
        </Card>
    )
}