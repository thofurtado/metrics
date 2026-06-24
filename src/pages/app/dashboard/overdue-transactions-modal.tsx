import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { differenceInDays } from 'date-fns'
import { AlertTriangle, CalendarX2, CheckCircle2, Loader2, Search } from 'lucide-react'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { updateStatusTransaction } from '@/api/update-transaction-status'
import { PaymentModal } from '../transactions/payment-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
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

    const [searchDesc, setSearchDesc] = useState('')
    const [filterMonth, setFilterMonth] = useState('all')
    const [filterYear, setFilterYear] = useState('all')

    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

    const { data: transactionsData, isLoading } = useQuery({
        queryKey: ['overdue-transactions'],
        queryFn: () => getTransactions({
            status: 'overdue',
            perPage: 100 // Trazemos um limite maior já que é um resumo de pendências
        }),
        enabled: open,
        refetchOnWindowFocus: false
    })

    const transactions = transactionsData?.data?.transactions?.transactions || []

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (searchDesc && (!t.description || !t.description.toLowerCase().includes(searchDesc.toLowerCase()))) {
                return false
            }
            
            if (filterMonth !== 'all' || filterYear !== 'all') {
                const date = new Date(t.data_vencimento)
                if (filterMonth !== 'all' && date.getMonth() !== Number(filterMonth)) return false
                if (filterYear !== 'all' && date.getFullYear() !== Number(filterYear)) return false
            }
            
            return true
        })
    }, [transactions, searchDesc, filterMonth, filterYear])

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
                        Transações em Atraso
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Listagem de todas as contas não consolidadas com vencimento anterior ao dia de hoje.
                    </p>
                </DialogHeader>

                <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 px-1">
                    <div className="relative w-full sm:w-auto flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filtrar por descrição..."
                            className="pl-9 h-9"
                            value={searchDesc}
                            onChange={(e) => setSearchDesc(e.target.value)}
                        />
                    </div>
                    <div className="flex w-full sm:w-auto items-center gap-2">
                        <Select value={filterMonth} onValueChange={setFilterMonth}>
                            <SelectTrigger className="w-full sm:w-[140px] h-9">
                                <SelectValue placeholder="Mês" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os meses</SelectItem>
                                {Array.from({ length: 12 }, (_, i) => {
                                    const monthName = new Date(0, i).toLocaleString('pt-BR', { month: 'long' });
                                    return (
                                        <SelectItem key={i} value={i.toString()}>
                                            {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                                        </SelectItem>
                                    )
                                })}
                            </SelectContent>
                        </Select>
                        <Select value={filterYear} onValueChange={setFilterYear}>
                            <SelectTrigger className="w-full sm:w-[110px] h-9">
                                <SelectValue placeholder="Ano" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os anos</SelectItem>
                                {years.map(year => (
                                    <SelectItem key={year} value={year.toString()}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

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
                    ) : filteredTransactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center">
                            <Search className="h-10 w-10 mb-3 opacity-50" />
                            <p className="text-base font-semibold">Nenhuma transação encontrada.</p>
                            <p className="text-sm">Tente ajustar os filtros acima.</p>
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
                                    {filteredTransactions.map((t) => {
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
                                            <TableCell className={`text-right font-bold whitespace-nowrap tabular-nums ${t.operation === 'income' ? 'text-emerald-600' : 'text-stiletto-600'}`}>
                                                {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button 
                                                    size="sm"
                                                    className={`h-8 w-full rounded-lg text-[10px] font-black uppercase tracking-widest text-white ${
                                                        t.operation === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                                                    }`}
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
                                                            {t.operation === 'income' ? 'Receber' : 'Pagar'}
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
