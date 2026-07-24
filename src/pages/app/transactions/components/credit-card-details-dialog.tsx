import { useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { payCreditCardInvoice } from '@/api/credit-cards'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface CreditCardDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  virtualTransaction: {
    id: string
    credit_card_id: string
    description: string
    totalValue: number
    data_vencimento: string | Date
    confirmed: boolean
    swipes: any[]
  } | null
}

export function CreditCardDetailsDialog({
  open,
  onOpenChange,
  virtualTransaction,
}: CreditCardDetailsDialogProps) {
  const queryClient = useQueryClient()

  const { mutateAsync: payInvoiceMutation, isPending } = useMutation({
    mutationFn: ({ id, month }: { id: string; month: string }) =>
      payCreditCardInvoice(id, month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      toast.success('Fatura do cartão paga/baixada com sucesso!')
      onOpenChange(false)
    },
    onError: (err) => {
      console.error(err)
      toast.error('Erro ao pagar fatura do cartão.')
    },
  })

  if (!virtualTransaction) return null

  const monthStr = dayjs(virtualTransaction.data_vencimento).format('YYYY-MM')

  async function handlePayInvoice() {
    if (!virtualTransaction?.credit_card_id) return
    await payInvoiceMutation({
      id: virtualTransaction.credit_card_id,
      month: monthStr,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold tracking-tight">
            {virtualTransaction.description}
          </DialogTitle>
          <DialogDescription className="font-medium text-slate-500">
            Visualizando as compras individuais desta fatura para o mês de{' '}
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {dayjs(virtualTransaction.data_vencimento).format('MMMM YYYY')}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[350px] overflow-y-auto py-4">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 dark:border-slate-800">
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Vencimento
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Descrição
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Valor
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {virtualTransaction.swipes?.map((swipe) => (
                <TableRow
                  key={swipe.id}
                  className="border-slate-100 transition-colors hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/50"
                >
                  <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                    {dayjs(swipe.data_vencimento).format('DD/MM/YYYY')}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate font-medium text-slate-700 dark:text-slate-200">
                    {swipe.description || 'Sem descrição'}
                  </TableCell>
                  <TableCell className="text-right text-sm font-black tabular-nums text-slate-800 dark:text-slate-100">
                    R${' '}
                    {(swipe.totalValue ?? swipe.amount).toLocaleString(
                      'pt-BR',
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {virtualTransaction.swipes?.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-6 text-center text-xs font-bold uppercase tracking-widest text-slate-400"
                  >
                    Nenhuma compra encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="flex w-full items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800 sm:justify-between">
          <div className="flex flex-col gap-0.5 text-left">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Valor Total
            </span>
            <span className="text-xl font-black tracking-tight text-rose-600">
              R${' '}
              {virtualTransaction.totalValue.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl border-slate-200/80 font-bold dark:border-slate-800"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
            {!virtualTransaction.confirmed && (
              <Button
                className="flex h-10 items-center gap-1 rounded-xl bg-rose-600 px-4 text-[10px] font-black uppercase tracking-widest text-white hover:bg-rose-700"
                onClick={handlePayInvoice}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Dar Baixa na Fatura
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
