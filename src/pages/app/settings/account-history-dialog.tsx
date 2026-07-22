import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Download, Loader2, ArrowDownRight, ArrowUpLeft, ArrowRightLeft } from 'lucide-react'
import { AccountHistoryItem, getAccountHistory } from '@/api/get-account-history'
import { useInfiniteQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import html2canvas from 'html2canvas'
import { useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface AccountHistoryDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    account: { id: string; name: string; balance: number } | null
    onExportPDF: (account: { id: string; name: string }, history: (AccountHistoryItem & { runningBalance: number })[]) => void
}

export function AccountHistoryDialog({ isOpen, onOpenChange, account, onExportPDF }: AccountHistoryDialogProps) {
    const [isGroupedByDay, setIsGroupedByDay] = useState(false)
    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
        queryKey: ['account-history', account?.id],
        queryFn: ({ pageParam }) => getAccountHistory({ accountId: account!.id, page: pageParam as number, limit: 20 }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            if (lastPage.currentPage < lastPage.totalPages) {
                return lastPage.currentPage + 1
            }
            return undefined
        },
        enabled: !!account && isOpen,
    })

    const timelineRef = useRef<HTMLDivElement>(null)

    const handleExportImage = async () => {
        if (!timelineRef.current || !account) return
        try {
            const element = timelineRef.current
            const canvas = await html2canvas(element, {
                backgroundColor: null,
                scale: 2, // Melhorar resolução
                useCORS: true,
                allowTaint: true,
                scrollY: -window.scrollY,
                windowHeight: element.scrollHeight,
                height: element.scrollHeight,
            })
            const image = canvas.toDataURL('image/png', 1.0)
            const link = document.createElement('a')
            link.download = `timeline_${account.name.replace(/\s+/g, '_').toLowerCase()}.png`
            link.href = image
            link.click()
        } catch (error) {
            console.error('Erro ao exportar imagem:', error)
        }
    }

    const observerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!observerRef.current) return
        
        const viewport = document.getElementById('timeline-scroll-container')
        
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                fetchNextPage()
            }
        }, { root: viewport, rootMargin: '200px' })

        observer.observe(observerRef.current)
        return () => observer.disconnect()
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    // Drag to scroll functionality
    useEffect(() => {
        const viewport = document.getElementById('timeline-scroll-container')
        if (!viewport) return

        let isDown = false
        let startY = 0
        let scrollTop = 0

        const handleMouseDown = (e: MouseEvent) => {
            isDown = true
            viewport.style.cursor = 'grabbing'
            startY = e.pageY - viewport.offsetTop
            scrollTop = viewport.scrollTop
        }

        const handleMouseLeave = () => {
            isDown = false
            viewport.style.cursor = 'auto'
        }

        const handleMouseUp = () => {
            isDown = false
            viewport.style.cursor = 'auto'
        }

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDown) return
            e.preventDefault()
            const y = e.pageY - viewport.offsetTop
            const walk = (y - startY) * 1.5 // Scroll speed
            viewport.scrollTop = scrollTop - walk
        }

        viewport.addEventListener('mousedown', handleMouseDown)
        viewport.addEventListener('mouseleave', handleMouseLeave)
        viewport.addEventListener('mouseup', handleMouseUp)
        viewport.addEventListener('mousemove', handleMouseMove)

        return () => {
            viewport.removeEventListener('mousedown', handleMouseDown)
            viewport.removeEventListener('mouseleave', handleMouseLeave)
            viewport.removeEventListener('mouseup', handleMouseUp)
            viewport.removeEventListener('mousemove', handleMouseMove)
            viewport.style.cursor = 'auto'
        }
    }, [isOpen])

    const { historyWithBalance, initialBalance } = (() => {
        if (!data || !account) return { historyWithBalance: [], initialBalance: account?.balance || 0 }
        let currentBalance = account.balance
        
        const allHistory = data.pages.flatMap((page) => page.history)

        let processedHistory = allHistory.map((item) => {
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
        
        if (isGroupedByDay) {
            const grouped: any[] = []
            let currentGroup: any = null
            
            for (const item of processedHistory) {
                const dateKey = format(new Date(item.date), 'yyyy-MM-dd')
                let income = 0
                let expense = 0
                if (item.type === 'adjustment') {
                    if (item.value >= 0) income += item.value
                    else expense += Math.abs(item.value)
                } else {
                    if (item.operation === 'income') income += item.value
                    else expense += item.value
                }
                      
                if (!currentGroup || currentGroup.dateKey !== dateKey) {
                    if (currentGroup) grouped.push(currentGroup)
                    currentGroup = {
                        dateKey,
                        id: `group-${dateKey}`,
                        date: item.date,
                        description: 'Resumo Diário',
                        runningBalance: item.runningBalance,
                        totalIncome: income,
                        totalExpense: expense,
                        netValue: income - expense
                    }
                } else {
                    currentGroup.totalIncome += income
                    currentGroup.totalExpense += expense
                    currentGroup.netValue += (income - expense)
                }
            }
            if (currentGroup) grouped.push(currentGroup)
            
            processedHistory = grouped.map((g: any) => ({
                ...g,
                value: Math.abs(g.netValue),
                operation: g.netValue >= 0 ? 'income' : 'expense',
                type: 'transaction'
            }))
        }

        return { historyWithBalance: processedHistory, initialBalance: currentBalance }
    })()

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: hsl(var(--border)); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: hsl(var(--muted-foreground) / 0.5); }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite linear;
                }
            `}</style>
            <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <div className="flex items-center justify-between pr-12">
                        <div>
                            <DialogTitle className="text-xl">Histórico da Conta</DialogTitle>
                            <DialogDescription>
                                {account?.name}
                            </DialogDescription>
                        </div>
                        <div className="hidden sm:flex items-center gap-2">
                            <div className="flex bg-muted/50 p-1 rounded-lg mr-2 border border-border/50">
                                <button
                                    onClick={() => setIsGroupedByDay(false)}
                                    className={cn("px-3 py-1 text-xs font-semibold rounded-md transition-all", !isGroupedByDay ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                                >
                                    Detalhado
                                </button>
                                <button
                                    onClick={() => setIsGroupedByDay(true)}
                                    className={cn("px-3 py-1 text-xs font-semibold rounded-md transition-all", isGroupedByDay ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                                >
                                    Diário
                                </button>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-2"
                                onClick={handleExportImage}
                                disabled={isLoading || historyWithBalance.length === 0}
                            >
                                <Download className="w-4 h-4" />
                                Exportar Imagem
                            </Button>
                            <Button 
                                variant="default" 
                                size="sm" 
                                className="gap-2 bg-primary/90"
                                onClick={() => account && onExportPDF(account, historyWithBalance)}
                                disabled={isLoading || historyWithBalance.length === 0}
                            >
                                <FileText className="w-4 h-4" />
                                Exportar Tabela PDF
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div 
                    id="timeline-scroll-container"
                    className="flex-1 min-h-0 overflow-y-auto relative custom-scrollbar"
                >
                    <div ref={timelineRef} className="px-6 py-6 bg-background text-foreground select-none min-h-full">
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
                        <div className="relative py-6 max-w-4xl mx-auto px-2 sm:px-6">
                            {/* Top Balance Summary */}
                            <div className="flex justify-center mb-12">
                                <div className={cn(
                                    "relative overflow-hidden border shadow-xl rounded-2xl px-12 py-5 flex flex-col items-center transition-all duration-500 hover:scale-[1.02]",
                                    account?.balance && account.balance < 0 
                                        ? "bg-rose-500/10 text-rose-500 border-rose-500/30" 
                                        : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                )}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent -translate-x-full animate-shimmer" />
                                    <span className="text-sm font-semibold tracking-widest uppercase opacity-80 mb-2">Saldo Atual</span>
                                    <span className="text-4xl font-black tracking-tighter">
                                        R$ {account?.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-8 relative">
                                {/* The continuous vertical line behind everything */}
                                <div className="absolute left-[23px] sm:left-[31px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-transparent via-border/50 to-transparent" />

                                {historyWithBalance.map((item, index) => {
                                    const isIncome = item.operation === 'income'
                                    const isAdjustment = item.type === 'adjustment'
                                    const sign = isAdjustment ? (item.value >= 0 ? '+' : '-') : isIncome ? '+' : '-'
                                    const displayValue = Math.abs(item.value)
                                    
                                    const balanceAfterThisTx = item.runningBalance

                                    return (
                                        <div key={item.id} className="relative flex items-start gap-4 sm:gap-6 group z-10">
                                            {/* Icon on Timeline */}
                                            <div className="flex flex-col items-center shrink-0 relative mt-2">
                                                <div className={cn(
                                                    "w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg border-2 transition-transform duration-300 group-hover:scale-110",
                                                    isAdjustment ? "bg-amber-100 text-amber-600 border-amber-300 dark:bg-amber-950/80 dark:text-amber-400 dark:border-amber-700/50" :
                                                    isIncome ? "bg-emerald-100 text-emerald-600 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border-emerald-700/50" 
                                                             : "bg-rose-100 text-rose-600 border-rose-300 dark:bg-rose-950/80 dark:text-rose-400 dark:border-rose-700/50"
                                                )}>
                                                    {isAdjustment ? <ArrowRightLeft className="w-5 h-5 sm:w-6 sm:h-6" /> :
                                                     isIncome ? <ArrowUpLeft className="w-5 h-5 sm:w-6 sm:h-6" /> : 
                                                     <ArrowDownRight className="w-5 h-5 sm:w-6 sm:h-6" />}
                                                </div>
                                            </div>

                                            {/* Transaction Card */}
                                            <div className={cn(
                                                "flex-1 flex flex-col sm:flex-row justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white/70 dark:bg-card/40 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg transition-all duration-300 hover:shadow-xl hover:bg-white dark:hover:bg-card/80",
                                                isIncome ? "hover:shadow-emerald-500/10 hover:border-emerald-500/30" : "hover:shadow-rose-500/10 hover:border-rose-500/30"
                                            )}>
                                                <div className="flex flex-col min-w-0 justify-center">
                                                    <span className="font-bold text-lg sm:text-xl text-foreground capitalize truncate">
                                                        {isGroupedByDay 
                                                            ? format(new Date(item.date), "dd 'de' MMMM", { locale: ptBR })
                                                            : (isAdjustment ? 'Ajuste de Saldo' : item.description || 'Transação')}
                                                    </span>
                                                    <span className="text-sm font-semibold text-muted-foreground mt-1 tracking-wide uppercase">
                                                        {isGroupedByDay 
                                                            ? (isIncome ? 'Total de Entradas' : 'Total de Saídas')
                                                            : format(new Date(item.date), "dd MMM, HH:mm", { locale: ptBR })}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col sm:items-end justify-center shrink-0 bg-background/50 rounded-2xl p-4 sm:bg-transparent sm:p-0">
                                                    <span className={cn(
                                                        "font-black text-2xl sm:text-3xl tracking-tighter",
                                                        isAdjustment ? "text-amber-500" :
                                                        isIncome ? "text-emerald-500" : "text-rose-500"
                                                    )}>
                                                        {sign} R$ {displayValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-3">
                                                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                                            Saldo Atualizado
                                                        </span>
                                                        <span className={cn(
                                                            "text-sm font-bold",
                                                            balanceAfterThisTx < 0 ? "text-rose-500" : "text-emerald-500"
                                                        )}>
                                                            R$ {balanceAfterThisTx.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}

                                {/* Bottom Node: Saldo Inicial */}
                                {!hasNextPage && historyWithBalance.length > 0 && (
                                    <div className="relative flex items-center gap-4 sm:gap-6 mt-4 z-10">
                                        <div className="flex flex-col items-center shrink-0">
                                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-background flex items-center justify-center bg-muted">
                                                <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                                            </div>
                                        </div>
                                        <div className="flex-1 flex items-center opacity-70">
                                            <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Início do Histórico</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {hasNextPage && (
                                <div ref={observerRef} className="flex justify-center py-6">
                                    {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
                                </div>
                            )}
                        </div>
                    )}
                    </div>
                </div>
                
                <div className="p-4 border-t bg-muted/20 sm:hidden flex flex-col gap-2">
                    <Button 
                        variant="outline" 
                        className="w-full gap-2"
                        onClick={handleExportImage}
                        disabled={isLoading || historyWithBalance.length === 0}
                    >
                        <Download className="w-4 h-4" />
                        Exportar Imagem
                    </Button>
                    <Button 
                        variant="default" 
                        className="w-full gap-2 bg-primary/90"
                        onClick={() => account && onExportPDF(account, historyWithBalance)}
                        disabled={isLoading || historyWithBalance.length === 0}
                    >
                        <FileText className="w-4 h-4" />
                        Exportar Tabela PDF
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
