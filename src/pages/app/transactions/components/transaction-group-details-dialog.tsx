import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    ResponsiveDialogDescription,
} from "@/components/ui/responsive-dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getTransactionGroup } from "@/api/get-transaction-group"
import { terminateTransactionGroup } from "@/api/terminate-transaction-group"
import { deleteTransactionGroup } from "@/api/delete-transaction-group"
import { updateStatusTransaction } from "@/api/update-transaction-status"
import { revertTransactionStatus } from "@/api/revert-transaction-status"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import dayjs from "dayjs"
import { Button } from "@/components/ui/button"
import { Loader2, Scissors, Trash } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface TransactionGroupDetailsDialogProps {
    groupId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function TransactionGroupDetailsDialog({ groupId, open, onOpenChange }: TransactionGroupDetailsDialogProps) {
    const queryClient = useQueryClient()
    const [terminatingId, setTerminatingId] = useState<string | null>(null)
    const [paymentAction, setPaymentAction] = useState<{ id: string, type: 'pay' | 'unpay', amount: number, data_vencimento: Date } | null>(null)

    const { data: groupDetails, isLoading } = useQuery({
        queryKey: ['transaction-group', groupId],
        queryFn: () => getTransactionGroup(groupId!),
        enabled: !!groupId && open,
    })

    const { mutateAsync: terminate } = useMutation({
        mutationFn: terminateTransactionGroup,
        onSuccess: () => {
            toast.success("Contrato encerrado e parcelas futuras removidas.")
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            queryClient.invalidateQueries({ queryKey: ['transaction-group', groupId] })
            onOpenChange(false)
        },
        onError: () => {
            toast.error("Erro ao encerrar contrato.")
        }
    })

    const { mutateAsync: deleteFn, isPending: isDeleting } = useMutation({
        mutationFn: deleteTransactionGroup,
        onSuccess: () => {
            toast.success("Parcelamento excluído com sucesso!")
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            queryClient.invalidateQueries({ queryKey: ['transaction-group', groupId] })
            onOpenChange(false)
        },
        onError: () => {
            toast.error("Erro ao excluir o parcelamento. Verifique se existem transações já baixadas que precisam ser revertidas primeiro.")
        }
    })

    const { mutateAsync: payTransaction, isPending: isPaying } = useMutation({
        mutationFn: updateStatusTransaction,
        onSuccess: () => {
            toast.success("Parcela marcada como PAGA!")
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            queryClient.invalidateQueries({ queryKey: ['transaction-group', groupId] })
            setPaymentAction(null)
        },
        onError: () => toast.error("Erro ao confirmar pagamento.")
    })

    const { mutateAsync: unpayTransaction, isPending: isUnpaying } = useMutation({
        mutationFn: revertTransactionStatus,
        onSuccess: () => {
            toast.success("Parcela marquée como PENDENTE!")
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            queryClient.invalidateQueries({ queryKey: ['transaction-group', groupId] })
            setPaymentAction(null)
        },
        onError: () => toast.error("Erro ao reverter pagamento.")
    })

    const isActionPending = isPaying || isUnpaying

    async function handleTerminate(lastKeptId: string) {
        if (!groupId) return

        // Confirm alert?
        if (!confirm("Tem certeza que deseja encerrar o contrato MANTENDO esta parcela e removendo as futuras?")) return;

        setTerminatingId(lastKeptId)
        try {
            await terminate({ groupId, lastKeptTransactionId: lastKeptId })
        } finally {
            setTerminatingId(null)
        }
    }

    async function handleDeleteGroup() {
        if (!groupId) return
        if (!confirm("Tem certeza que deseja EXCLUIR TODOS OS VÍNCULOS e TODAS AS TRANSAÇÕES deste parcelamento? Esta ação não pode ser desfeita.")) return;

        try {
            await deleteFn({ groupId })
        } catch (e) {
            console.error(e)
        }
    }

    async function handleConfirmToggle() {
        if (!paymentAction) return

        try {
            if (paymentAction.type === 'pay') {
                await payTransaction({
                    id: paymentAction.id,
                    amount: paymentAction.amount,
                    data_vencimento: paymentAction.data_vencimento,
                    // No accountId means keeping original
                })
            } else {
                await unpayTransaction({ id: paymentAction.id })
            }
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Recorrente</DialogTitle>
                        <ResponsiveDialogDescription className="text-slate-600 dark:text-slate-400 text-sm mt-1.5 flex flex-col gap-1">
                            <span>Gerencie ou encerre as parcelas deste contrato.</span>
                            <span className="text-[11px] font-semibold text-slate-500/80 uppercase tracking-wider">Clique no status para alterar rapidamente.</span>
                        </ResponsiveDialogDescription>
                    </DialogHeader>

                    {isLoading ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                    ) : groupDetails ? (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4 text-sm mb-2 bg-muted p-2 rounded justify-between sm:items-center">
                                <div className="flex gap-4">
                                    <div><strong>Total Contrato:</strong> R$ {groupDetails.totalAmount.toFixed(2)}</div>
                                    <div><strong>Ocorrências:</strong> {groupDetails.installmentsCount}</div>
                                </div>
                                <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    onClick={handleDeleteGroup}
                                    disabled={isDeleting}
                                    className="w-full sm:w-auto text-xs"
                                >
                                    {isDeleting ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Trash className="h-3 w-3 mr-2" />}
                                    Excluir Todo o Parcelamento
                                </Button>
                            </div>

                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead>Valor</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="w-[140px] text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groupDetails.transactions.map((tx, index) => {
                                            const isLast = index === groupDetails.transactions.length - 1

                                            return (
                                                <TableRow key={tx.id}>
                                                    <TableCell className="whitespace-nowrap">{dayjs(tx.data_vencimento).format('DD/MM/YYYY')}</TableCell>
                                                    <TableCell className="min-w-[150px]">{tx.description}</TableCell>
                                                    <TableCell className="whitespace-nowrap">R$ {tx.amount.toFixed(2)}</TableCell>
                                                    <TableCell>
                                                        <span
                                                            onClick={() => setPaymentAction({
                                                                id: tx.id,
                                                                type: tx.confirmed ? 'unpay' : 'pay',
                                                                amount: tx.amount,
                                                                data_vencimento: new Date(tx.data_vencimento)
                                                            })}
                                                            className={cn(
                                                                "cursor-pointer select-none px-2 py-1 rounded transition-colors border border-transparent hover:border-border whitespace-nowrap",
                                                                tx.confirmed
                                                                    ? "text-green-600 font-bold hover:bg-green-50"
                                                                    : "text-yellow-600 font-medium hover:bg-yellow-50"
                                                            )}
                                                            title={tx.confirmed ? "Clique para tornar pendente" : "Clique para pagar agora"}
                                                        >
                                                            {tx.confirmed ? "Pago" : "Pendente"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {!isLast && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                title="Encerrar contrato AQUI (Mantém esta, apaga futuras)"
                                                                disabled={terminatingId !== null}
                                                                onClick={() => handleTerminate(tx.id)}
                                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            >
                                                                {terminatingId === tx.id ? <Loader2 className="h-4 w-4 animate-spin" /> :
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Scissors className="h-3.5 w-3.5" />
                                                                        <span className="text-xs font-semibold">Encerrar</span>
                                                                    </div>
                                                                }
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-muted-foreground">Não foi possível carregar os detalhes.</div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!paymentAction} onOpenChange={(open) => !open && setPaymentAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {paymentAction?.type === 'pay' ? 'Confirmar Pagamento' : 'Reverter Pagamento'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {paymentAction?.type === 'pay' ? (
                                <>
                                    Deseja marcar esta parcela de <strong className="text-foreground">R$ {paymentAction?.amount.toFixed(2)}</strong> como <strong>PAGA</strong>?<br />
                                    A data do pagamento será definida para <strong>hoje</strong>.
                                </>
                            ) : (
                                <>
                                    Deseja marcar esta parcela como <strong>PENDENTE</strong>?<br />
                                    A data do pagamento e conta serão removidos.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isActionPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isActionPending}
                            onClick={(e) => {
                                e.preventDefault()
                                handleConfirmToggle()
                            }}
                            className={cn(
                                paymentAction?.type === 'pay' ? "bg-green-600 hover:bg-green-700 text-white" : "bg-yellow-600 hover:bg-yellow-700 text-white"
                            )}
                        >
                            {isActionPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {paymentAction?.type === 'pay' ? 'Confirmar Pagamento' : 'Tornar Pendente'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
