import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CalendarX2 } from 'lucide-react'
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
    // Calculamos o dia de ontem, garantindo que pegue tudo que venceu até 23:59 de ontem
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(23, 59, 59, 999)

    const { data: transactionsData, isLoading } = useQuery({
        queryKey: ['overdue-transactions'],
        queryFn: () => getTransactions({
            status: 'pending',
            type: 'expense',
            toDate: yesterday.toISOString(),
            perPage: 100 // Trazemos um limite maior já que é um resumo de pendências
        }),
        enabled: open,
        refetchOnWindowFocus: false
    })

    const transactions = transactionsData?.data?.transactions?.transactions || []

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
                                        <TableHead className="w-1/6 font-semibold">Data Vencimento</TableHead>
                                        <TableHead className="w-2/6 font-semibold">Descrição</TableHead>
                                        <TableHead className="w-2/6 font-semibold">Fornecedor</TableHead>
                                        <TableHead className="w-1/6 text-right font-semibold">Valor</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((t) => (
                                        <TableRow key={t.id} className="hover:bg-stiletto-50/50 transition-colors">
                                            <TableCell className="font-mono text-xs font-semibold text-stiletto-700 whitespace-nowrap">
                                                {new Date(t.data_vencimento).toLocaleDateString('pt-BR')}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {t.description || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {t.supplier?.name || '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-stiletto-600 whitespace-nowrap tabular-nums">
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
