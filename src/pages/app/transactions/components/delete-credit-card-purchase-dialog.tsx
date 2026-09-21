import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  deleteCreditCardPurchase,
  DeleteCreditCardPurchaseScope,
} from '@/api/credit-card-purchases'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface DeletableCreditCardPurchase {
  id: string
  description?: string | null
  amount: number
  totalValue?: number | null
  confirmed: boolean
  transaction_group_id?: string | null
}

interface DeleteCreditCardPurchaseDialogProps {
  purchase: DeletableCreditCardPurchase | null
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

const OPTIONS: { value: DeleteCreditCardPurchaseScope; label: string }[] = [
  { value: 'one', label: 'Só esta parcela' },
  { value: 'forward', label: 'Esta e as próximas' },
  { value: 'all', label: 'Todas as parcelas' },
]

export function DeleteCreditCardPurchaseDialog({
  purchase,
  onOpenChange,
  onDeleted,
}: DeleteCreditCardPurchaseDialogProps) {
  const queryClient = useQueryClient()
  const [scope, setScope] = useState<DeleteCreditCardPurchaseScope>('one')

  useEffect(() => {
    if (purchase) setScope('one')
  }, [purchase])

  const { mutateAsync: remove, isPending } = useMutation({
    mutationFn: () => deleteCreditCardPurchase(purchase!.id, scope),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      queryClient.invalidateQueries({ queryKey: ['payables'] })
      toast.success(
        res.preserved > 0
          ? `${res.deleted} excluída(s). ${res.preserved} já paga(s) mantida(s).`
          : res.deleted > 1
            ? `${res.deleted} parcelas excluídas.`
            : 'Compra excluída.',
      )
      onDeleted()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Não foi possível excluir.')
    },
  })

  if (!purchase) return null

  const hasInstallments = Boolean(purchase.transaction_group_id)
  const value = (purchase.totalValue ?? purchase.amount).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
  })

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl p-6 sm:max-w-[440px]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-black tracking-tight">
            Excluir compra?
          </DialogTitle>
          <DialogDescription className="text-sm font-medium">
            {purchase.description || 'Compra em cartão'} · R$ {value}
          </DialogDescription>
        </DialogHeader>

        {hasInstallments && (
          <div className="grid gap-2">
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setScope(opt.value)}
                className={cn(
                  'h-12 rounded-xl border px-4 text-left text-sm font-bold transition-colors',
                  scope === opt.value
                    ? 'border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300',
                )}
              >
                {opt.label}
              </button>
            ))}
            {scope !== 'one' && (
              <p className="text-xs font-medium text-slate-500">
                Parcelas já pagas na fatura são mantidas.
              </p>
            )}
          </div>
        )}

        {purchase.confirmed && scope === 'one' && (
          <p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Esta compra já foi paga na fatura. Ao excluir, R$ {value} volta para
            a conta que pagou.
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            className="h-11 rounded-xl font-bold"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            className="h-11 rounded-xl bg-rose-600 px-6 font-black hover:bg-rose-700"
            onClick={() => remove()}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
