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
                        <div className="relative py-8 sm:px-0">
                            {/* Linha vertical central */}
                            <div className="absolute left-6 sm:left-1/2 top-0 bottom-0 w-0.5 bg-border/60 sm:-translate-x-1/2 rounded-full" />

                            {/* Nó Inicial: Saldo Atual */}
                            <div className="relative flex justify-start sm:justify-center mb-10 z-10 pl-14 sm:pl-0">
                                <div className="bg-background border-2 border-primary/20 shadow-sm rounded-full px-5 py-2 text-sm font-extrabold flex items-center justify-center text-primary">
                                    Saldo Atual: R$ {account?.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                            </div>

                            <div className="flex flex-col space-y-4 sm:space-y-2">
                                {historyWithBalance.map((item) => {
                                    const isIncome = item.operation === 'income'
                                    const isAdjustment = item.type === 'adjustment'
                                    const isRightSide = isIncome || (isAdjustment && item.value >= 0)
                                    const sign = isAdjustment ? (item.value >= 0 ? '+' : '-') : isIncome ? '+' : '-'
                                    const displayValue = Math.abs(item.value)
                                    
                                    return (
                                        <div key={item.id} className={cn(
                                            "relative flex w-full group",
                                            "sm:w-1/2",
                                            isRightSide ? "sm:ml-auto pl-14 sm:pl-8" : "sm:mr-auto pl-14 sm:pr-8 sm:pl-0"
                                        )}>
                                            {/* Dot */}
                                            <div className={cn(
                                                "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ring-4 ring-background z-20 transition-transform group-hover:scale-125",
                                                "left-6 -translate-x-1/2", 
                                                isRightSide ? "sm:-left-1.5 sm:translate-x-0" : "sm:left-auto sm:-right-1.5 sm:translate-x-0"
                                            )}
                                            style={{ backgroundColor: isAdjustment ? '#fbbf24' : isIncome ? '#10b981' : '#f43f5e' }} />
                                            
                                            {/* Connector Line */}
                                            <div className={cn(
                                                "hidden sm:block absolute top-1/2 -translate-y-1/2 h-0.5 bg-border/60 z-10 transition-colors group-hover:bg-border",
                                                isRightSide ? "left-0 w-8" : "right-0 w-8"
                                            )} />

                                            {/* Card */}
                                            <div className={cn(
                                                "w-full bg-card border border-border/50 p-4 rounded-2xl shadow-sm group-hover:shadow-md transition-all relative z-10",
                                                isRightSide ? "" : "sm:text-right"
                                            )}>
                                                <div className={cn(
                                                    "flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 sm:items-center",
                                                    isRightSide ? "" : "sm:flex-row-reverse"
                                                )}>
                                                    <div>
                                                        <p className="font-bold text-foreground">
                                                            {isAdjustment ? 'Ajuste de Saldo' : item.description || 'Transação'}
                                                        </p>
                                                        <p className="text-[11px] font-bold text-muted-foreground mt-1 tracking-wider uppercase opacity-80">
                                                            {format(new Date(item.date), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                                        </p>
                                                    </div>
                                                    
                                                    <div className={cn(
                                                        "flex flex-col items-start",
                                                        isRightSide ? "sm:items-end" : "sm:items-start"
                                                    )}>
                                                        <p className={cn(
                                                            "font-black text-lg tabular-nums tracking-tighter",
                                                            isAdjustment ? "text-amber-600 dark:text-amber-400" :
                                                            isIncome ? "text-emerald-600 dark:text-emerald-400" :
                                                            "text-rose-600 dark:text-rose-400"
                                                        )}>
                                                            {sign} R$ {displayValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </p>
                                                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black opacity-60 tabular-nums">
                                                            Saldo: R$ {item.runningBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
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
