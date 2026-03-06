import { useQuery } from '@tanstack/react-query'
import { type ComponentProps } from 'react'
import { Wallet, TrendingUp, AlertTriangle, CalendarClock } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getOperationalSummary } from '@/api/get-operational-summary'

interface FinanceCardOperacionalProps extends ComponentProps<'div'> {
    month: number
    year: number
}

// Função auxiliar para formatar em Reais
const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function FinanceCardOperacional({ className, month, year, ...props }: FinanceCardOperacionalProps) {
    const { data: opData, isLoading } = useQuery({
        queryFn: () => getOperationalSummary({ month, year }),
        queryKey: ['metrics', 'operational-summary', month, year],
    })

    const totalDespesasMes = opData?.totalDespesasMes ?? 0
    const despesasPagasMes = opData?.despesasPagasMes ?? 0
    const totalVencido = opData?.totalVencido ?? 0
    const projecao14Dias = opData?.projecao14Dias ?? 0
    const receitaAcumulada = opData?.receitaAcumulada ?? 0

    // Cálculo da porcentagem para a barra de progresso (evitando NaN/Infinity)
    const progressPercentage = totalDespesasMes > 0
        ? Math.min((despesasPagasMes / totalDespesasMes) * 100, 100)
        : 0

    return (
        <Card className={cn("col-span-1 flex flex-col", className)} {...props}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3 px-4 pt-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-minsk-600" />
                    Fluxo e Saúde Financeira
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 space-y-4 px-4 pb-4">
                {/* Topo / Destaque: Receitas Acumuladas */}
                <div className="bg-vida-loca-50 dark:bg-vida-loca-900/20 rounded-lg p-4 border border-vida-loca-100 dark:border-vida-loca-800">
                    <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp className="h-4 w-4 text-vida-loca-600" />
                        <span className="text-sm font-semibold text-vida-loca-700">Receita Acumulada no Período</span>
                    </div>
                    {isLoading ? (
                        <div className="h-6 w-32 bg-vida-loca-200 animate-pulse rounded mt-1"></div>
                    ) : (
                        <span className="text-2xl font-bold text-vida-loca-600 block mt-1">
                            {formatCurrency(receitaAcumulada)}
                        </span>
                    )}
                </div>

                {/* Meio: Restante das métricas em Grid */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Bloco Compromissos Vencidos */}
                    <div className="bg-stiletto-50 dark:bg-stiletto-900/20 rounded-lg p-3 border border-stiletto-100 dark:border-stiletto-800 col-span-2 sm:col-span-1">
                        <div className="flex items-center gap-1.5 mb-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-stiletto-600" />
                            <span className="text-xs font-semibold text-stiletto-700">Total Vencido</span>
                        </div>
                        {isLoading ? (
                            <div className="h-5 w-20 bg-stiletto-200 animate-pulse rounded"></div>
                        ) : (
                            <span className="text-lg font-bold text-stiletto-600 block">
                                {formatCurrency(totalVencido)}
                            </span>
                        )}
                    </div>

                    {/* Bloco Projeção de 14 dias */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-100 dark:border-amber-800 col-span-2 sm:col-span-1">
                        <div className="flex items-center gap-1.5 mb-1">
                            <CalendarClock className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-xs font-semibold text-amber-700">A Vencer (14d)</span>
                        </div>
                        {isLoading ? (
                            <div className="h-5 w-20 bg-amber-200 animate-pulse rounded"></div>
                        ) : (
                            <span className="text-lg font-bold text-amber-600 block">
                                {formatCurrency(projecao14Dias)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Rodapé: Barra de Progresso (Ponto de Equilíbrio) */}
                <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-medium">Equilíbrio do Mês</span>
                        {isLoading ? (
                            <div className="h-4 w-12 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                            <span className="font-bold">{progressPercentage.toFixed(0)}% Pago</span>
                        )}
                    </div>

                    <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 relative">
                        <div
                            className="bg-vida-loca-500 h-full transition-all duration-500 ease-in-out"
                            style={{ width: `${isLoading ? 0 : progressPercentage}%` }}
                        />
                    </div>

                    <div className="text-xs text-muted-foreground text-center">
                        {isLoading ? (
                            <div className="h-3 w-48 bg-gray-200 animate-pulse mx-auto rounded mt-1"></div>
                        ) : (
                            <span className="mt-1 block">
                                <strong>{formatCurrency(despesasPagasMes)}</strong> de {formatCurrency(totalDespesasMes)} liquidadas
                            </span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
