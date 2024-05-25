import { HandCoins } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function MonthExpendsCard() {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0  pb-2">
        <CardTitle className="text-base font-semibold">
          Despesas totais (mês)
        </CardTitle>
        <HandCoins className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-1">
        <span className="text-2xl font-bold tracking-tight">R$ 3279,80</span>
        <p className="text-xs text-muted-foreground">
          <span className="text-emerald-600 dark:text-emerald-500"> -15% </span>
          em relação ao mês passado
        </p>
      </CardContent>
    </Card>
  )
}
