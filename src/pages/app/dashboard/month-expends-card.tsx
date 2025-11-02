import { useQuery } from '@tanstack/react-query'
import { TrendingDown } from 'lucide-react'

import { getMonthExpensesAmount } from '@/api/get-month-expenses-amount'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function MonthExpendsCard() {
  const { data: monthExpenseAmount } = useQuery({
    queryFn: getMonthExpensesAmount,
    queryKey: ['metrics', 'month-expenses-amount'],
  })

  // 1. Verificar se o valor de comparação existe (não é null)
  const hasComparisonData =
    monthExpenseAmount && monthExpenseAmount.diffFromLastMonth !== null

  // 2. Definir o valor para exibição, formatado como moeda (BRL)
  const formattedAmount = monthExpenseAmount?.monthExpenseAmount !== null
    ? monthExpenseAmount?.monthExpenseAmount.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
    : 'R$ 0,00'

  // 3. Função para renderizar o texto de comparação/fallback
  const renderComparisonText = () => {
    // Se não há dados do mês anterior para comparar, mostre a mensagem de primeiro período.
    if (!hasComparisonData) {
      // Se houver despesas, mas não mês anterior para comparar
      if (monthExpenseAmount?.monthExpenseAmount > 0) {
        return (
          <span className="font-semibold text-blue-700 dark:text-blue-500">
            Primeira despesa do período.
          </span>
        )
      }
      // Se não há despesas e nem mês anterior para comparar
      return (
        <span className="font-semibold text-blue-700 dark:text-blue-500">
          Este mês não possui saídas.
        </span>
      )
    }

    // Se houver dados de comparação (hasComparisonData é true)
    const diff = monthExpenseAmount!.diffFromLastMonth // Garante que não é null/undefined aqui

    if (diff > 0) {
      return (
        <>
          <span className="font-semibold text-stiletto-600 dark:text-stiletto-500">
            +{diff}%
          </span>
          em relação ao mês passado
        </>
      )
    }

    // Se a diferença for zero ou negativa
    return (
      <>
        <span className="font-semibold text-vida-loca-600 dark:text-vida-loca-500">
          {diff}%
        </span>{' '}
        em relação ao mês passado
      </>
    )
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">
          Despesas mensais
        </CardTitle>
        <TrendingDown className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-1">
        {monthExpenseAmount && (
          <>
            <span className="text-2xl font-bold tracking-tight">
              {formattedAmount}
            </span>

            {/* Renderiza o texto de comparação ou o fallback */}
            <p className="text-xs text-muted-foreground">
              {renderComparisonText()}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}