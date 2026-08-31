import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  Percent,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Undo2,
  User,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { getAccounts } from '@/api/get-accounts'
import { getClients } from '@/api/get-clients'
import { getPendingSettlements } from '@/api/get-pending-settlements'
import { getSettlements } from '@/api/get-settlements'
import { getEmployees } from '@/api/hr/employees'
import { revertSettlement } from '@/api/revert-settlement'
import { settleTermDebt } from '@/api/settle-term-debt'
import { MonthPicker } from '@/components/MonthPicker'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/axios'

import { TermReportModal } from './components/term-report-modal'

export function Settlements() {
  const queryClient = useQueryClient()

  // Selected Month (Default: current month)
  const [selectedMonthDate, setSelectedMonthDate] = useState<Date>(new Date())
  const selectedMonth = selectedMonthDate.getMonth() + 1
  const selectedYear = selectedMonthDate.getFullYear()

  const [activeTab, setActiveTab] = useState<string>('automatic')

  // Pagination per tab
  const [pendingCardPageIndex, setPendingCardPageIndex] = useState(0)
  const [receivedCardPageIndex, setReceivedCardPageIndex] = useState(0)
  const [pendingTermPageIndex, setPendingTermPageIndex] = useState(0)
  const [receivedTermPageIndex, setReceivedTermPageIndex] = useState(0)

  // Modals state
  const [triggerModalOpen, setTriggerModalOpen] = useState(false)
  const [termModalOpen, setTermModalOpen] = useState(false)
  const [selectedTermTx, setSelectedTermTx] = useState<any>(null)
  const [reportModalOpen, setReportModalOpen] = useState(false)

  // Selection for batch settlements
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([])

  // Term Debt Form state
  const [targetAccountId, setTargetAccountId] = useState('')
  const [actualMethod, setActualMethod] = useState('PIX')

  // Sorting
  const [sortFieldPendingCard, setSortFieldPendingCard] = useState('data_vencimento')
  const [sortDirPendingCard, setSortDirPendingCard] = useState('asc')

  const [sortFieldReceivedCard, setSortFieldReceivedCard] = useState('data_vencimento')
  const [sortDirReceivedCard, setSortDirReceivedCard] = useState('desc')

  // Search filter inside Term tab
  const [termSearchQuery, setTermSearchQuery] = useState('')

  // 1. Query: Cartões à Receber no Mês Selecionado
  const { data: pendingCardsResult, isLoading: isLoadingPendingCards } = useQuery({
    queryKey: [
      'pending-settlements-cards',
      pendingCardPageIndex,
      sortFieldPendingCard,
      sortDirPendingCard,
      selectedMonth,
      selectedYear,
    ],
    queryFn: () =>
      getPendingSettlements({
        pageIndex: pendingCardPageIndex,
        sortBy: sortFieldPendingCard,
        sortDir: sortDirPendingCard,
        month: selectedMonth,
        year: selectedYear,
        type: 'automatic',
      }),
  })
  const pendingCards = pendingCardsResult?.data || []
  const pendingCardsSummary = pendingCardsResult?.summary || {
    totalGross: 0,
    totalNet: 0,
    totalFees: 0,
    count: 0,
  }

  // 2. Query: Cartões à Receber GERAL (Futuro Total em Aberto)
  const { data: allPendingCardsResult } = useQuery({
    queryKey: ['pending-settlements-cards-all'],
    queryFn: () =>
      getPendingSettlements({
        type: 'automatic',
      }),
  })
  const totalAllPendingCardsGross = allPendingCardsResult?.summary?.totalGross || 0
  const totalAllPendingCardsNet = allPendingCardsResult?.summary?.totalNet || 0

  // 3. Query: Cartões Recebidos / Liquidados no Mês
  const { data: receivedCardsResult, isLoading: isLoadingReceivedCards } = useQuery({
    queryKey: [
      'settlements-cards',
      receivedCardPageIndex,
      sortFieldReceivedCard,
      sortDirReceivedCard,
      selectedMonth,
      selectedYear,
    ],
    queryFn: () =>
      getSettlements({
        pageIndex: receivedCardPageIndex,
        sortBy: sortFieldReceivedCard,
        sortDir: sortDirReceivedCard,
        month: selectedMonth,
        year: selectedYear,
        type: 'automatic',
      }),
  })
  const receivedCards = receivedCardsResult?.data || []
  const receivedCardsSummary = receivedCardsResult?.summary || {
    totalGross: 0,
    totalNet: 0,
    totalFees: 0,
    count: 0,
  }

  // 4. Query: A Prazo a Receber (Clientes e Funcionários) no Mês
  const { data: pendingTermsResult, isLoading: isLoadingPendingTerms } = useQuery({
    queryKey: ['pending-settlements-terms', selectedMonth, selectedYear, pendingTermPageIndex],
    queryFn: () =>
      getPendingSettlements({
        pageIndex: pendingTermPageIndex,
        month: selectedMonth,
        year: selectedYear,
        type: 'term',
      }),
  })
  const pendingTerms = pendingTermsResult?.data || []

  // 5. Query: A Prazo a Receber GERAL (Todos os débitos em aberto para o modal de relatório e total)
  const { data: allPendingTermsResult } = useQuery({
    queryKey: ['pending-settlements-terms-all'],
    queryFn: () =>
      getPendingSettlements({
        type: 'term',
      }),
  })
  const allPendingTerms = allPendingTermsResult?.data || []

  // 6. Query: A Prazo Recebidos no Mês
  const { data: receivedTermsResult, isLoading: isLoadingReceivedTerms } = useQuery({
    queryKey: ['settlements-terms', selectedMonth, selectedYear, receivedTermPageIndex],
    queryFn: () =>
      getSettlements({
        pageIndex: receivedTermPageIndex,
        month: selectedMonth,
        year: selectedYear,
        type: 'term',
      }),
  })
  const receivedTerms = receivedTermsResult?.data || []
  const receivedTermsSummary = receivedTermsResult?.summary || {
    totalGross: 0,
    totalNet: 0,
    totalFees: 0,
    count: 0,
  }

  // Auxiliary data: Contas, Clientes e Funcionários
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
  })

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
  })
  const clients = (clientsData as any)?.clients || (Array.isArray(clientsData) ? clientsData : [])

  const { data: employeesData } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => getEmployees({ limit: 1000 }),
  })
  const employees = (employeesData as any)?.employees || (Array.isArray(employeesData) ? employeesData : [])

  // Auto-Settle on mount
  useEffect(() => {
    const autoSettle = async () => {
      try {
        await api.post('/trigger-settlement', undefined, {
          params: { onlyToday: 'true' },
        })
        queryClient.invalidateQueries({ queryKey: ['settlements-cards'] })
        queryClient.invalidateQueries({ queryKey: ['pending-settlements-cards'] })
        queryClient.invalidateQueries({ queryKey: ['finance-metrics'] })
      } catch (e) {
        console.error('Failed to auto-settle', e)
      }
    }
    autoSettle()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Mutations
  const { mutateAsync: revert } = useMutation({
    mutationFn: revertSettlement,
    onSuccess: () => {
      toast.success('Liquidação revertida com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['settlements-cards'] })
      queryClient.invalidateQueries({ queryKey: ['pending-settlements-cards'] })
      queryClient.invalidateQueries({ queryKey: ['finance-metrics'] })
    },
    onError: () => toast.error('Erro ao reverter liquidação.'),
  })

  const { mutateAsync: triggerSettlement, isPending: isTriggering } = useMutation({
    mutationFn: async (ids?: string[]) => {
      const payload = ids && ids.length > 0 ? { transactionIds: ids } : undefined
      const res = await api.post('/trigger-settlement', payload)
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Liquidação processada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['settlements-cards'] })
      queryClient.invalidateQueries({ queryKey: ['pending-settlements-cards'] })
      queryClient.invalidateQueries({ queryKey: ['pending-settlements-cards-all'] })
      queryClient.invalidateQueries({ queryKey: ['finance-metrics'] })
      setTriggerModalOpen(false)
      setSelectedTxIds([])
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Erro ao processar liquidações.'),
  })

  const { mutateAsync: handleSettleTerm, isPending: isSettlingTerm } = useMutation({
    mutationFn: (isWriteOff: boolean) =>
      settleTermDebt({
        transactionId: selectedTermTx.id,
        targetAccountId: isWriteOff ? null : targetAccountId,
        actualPaymentMethod: isWriteOff ? null : actualMethod,
        isWriteOff,
      }),
    onSuccess: () => {
      toast.success('Baixa realizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['pending-settlements-terms'] })
      queryClient.invalidateQueries({ queryKey: ['pending-settlements-terms-all'] })
      queryClient.invalidateQueries({ queryKey: ['settlements-terms'] })
      queryClient.invalidateQueries({ queryKey: ['finance-metrics'] })
      setTermModalOpen(false)
      setSelectedTermTx(null)
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Erro ao realizar baixa.'),
  })

  // Multi-select for card settlements
  const allAutomaticIds = pendingCards.map((t) => t.id)
  const isAllSelected = allAutomaticIds.length > 0 && selectedTxIds.length === allAutomaticIds.length

  const handleSelectAll = () => {
    if (isAllSelected) setSelectedTxIds([])
    else setSelectedTxIds(allAutomaticIds)
  }

  const toggleSelection = (id: string) => {
    setSelectedTxIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  // Month names in Portuguese
  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]

  // KPI Calculations for Term Debts (A Prazo)
  const termKpis = useMemo(() => {
    let mesFuncionarios = 0
    let mesClientes = 0
    let geralFuncionarios = 0
    let geralClientes = 0

    pendingTerms.forEach((item) => {
      const amt = Number(item.amount || 0)
      if (item.isEmployeeVale || (item.payment_method || '').toUpperCase().includes('FUNCIONARIO')) {
        mesFuncionarios += amt
      } else {
        mesClientes += amt
      }
    })

    allPendingTerms.forEach((item) => {
      const amt = Number(item.amount || 0)
      if (item.isEmployeeVale || (item.payment_method || '').toUpperCase().includes('FUNCIONARIO')) {
        geralFuncionarios += amt
      } else {
        geralClientes += amt
      }
    })

    return {
      mesTotal: mesFuncionarios + mesClientes,
      mesFuncionarios,
      mesClientes,
      geralTotal: geralFuncionarios + geralClientes,
      geralFuncionarios,
      geralClientes,
    }
  }, [pendingTerms, allPendingTerms])

  // Filtered term items by search
  const filteredPendingTerms = useMemo(() => {
    if (!termSearchQuery.trim()) return pendingTerms
    const q = termSearchQuery.toLowerCase()
    return pendingTerms.filter(
      (item) =>
        (item.description || '').toLowerCase().includes(q) ||
        (item.employeeName || '').toLowerCase().includes(q) ||
        (item.payment_method || '').toLowerCase().includes(q),
    )
  }, [pendingTerms, termSearchQuery])

  return (
    <>
      <Helmet title="Recebíveis & Liquidações" />

      <div className="mx-auto max-w-7xl space-y-4 pb-8 text-slate-900 dark:text-slate-100">
        {/* HEADER PRINCIPAL COM SELETOR DE MÊS */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Recebíveis & Liquidações
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Gestão de recebimentos de cartões, liquidações de adquirentes e controle de contas a prazo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <MonthPicker date={selectedMonthDate} setDate={setSelectedMonthDate} />

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-bold"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['settlements-cards'] })
                queryClient.invalidateQueries({ queryKey: ['pending-settlements-cards'] })
                queryClient.invalidateQueries({ queryKey: ['pending-settlements-cards-all'] })
                queryClient.invalidateQueries({ queryKey: ['pending-settlements-terms'] })
                queryClient.invalidateQueries({ queryKey: ['pending-settlements-terms-all'] })
                queryClient.invalidateQueries({ queryKey: ['settlements-terms'] })
                toast.success('Dados atualizados com sucesso!')
              }}
            >
              <RefreshCw size={14} />
              <span>Atualizar</span>
            </Button>
          </div>
        </div>

        {/* 4 ABAS DA TELA DE RECEBÍVEIS */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <TabsTrigger
              value="automatic"
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-blue-400"
            >
              <CreditCard size={15} />
              <span>Cartões à Receber</span>
            </TabsTrigger>

            <TabsTrigger
              value="card_history"
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-emerald-400"
            >
              <CheckCircle2 size={15} />
              <span>Cartões Recebidos</span>
            </TabsTrigger>

            <TabsTrigger
              value="term"
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-orange-400"
            >
              <Users size={15} />
              <span>A Prazo a Receber</span>
            </TabsTrigger>

            <TabsTrigger
              value="term_history"
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-purple-400"
            >
              <Banknote size={15} />
              <span>A Prazo Recebidos</span>
            </TabsTrigger>
          </TabsList>

          {/* ========================================================================= */}
          {/* ABA 1: CARTÕES À RECEBER */}
          {/* ========================================================================= */}
          <TabsContent value="automatic" className="space-y-4">
            {/* CARDS DE KPIS */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50/80 to-white p-4 shadow-xs dark:border-blue-900/40 dark:from-slate-900 dark:to-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    A Receber em {monthNames[selectedMonth - 1]}
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                    <CreditCard size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-blue-950 dark:text-blue-100">
                  {pendingCardsSummary.totalNet.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-slate-500 border-t border-blue-100 pt-1 dark:border-slate-800">
                  <span>Bruto: {pendingCardsSummary.totalGross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  <span>{pendingCardsSummary.count} lançamentos</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total Futuro em Aberto (Geral)
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                    <Wallet size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {totalAllPendingCardsNet.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-slate-500 border-t border-slate-100 pt-1 dark:border-slate-800">
                  <span>Bruto Total: {totalAllPendingCardsGross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  <span>Todos os Meses</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Taxas MDR Retidas ({monthNames[selectedMonth - 1]})
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                    <Percent size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                  - {pendingCardsSummary.totalFees.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <span className="mt-1 block text-[11px] font-semibold text-slate-500 border-t border-slate-100 pt-1 dark:border-slate-800">
                  Retenção Stone / PagBank
                </span>
              </div>
            </div>

            {/* BARRA DE AÇÕES DA TABELA */}
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center rounded-2xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Select
                  value={`${sortFieldPendingCard}-${sortDirPendingCard}`}
                  onValueChange={(val) => {
                    const [field, dir] = val.split('-')
                    setSortFieldPendingCard(field)
                    setSortDirPendingCard(dir)
                  }}
                >
                  <SelectTrigger className="w-[210px] rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-950">
                    <SelectValue placeholder="Ordenar por..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="data_vencimento-asc">Vencimento (Próximos)</SelectItem>
                    <SelectItem value="data_vencimento-desc">Vencimento (Distantes)</SelectItem>
                    <SelectItem value="amount-desc">Maior Valor</SelectItem>
                    <SelectItem value="amount-asc">Menor Valor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setTriggerModalOpen(true)}
                  className="gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 active:scale-95"
                >
                  <Rocket size={14} />
                  <span>
                    {selectedTxIds.length > 0
                      ? `Adiantar ${selectedTxIds.length} Selecionados`
                      : 'Adiantar Liquidações de Hoje'}
                  </span>
                </Button>
              </div>
            </div>

            {/* TABELA DE CARTÕES A RECEBER */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-950">
                  <TableRow>
                    <TableHead className="w-[50px] text-center">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        disabled={pendingCards.length === 0}
                      />
                    </TableHead>
                    <TableHead className="text-xs font-black uppercase">Vencimento Previsto</TableHead>
                    <TableHead className="text-xs font-black uppercase">Venda / Descrição</TableHead>
                    <TableHead className="text-xs font-black uppercase">Forma / Bandeira</TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">Bruto (R$)</TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">Taxa MDR</TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">Líquido a Receber</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingPendingCards ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-28 text-center text-xs font-bold text-slate-500">
                        Carregando recebíveis de cartões...
                      </TableCell>
                    </TableRow>
                  ) : pendingCards.length > 0 ? (
                    pendingCards.map((tx) => {
                      const taxPerc = tx.interest || 0
                      const bruto = tx.totalValue || tx.amount
                      const liquido = tx.amount

                      return (
                        <TableRow key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                          <TableCell className="text-center">
                            <Checkbox
                              checked={selectedTxIds.includes(tx.id)}
                              onCheckedChange={() => toggleSelection(tx.id)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                            {format(new Date(tx.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {tx.description}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {tx.payment_method}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-medium text-slate-600 dark:text-slate-400">
                            {bruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-red-500">
                            {taxPerc}%
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                            {liquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-28 text-center text-xs font-semibold text-slate-400">
                        Nenhum cartão ou voucher aguardando liquidação para o mês de {monthNames[selectedMonth - 1]}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {pendingCardsResult?.meta && pendingCardsResult.meta.totalPages > 1 && (
              <Pagination
                pageIndex={pendingCardPageIndex}
                totalCount={pendingCardsResult.meta.total}
                perPage={pendingCardsResult.meta.limit}
                onPageChange={setPendingCardPageIndex}
              />
            )}
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 2: CARTÕES RECEBIDOS (SEPARADOS POR MÊS) */}
          {/* ========================================================================= */}
          <TabsContent value="card_history" className="space-y-4">
            {/* CARDS DE KPIS DO MÊS */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 to-white p-4 shadow-xs dark:border-emerald-900/40 dark:from-slate-900 dark:to-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Líquido Depositado ({monthNames[selectedMonth - 1]})
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    <CheckCircle2 size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-emerald-950 dark:text-emerald-300">
                  {receivedCardsSummary.totalNet.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <span className="mt-1 block text-[11px] font-semibold text-slate-500 border-t border-emerald-100 pt-1 dark:border-slate-800">
                  Saldo Real Efetivado
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Bruto Original Faturado
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                    <Wallet size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {receivedCardsSummary.totalGross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <span className="mt-1 block text-[11px] font-semibold text-slate-500 border-t border-slate-100 pt-1 dark:border-slate-800">
                  Valor de Venda no Balcão
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Taxas MDR Descontadas
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                    <Percent size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                  - {receivedCardsSummary.totalFees.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <span className="mt-1 block text-[11px] font-semibold text-slate-500 border-t border-slate-100 pt-1 dark:border-slate-800">
                  Retenção das Maquininhas
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Liquidações no Mês
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400">
                    <CheckCircle2 size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {receivedCardsSummary.count}
                </p>
                <span className="mt-1 block text-[11px] font-semibold text-slate-500 border-t border-slate-100 pt-1 dark:border-slate-800">
                  Lotes Efetivados no Banco
                </span>
              </div>
            </div>

            {/* TABELA DE HISTÓRICO DE CARTÕES */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-950">
                  <TableRow>
                    <TableHead className="text-xs font-black uppercase">Data da Baixa</TableHead>
                    <TableHead className="text-xs font-black uppercase">Data da Venda</TableHead>
                    <TableHead className="text-xs font-black uppercase">Descrição / Maquininha</TableHead>
                    <TableHead className="text-xs font-black uppercase">Conta Destino</TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">Bruto Original</TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">Líquido Depositado</TableHead>
                    <TableHead className="w-[80px] text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingReceivedCards ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-28 text-center text-xs font-bold text-slate-500">
                        Carregando histórico de liquidações...
                      </TableCell>
                    </TableRow>
                  ) : receivedCards && receivedCards.length > 0 ? (
                    receivedCards.map((settlement) => (
                      <TableRow key={settlement.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                        <TableCell className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {format(new Date(settlement.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-medium text-slate-500">
                          {format(new Date(settlement.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {settlement.description || 'Liquidação'}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {settlement.accounts?.name || 'Conta Padrão'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-medium text-slate-600 dark:text-slate-400">
                          {(settlement.totalValue || settlement.amount).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                          {settlement.amount.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </TableCell>
                        <TableCell className="text-center">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-orange-500 hover:bg-orange-50 hover:text-orange-600"
                                title="Desfazer e voltar para pendentes"
                              >
                                <Undo2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-3xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reverter liquidação?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação marcará esta transação como Pendente novamente, e ela sairá dos relatórios de saldo atual.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => revert({ id: settlement.id })}
                                  className="rounded-xl bg-orange-500 font-bold hover:bg-orange-600"
                                >
                                  Sim, Reverter
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-28 text-center text-xs font-semibold text-slate-400">
                        Nenhuma liquidação de cartão efetivada em {monthNames[selectedMonth - 1]} de {selectedYear}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {receivedCardsResult?.meta && receivedCardsResult.meta.totalPages > 1 && (
              <Pagination
                pageIndex={receivedCardPageIndex}
                totalCount={receivedCardsResult.meta.total}
                perPage={receivedCardsResult.meta.limit}
                onPageChange={setReceivedCardPageIndex}
              />
            )}
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 3: A PRAZO A RECEBER (CLIENTES E FUNCIONÁRIOS) */}
          {/* ========================================================================= */}
          <TabsContent value="term" className="space-y-4">
            {/* CARDS DE KPIS DE A PRAZO */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-orange-200/70 bg-gradient-to-br from-orange-50/80 to-white p-4 shadow-xs dark:border-orange-900/40 dark:from-slate-900 dark:to-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 dark:text-orange-400">
                    A Prazo no Mês ({monthNames[selectedMonth - 1]})
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                    <Users size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-orange-950 dark:text-orange-100">
                  {termKpis.mesTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-slate-500 border-t border-orange-100 pt-1 dark:border-slate-800">
                  <span>{pendingTerms.length} débitos</span>
                  <span>{monthNames[selectedMonth - 1]}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Débitos: Funcionários (Vales)
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                    <User size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {termKpis.mesFuncionarios.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <span className="mt-1 block text-[11px] font-semibold text-slate-500 border-t border-slate-100 pt-1 dark:border-slate-800">
                  Consumos em Folha no Mês
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Débitos: Clientes (Fiado/Permuta)
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                    <Users size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {termKpis.mesClientes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <span className="mt-1 block text-[11px] font-semibold text-slate-500 border-t border-slate-100 pt-1 dark:border-slate-800">
                  Contas de Clientes no Mês
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total Geral em Aberto
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                    <Wallet size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400">
                  {termKpis.geralTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <span className="mt-1 block text-[11px] font-semibold text-slate-500 border-t border-slate-100 pt-1 dark:border-slate-800">
                  Acumulado de Todos os Meses
                </span>
              </div>
            </div>

            {/* BARRA DE AÇÕES: RELATÓRIO PDF + BUSCA */}
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center rounded-2xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="relative flex-1 max-w-md">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente, funcionário ou descrição..."
                  value={termSearchQuery}
                  onChange={(e) => setTermSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-semibold text-slate-800 outline-none transition-all focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setReportModalOpen(true)}
                  className="gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-black uppercase text-white shadow-md shadow-orange-600/25 hover:bg-orange-700 active:scale-95"
                >
                  <FileText size={14} />
                  <span>Relatório / Cobrança em PDF</span>
                </Button>
              </div>
            </div>

            {/* TABELA DE A PRAZO A RECEBER */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-950">
                  <TableRow>
                    <TableHead className="text-xs font-black uppercase">Data / Vencimento</TableHead>
                    <TableHead className="text-xs font-black uppercase">Devedor / Nome</TableHead>
                    <TableHead className="text-xs font-black uppercase">Categoria / Tipo</TableHead>
                    <TableHead className="text-xs font-black uppercase">Descrição / Turno</TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">Valor a Receber</TableHead>
                    <TableHead className="w-[140px] text-center text-xs font-black uppercase">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingPendingTerms ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-xs font-bold text-slate-500">
                        Carregando débitos a prazo...
                      </TableCell>
                    </TableRow>
                  ) : filteredPendingTerms.length > 0 ? (
                    filteredPendingTerms.map((tx) => {
                      const isEmployee = tx.isEmployeeVale || (tx.payment_method || '').toUpperCase().includes('FUNCIONARIO')
                      let personName = tx.employeeName || ''
                      if (!personName) {
                        const match = tx.description?.match(/:s*([^[]+)/) || tx.description?.match(/-s*([^-]+)$/)
                        personName = match ? match[1].trim() : 'Cliente'
                      }

                      return (
                        <TableRow key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                          <TableCell className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                            {format(new Date(tx.data_vencimento || tx.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {personName}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                                isEmployee
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                                  : tx.payment_method === 'PERMUTA'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400'
                                  : 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400'
                              }`}
                            >
                              {isEmployee ? 'Funcionário' : tx.payment_method === 'PERMUTA' ? 'Permuta' : 'Cliente A Prazo'}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {tx.description}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                            {tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              className="gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-black uppercase text-white shadow-xs hover:bg-emerald-700"
                              onClick={() => {
                                setSelectedTermTx(tx)
                                setTermModalOpen(true)
                              }}
                            >
                              <CheckCircle2 size={13} />
                              <span>Receber</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-xs font-semibold text-slate-400">
                        Nenhum débito a prazo de clientes ou funcionários encontrado em {monthNames[selectedMonth - 1]}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 4: A PRAZO RECEBIDOS (HISTÓRICO MENSAL) */}
          {/* ========================================================================= */}
          <TabsContent value="term_history" className="space-y-4">
            {/* CARDS DE KPIS */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-purple-200/70 bg-gradient-to-br from-purple-50/80 to-white p-4 shadow-xs dark:border-purple-900/40 dark:from-slate-900 dark:to-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400">
                    Total Acertado / Baixado ({monthNames[selectedMonth - 1]})
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                    <CheckCircle2 size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-purple-950 dark:text-purple-100">
                  {receivedTermsSummary.totalGross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-slate-500 border-t border-purple-100 pt-1 dark:border-slate-800">
                  <span>{receivedTermsSummary.count} acertos realizados</span>
                  <span>{monthNames[selectedMonth - 1]}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Recebidos de Clientes
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    <Wallet size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  {receivedTermsSummary.totalNet.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <span className="mt-1 block text-[11px] font-semibold text-slate-500 border-t border-slate-100 pt-1 dark:border-slate-800">
                  Acertos Depositados no Mês
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Status das Baixas
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400">
                    <Banknote size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  100% Conciliado
                </p>
                <span className="mt-1 block text-[11px] font-semibold text-slate-500 border-t border-slate-100 pt-1 dark:border-slate-800">
                  Integrado com Contas Bancárias
                </span>
              </div>
            </div>

            {/* TABELA DE A PRAZO RECEBIDOS */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-950">
                  <TableRow>
                    <TableHead className="text-xs font-black uppercase">Data da Baixa</TableHead>
                    <TableHead className="text-xs font-black uppercase">Descrição / Acerto</TableHead>
                    <TableHead className="text-xs font-black uppercase">Forma Recebida</TableHead>
                    <TableHead className="text-xs font-black uppercase">Conta Destino</TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">Valor Recebido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingReceivedTerms ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-28 text-center text-xs font-bold text-slate-500">
                        Carregando histórico de acertos...
                      </TableCell>
                    </TableRow>
                  ) : receivedTerms && receivedTerms.length > 0 ? (
                    receivedTerms.map((settlement) => (
                      <TableRow key={settlement.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                        <TableCell className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {format(new Date(settlement.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {settlement.description || 'Acerto de Conta'}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {settlement.payment_method || 'Acerto'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {settlement.accounts?.name || 'Caixa Central'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                          {settlement.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-28 text-center text-xs font-semibold text-slate-400">
                        Nenhum acerto de contas a prazo registrado em {monthNames[selectedMonth - 1]} de {selectedYear}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {receivedTermsResult?.meta && receivedTermsResult.meta.totalPages > 1 && (
              <Pagination
                pageIndex={receivedTermPageIndex}
                totalCount={receivedTermsResult.meta.total}
                perPage={receivedTermsResult.meta.limit}
                onPageChange={setReceivedTermPageIndex}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADIANTAR LIQUIDAÇÕES DE CARTÕES */}
      {/* ========================================================================= */}
      <Dialog open={triggerModalOpen} onOpenChange={setTriggerModalOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                <Rocket size={16} />
              </div>
              <span className="text-base font-black">
                {selectedTxIds.length > 0
                  ? `Adiantar ${selectedTxIds.length} Liquidações`
                  : 'Liquidações Pendentes de Hoje'}
              </span>
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs leading-relaxed text-slate-500">
              {selectedTxIds.length > 0
                ? 'Ao confirmar, os lotes selecionados serão creditados no saldo da conta de destino imediatamente.'
                : 'O sistema efetivará a entrada do dinheiro líquido nos saldos bancários para os cartões vencidos até hoje.'}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-2.5">
            <Button
              onClick={() => triggerSettlement(selectedTxIds.length > 0 ? selectedTxIds : undefined)}
              disabled={isTriggering}
              className="h-11 w-full gap-2 rounded-xl bg-blue-600 text-xs font-black uppercase text-white shadow-md shadow-blue-600/25 hover:bg-blue-700"
            >
              {isTriggering ? (
                'Processando...'
              ) : (
                <>
                  <Rocket size={15} />
                  <span>Confirmar Liquidação</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setTriggerModalOpen(false)}
              disabled={isTriggering}
              className="rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: RECEBER / DAR BAIXA EM A PRAZO OU PERMUTA */}
      {/* ========================================================================= */}
      <Dialog
        open={termModalOpen}
        onOpenChange={(open) => {
          setTermModalOpen(open)
          if (!open) setSelectedTermTx(null)
        }}
      >
        <DialogContent className="sm:max-w-[460px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black text-emerald-700 dark:text-emerald-400">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <CheckCircle2 size={18} />
              </div>
              <span>Acerto de Débito A Prazo</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registrar o recebimento em dinheiro/conta ou dar baixa por permuta/perdão.
            </DialogDescription>
          </DialogHeader>

          {selectedTermTx && (
            <div className="flex flex-col gap-4 py-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Referência do Débito
                </p>
                <p className="mt-1 text-xs font-bold text-slate-900 dark:text-slate-100">
                  {selectedTermTx.description}
                </p>
                <div className="mt-3 flex items-end justify-between border-t border-slate-200/60 pt-2 dark:border-slate-800">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-500">Valor Total</p>
                    <p className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {selectedTermTx.amount.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </p>
                  </div>
                  <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                    Pendente
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="mb-1 block text-xs font-black uppercase text-slate-500">
                    Forma de Pagamento Recebida
                  </Label>
                  <Select value={actualMethod} onValueChange={setActualMethod}>
                    <SelectTrigger className="rounded-xl text-xs font-bold bg-white dark:bg-slate-950">
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PIX">⚡ Pix</SelectItem>
                      <SelectItem value="DINHEIRO">💵 Dinheiro Vivo</SelectItem>
                      <SelectItem value="CARTÃO DE CRÉDITO">💳 Cartão de Crédito</SelectItem>
                      <SelectItem value="CARTÃO DE DÉBITO">💳 Cartão de Débito</SelectItem>
                      <SelectItem value="TRANSFERÊNCIA">🏦 Transferência Bancária</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-1 block text-xs font-black uppercase text-slate-500">
                    Conta Bancária de Destino
                  </Label>
                  <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                    <SelectTrigger className="rounded-xl text-xs font-bold bg-white dark:bg-slate-950">
                      <SelectValue placeholder="Selecione a conta destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        ?.filter((a) => !a.is_transit)
                        .map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-2">
                <Button
                  onClick={() => handleSettleTerm(false)}
                  disabled={!targetAccountId || isSettlingTerm}
                  className="h-11 w-full gap-1.5 rounded-xl bg-emerald-600 text-xs font-black uppercase text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700"
                >
                  {isSettlingTerm ? 'Processando...' : 'Confirmar Recebimento (Gerar Saldo)'}
                </Button>

                <div className="relative my-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black">
                    <span className="bg-white px-2 text-slate-400 dark:bg-slate-900">Ou</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => handleSettleTerm(true)}
                  disabled={isSettlingTerm}
                  className="w-full rounded-xl border-orange-200 text-xs font-black uppercase text-orange-700 hover:bg-orange-50 dark:border-orange-900/50 dark:text-orange-400"
                  title="Remove da lista sem somar dinheiro real no saldo da empresa"
                >
                  Baixar Sem Gerar Saldo (Permuta / Perdão)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: GERAR RELATÓRIO / COBRANÇA EM PDF (A PRAZO) */}
      {/* ========================================================================= */}
      <TermReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        currentMonthDate={selectedMonthDate}
        pendingItems={allPendingTerms}
        clients={clients}
        employees={employees}
      />
    </>
  )
}
