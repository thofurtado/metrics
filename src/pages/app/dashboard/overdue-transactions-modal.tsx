import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { differenceInDays } from 'date-fns'
import { AlertTriangle, CalendarX2, CheckCircle2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { updateStatusTransaction } from '@/api/update-transaction-status'
import { PaymentModal } from '../transactions/payment-modal'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
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
import { getTransactions } from '@/api/get-transactions'

interface OverdueTransactionsModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function OverdueTransactionsModal({ open, onOpenChange }: OverdueTransactionsModalProps) {
    const queryClient = useQueryClient()
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null)
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [localLoadingId, setLocalLoadingId] = useState<string | null>(null)

    const { data: transactionsData, isLoading } = useQuery({
        queryKey: ['overdue-transactions'],
        queryFn: () => getTransactions({
            status: 'overdue',
            type: 'out', // despesas
            perPage: 100 // Trazemos um limite maior já que é um resumo de pendências
        }),
        enabled: open,
        refetchOnWindowFocus: false
    })

    const transactions = transactionsData?.data?.transactions?.transactions || []

    const { mutateAsync: switchTransactionStatus } = useMutation({
        mutationFn: updateStatusTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['overdue-transactions'] })
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            queryClient.invalidateQueries({ queryKey: ['summary'] })
            queryClient.invalidateQueries({ queryKey: ['finance-metrics-overdue'] })
        },
        onError: () => {
            toast.error('Ocorreu um erro ao processar o pagamento.')
        },
        onSettled: () => {
            setLocalLoadingId(null)
        }
    })

    async function handlePayment(payload: any) {
        if (!selectedTransaction) return
        setLocalLoadingId(selectedTransaction.id)
        try {
            const isPartialPayment = payload.amount < selectedTransaction.amount
            await switchTransactionStatus({
                id: selectedTransaction.id,
                ...payload
            })
            toast.success(isPartialPayment ? 'Pagamento parcial processado com sucesso!' : 'Pagamento processado com sucesso!')
            setIsPaymentModalOpen(false)
        } catch (error) {
            console.error(error)
        }
    }

    const paymentTransaction = selectedTransaction ? {
        ...selectedTransaction,
        sectorId: selectedTransaction.sectors?.id || null,
        accountId: selectedTransaction.accounts?.id,
    } : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6">
                <DialogHeader className="pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-stiletto-700">
                        <AlertTriangle className="h-6 w-6" />
                        Despesas Vencidas
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Listagem de todas as contas não pagas com vencimento anterior ao dia de hoje.
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto mt-4 pr-1">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-10 opacity-70">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-stiletto-500 border-t-transparent" />
                            <span className="mt-4 text-sm font-semibold text-muted-foreground">Buscando títulos vencidos...</span>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center">
                            <CalendarX2 className="h-10 w-10 mb-3 opacity-50" />
                            <p className="text-base font-semibold">Nenhuma conta vencida encontrada.</p>
                            <p className="text-sm">Todo o financeiro está em dia!</p>
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[15%] font-semibold">Vencimento</TableHead>
                                        <TableHead className="w-[25%] font-semibold">Descrição</TableHead>
                                        <TableHead className="w-[10%] font-semibold text-center">Atraso</TableHead>
                                        <TableHead className="w-[20%] font-semibold">Fornecedor</TableHead>
                                        <TableHead className="w-[15%] text-right font-semibold">Valor</TableHead>
                                        <TableHead className="w-[15%] text-center font-semibold">Ação</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((t) => {
                                        const diasVencido = differenceInDays(new Date(), new Date(t.data_vencimento))
                                        return (
                                        <TableRow key={t.id} className="hover:bg-stiletto-50/50 transition-colors">
                                            <TableCell className="font-mono text-xs font-semibold text-stiletto-700 whitespace-nowrap">
                                                {new Date(t.data_vencimento).toLocaleDateString('pt-BR')}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {t.description || '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="inline-flex items-center rounded-md bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20 whitespace-nowrap">
                                                    {diasVencido} {diasVencido === 1 ? 'dia' : 'dias'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {t.supplier?.name || '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-stiletto-600 whitespace-nowrap tabular-nums">
                                                {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button 
                                                    size="sm"
                                                    className="h-8 w-full rounded-lg text-[10px] font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white"
                                                    onClick={() => {
                                                        setSelectedTransaction(t)
                                                        setIsPaymentModalOpen(true)
                                                    }}
                                                    disabled={localLoadingId === t.id}
                                                >
                                                    {localLoadingId === t.id ? (
                                                        <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                                                    ) : (
                                                        <>
                                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                                            Pagar
                                                        </>
                                                    )}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </DialogContent>

            {selectedTransaction && (
                <PaymentModal
                    open={isPaymentModalOpen}
                    onOpenChange={setIsPaymentModalOpen}
                    transaction={paymentTransaction}
                    onConfirm={handlePayment}
                />
            )}
        </Dialog>
    )
}
