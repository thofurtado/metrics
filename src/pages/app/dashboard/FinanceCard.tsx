import { useQuery } from '@tanstack/react-query'
import { type ComponentProps } from 'react'
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getMonthIncomesAmount } from '@/api/get-month-income-amount'
import { getMonthExpensesAmount } from '@/api/get-month-expenses-amount'
import { cn } from '@/lib/utils'

interface MonthlyAmountResponse {
    monthIncomeAmount?: number | null;
    monthExpenseAmount?: number | null;
    diffFromLastMonth?: number | null;
}

type FinanceCardProps = ComponentProps<'div'>

export function FinanceCard({ className, ...props }: FinanceCardProps) {
    // ----------------------------------------------------
    // ⚠️ MOCKS E FUNÇÕES DE CONVENIÊNCIA
    // ----------------------------------------------------

    // Dados mockados (movidos para dentro do componente)
    const mockBalance = 15450.75
    const mockAPagar = 2800.00
    const mockAReceber = 4250.00

    // Função auxiliar para formatar em Reais
    const formatCurrency = (value: number) =>
        value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

    // ----------------------------------------------------
    // LÓGICA DE DADOS (usando mocks para simular as APIs)
    // ----------------------------------------------------
    
    // Mocking useQuery data
    const receita = 35000.00 // monthIncomeAmount?.monthIncomeAmount ?? 35000.00
    const despesa = 19500.00 // monthExpenseAmount?.monthExpenseAmount ?? 19500.00
    const saldo = receita - despesa

    const diffReceita = 12 // monthIncomeAmount?.diffFromLastMonth ?? 12
    const hasValidDiffReceita = true

    const diffDespesa = -5 // monthExpenseAmount?.diffFromLastMonth ?? -5
    const hasValidDiffDespesa = true


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
                        <span className="text-xl font-bold text-minsk-700 dark:text-minsk-300">
                            {formatCurrency(mockBalance)}
                        </span>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${saldo >= 0
                        ? 'bg-vida-loca-100 text-vida-loca-700 dark:bg-vida-loca-900/30'
                        : 'bg-stiletto-100 text-stiletto-700 dark:bg-stiletto-900/30'
                        }`}>
                        {saldo >= 0 ? 'Positivo' : 'Negativo'}
                    </div>
                    
                </div>

                {/* Grid Compacto (Receita e Despesa) */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Receita */}
                    <div className="bg-vida-loca-50 dark:bg-vida-loca-900/20 rounded-lg p-3 border border-vida-loca-100 dark:border-vida-loca-800">
                        <div className="flex items-center gap-1 mb-1">
                            <TrendingUp className="h-3 w-3 text-vida-loca-600" />
                            <span className="text-xs font-semibold text-vida-loca-700">Receita</span>
                        </div>
                        <span className="text-lg font-bold block mb-1">
                            {formatCurrency(receita)}
                        </span>
                        {hasValidDiffReceita && (
                            <div className="flex items-center gap-1">
                                {diffReceita! >= 0 ? (
                                    <TrendingUp className="h-3 w-3 text-vida-loca-600" />
                                ) : (
                                    <TrendingDown className="h-3 w-3 text-stiletto-600" />
                                )}
                                <span className={`text-xs ${diffReceita! >= 0 ? 'text-vida-loca-600' : 'text-stiletto-600'}`}>
                                    {diffReceita! >= 0 ? `+${diffReceita!}%` : `${diffReceita!}%`}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Despesa */}
                    <div className="bg-stiletto-50 dark:bg-stiletto-900/20 rounded-lg p-3 border border-stiletto-100 dark:border-stiletto-800">
                        <div className="flex items-center gap-1 mb-1">
                            <TrendingDown className="h-3 w-3 text-stiletto-600" />
                            <span className="text-xs font-semibold text-stiletto-700">Despesa</span>
                        </div>
                        <span className="text-lg font-bold block mb-1">
                            {formatCurrency(despesa)}
                        </span>
                        {hasValidDiffDespesa && (
                            <div className="flex items-center gap-1">
                                {diffDespesa! > 0 ? (
                                    <TrendingUp className="h-3 w-3 text-stiletto-600" />
                                ) : (
                                    <TrendingDown className="h-3 w-3 text-vida-loca-600" />
                                )}
                                <span className={`text-xs ${diffDespesa! > 0 ? 'text-stiletto-600' : 'text-vida-loca-600'}`}>
                                    {diffDespesa! >= 0 ? `+${diffDespesa!}%` : `${diffDespesa!}%`}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* A Pagar / A Receber - Layout Horizontal Compacto */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="text-center">
                        <span className="text-xs text-muted-foreground block">A Pagar</span>
                        <span className="text-sm font-semibold text-stiletto-600">
                            {formatCurrency(mockAPagar)}
                        </span>
                    </div>
                    <div className="text-center">
                        <span className="text-xs text-muted-foreground block">A Receber</span>
                        <span className="text-sm font-semibold text-vida-loca-600">
                            {formatCurrency(mockAReceber)}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}