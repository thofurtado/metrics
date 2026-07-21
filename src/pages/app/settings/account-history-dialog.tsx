import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, ArrowUpRight, ArrowDownRight, ArrowRightLeft } from 'lucide-react'
import { AccountHistoryItem, getAccountHistory } from '@/api/get-account-history'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface AccountHistoryDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    account: { id: string; name: string; balance: number } | null
    onExportPDF: (account: { id: string; name: string }, history: (AccountHistoryItem & { runningBalance: number })[]) => void
}

export function AccountHistoryDialog({ isOpen, onOpenChange, account, onExportPDF }: AccountHistoryDialogProps) {
    const { data, isLoading } = useQuery({
        queryKey: ['account-history', account?.id],
        queryFn: () => getAccountHistory({ accountId: account!.id, page: 1, limit: 1000 }),
        enabled: !!account && isOpen,
    })

    const historyWithBalance = (() => {
        if (!data || !account) return []
        let currentBalance = account.balance

        return data.history.map((item) => {
            const balanceAtThisPoint = currentBalance
            
            if (item.type === 'adjustment') {
                currentBalance = item.previous_balance ?? (currentBalance - item.value)
            } else {
                if (item.operation === 'income') {
                    currentBalance -= item.value
                } else {
                    currentBalance += item.value
                }
            }
            
            return {
                ...item,
                runningBalance: balanceAtThisPoint
            }
        })
    })()

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-xl">Histórico da Conta</DialogTitle>
                            <DialogDescription>
                                {account?.name}
                            </DialogDescription>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="hidden sm:flex gap-2"
                            onClick={() => account && onExportPDF(account, historyWithBalance)}
                            disabled={isLoading || historyWithBalance.length === 0}
                        >
                            <FileText className="w-4 h-4" />
                            Exportar PDF
                        </Button>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex justify-between items-center p-4 border rounded-lg">
                                    <div className="flex gap-4 items-center">
                                        <Skeleton className="w-10 h-10 rounded-full" />
                                        <div className="space-y-2">
                                            <Skeleton className="w-32 h-4" />
                                            <Skeleton className="w-20 h-3" />
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-right flex flex-col items-end">
                                        <Skeleton className="w-24 h-4" />
                                        <Skeleton className="w-16 h-3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : historyWithBalance.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                            <FileText className="w-12 h-12 mb-4 opacity-20" />
                            <p>Nenhuma movimentação encontrada.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {historyWithBalance.map((item) => {
                                const isIncome = item.operation === 'income'
                                const isAdjustment = item.type === 'adjustment'
                                
                                return (
                                    <div key={item.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 border rounded-xl hover:bg-muted/50 transition-colors gap-4">
                                        <div className="flex gap-4 items-center">
                                            <div className={cn(
                                                "p-2.5 rounded-full",
                                                isAdjustment ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" :
                                                isIncome ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                                "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                                            )}>
                                                {isAdjustment ? (
                                                    <ArrowRightLeft className="w-5 h-5" />
                                                ) : isIncome ? (
                                                    <ArrowUpRight className="w-5 h-5" />
                                                ) : (
                                                    <ArrowDownRight className="w-5 h-5" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">
                                                    {isAdjustment ? 'Ajuste de Saldo' : item.description || 'Transação'}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {format(new Date(item.date), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex sm:flex-col justify-between sm:justify-center items-end ml-14 sm:ml-0 gap-1">
                                            <p className={cn(
                                                "font-semibold text-lg",
                                                isAdjustment ? "text-amber-600 dark:text-amber-400" :
                                                isIncome ? "text-emerald-600 dark:text-emerald-400" :
                                                "text-rose-600 dark:text-rose-400"
                                            )}>
                                                {isIncome ? '+' : '-'} R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                            <p className="text-xs text-muted-foreground font-medium">
                                                Saldo: R$ {item.runningBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </ScrollArea>
                
                <div className="p-4 border-t bg-muted/20 sm:hidden">
                    <Button 
                        variant="default" 
                        className="w-full gap-2"
                        onClick={() => account && onExportPDF(account, historyWithBalance)}
                        disabled={isLoading || historyWithBalance.length === 0}
                    >
                        <FileText className="w-4 h-4" />
                        Exportar Relatório PDF
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
