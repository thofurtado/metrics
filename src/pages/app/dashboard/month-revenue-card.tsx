import { useQuery } from '@tanstack/react-query'
import { PiggyBank, TrendingUp, TrendingUpIcon } from 'lucide-react'

import { getMonthIncomesAmount } from '@/api/get-month-income-amount'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function MonthRevenueCard() {
  const { data: monthIncomeAmount } = useQuery({
    queryFn: getMonthIncomesAmount,
    queryKey: ['metrics', 'month-incomes-amount'],
  })

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0  pb-2">
        <CardTitle className="text-base font-semibold">
          Receitas mensais
        </CardTitle>
        <TrendingUp className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-1">
        {monthIncomeAmount && (
          <>
            <span className="text-2xl font-bold tracking-tight">
              {monthIncomeAmount.monthIncomeAmount !== null
                ? monthIncomeAmount.monthIncomeAmount.toLocaleString('pt-BR')
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
              {monthIncomeAmount.diffFromLastMonth > 0 ? (
                <>
                  <span className="font-semibold text-vida-loca-600 dark:text-vida-loca-500">
                    +{monthIncomeAmount.diffFromLastMonth}%
                  </span>{' '}
                  em relação ao mês passado
                </>
              ) : (
                <>
                  {monthIncomeAmount.monthIncomeAmount !== null ? (
                    <span className="font-semibold text-stiletto-600 dark:text-stiletto-500">
                      {monthIncomeAmount.diffFromLastMonth} % em relação ao mês
                      passado
                    </span>
                  ) : (
                    <span className="font-semibold text-blue-700 dark:text-blue-500">
                      Este mês não possui entradas
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
