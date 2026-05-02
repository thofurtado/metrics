import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import dayjs from "dayjs"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { payCreditCardInvoice } from "@/api/credit-cards"

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
            queryClient.invalidateQueries({ queryKey: ["transactions"] })
            queryClient.invalidateQueries({ queryKey: ["summary"] })
            toast.success("Fatura do cartão paga/baixada com sucesso!")
            onOpenChange(false)
        },
        onError: (err) => {
            console.error(err)
            toast.error("Erro ao pagar fatura do cartão.")
        }
    })

    if (!virtualTransaction) return null

    const monthStr = dayjs(virtualTransaction.data_vencimento).format("YYYY-MM")

    async function handlePayInvoice() {
        if (!virtualTransaction?.credit_card_id) return
        await payInvoiceMutation({
            id: virtualTransaction.credit_card_id,
            month: monthStr,
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-extrabold tracking-tight">
                        {virtualTransaction.description}
                    </DialogTitle>
                    <DialogDescription className="font-medium text-slate-500">
                        Visualizando as compras individuais desta fatura para o mês de{" "}
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                            {dayjs(virtualTransaction.data_vencimento).format("MMMM YYYY")}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 max-h-[350px] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-100 dark:border-slate-800">
                                <TableHead className="font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                                    Vencimento
                                </TableHead>
                                <TableHead className="font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                                    Descrição
                                </TableHead>
                                <TableHead className="font-bold text-slate-500 text-[10px] uppercase tracking-widest text-right">
                                    Valor
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {virtualTransaction.swipes?.map((swipe) => (
                                <TableRow
                                    key={swipe.id}
                                    className="border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
                                >
                                    <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                                        {dayjs(swipe.data_vencimento).format("DD/MM/YYYY")}
                                    </TableCell>
                                    <TableCell className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                                        {swipe.description || "Sem descrição"}
                                    </TableCell>
                                    <TableCell className="font-black tabular-nums text-slate-800 dark:text-slate-100 text-right text-sm">
                                        R${" "}
                                        {(swipe.totalValue ?? swipe.amount).toLocaleString(
                                            "pt-BR",
                                            {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            }
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {virtualTransaction.swipes?.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={3}
                                        className="text-center font-bold text-slate-400 py-6 text-xs uppercase tracking-widest"
                                    >
                                        Nenhuma compra encontrada
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <DialogFooter className="flex justify-between items-center sm:justify-between w-full border-t border-slate-100 pt-4 dark:border-slate-800">
                    <div className="text-left flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Valor Total
                        </span>
                        <span className="text-xl font-black tracking-tight text-rose-600">
                            R${" "}
                            {virtualTransaction.totalValue.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="rounded-xl font-bold border-slate-200/80 dark:border-slate-800"
                            onClick={() => onOpenChange(false)}
                        >
                            Fechar
                        </Button>
                        {!virtualTransaction.confirmed && (
                            <Button
                                className="rounded-xl font-black bg-rose-600 hover:bg-rose-700 uppercase tracking-widest text-[10px] h-10 px-4 flex items-center gap-1 text-white"
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
