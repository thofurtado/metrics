import { useQuery } from '@tanstack/react-query'
import { Banknote, Eye, EyeOff, Vault } from 'lucide-react'
import { useState } from 'react'

import { getGeneralBalance } from '@/api/get-general-balance'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function GeneralBalance() {
  const [balanceVisibility, setBalanceVisibility] = useState(false)
  const { data: generalBalance } = useQuery({
    queryFn: getGeneralBalance,
    queryKey: ['metrics', 'general-balance'],
  })

  console.log(generalBalance)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 !pb-2">
        <CardTitle className="text-base font-semibold">Balanço Geral</CardTitle>
        <Banknote className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-1">
        {(generalBalance && balanceVisibility && (
          <>
            <span className="flex w-[220px] items-center justify-between space-x-2 text-2xl font-bold tracking-tight">
              {(generalBalance > 0 && (
                <span className="ext-2xl font-bold tracking-tight text-vida-loca-800">
                  <span className="mr-2 text-black">R$</span>
                  <span>{generalBalance.toLocaleString('pt-BR')}</span>
                </span>
              )) || (
                <span className="ext-2xl font-bold tracking-tight text-stiletto-700">
                  R$ {generalBalance.toLocaleString('pt-BR')}
                </span>
              )}

              <Button
                variant="ghost"
                className="hover:bg-white"
                onClick={() => {
                  setBalanceVisibility(false)
                }}
              >
                <EyeOff className="place-self-end	text-minsk-800" />
              </Button>
            </span>
          </>
        )) || (
          <>
            <span className="flex w-[220px] items-center justify-between space-x-2 text-2xl font-bold tracking-tight">
              <span>R$</span>
              <Skeleton className="h-6 w-36" />
              <Button
                variant="ghost"
                className="hover:bg-white"
                onClick={() => {
                  setBalanceVisibility(true)
                }}
              >
                <Eye className="justify-self-end text-minsk-800" />
              </Button>
            </span>
          </>
        )}
      </CardContent>
    </Card>
  )
}
