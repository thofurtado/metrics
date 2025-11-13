// ARQUIVO: FinanceCard.tsx
import { useQuery } from '@tanstack/react-query'
import { type ComponentProps } from 'react'
import { Wallet } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
    getFinanceMetrics,
    type GetFinanceMetricsResponse
} from '@/api/get-finance-metrics'

type FinanceCardProps = ComponentProps<'div'>

// Função auxiliar para formatar em Reais
const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function FinanceCard({ className, ...props }: FinanceCardProps) {
    // Query para buscar todos os dados financeiros
    const { data: financeData, isLoading } = useQuery({
        queryFn: getFinanceMetrics,
        queryKey: ['metrics', 'finance-metrics'],
    })

    // Mapeamento dos dados da API
    const saldoDisponivel = financeData?.saldoDisponivel ?? 0
    const receita = financeData?.receita ?? 0
    const despesa = financeData?.despesa ?? 0
    const aReceber = financeData?.aReceber ?? 0
    const aPagar = financeData?.aPagar ?? 0
    const receitaVencida = financeData?.receitaVencida ?? 0
    const despesaVencida = financeData?.despesaVencida ?? 0

    // O saldo é positivo/negativo com base no 'saldoDisponivel'
    const isPositive = saldoDisponivel >= 0

    return (
        <Card className={cn("col-span-1", className)} {...props}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3 px-4 pt-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-minsk-600" />
                    Visão Financeira
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 px-4 pb-4">
                {/* Saldo Principal - Layout Compacto */}
                <div className="flex items-center justify-between bg-minsk-50 dark:bg-minsk-900/30 rounded-lg p-3 border">
                    <div>
                        <span className="text-xs text-muted-foreground block">Saldo Disponível</span>
                        {isLoading ? (
                            <div className="h-6 w-32 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                            <span className="text-xl font-bold text-minsk-700 dark:text-minsk-300">
                                {formatCurrency(saldoDisponivel)}
                            </span>
                        )}
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${isPositive
                        ? 'bg-vida-loca-100 text-vida-loca-700 dark:bg-vida-loca-900/30'
                        : 'bg-stiletto-100 text-stiletto-700 dark:bg-stiletto-900/30'
                        }`}>
                        {isPositive ? 'Positivo' : 'Negativo'}
                    </div>
                </div>

                {/* Grid Compacto (Receita e Despesa) */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Receita + A Receber */}
                    <div className="bg-vida-loca-50 dark:bg-vida-loca-900/20 rounded-lg p-3 border border-vida-loca-100 dark:border-vida-loca-800">
                        <div className="flex items-center gap-1 mb-1">
                            <span className="text-xs font-semibold text-vida-loca-700">Receita</span>
                        </div>
                        {isLoading ? (
                            <div className="h-4 w-16 bg-vida-loca-200 animate-pulse rounded mb-1"></div>
                        ) : (
                            <span className="text-lg font-bold block mb-1">
                                {formatCurrency(receita)}
                            </span>
                        )}

                        {/* A Receber */}
                        <div className="flex items-center justify-between pt-1 border-t border-vida-loca-200 dark:border-vida-loca-800">
                            <span className="text-xs text-vida-loca-800 dark:text-vida-loca-300 font-medium">
                                A Receber:
                            </span>
                            {isLoading ? (
                                <div className="h-3 w-10 bg-vida-loca-200 animate-pulse rounded"></div>
                            ) : (
                                <span className="text-xs font-bold text-vida-loca-600">
                                    {formatCurrency(aReceber)}
                                </span>
                            )}
                        </div>

                        {/* A Receber Vencido - MESMO TAMANHO */}
                        <div className="flex items-center justify-between pt-1 border-t border-vida-loca-200 dark:border-vida-loca-800">
                            <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                                Vencido:
                            </span>
                            {isLoading ? (
                                <div className="h-3 w-10 bg-amber-200 animate-pulse rounded"></div>
                            ) : (
                                <span className="text-xs font-bold text-amber-600">
                                    {formatCurrency(receitaVencida)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Despesa + A Pagar */}
                    <div className="bg-stiletto-50 dark:bg-stiletto-900/20 rounded-lg p-3 border border-stiletto-100 dark:border-stiletto-800">
                        <div className="flex items-center gap-1 mb-1">
                            <span className="text-xs font-semibold text-stiletto-700">Despesa</span>
                        </div>
                        {isLoading ? (
                            <div className="h-4 w-16 bg-stiletto-200 animate-pulse rounded mb-1"></div>
                        ) : (
                            <span className="text-lg font-bold block mb-1">
                                {formatCurrency(despesa)}
                            </span>
                        )}

                        {/* A Pagar */}
                        <div className="flex items-center justify-between pt-1 border-t border-stiletto-200 dark:border-stiletto-800">
                            <span className="text-xs text-stiletto-800 dark:text-stiletto-300 font-medium">
                                A Pagar:
                            </span>
                            {isLoading ? (
                                <div className="h-3 w-10 bg-stiletto-200 animate-pulse rounded"></div>
                            ) : (
                                <span className="text-xs font-bold text-stiletto-600">
                                    {formatCurrency(aPagar)}
                                </span>
                            )}
                        </div>

                        {/* A Pagar Vencido - MESMO TAMANHO */}
                        <div className="flex items-center justify-between pt-1 border-t border-stiletto-200 dark:border-stiletto-800">
                            <span className="text-xs text-rose-800 dark:text-rose-300 font-medium">
                                Vencido:
                            </span>
                            {isLoading ? (
                                <div className="h-3 w-10 bg-rose-200 animate-pulse rounded"></div>
                            ) : (
                                <span className="text-xs font-bold text-rose-600">
                                    {formatCurrency(despesaVencida)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}