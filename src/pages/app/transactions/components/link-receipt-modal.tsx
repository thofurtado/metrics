import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Search } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { updateStatusTransaction } from '@/api/update-transaction-status'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { api } from '@/lib/axios'

import { PaymentModal } from '../payment-modal'

export function LinkReceiptModal({
  receipt,
  open,
  onOpenChange,
}: {
  receipt: any
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedTransactionForPayment, setSelectedTransactionForPayment] =
    useState<any>(null)
  const [includePaid, setIncludePaid] = useState(false)

  // Fetch transactions
  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['transactions-for-link', search, includePaid],
    queryFn: async () => {
      // Just fetching the first page of recent transactions
      const res = await api.get('/transactions', {
        params: {
          page: 1,
          per_page: 50,
          description: search || undefined,
          status: includePaid ? undefined : 'pending',
          month: includePaid ? 'all' : undefined,
          sortBy: 'data_vencimento',
          sortDirection: 'desc',
        },
      })
      return res.data
    },
    enabled: open,
  })

  const { mutateAsync: linkReceipt, isPending } = useMutation({
    mutationFn: async (transactionId: string) => {
      const res = await api.patch(
        `/uploads/receipts/${receipt.filename}/link/${transactionId}`,
        {},
      )
      return res.data
    },
    onSuccess: (data, transactionId) => {
      toast.success('Comprovante vinculado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['pending-receipts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })

      const transaction = availableTransactions.find(
        (t: any) => t.id === transactionId,
      )
      if (transaction) {
        if (transaction.confirmed) {
          // Se já está paga, não precisa abrir o modal de pagamento
          onOpenChange(false)
        } else {
          let initialInterest = 0
          let initialDiscount = 0

          if (receipt.value && receipt.value > 0) {
            const diff = receipt.value - transaction.amount
            if (diff > 0.01) {
              initialInterest = diff
            } else if (diff < -0.01) {
              initialDiscount = Math.abs(diff)
            }
          }

          setSelectedTransactionForPayment({
            ...transaction,
            attachment_url: data?.attachment_url,
            sectorId: transaction.sectors?.id || null,
            accountId: transaction.accounts?.id || null,
            suggestedInterest:
              initialInterest > 0 ? initialInterest : undefined,
            suggestedDiscount:
              initialDiscount > 0 ? initialDiscount : undefined,
          })
        }
      } else {
        onOpenChange(false)
      }
    },
    onError: () => {
      toast.error('Erro ao vincular comprovante.')
    },
  })

  // Mutação para pagar a transação logo após o vínculo
  const { mutateAsync: switchTransactionStatus } = useMutation({
    mutationFn: updateStatusTransaction,
    onSuccess: () => {
      toast.success('Pagamento processado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      queryClient.invalidateQueries({ queryKey: ['treatments'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      setSelectedTransactionForPayment(null)
      onOpenChange(false)
    },
    onError: () => {
      toast.error('Ocorreu um erro ao alterar o status do pagamento.')
    },
  })

  async function handlePayment(payload: {
    id: string
    amount: number
    interest?: number
    discount?: number
    data_vencimento: Date
    data_emissao?: Date
    remainingDate?: Date
    accountId?: string
  }) {
    await switchTransactionStatus({
      id: selectedTransactionForPayment.id,
      amount: payload.amount,
      interest: payload.interest,
      discount: payload.discount,
      data_vencimento: payload.data_vencimento,
      remainingDate: payload.remainingDate,
      accountId: payload.accountId,
    })
  }

  // Filter transactions that don't have attachments yet (or just show all recent)
  const availableTransactions =
    transactionsData?.transactions?.transactions?.filter(
      (t: any) => !t.attachment_url && !t.id.startsWith('virtual-card-'),
    ) || []

  return (
    <>
      <Dialog
        open={open && !selectedTransactionForPayment}
        onOpenChange={onOpenChange}
      >
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle>Vincular a Despesa</DialogTitle>
            <DialogDescription>
              Busque e escolha uma das despesas para anexar o comprovante "
              {receipt?.description}".
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 flex items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar despesa por descrição..."
                className="h-11 rounded-xl pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="ml-4 flex items-center space-x-2">
              <Switch
                id="include-paid"
                checked={includePaid}
                onCheckedChange={setIncludePaid}
              />
              <Label
                htmlFor="include-paid"
                className="cursor-pointer whitespace-nowrap text-sm"
              >
                Incluir já pagas
              </Label>
            </div>
          </div>

          <div className="mt-2 flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
            {isLoading && (
              <p className="py-4 text-center text-sm text-slate-500">
                Carregando...
              </p>
            )}

            {!isLoading && availableTransactions.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-500">
                Nenhuma despesa sem anexo encontrada.
              </p>
            )}

            {availableTransactions.map((t: any) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3 transition-colors hover:border-slate-300"
              >
                <div>
                  <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    {t.description}
                    {t.confirmed ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        Paga
                      </span>
                    ) : (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                        Aberta
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(t.data_vencimento).toLocaleDateString()} -{' '}
                    {t.amount.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold"
                  disabled={isPending}
                  onClick={() => linkReceipt(t.id)}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Selecionar'
                  )}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {selectedTransactionForPayment && (
        <PaymentModal
          open={!!selectedTransactionForPayment}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedTransactionForPayment(null)
              onOpenChange(false)
            }
          }}
          transaction={selectedTransactionForPayment}
          onConfirm={handlePayment}
        />
      )}
    </>
  )
}
