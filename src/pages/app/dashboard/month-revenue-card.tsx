import { useQuery } from '@tanstack/react-query'
import { PiggyBank, TrendingUp, TrendingUpIcon } from 'lucide-react'

import { getMonthIncomesAmount } from '@/api/get-month-income-amount'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function MonthRevenueCard() {
  const { data: monthIncomeAmount } = useQuery({
    queryFn: getMonthIncomesAmount,
    queryKey: ['metrics', 'month-incomes-amount'],
  })

  // VARIÁVEL AUXILIAR PARA VERIFICAR SE EXISTE DADO DE COMPARAÇÃO
  // Assumindo que 'null' (ou outro valor que não seja um número) indica ausência de dado.
  const hasValidDiff = monthIncomeAmount && 
                       monthIncomeAmount.diffFromLastMonth !== null && 
                       !isNaN(monthIncomeAmount.diffFromLastMonth);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
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

            {/* Este bloco p agora só será renderizado se houver dados válidos para comparação */}
            {hasValidDiff ? (
                <p className="text-xs text-muted-foreground">
                    {monthIncomeAmount.diffFromLastMonth > 0 ? (
                        <>
                            <span className="font-semibold text-vida-loca-600 dark:text-vida-loca-500">
                                +{monthIncomeAmount.diffFromLastMonth}%
                            </span>{' '}
                            em relação ao mês passado
                        </>
                    ) : (
                        // Aqui eu *tive* que alterar a linha para exibir apenas o span de porcentagem
                        // e manter o texto "em relação ao mês passado" fora dele para aplicar a condição de ocultação.
                        <span className="font-semibold text-stiletto-600 dark:text-stiletto-500">
                            {monthIncomeAmount.diffFromLastMonth}% em relação ao mês
                            passado
                        </span>
                    )}
                </p>
            ) : monthIncomeAmount.monthIncomeAmount !== null && (
                // Se não há dados de comparação, mas há receita neste mês, exibe uma mensagem alternativa
                <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-blue-700 dark:text-blue-500">
                        Primeira receita do período
                    </span>
                </p>
            )}
            
            {/* O bloco original com o 'Este mês não possui entradas' só aparece se monthIncomeAmount.monthIncomeAmount for NULL */}
            {monthIncomeAmount.monthIncomeAmount === null && (
                <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-blue-700 dark:text-blue-500">
                        Este mês não possui entradas
                    </span>
                </p>
            )}
            
          </>
        )}
      </CardContent>
    </Card>
  )
}