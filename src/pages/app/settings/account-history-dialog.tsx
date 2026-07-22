import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Download, Loader2, ArrowDownRight, ArrowUpLeft, ArrowRightLeft, AlertTriangle, Filter } from 'lucide-react'
import { AccountHistoryItem, getAccountHistory } from '@/api/get-account-history'
import { toast } from 'sonner'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { getAccounts } from '@/api/get-accounts'
import { getTransactions } from '@/api/get-transactions'
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
    const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
    const [isPillsInitialized, setIsPillsInitialized] = useState(false)

    const { data: accountsData } = useQuery({
        queryKey: ['accounts'],
        queryFn: getAccounts,
        enabled: isOpen && account?.id === 'all',
    })

    useEffect(() => {
        if (account?.id === 'all' && accountsData?.accounts && !isPillsInitialized) {
            setSelectedAccountIds(accountsData.accounts.map(a => a.id))
            setIsPillsInitialized(true)
        } else if (account?.id !== 'all') {
            setIsPillsInitialized(false)
            setSelectedAccountIds([])
        }
    }, [account?.id, accountsData, isPillsInitialized])

    const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
        queryKey: ['account-history', account?.id, selectedAccountIds],
        queryFn: async ({ pageParam }) => {
            if (account!.id === 'all') {
                try {
                    const res = await getTransactions({ accountId: selectedAccountIds.length > 0 ? selectedAccountIds.join(',') : undefined, page: pageParam as number, perPage: 20 })
                    return {
                    account: { id: 'all', name: 'Histórico Geral', balance: 0 },
                    history: res.data.transactions.transactions.map(t => ({
                        id: t.id,
                        type: 'transaction',
                        description: t.description || 'Transação',
                        operation: t.operation,
                        value: t.totalValue ?? t.amount,
                        date: t.data_vencimento.toString(),
                        created_at: t.data_emissao ? t.data_emissao.toString() : new Date().toISOString()
                    })),
                    totalCount: res.data.transactions.totalCount,
                    totalPages: Math.ceil(res.data.transactions.totalCount / res.data.transactions.perPage),
                    currentPage: res.data.transactions.pageIndex
                }
                } catch (error) {
                    console.error("Error fetching transactions for all accounts:", error)
                    throw error
                }
            } else {
                return getAccountHistory({ accountId: account!.id, page: pageParam as number, limit: 20 })
            }
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            if (lastPage.currentPage < lastPage.totalPages) {
                return lastPage.currentPage + 1
            }
            return undefined
        },
        enabled: !!account && isOpen && (account.id !== 'all' || isPillsInitialized),
    })

    const timelineRef = useRef<HTMLDivElement>(null)

    const handleExportImage = async () => {
        if (!timelineRef.current || !account) return
        
        const toastId = toast.loading('Gerando imagem da timeline...')
        
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
            
            toast.success('Imagem exportada com sucesso!', { id: toastId })
        } catch (error: any) {
            console.error('Erro ao exportar imagem:', error)
            toast.error(`Erro ao exportar: ${error?.message || 'Falha desconhecida'}`, { id: toastId })
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
        if (account.id === 'all' && accountsData?.accounts) {
            currentBalance = accountsData.accounts
                .filter(a => selectedAccountIds.includes(a.id))
                .reduce((acc, curr) => acc + curr.balance, 0)
        }
        
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
            <DialogContent className="w-full sm:max-w-[800px] h-[100dvh] sm:h-auto sm:max-h-[85vh] flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b shrink-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-col">
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

                {account?.id === 'all' && accountsData?.accounts && (
                    <div className="bg-muted/20 border-b border-border/40 py-3 px-6 shrink-0">
                        <div className="flex items-center gap-3 overflow-x-auto pb-1 custom-scrollbar">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 shrink-0">
                                Contas
                            </span>
                            <div className="h-4 w-px bg-border/50 mx-1 shrink-0" />
                            {accountsData.accounts.map(acc => {
                                const isSelected = selectedAccountIds.includes(acc.id)
                                return (
                                    <button 
                                        key={acc.id} 
                                        onClick={() => setSelectedAccountIds(prev => isSelected ? prev.filter(id => id !== acc.id) : [...prev, acc.id])}
                                        className={cn(
                                            "relative flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all overflow-hidden shrink-0",
                                            isSelected 
                                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]" 
                                                : "bg-background hover:bg-muted text-muted-foreground border border-border hover:border-primary/50 hover:text-foreground hover:shadow-sm"
                                        )}
                                    >
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                                        )}
                                        <div className={cn("w-2 h-2 rounded-full shadow-inner", isSelected ? "bg-primary-foreground/90" : "bg-muted-foreground/40")} />
                                        <span className="whitespace-nowrap">{acc.name}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                <div  
                    id="timeline-scroll-container"
                    className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative custom-scrollbar"
                >
                    <div ref={timelineRef} className="px-2 sm:px-6 py-6 bg-background text-foreground select-none min-h-full">
                    {isLoading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex justify-between items-center p-4 border rounded-lg">
                                    <div className="flex gap-4 items-center">
                                        <Skeleton className="w-10 h-10 rounded-full" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-[150px]" />
                                            <Skeleton className="h-3 w-[100px]" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-6 w-[80px]" />
                                </div>
                            ))}
                        </div>
                    ) : isError ? (
                        <div className="flex flex-col items-center justify-center h-full text-rose-500 opacity-90 py-12">
                            <AlertTriangle className="w-16 h-16 mb-4" />
                            <p className="text-lg font-semibold">Ocorreu um erro ao carregar o histórico.</p>
                            <p className="text-sm text-muted-foreground mt-2">Por favor, tente novamente.</p>
                        </div>
                    ) : historyWithBalance.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                            <FileText className="w-12 h-12 mb-4 opacity-20" />
                            <p>Nenhuma movimentação encontrada.</p>
                        </div>
                    ) : (
                        <div className="relative py-8">
                            {/* Saldo Atual (Top node) */}
                            <div className="relative z-20 mb-8 flex flex-col w-full items-start sm:items-center pl-6 sm:pl-0">
                                <div className="flex flex-col items-center -translate-x-1/2 sm:translate-x-0 group">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                                        Saldo Atual
                                    </span>
                                    <div className={cn(
                                        "text-2xl sm:text-3xl font-black tabular-nums tracking-tighter transition-all duration-300 group-hover:scale-105",
                                        account?.balance && account.balance < 0 ? "text-indigo-600 dark:text-indigo-400" : "text-blue-600 dark:text-blue-400"
                                    )}>
                                        R$ {account?.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className={cn(
                                        "w-2.5 h-2.5 rounded-full mt-3 shadow-md",
                                        account?.balance && account.balance < 0 ? "bg-indigo-500 shadow-indigo-500/40" : "bg-blue-500 shadow-blue-500/40"
                                    )} />
                                </div>
                            </div>

                            <div className="flex flex-col">
                                {historyWithBalance.map((item) => {
                                    const isIncome = item.operation === 'income'
                                    const isAdjustment = item.type === 'adjustment'
                                    const isRightSide = isIncome || (isAdjustment && item.value >= 0)
                                    const sign = isAdjustment ? (item.value >= 0 ? '+' : '-') : isIncome ? '+' : '-'
                                    const displayValue = Math.abs(item.value)
                                    
                                    const olderBalance = isAdjustment 
                                        ? item.previous_balance ?? (item.runningBalance - item.value)
                                        : (isIncome ? item.runningBalance - item.value : item.runningBalance + item.value)
                                        
                                    const isLastItem = historyWithBalance.indexOf(item) === historyWithBalance.length - 1 && !hasNextPage

                                    return (
                                        <div key={item.id} className="relative flex flex-col w-full group">
                                            {/* The Line segment containing the Math and Card */}
                                            <div className="relative w-full flex justify-center py-3 sm:py-5">
                                                {/* Vertical Line */}
                                                <div className="absolute left-6 sm:left-1/2 top-0 bottom-0 w-0.5 bg-border/40 sm:-translate-x-1/2" />
                                                
                                                {/* Horizontal Connector Line (Desktop) */}
                                                <div className={cn(
                                                    "hidden sm:block absolute top-1/2 -translate-y-1/2 h-px z-10 w-8 sm:w-12 transition-all duration-700 opacity-70 group-hover:opacity-100 group-hover:w-16",
                                                    isRightSide ? "left-[50%]" : "right-[50%]",
                                                    isAdjustment ? "bg-amber-500/80 group-hover:bg-amber-400" :
                                                    isIncome ? "bg-emerald-500/80 group-hover:bg-emerald-400" :
                                                               "bg-rose-500/80 group-hover:bg-rose-400"
                                                )} />

                                                {/* Horizontal Connector Line (Mobile) */}
                                                <div className={cn(
                                                    "sm:hidden absolute top-1/2 -translate-y-1/2 h-px z-10 w-6 transition-all duration-700 opacity-70 group-hover:opacity-100 group-hover:w-10",
                                                    "left-6",
                                                    isAdjustment ? "bg-amber-500/80 group-hover:bg-amber-400" :
                                                    isIncome ? "bg-emerald-500/80 group-hover:bg-emerald-400" :
                                                               "bg-rose-500/80 group-hover:bg-rose-400"
                                                )} />

                                                {/* The Math Label ON the line */}
                                                <div className="absolute left-6 sm:left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
                                                    {(item as any).totalIncome > 0 && (item as any).totalExpense > 0 && isGroupedByDay && (
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 bg-background px-2 py-0.5 rounded-full shadow-sm border border-border/50">
                                                            {format(new Date(item.date), "dd 'de' MMM", { locale: ptBR })}
                                                        </span>
                                                    )}
                                                    <div className={cn(
                                                        "px-4 py-1.5 rounded-full text-xs sm:text-sm font-black tabular-nums border-[3px] shadow-lg whitespace-nowrap relative overflow-hidden group-hover:scale-110 transition-transform duration-300",
                                                        isAdjustment ? "bg-amber-100 text-amber-700 border-amber-400 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-600" :
                                                        isIncome ? "bg-emerald-100 text-emerald-700 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-600" 
                                                                 : "bg-rose-100 text-rose-700 border-rose-400 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-600"
                                                    )}>
                                                        <div data-html2canvas-ignore="true" className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent -translate-x-full animate-shimmer" />
                                                        <span className="relative z-10 tracking-tight">{sign} R$ {displayValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                </div>

                                                {/* The Card(s) Branching off */}
                                                {(item as any).totalIncome > 0 && (item as any).totalExpense > 0 && isGroupedByDay ? (
                                                    <div className="w-full flex flex-col sm:flex-row relative z-10 gap-3 sm:gap-0 mt-12 sm:mt-0">
                                                        {/* Left side (Expense) */}
                                                        <div className="w-full sm:w-1/2 flex justify-start sm:justify-end pl-12 sm:pl-0 sm:pr-12 relative">
                                                            {/* Mobile Connector */}
                                                            <div className="sm:hidden absolute top-1/2 -translate-y-1/2 h-px z-10 w-6 left-6 bg-rose-500/80" />
                                                            {/* Card Content */}
                                                            <div className={cn(
                                                                "flex flex-col p-3 rounded-xl bg-white dark:bg-card/80 border shadow-md w-full max-w-[280px] sm:max-w-[280px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg mr-4 sm:mr-0",
                                                                "border-l-[6px] border-l-rose-500 border-y-rose-500/10 border-r-rose-500/10",
                                                                "sm:text-right"
                                                            )}>
                                                                <div className={cn("flex items-center gap-3", "sm:flex-row-reverse")}>
                                                                    <div className="p-2 rounded-lg flex-shrink-0 bg-rose-500/10 text-rose-500">
                                                                        <ArrowDownRight className="w-4 h-4" />
                                                                    </div>
                                                                    <div className="flex flex-col min-w-0 flex-1">
                                                                        <span className="font-extrabold text-rose-500 text-sm sm:text-base capitalize truncate tracking-tight">
                                                                            - R$ {(item as any).totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                        </span>
                                                                        <span className="text-[10px] font-black text-muted-foreground mt-0.5 uppercase tracking-wider">
                                                                            Total de Saídas
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {/* Right side (Income) */}
                                                        <div className="w-full sm:w-1/2 flex justify-start pl-12 sm:pl-12 relative">
                                                            {/* Mobile Connector */}
                                                            <div className="sm:hidden absolute top-1/2 -translate-y-1/2 h-px z-10 w-6 left-6 bg-emerald-500/80" />
                                                            {/* Card Content */}
                                                            <div className={cn(
                                                                "flex flex-col p-3 rounded-xl bg-white dark:bg-card/80 border shadow-md w-full max-w-[280px] sm:max-w-[280px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg mr-4 sm:mr-0",
                                                                "border-l-[6px] border-l-emerald-500 border-y-emerald-500/10 border-r-emerald-500/10"
                                                            )}>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2 rounded-lg flex-shrink-0 bg-emerald-500/10 text-emerald-500">
                                                                        <ArrowUpLeft className="w-4 h-4" />
                                                                    </div>
                                                                    <div className="flex flex-col min-w-0 flex-1">
                                                                        <span className="font-extrabold text-emerald-500 text-sm sm:text-base capitalize truncate tracking-tight">
                                                                            + R$ {(item as any).totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                        </span>
                                                                        <span className="text-[10px] font-black text-muted-foreground mt-0.5 uppercase tracking-wider">
                                                                            Total de Entradas
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className={cn(
                                                        "w-full sm:w-1/2 flex relative z-10",
                                                        isRightSide ? "justify-start pl-12 sm:pl-12" : "justify-start sm:justify-end pl-12 sm:pl-0 sm:pr-12"
                                                    )}>
                                                        {/* Card Content */}
                                                        <div className={cn(
                                                            "flex flex-col p-3 rounded-xl bg-white dark:bg-card/80 border shadow-md w-full max-w-[280px] sm:max-w-[280px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg mr-4 sm:mr-0",
                                                            isAdjustment ? "border-l-[6px] border-l-amber-500 border-y-amber-500/10 border-r-amber-500/10" : 
                                                            isIncome ? "border-l-[6px] border-l-emerald-500 border-y-emerald-500/10 border-r-emerald-500/10" : 
                                                                       "border-l-[6px] border-l-rose-500 border-y-rose-500/10 border-r-rose-500/10",
                                                            !isRightSide && "sm:text-right"
                                                        )}>
                                                            <div className={cn("flex items-center gap-3", !isRightSide && "sm:flex-row-reverse")}>
                                                                <div className={cn(
                                                                    "p-2 rounded-lg flex-shrink-0",
                                                                    isAdjustment ? "bg-amber-500/10 text-amber-500" :
                                                                    isIncome ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                                                                )}>
                                                                    {isAdjustment ? <ArrowRightLeft className="w-4 h-4" /> :
                                                                     isIncome ? <ArrowUpLeft className="w-4 h-4" /> : 
                                                                     <ArrowDownRight className="w-4 h-4" />}
                                                                </div>
                                                                <div className="flex flex-col min-w-0 flex-1">
                                                                    <span className="font-extrabold text-slate-800 dark:text-foreground text-sm sm:text-base capitalize truncate">
                                                                        {isGroupedByDay 
                                                                            ? format(new Date(item.date), "dd 'de' MMMM", { locale: ptBR })
                                                                            : (isAdjustment ? 'Ajuste de Saldo' : item.description || 'Transação')}
                                                                    </span>
                                                                    <span className="text-[10px] font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">
                                                                        {isGroupedByDay 
                                                                            ? (isIncome ? 'Total de Entradas' : 'Total de Saídas')
                                                                            : format(new Date(item.date), "dd MMM, HH:mm", { locale: ptBR })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* The Balance Pill BEFORE this transaction (Older Balance) */}
                                            <div className="relative z-20 my-1 flex w-full justify-start sm:justify-center pl-6 sm:pl-0">
                                                <div className="flex flex-col items-center -translate-x-1/2 sm:translate-x-0 group cursor-default">
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full mb-1.5 transition-transform duration-300 group-hover:scale-150 shadow-sm",
                                                        olderBalance < 0 ? "bg-indigo-400 shadow-indigo-500/30" : "bg-blue-400 shadow-blue-500/30"
                                                    )} />
                                                    <span className={cn(
                                                        "text-[11px] sm:text-xs font-black tracking-wider transition-colors duration-300",
                                                        olderBalance < 0 
                                                            ? "text-indigo-600/70 dark:text-indigo-400/70 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" 
                                                            : "text-blue-600/70 dark:text-blue-400/70 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                                                    )}>
                                                        R$ {olderBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
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
