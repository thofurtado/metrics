import { useQuery } from '@tanstack/react-query'
import { HandCoins, TrendingDown } from 'lucide-react'

import { getMonthExpensesAmount } from '@/api/get-month-expenses-amount'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function MonthExpendsCard() {
  const { data: monthExpenseAmount } = useQuery({
    queryFn: getMonthExpensesAmount,
    queryKey: ['metrics', 'month-expenses-amount'],
  })

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0  pb-2">
        <CardTitle className="text-base font-semibold">
          Despesas mensais
        </CardTitle>
        <TrendingDown className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-1">
        {monthExpenseAmount && (
          <>
            <span className="text-2xl font-bold tracking-tight">
              {monthExpenseAmount.monthExpenseAmount !== null
                ? monthExpenseAmount.monthExpenseAmount.toLocaleString('pt-BR')
                : '0'}
            </span>

            {/* <p>
              {(
                monthExpenseAmount.monthExpenseAmount -
                monthExpenseAmount.alreadyPaid
              ).toFixed(2)}{' '}
              à pagar
            </p> */}
            <p className="text-xs text-muted-foreground">
              {monthExpenseAmount.diffFromLastMonth > 0 ? (
                <>
                  <span className="font-semibold text-stiletto-600 dark:text-stiletto-500">
                    +{monthExpenseAmount.diffFromLastMonth}%
                  </span>
                  em relação ao mês passado
                </>
              ) : (
                <>
                  {monthExpenseAmount.monthExpenseAmount !== null ? (
                    <span className="font-semibold text-vida-loca-600 dark:text-vida-loca-500">
                      {monthExpenseAmount.diffFromLastMonth} % em relação ao mês
                      passado
                    </span>
                  ) : (
                    <span className="font-semibold text-blue-700 dark:text-blue-500">
                      Este mês não possui saídas
                    </span>
                  )}
                </>
              )}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
