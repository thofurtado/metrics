import { useQuery } from '@tanstack/react-query'
import { Handshake } from 'lucide-react'

import { getMonthTreatmentsAmount } from '@/api/get-month-treatments-amount'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function MonthTreatmentAmountCard() {
  const { data: monthTreatmentsAmount } = useQuery({
    queryFn: getMonthTreatmentsAmount,
    queryKey: ['metrics', 'month-treatments-amount'],
  })

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 !pb-2">
        <CardTitle className="text-base font-semibold">
          Atendimentos mensais
        </CardTitle>
        <Handshake className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-1">
        {monthTreatmentsAmount && monthTreatmentsAmount.amount !== null && (
          <>
            <span className="text-2xl font-bold tracking-tight">
              {monthTreatmentsAmount.amount.toLocaleString('pt-BR')}
            </span>
            <p className="text-xs text-muted-foreground">
              {monthTreatmentsAmount.diffFromLastMonth > 0 ? (
                <>
                  <span className="text-vida-loca-600 dark:text-vida-loca-500">
                    +{monthTreatmentsAmount.diffFromLastMonth}%
                  </span>
                  em relação ao mês passado
                </>
              ) : (
                <>
                  {monthTreatmentsAmount.amount !== 0 ? (
                    <span className="text-stiletto-600 dark:text-stiletto-500">
                      {monthTreatmentsAmount.diffFromLastMonth}% em relação ao
                      mês passado
                    </span>
                  ) : (
                    <span className="font-semibold text-blue-600 dark:text-blue-500">
                      Este mês não possui atendimentos
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
