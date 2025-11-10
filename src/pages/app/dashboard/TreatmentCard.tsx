import { useQuery } from '@tanstack/react-query'
// Incluímos todos os ícones necessários
import { Handshake, Wrench, Bus, CheckCircle2, TrendingUp, Clock } from 'lucide-react'
import { type ComponentProps } from 'react'

// REMOVIDO: import { getMonthTreatmentsAmount } from '@/api/get-month-treatments-amount'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils' // Assumindo o utilitário cn

// Interface de retorno da API (mantida)
interface GetMonthTreatmentsAmountResponse {
    amount: number | null // Usaremos este para totalAbertos
    diffFromLastMonth: number // Usaremos este para o diff (percentual)
}

// ⚠️ MOCK LOCAL DA FUNÇÃO DE API (Para resolver o erro de compilação)
const getMonthTreatmentsAmount = async (): Promise<GetMonthTreatmentsAmountResponse> => {
    // Simula um delay de rede
    await new Promise(resolve => setTimeout(resolve, 500))
    // Retorna dados mockados (15 abertos e 2% de diferença)
    return {
        amount: 15,
        diffFromLastMonth: 2,
    }
}

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
    const { data: monthTreatmentsAmount } = useQuery<GetMonthTreatmentsAmountResponse>({
        queryFn: getMonthTreatmentsAmount,
        queryKey: ['metrics', 'month-treatments-amount'],
    })

    const totalAbertosAPI = monthTreatmentsAmount?.amount ?? 0 // Total de abertos (API)

    // ---------------------------------------------
    // DADOS MOCKADOS
    // ---------------------------------------------
    const mockMaquinasBancada = 45             // Máquinas aguardando ou em serviço na bancada
    const mockExternosAbertos = 22             // Atendimentos que precisam de deslocamento

    const mockConcluidosMes = 115              // Total de atendimentos concluídos no mês

    // Atendimentos Totais (Mock: Concluídos + Abertos (Bancada + Externo))
    const mockTotalMes = mockConcluidosMes + mockMaquinasBancada + mockExternosAbertos

    const diffConcluidos = 5                   // Ex: Crescimento de 5% (Positivo = bom)
    const isConcluidosCrescimento = diffConcluidos >= 0
    const diffConcluidosText = diffConcluidos >= 0 ? `+${diffConcluidos}%` : `${diffConcluidos}%`

    const mockTMA = 1800                       // 30 minutos (30 * 60)
    const diffTMA = -10                        // Ex: Melhoria de 10% (Negativo = bom)
    const isTMAmelhoria = diffTMA <= 0
    const diffTMAText = diffTMA <= 0 ? `${diffTMA}%` : `+${diffTMA}%`

    // Total Ativo é a soma dos abertos (Bancada + Externo)
    const totalAtendimentosAtivos = mockMaquinasBancada + mockExternosAbertos
    // ---------------------------------------------

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
                        <span className="text-2xl font-bold tracking-tight block">
                            {mockTotalMes.toLocaleString('pt-BR')}
                        </span>
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
                        <span className="text-2xl font-bold tracking-tight block">
                            {mockConcluidosMes.toLocaleString('pt-BR')}
                        </span>
                        {/* Comparação Concluídos (Crescimento é bom) */}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            <span className={`font-semibold ${isConcluidosCrescimento ? 'text-vida-loca-600' : 'text-stiletto-600'}`}>
                                {diffConcluidosText}
                            </span>{' '}
                            vs. Mês Ant.
                        </p>
                    </div>

                    {/* C. Tempo Médio de Atendimento (TMA) */}
                    <div className='p-2 bg-gray-50 dark:bg-gray-800/30 rounded-lg'>
                        <span className="flex items-center text-xs font-semibold text-gray-700 dark:text-gray-400 mb-1">
                            <Clock className="mr-1 h-3 w-3" />
                            TMA (Média)
                        </span>
                        <span className="text-2xl font-bold tracking-tight block">
                            {formatTime(mockTMA)}
                        </span>
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
                        <span className="text-3xl font-extrabold tracking-tight block">
                            {mockMaquinasBancada.toLocaleString('pt-BR')}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            ({totalAbertosAPI} em espera)
                        </p>
                    </div>

                    {/* B. Atendimentos Externos Abertos (Abertos de Deslocamento) */}
                    <div className='text-center'>
                        <span className="flex items-center justify-center text-sm font-semibold text-minsk-700 dark:text-minsk-400 mb-1">
                            <Bus className="mr-1 h-4 w-4" />
                            Externos
                        </span>
                        <span className="text-3xl font-extrabold tracking-tight block">
                            {mockExternosAbertos.toLocaleString('pt-BR')}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            ({totalAtendimentosAtivos} Ativos Totais)
                        </p>
                    </div>
                </div>

            </CardContent>
        </Card>
    )
}