import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import html2canvas from 'html2canvas'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpLeft,
  Download,
  FileText,
  Filter,
  Loader2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import {
  AccountHistoryItem,
  getAccountHistory,
} from '@/api/get-account-history'
import { getAccounts } from '@/api/get-accounts'
import { getTransactions } from '@/api/get-transactions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface AccountHistoryDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  account: { id: string; name: string; balance: number } | null
  onExportPDF: (
    account: { id: string; name: string },
    history: (AccountHistoryItem & { runningBalance: number })[],
  ) => void
}

export function AccountHistoryDialog({
  isOpen,
  onOpenChange,
  account,
  onExportPDF,
}: AccountHistoryDialogProps) {
  const [isGroupedByDay, setIsGroupedByDay] = useState(false)
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [isPillsInitialized, setIsPillsInitialized] = useState(false)

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
    enabled: isOpen && account?.id === 'all',
  })

  useEffect(() => {
    if (
      account?.id === 'all' &&
      accountsData?.accounts &&
      !isPillsInitialized
    ) {
      setSelectedAccountIds(accountsData.accounts.map((a) => a.id))
      setIsPillsInitialized(true)
    } else if (account?.id !== 'all') {
      setIsPillsInitialized(false)
      setSelectedAccountIds([])
    }
  }, [account?.id, accountsData, isPillsInitialized])

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['account-history', account?.id, selectedAccountIds],
    queryFn: async ({ pageParam }) => {
      if (account!.id === 'all') {
        try {
          const res = await getTransactions({
            accountId:
              selectedAccountIds.length > 0
                ? selectedAccountIds.join(',')
                : undefined,
            page: pageParam as number,
            perPage: 20,
            sortBy: 'data_vencimento',
            sortDirection: 'desc',
          })
          return {
            account: { id: 'all', name: 'Histórico Geral', balance: 0 },
            history: res.data.transactions.transactions.map((t) => ({
              id: t.id,
              type: 'transaction',
              description: t.description || 'Transação',
              operation: t.operation,
              value: t.totalValue ?? t.amount,
              date: t.data_vencimento.toString(),
              created_at: t.data_emissao
                ? t.data_emissao.toString()
                : new Date().toISOString(),
            })),
            totalCount: res.data.transactions.totalCount,
            totalPages: Math.ceil(
              res.data.transactions.totalCount / res.data.transactions.perPage,
            ),
            currentPage: res.data.transactions.pageIndex,
          }
        } catch (error) {
          console.error('Error fetching transactions for all accounts:', error)
          throw error
        }
      } else {
        return getAccountHistory({
          accountId: account!.id,
          page: pageParam as number,
          limit: 20,
        })
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.currentPage < lastPage.totalPages) {
        return lastPage.currentPage + 1
      }
      return undefined
    },
    enabled:
      !!account && isOpen && (account.id !== 'all' || isPillsInitialized),
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
      toast.error(
        `Erro ao exportar: ${error?.message || 'Falha desconhecida'}`,
        { id: toastId },
      )
    }
  }

  const observerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!observerRef.current) return

    const viewport = document.getElementById('timeline-scroll-container')

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { root: viewport, rootMargin: '200px' },
    )

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

  // Auto-scroll to bottom when first page loads
  useEffect(() => {
    if (isOpen && data?.pages.length === 1 && !isFetchingNextPage) {
      const viewport = document.getElementById('timeline-scroll-container')
      if (viewport) {
        // Use a slight timeout to ensure render is complete
        setTimeout(() => {
          viewport.scrollTop = viewport.scrollHeight
        }, 100)
      }
    }
  }, [isOpen, data?.pages.length, isFetchingNextPage])

  const { historyWithBalance, initialBalance } = (() => {
    if (!data || !account)
      return { historyWithBalance: [], initialBalance: account?.balance || 0 }

    let currentBalance = account.balance
    if (account.id === 'all' && accountsData?.accounts) {
      currentBalance = accountsData.accounts
        .filter((a) => selectedAccountIds.includes(a.id))
        .reduce((acc, curr) => acc + curr.balance, 0)
    }

    const allHistory = data.pages.flatMap((page) => page.history)

    let processedHistory = allHistory.map((item) => {
      const balanceAtThisPoint = currentBalance

      if (item.type === 'adjustment') {
        currentBalance = item.previous_balance ?? currentBalance - item.value
      } else {
        if (item.operation === 'income') {
          currentBalance -= item.value
        } else {
          currentBalance += item.value
        }
      }

      return {
        ...item,
        runningBalance: balanceAtThisPoint,
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
            netValue: income - expense,
          }
        } else {
          currentGroup.totalIncome += income
          currentGroup.totalExpense += expense
          currentGroup.netValue += income - expense
        }
      }
      if (currentGroup) grouped.push(currentGroup)

      processedHistory = grouped.map((g: any) => ({
        ...g,
        value: Math.abs(g.netValue),
        operation: g.netValue >= 0 ? 'income' : 'expense',
        type: 'transaction',
      }))
    }

    return {
      historyWithBalance: processedHistory,
      initialBalance: currentBalance,
    }
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
      <DialogContent className="flex max-h-[85vh] flex-col p-0 sm:max-w-[800px]">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex flex-col">
              <DialogTitle className="text-xl">Histórico da Conta</DialogTitle>
              <DialogDescription>{account?.name}</DialogDescription>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <div className="mr-2 flex rounded-lg border border-border/50 bg-muted/50 p-1">
                <button
                  onClick={() => setIsGroupedByDay(false)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-semibold transition-all',
                    !isGroupedByDay
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Detalhado
                </button>
                <button
                  onClick={() => setIsGroupedByDay(true)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-semibold transition-all',
                    isGroupedByDay
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
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
                <Download className="h-4 w-4" />
                Exportar Imagem
              </Button>
              <Button
                variant="default"
                size="sm"
                className="gap-2 bg-primary/90"
                onClick={() =>
                  account && onExportPDF(account, historyWithBalance)
                }
                disabled={isLoading || historyWithBalance.length === 0}
              >
                <FileText className="h-4 w-4" />
                Exportar Tabela PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        {account?.id === 'all' && accountsData?.accounts && (
          <div className="shrink-0 border-b border-border/40 bg-muted/20 px-6 py-3">
            <div className="custom-scrollbar flex items-center gap-3 overflow-x-auto pb-1">
              <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Contas
              </span>
              <div className="mx-1 h-4 w-px shrink-0 bg-border/50" />
              {accountsData.accounts.map((acc) => {
                const isSelected = selectedAccountIds.includes(acc.id)
                return (
                  <button
                    key={acc.id}
                    onClick={() =>
                      setSelectedAccountIds((prev) =>
                        isSelected
                          ? prev.filter((id) => id !== acc.id)
                          : [...prev, acc.id],
                      )
                    }
                    className={cn(
                      'relative flex shrink-0 items-center gap-2 overflow-hidden rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
                      isSelected
                        ? 'scale-[1.02] bg-primary text-primary-foreground shadow-md shadow-primary/20'
                        : 'border border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted hover:text-foreground hover:shadow-sm',
                    )}
                  >
                    {isSelected && (
                      <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    )}
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full shadow-inner',
                        isSelected
                          ? 'bg-primary-foreground/90'
                          : 'bg-muted-foreground/40',
                      )}
                    />
                    <span className="whitespace-nowrap">{acc.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div
          id="timeline-scroll-container"
          className="custom-scrollbar relative min-h-0 flex-1 overflow-y-auto"
        >
          <div
            ref={timelineRef}
            className="min-h-full select-none bg-background px-6 py-6 text-foreground"
          >
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
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
              <div className="flex h-full flex-col items-center justify-center py-12 text-rose-500 opacity-90">
                <AlertTriangle className="mb-4 h-16 w-16" />
                <p className="text-lg font-semibold">
                  Ocorreu um erro ao carregar o histórico.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Por favor, tente novamente.
                </p>
              </div>
            ) : historyWithBalance.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <FileText className="mb-4 h-12 w-12 opacity-20" />
                <p>Nenhuma movimentação encontrada.</p>
              </div>
            ) : (
              <div className="relative py-8">
                {hasNextPage && (
                  <div
                    ref={observerRef}
                    className="relative z-30 flex justify-center py-6"
                  >
                    {isFetchingNextPage && (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    )}
                  </div>
                )}

                {/* Saldo Inicial (Top node now, when all loaded) */}
                {!hasNextPage && historyWithBalance.length > 0 && (
                  <div className="relative z-20 mb-2 flex w-full flex-col items-start pl-6 sm:items-center sm:pl-0">
                    <div className="group flex -translate-x-1/2 flex-col items-center sm:translate-x-0">
                      <div className="mb-3 h-2.5 w-2.5 rounded-full bg-slate-300 shadow-md dark:bg-slate-600" />
                      <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Saldo Inicial (Fim do Histórico)
                      </span>
                      <div
                        className={cn(
                          'text-2xl font-black tabular-nums tracking-tighter transition-all duration-300 group-hover:scale-105 sm:text-3xl',
                          initialBalance < 0
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-blue-600 dark:text-blue-400',
                        )}
                      >
                        R${' '}
                        {initialBalance.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col-reverse">
                  {historyWithBalance.map((item) => {
                    const isIncome = item.operation === 'income'
                    const isAdjustment = item.type === 'adjustment'
                    const isRightSide =
                      isIncome || (isAdjustment && item.value >= 0)
                    const sign = isAdjustment
                      ? item.value >= 0
                        ? '+'
                        : '-'
                      : isIncome
                        ? '+'
                        : '-'
                    const displayValue = Math.abs(item.value)

                    const olderBalance = isAdjustment
                      ? item.previous_balance ??
                        item.runningBalance - item.value
                      : isIncome
                        ? item.runningBalance - item.value
                        : item.runningBalance + item.value

                    const isLastItem =
                      historyWithBalance.indexOf(item) ===
                        historyWithBalance.length - 1 && !hasNextPage

                    return (
                      <div
                        key={item.id}
                        className="group relative flex w-full flex-col"
                      >
                        {/* The Line segment containing the Math and Card */}
                        <div className="relative flex w-full justify-center py-3 sm:py-5">
                          {/* Vertical Line */}
                          <div className="absolute bottom-0 left-6 top-0 w-0.5 bg-border/40 sm:left-1/2 sm:-translate-x-1/2" />

                          {/* Horizontal Connector Line (Desktop) */}
                          <div
                            className={cn(
                              'absolute top-1/2 z-10 hidden h-px w-8 -translate-y-1/2 opacity-70 transition-all duration-700 group-hover:w-16 group-hover:opacity-100 sm:block sm:w-12',
                              isRightSide ? 'left-[50%]' : 'right-[50%]',
                              isAdjustment
                                ? 'bg-amber-500/80 group-hover:bg-amber-400'
                                : isIncome
                                  ? 'bg-emerald-500/80 group-hover:bg-emerald-400'
                                  : 'bg-rose-500/80 group-hover:bg-rose-400',
                            )}
                          />

                          {/* Horizontal Connector Line (Mobile) */}
                          <div
                            className={cn(
                              'absolute top-1/2 z-10 h-px w-6 -translate-y-1/2 opacity-70 transition-all duration-700 group-hover:w-10 group-hover:opacity-100 sm:hidden',
                              'left-6',
                              isAdjustment
                                ? 'bg-amber-500/80 group-hover:bg-amber-400'
                                : isIncome
                                  ? 'bg-emerald-500/80 group-hover:bg-emerald-400'
                                  : 'bg-rose-500/80 group-hover:bg-rose-400',
                            )}
                          />

                          {/* The Math Label ON the line */}
                          <div className="absolute left-6 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center sm:left-1/2">
                            {(item as any).totalIncome > 0 &&
                              (item as any).totalExpense > 0 &&
                              isGroupedByDay && (
                                <span className="mb-1.5 rounded-full border border-border/50 bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground shadow-sm">
                                  {format(new Date(item.date), "dd 'de' MMM", {
                                    locale: ptBR,
                                  })}
                                </span>
                              )}
                            <div
                              className={cn(
                                'relative overflow-hidden whitespace-nowrap rounded-full border-[3px] px-4 py-1.5 text-xs font-black tabular-nums shadow-lg transition-transform duration-300 group-hover:scale-110 sm:text-sm',
                                isAdjustment
                                  ? 'border-amber-400 bg-amber-100 text-amber-700 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-300'
                                  : isIncome
                                    ? 'border-emerald-400 bg-emerald-100 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'border-rose-400 bg-rose-100 text-rose-700 dark:border-rose-600 dark:bg-rose-950 dark:text-rose-300',
                              )}
                            >
                              <div
                                data-html2canvas-ignore="true"
                                className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10"
                              />
                              <span className="relative z-10 tracking-tight">
                                {sign} R${' '}
                                {displayValue.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          </div>

                          {/* The Card(s) Branching off */}
                          {(item as any).totalIncome > 0 &&
                          (item as any).totalExpense > 0 &&
                          isGroupedByDay ? (
                            <div className="relative z-10 mt-12 flex w-full flex-col gap-3 sm:mt-0 sm:flex-row sm:gap-0">
                              {/* Left side (Expense) */}
                              <div className="relative flex w-full justify-start pl-16 sm:mr-auto sm:w-1/2 sm:justify-end sm:pl-0 sm:pr-12">
                                {/* Mobile Connector */}
                                <div className="absolute left-6 top-1/2 z-10 h-px w-6 -translate-y-1/2 bg-rose-500/80 sm:hidden" />
                                {/* Card Content */}
                                <div
                                  className={cn(
                                    'flex w-full max-w-[260px] flex-col rounded-xl border bg-white p-3 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:bg-card/80 sm:max-w-[280px]',
                                    'border-l-[6px] border-y-rose-500/10 border-l-rose-500 border-r-rose-500/10',
                                    'sm:text-right',
                                  )}
                                >
                                  <div
                                    className={cn(
                                      'flex items-center gap-3',
                                      'sm:flex-row-reverse',
                                    )}
                                  >
                                    <div className="flex-shrink-0 rounded-lg bg-rose-500/10 p-2 text-rose-500">
                                      <ArrowDownRight className="h-4 w-4" />
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col">
                                      <span className="truncate text-sm font-extrabold capitalize tracking-tight text-rose-500 sm:text-base">
                                        - R${' '}
                                        {(
                                          item as any
                                        ).totalExpense.toLocaleString('pt-BR', {
                                          minimumFractionDigits: 2,
                                        })}
                                      </span>
                                      <span className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                        Total de Saídas
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {/* Right side (Income) */}
                              <div className="relative flex w-full justify-start pl-16 sm:ml-auto sm:w-1/2 sm:pl-12">
                                {/* Mobile Connector */}
                                <div className="absolute left-6 top-1/2 z-10 h-px w-6 -translate-y-1/2 bg-emerald-500/80 sm:hidden" />
                                {/* Card Content */}
                                <div
                                  className={cn(
                                    'flex w-full max-w-[260px] flex-col rounded-xl border bg-white p-3 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:bg-card/80 sm:max-w-[280px]',
                                    'border-l-[6px] border-y-emerald-500/10 border-l-emerald-500 border-r-emerald-500/10',
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0 rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
                                      <ArrowUpLeft className="h-4 w-4" />
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col">
                                      <span className="truncate text-sm font-extrabold capitalize tracking-tight text-emerald-500 sm:text-base">
                                        + R${' '}
                                        {(
                                          item as any
                                        ).totalIncome.toLocaleString('pt-BR', {
                                          minimumFractionDigits: 2,
                                        })}
                                      </span>
                                      <span className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                        Total de Entradas
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              className={cn(
                                'relative z-10 flex w-full sm:w-1/2',
                                isRightSide
                                  ? 'justify-start pl-16 sm:ml-auto sm:pl-12'
                                  : 'pl-16 sm:mr-auto sm:justify-end sm:pl-0 sm:pr-12',
                              )}
                            >
                              {/* Card Content */}
                              <div
                                className={cn(
                                  'flex w-full max-w-[260px] flex-col rounded-xl border bg-white p-3 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:bg-card/80 sm:max-w-[280px]',
                                  isAdjustment
                                    ? 'border-l-[6px] border-y-amber-500/10 border-l-amber-500 border-r-amber-500/10'
                                    : isIncome
                                      ? 'border-l-[6px] border-y-emerald-500/10 border-l-emerald-500 border-r-emerald-500/10'
                                      : 'border-l-[6px] border-y-rose-500/10 border-l-rose-500 border-r-rose-500/10',
                                  !isRightSide && 'sm:text-right',
                                )}
                              >
                                <div
                                  className={cn(
                                    'flex items-center gap-3',
                                    !isRightSide && 'sm:flex-row-reverse',
                                  )}
                                >
                                  <div
                                    className={cn(
                                      'flex-shrink-0 rounded-lg p-2',
                                      isAdjustment
                                        ? 'bg-amber-500/10 text-amber-500'
                                        : isIncome
                                          ? 'bg-emerald-500/10 text-emerald-500'
                                          : 'bg-rose-500/10 text-rose-500',
                                    )}
                                  >
                                    {isAdjustment ? (
                                      <ArrowRightLeft className="h-4 w-4" />
                                    ) : isIncome ? (
                                      <ArrowUpLeft className="h-4 w-4" />
                                    ) : (
                                      <ArrowDownRight className="h-4 w-4" />
                                    )}
                                  </div>
                                  <div className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate text-sm font-extrabold capitalize text-slate-800 dark:text-foreground sm:text-base">
                                      {isGroupedByDay
                                        ? format(
                                            new Date(item.date),
                                            "dd 'de' MMMM",
                                            { locale: ptBR },
                                          )
                                        : isAdjustment
                                          ? 'Ajuste de Saldo'
                                          : item.description || 'Transação'}
                                    </span>
                                    <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                      {isGroupedByDay
                                        ? isIncome
                                          ? 'Total de Entradas'
                                          : 'Total de Saídas'
                                        : format(
                                            new Date(item.date),
                                            'dd MMM, HH:mm',
                                            { locale: ptBR },
                                          )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* The Balance Pill BEFORE this transaction (Older Balance) */}
                        <div className="relative z-20 my-1 flex w-full justify-start pl-6 sm:justify-center sm:pl-0">
                          <div className="group flex -translate-x-1/2 cursor-default flex-col items-center sm:translate-x-0">
                            <div
                              className={cn(
                                'mb-1.5 h-2 w-2 rounded-full shadow-sm transition-transform duration-300 group-hover:scale-150',
                                olderBalance < 0
                                  ? 'bg-indigo-400 shadow-indigo-500/30'
                                  : 'bg-blue-400 shadow-blue-500/30',
                              )}
                            />
                            <span
                              className={cn(
                                'text-[11px] font-black tracking-wider transition-colors duration-300 sm:text-xs',
                                olderBalance < 0
                                  ? 'text-indigo-600/70 group-hover:text-indigo-600 dark:text-indigo-400/70 dark:group-hover:text-indigo-400'
                                  : 'text-blue-600/70 group-hover:text-blue-600 dark:text-blue-400/70 dark:group-hover:text-blue-400',
                              )}
                            >
                              R${' '}
                              {olderBalance.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Saldo Atual (Bottom node now) */}
                <div className="relative z-20 mt-2 flex w-full flex-col items-start pl-6 sm:items-center sm:pl-0">
                  <div className="group flex -translate-x-1/2 flex-col items-center sm:translate-x-0">
                    <div
                      className={cn(
                        'mb-3 h-3 w-3 rounded-full shadow-md',
                        account?.balance && account.balance < 0
                          ? 'bg-indigo-500 shadow-indigo-500/40'
                          : 'bg-blue-500 shadow-blue-500/40',
                      )}
                    />
                    <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Saldo Atual
                    </span>
                    <div
                      className={cn(
                        'text-2xl font-black tabular-nums tracking-tighter transition-all duration-300 group-hover:scale-105 sm:text-3xl',
                        account?.balance && account.balance < 0
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-blue-600 dark:text-blue-400',
                      )}
                    >
                      R${' '}
                      {account?.balance.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t bg-muted/20 p-4 sm:hidden">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleExportImage}
            disabled={isLoading || historyWithBalance.length === 0}
          >
            <Download className="h-4 w-4" />
            Exportar Imagem
          </Button>
          <Button
            variant="default"
            className="w-full gap-2 bg-primary/90"
            onClick={() => account && onExportPDF(account, historyWithBalance)}
            disabled={isLoading || historyWithBalance.length === 0}
          >
            <FileText className="h-4 w-4" />
            Exportar Tabela PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
