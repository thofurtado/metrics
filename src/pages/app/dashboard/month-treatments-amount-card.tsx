import { Handshake } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function MonthTreatmentAmountCard() {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 ">
        <CardTitle className="text-base font-semibold">
          Atendimentos totais (mês)
        </CardTitle>
        <Handshake className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-1">
        <span className="text-2xl font-bold tracking-tight">67</span>
        <p className="text-xs text-muted-foreground">
          <span className="text-emerald-600 dark:text-emerald-500"> +20% </span>
          em relação ao mês passado
        </p>
      </CardContent>
    </Card>
  )
}
