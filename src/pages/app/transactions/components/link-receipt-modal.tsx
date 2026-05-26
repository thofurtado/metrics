import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/axios'
import { toast } from 'sonner'

export function LinkReceiptModal({ receipt, open, onOpenChange }: { receipt: any, open: boolean, onOpenChange: (o: boolean) => void }) {
  const queryClient = useQueryClient()
  
  // Fetch only pending/recent transactions
  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['transactions-for-link'],
    queryFn: async () => {
      // Just fetching the first page of recent transactions
      const res = await api.get('/transactions', { params: { perPage: 20 } })
      return res.data
    },
    enabled: open
  })

  const { mutateAsync: linkReceipt, isPending } = useMutation({
    mutationFn: async (transactionId: string) => {
      await api.patch(`/uploads/receipts/${receipt.filename}/link/${transactionId}`)
    },
    onSuccess: () => {
      toast.success('Comprovante vinculado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['pending-receipts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      onOpenChange(false)
    },
    onError: () => {
      toast.error('Erro ao vincular comprovante.')
    }
  })

  // Filter transactions that don't have attachments yet (or just show all recent)
  const availableTransactions = transactionsData?.transactions?.transactions?.filter((t: any) => !t.attachment_url) || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle>Vincular a Despesa</DialogTitle>
          <DialogDescription>
            Escolha uma das despesas recentes para anexar o comprovante "{receipt?.description}".
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
          {isLoading && <p className="text-center text-sm text-slate-500 py-4">Carregando...</p>}
          
          {!isLoading && availableTransactions.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-4">Nenhuma despesa recente sem anexo encontrada.</p>
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
                Selecionar
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
