import { useQuery } from '@tanstack/react-query'
import { CalendarClock, CalendarX2 } from 'lucide-react'
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

interface UpcomingTransactionsModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function UpcomingTransactionsModal({ open, onOpenChange }: UpcomingTransactionsModalProps) {
    // Calculo de hoje (meia-noite local) para evitar trazer vencidos
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    
    // Fim da janela (14 dias à frente)
    const fourteenDays = new Date(today)
    fourteenDays.setDate(today.getDate() + 14)
    fourteenDays.setHours(23, 59, 59, 999)

    const { data: transactionsData, isLoading } = useQuery({
        queryKey: ['upcoming-transactions-14d', today.getTime()],
        queryFn: () => getTransactions({
            status: 'pending',
            type: 'out', // 'out' vira 'expense' no use-case
            fromDate: today.toISOString(),
            toDate: fourteenDays.toISOString(),
            perPage: 100 
        }),
        enabled: open,
        refetchOnWindowFocus: false
    })

    const transactions = transactionsData?.data?.transactions?.transactions || []

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6">
                <DialogHeader className="pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-600">
                        <CalendarClock className="h-6 w-6" />
                        Despesas a Vencer (Próx. 14 dias)
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Listagem de todas as contas a pagar previstas de hoje até as próximas duas semanas.
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto mt-4 pr-1">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-10 opacity-70">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                            <span className="mt-4 text-sm font-semibold text-muted-foreground">Buscando títulos a vencer...</span>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center">
                            <CalendarX2 className="h-10 w-10 mb-3 opacity-50" />
                            <p className="text-base font-semibold">Nenhuma conta agendada encontrada.</p>
                            <p className="text-sm">Não há despesas previstas para os próximos 14 dias.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-1/6 font-semibold">Data Vencimento</TableHead>
                                        <TableHead className="w-2/6 font-semibold">Descrição</TableHead>
                                        <TableHead className="w-2/6 font-semibold">Fornecedor</TableHead>
                                        <TableHead className="w-1/6 text-right font-semibold">Valor</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((t) => (
                                        <TableRow key={t.id} className="hover:bg-amber-50/50 transition-colors">
                                            <TableCell className="font-mono text-xs font-semibold text-amber-700 whitespace-nowrap">
                                                {new Date(t.data_vencimento).toLocaleDateString('pt-BR')}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {t.description || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {t.supplier?.name || '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-amber-600 whitespace-nowrap tabular-nums">
                                                {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
