import { MessageSquareText } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

/**
 * Observação rápida (só no salão), decisão do Thomás em 16/10/2026: o grupo marcado não tem preço, nunca aparece no
 * cardápio online nem no iFood/99, e no PDV e no app do garçom vira botões de observação com contador.
 */
export function ObservacaoRapidaCampo({
  id,
  checked,
  onChange,
}: {
  id: string
  checked: boolean
  onChange: (marcado: boolean) => void
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-all',
        checked
          ? 'border-orange-500/50 bg-orange-50/60 dark:border-orange-500/40 dark:bg-orange-950/20'
          : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/40',
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(valor) => onChange(valor === true)}
        className="mt-0.5"
      />
      <div className="space-y-0.5">
        <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
          <MessageSquareText className="h-4 w-4 shrink-0 text-orange-600" />
          Observação rápida (só no salão: não aparece no cardápio online nem no iFood/99)
        </span>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No PDV e no app do garçom as opções viram botões de observação com contador (ex.: "Sem gelo ×2"). Não têm preço.
        </p>
      </div>
    </label>
  )
}

/** Selo do grupo de observação rápida nas listas de grupos. */
export function SeloSoNoSalao() {
  return (
    <Badge
      variant="secondary"
      className="border-orange-200 bg-orange-50 text-[10px] font-bold text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300"
    >
      Só no salão
    </Badge>
  )
}
