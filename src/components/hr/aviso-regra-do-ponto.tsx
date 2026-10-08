// Aviso discreto (D18): aparece no ponto enquanto a loja não escolheu a regra de hora extra dela. Nada bloqueia.
import { useQuery } from '@tanstack/react-query'
import { Scale } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { obterRegraDoPonto } from '@/api/hr/ponto'
import { Button } from '@/components/ui/button'

export function AvisoRegraDoPonto() {
  const navigate = useNavigate()
  const { data } = useQuery({
    queryKey: ['ponto-regra'],
    queryFn: obterRegraDoPonto,
    staleTime: 5 * 60 * 1000,
  })
  if (!data || data.confirmada) return null
  const antiga = data.atual.modelo === 'LEGADO'
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/20 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
        <Scale className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {antiga
            ? 'A hora extra ainda segue a conta antiga do espelho (7h20 por dia, 60%, sem adicional noturno). Escolha a regra da sua loja: a lei ou a sua convenção coletiva.'
            : 'A hora extra está no padrão da CLT (50%, noturno de 20%). Se a sua convenção coletiva paga mais, ajuste a regra da loja.'}
        </span>
      </p>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 rounded-xl"
        onClick={() => navigate('/hr?tab=settings')}
      >
        Escolher a regra
      </Button>
    </div>
  )
}
