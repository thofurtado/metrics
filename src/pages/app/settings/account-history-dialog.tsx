import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Download, Loader2 } from 'lucide-react'
import { AccountHistoryItem, getAccountHistory } from '@/api/get-account-history'
import { useInfiniteQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import html2canvas from 'html2canvas'
import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface AccountHistoryDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    account: { id: string; name: string; balance: number } | null
    onExportPDF: (account: { id: string; name: string }, history: (AccountHistoryItem & { runningBalance: number })[]) => void
}

export function AccountHistoryDialog({ isOpen, onOpenChange, account, onExportPDF }: AccountHistoryDialogProps) {
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
        
        // Find the scroll viewport container of Radix UI
        const viewport = observerRef.current.closest('[data-radix-scroll-area-viewport]')
        
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
        const viewport = timelineRef.current?.closest('[data-radix-scroll-area-viewport]') as HTMLElement
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

        const history = allHistory.map((item) => {
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
        
        return { historyWithBalance: history, initialBalance: currentBalance }
    })()

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <div className="flex items-center justify-between pr-12">
                        <div>
                            <DialogTitle className="text-xl">Histórico da Conta</DialogTitle>
                            <DialogDescription>
                                {account?.name}
                            </DialogDescription>
                        </div>
                        <div className="hidden sm:flex items-center gap-2">
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

                <div className="flex-1 min-h-0 overflow-hidden relative">
                <ScrollArea className="h-full">
                    <div ref={timelineRef} className="px-6 py-6 bg-background text-foreground select-none">
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
                                    
                                    const cardBgClass = isAdjustment 
                                        ? "bg-card border-amber-500/40 shadow-amber-500/5" 
                                        : isIncome 
                                            ? "bg-card border-emerald-500/40 shadow-emerald-500/5" 
                                            : "bg-card border-rose-500/40 shadow-rose-500/5"
                                            
                                    return (
                                        <div key={item.id} className={cn(
                                            "relative flex w-full group",
                                            "sm:w-1/2",
                                            isRightSide ? "sm:ml-auto pl-14 sm:pl-10" : "sm:mr-auto pl-14 sm:pr-10 sm:pl-0"
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
                                                isRightSide ? "left-0 w-10" : "right-0 w-10"
                                            )} />

                                            {/* Card */}
                                            <div className={cn(
                                                "w-full border p-4 rounded-2xl shadow-sm group-hover:shadow-md transition-all relative z-10",
                                                cardBgClass,
                                                isRightSide ? "" : "sm:text-right"
                                            )}>
                                                <div className={cn(
                                                    "flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 sm:items-center",
                                                    isRightSide ? "" : "sm:flex-row-reverse"
                                                )}>
                                                    <div>
                                                        <p className="font-bold text-foreground text-sm sm:text-base">
                                                            {isAdjustment ? 'Ajuste de Saldo' : item.description || 'Transação'}
                                                        </p>
                                                        <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground mt-1 tracking-wider uppercase opacity-80">
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
                            
                            {hasNextPage && (
                                <div ref={observerRef} className="flex justify-center py-6">
                                    {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
                                </div>
                            )}

                            {!hasNextPage && historyWithBalance.length > 0 && (
                                <div className="relative flex justify-start sm:justify-center mt-8 mb-4 z-10 pl-14 sm:pl-0">
                                    <div className="bg-muted border-2 border-border shadow-sm rounded-full px-5 py-2 text-sm font-bold flex items-center justify-center text-muted-foreground">
                                        Saldo Inicial: R$ {initialBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    </div>
                </ScrollArea>
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
