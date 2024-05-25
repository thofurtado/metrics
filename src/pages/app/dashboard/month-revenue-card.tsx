import { PiggyBank } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function MonthRevenueCard() {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">
          Receitas totais (mês)
        </CardTitle>
        <PiggyBank className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-1">
        <span className="text-2xl font-bold tracking-tight">R$ 3579,30</span>
        <p className="text-xs text-muted-foreground">
          <span className="text-rose-600 dark:text-rose-500"> -8% </span>
          em relação ao mês passado
        </p>
      </CardContent>
    </Card>
  )
}
