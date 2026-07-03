import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/axios'
import { toast } from 'sonner'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search, Loader2 } from 'lucide-react'
import { PaymentModal } from '../payment-modal'
import { updateStatusTransaction } from '@/api/update-transaction-status'

export function LinkReceiptModal({ receipt, open, onOpenChange }: { receipt: any, open: boolean, onOpenChange: (o: boolean) => void }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedTransactionForPayment, setSelectedTransactionForPayment] = useState<any>(null)
  
  // Fetch only pending/recent transactions
  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['transactions-for-link', search],
    queryFn: async () => {
      // Just fetching the first page of recent transactions
      const res = await api.get('/transactions', { params: { page: 1, per_page: 20, description: search || undefined, status: 'pending' } })
      return res.data
    },
    enabled: open
  })

  const { mutateAsync: linkReceipt, isPending } = useMutation({
    mutationFn: async (transactionId: string) => {
      const res = await api.patch(`/uploads/receipts/${receipt.filename}/link/${transactionId}`)
      return res.data
    },
    onSuccess: (data, transactionId) => {
      toast.success('Comprovante vinculado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['pending-receipts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      
      const transaction = availableTransactions.find((t: any) => t.id === transactionId)
      if (transaction) {
        setSelectedTransactionForPayment({
          ...transaction,
          attachment_url: data?.attachment_url,
          sectorId: transaction.sectors?.id || null,
          accountId: transaction.accounts?.id || null,
        })
      } else {
        onOpenChange(false)
      }
    },
    onError: () => {
      toast.error('Erro ao vincular comprovante.')
    }
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
    }
  })

  async function handlePayment(payload: {
    id: string;
    amount: number;
    interest?: number;
    discount?: number;
    data_vencimento: Date;
    data_emissao?: Date;
    remainingDate?: Date;
    accountId?: string;
  }) {
    await switchTransactionStatus({
      id: selectedTransactionForPayment.id,
      amount: payload.amount,
      interest: payload.interest,
      discount: payload.discount,
      data_vencimento: payload.data_vencimento,
      remainingDate: payload.remainingDate,
      accountId: payload.accountId
    })
  }

  // Filter transactions that don't have attachments yet (or just show all recent)
  const availableTransactions = transactionsData?.transactions?.transactions?.filter((t: any) => !t.attachment_url) || []

  return (
    <>
      <Dialog open={open && !selectedTransactionForPayment} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle>Vincular a Despesa</DialogTitle>
            <DialogDescription>
              Busque e escolha uma das despesas para anexar o comprovante "{receipt?.description}".
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar despesa por descrição..." 
              className="pl-9 h-11 rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="mt-2 flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
            {isLoading && <p className="text-center text-sm text-slate-500 py-4">Carregando...</p>}
            
            {!isLoading && availableTransactions.length === 0 && (
              <p className="text-center text-sm text-slate-500 py-4">Nenhuma despesa pendente sem anexo encontrada.</p>
            )}

            {availableTransactions.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                <div>
                  <p className="font-bold text-sm text-slate-800">{t.description}</p>
                  <p className="text-xs text-slate-500">{new Date(t.data_vencimento).toLocaleDateString()} - {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="font-bold text-xs"
                  disabled={isPending}
                  onClick={() => linkReceipt(t.id)}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Selecionar'}
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
