import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, differenceInCalendarDays } from 'date-fns'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  FileText,
  Layers,
  List,
  MessageCircle,
  Percent,
  Printer,
  RefreshCw,
  Rocket,
  Search,
  Undo2,
  UserCheck,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { toast } from 'sonner'

import { getAccounts } from '@/api/get-accounts'
import { getClients } from '@/api/get-clients'
import { getPendingSettlements } from '@/api/get-pending-settlements'
import { getSettlements } from '@/api/get-settlements'
import { getEmployees } from '@/api/hr/employees'
import { revertSettlement } from '@/api/revert-settlement'
import { MonthPicker } from '@/components/MonthPicker'
import { PageHeader } from '@/components/page-header'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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

import { ClientSettleModal } from './components/client-settle-modal'
import { EmployeeTermPdfModal } from './components/employee-term-pdf-modal'
import { TermReportModal } from './components/term-report-modal'

export function Settlements() {
  const queryClient = useQueryClient()

  // Selected Month (Default: current month)
  const [selectedMonthDate, setSelectedMonthDate] = useState<Date>(new Date())
  const selectedMonth = selectedMonthDate.getMonth() + 1
  const selectedYear = selectedMonthDate.getFullYear()

  const [activeTab, setActiveTab] = useState<string>('automatic')

  // Pagination per tab
  const [pendingCardPageIndex] = useState(0)
  const [receivedCardPageIndex] = useState(0)
  const [pendingTermPageIndex] = useState(0)

  // Modals state
  const [triggerModalOpen, setTriggerModalOpen] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)

  // Client Settle Modal State
  const [clientModalTarget, setClientModalTarget] = useState<{
    clientName: string
    transactions: any[]
  } | null>(null)
  const [clientModalOpen, setClientModalOpen] = useState(false)

  // Employee PDF Modal State
  const [employeeModalTarget, setEmployeeModalTarget] = useState<{
    id: string
    name: string
    department?: string
    role?: string
    items: any[]
    totalAmount: number
  } | null>(null)
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false)

  // Multi-selection for cards
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([])

  // Filters: Cards
  const [cardSearchQuery, setCardSearchQuery] = useState('')
  const [cardAcquirerFilter, setCardAcquirerFilter] = useState('all')
  const [cardDueFilter, setCardDueFilter] = useState('all')

  // Filters: Clients (Term)
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [clientTypeFilter, setClientTypeFilter] = useState('all')
  const [clientStatusFilter, setClientStatusFilter] = useState('all')
  const [clientSortBy, setClientSortBy] = useState<'amount_desc' | 'due_asc' | 'name_asc'>('amount_desc')
  const [clientViewMode, setClientViewMode] = useState<'grouped' | 'list'>('grouped')
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({})

  // Filters: Employees
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('')
  const [employeeDeptFilter, setEmployeeDeptFilter] = useState('all')

  // 1. Query: Cartões à Receber no Mês Selecionado
  const { data: pendingCardsResult, isLoading: isLoadingPendingCards } = useQuery({
    queryKey: [
      'pending-settlements-cards',
      pendingCardPageIndex,
      selectedMonth,
      selectedYear,
    ],
    queryFn: () =>
      getPendingSettlements({
        pageIndex: pendingCardPageIndex,
        sortBy: 'data_vencimento',
        sortDir: 'asc',
        month: selectedMonth,
        year: selectedYear,
        type: 'automatic',
      }),
  })
  const rawPendingCards = pendingCardsResult?.data || []
  const pendingCards = useMemo(() => {
    let list = [...rawPendingCards]
    if (cardSearchQuery.trim()) {
      const q = cardSearchQuery.toLowerCase()
      list = list.filter((tx: any) =>
        (tx.description || '').toLowerCase().includes(q) ||
        (tx.payment_method || '').toLowerCase().includes(q) ||
        ((tx as any).accounts?.name || '').toLowerCase().includes(q)
      )
    }
    if (cardAcquirerFilter !== 'all') {
      const acq = cardAcquirerFilter.toLowerCase()
      list = list.filter((tx: any) =>
        (tx.description || '').toLowerCase().includes(acq) ||
        (tx.payment_method || '').toLowerCase().includes(acq)
      )
    }
    if (cardDueFilter === 'today') {
      const todayStr = format(new Date(), 'yyyy-MM-dd')
      list = list.filter((tx: any) => format(new Date(tx.data_vencimento), 'yyyy-MM-dd') <= todayStr)
    } else if (cardDueFilter === '7days') {
      list = list.filter((tx: any) => {
        const d = differenceInCalendarDays(new Date(tx.data_vencimento), new Date())
        return d >= 0 && d <= 7
      })
    } else if (cardDueFilter === '15days') {
      list = list.filter((tx: any) => {
        const d = differenceInCalendarDays(new Date(tx.data_vencimento), new Date())
        return d >= 0 && d <= 15
      })
    }
    return list
  }, [rawPendingCards, cardSearchQuery, cardAcquirerFilter, cardDueFilter])
  const pendingCardsSummary = pendingCardsResult?.summary || {
    totalGross: 0,
    totalNet: 0,
    totalFees: 0,
    count: 0,
  }

  // 2. Query: Cartões Liquidados no Mês
  const { data: receivedCardsResult, isLoading: isLoadingReceivedCards } = useQuery({
    queryKey: [
      'settlements-cards',
      receivedCardPageIndex,
      selectedMonth,
      selectedYear,
    ],
    queryFn: () =>
      getSettlements({
        pageIndex: receivedCardPageIndex,
        sortBy: 'data_vencimento',
        sortDir: 'desc',
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

  // 3. Query: A Prazo a Receber (Clientes e Funcionários) no Mês
  const { data: pendingTermsResult, isLoading: isLoadingPendingTerms } = useQuery({
    queryKey: [
      'pending-settlements-terms',
      selectedMonth,
      selectedYear,
      pendingTermPageIndex,
    ],
    queryFn: () =>
      getPendingSettlements({
        pageIndex: pendingTermPageIndex,
        month: selectedMonth,
        year: selectedYear,
        type: 'term',
      }),
  })
  const pendingTerms = pendingTermsResult?.data || []

  // 4. Query: A Prazo a Receber GERAL (Todos os débitos em aberto para o modal de relatório)
  const { data: allPendingTermsResult } = useQuery({
    queryKey: ['pending-settlements-terms-all'],
    queryFn: () =>
      getPendingSettlements({
        type: 'term',
      }),
  })
  const allPendingTerms = allPendingTermsResult?.data || []

  // Auxiliary data: Contas, Clientes e Funcionários
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
  })
  const accounts: any[] = (accountsData as any) || []

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
  })
  const clients =
    (clientsData as any)?.clients ||
    (Array.isArray(clientsData) ? clientsData : [])

  const { data: employeesData } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => getEmployees({ limit: 1000 }),
  })
  const employees =
    (employeesData as any)?.employees ||
    (Array.isArray(employeesData) ? employeesData : [])

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
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Erro ao reverter liquidação.'),
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
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['finance-metrics'] })
      setTriggerModalOpen(false)
      setSelectedTxIds([])
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Erro ao processar liquidações.'),
  })

  // Multi-select for card settlements
  const allCardIds = pendingCards.map((t) => t.id)
  const isAllCardsSelected =
    allCardIds.length > 0 && selectedTxIds.length === allCardIds.length

  const handleSelectAllCards = () => {
    if (isAllCardsSelected) setSelectedTxIds([])
    else setSelectedTxIds(allCardIds)
  }

  const toggleCardSelection = (id: string) => {
    setSelectedTxIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  // Selected cards financial summary
  const selectedCardsSummary = useMemo(() => {
    if (!selectedTxIds.length) {
      return { count: 0, gross: 0, net: 0, fees: 0, items: [] as typeof pendingCards }
    }
    const map = new Map<string, (typeof pendingCards)[0]>()
    pendingCards.forEach((item) => map.set(item.id, item))

    const selectedItems: typeof pendingCards = []
    let gross = 0
    let net = 0
    let fees = 0

    selectedTxIds.forEach((id) => {
      const tx = map.get(id)
      if (tx) {
        selectedItems.push(tx)
        const b = Number(tx.amount || 0)
        const n = Number(tx.totalValue ?? tx.amount ?? 0)
        const f = Math.max(0, b - n)

        gross += b
        net += n
        fees += f
      }
    })

    return { count: selectedTxIds.length, gross, net, fees, items: selectedItems }
  }, [selectedTxIds, pendingCards])

  // Month names
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]

  // Separação dos Débitos de Term: Clientes vs Funcionários
  const { clientDebts, employeeDebts, termSummary } = useMemo(() => {
    const clientsList: any[] = []
    const employeesList: any[] = []
    let clientTotal = 0
    let employeeTotal = 0

    pendingTerms.forEach((item) => {
      const amt = Number(item.amount || 0)
      const isEmployee =
        item.isEmployeeVale ||
        (item.payment_method || '').toUpperCase().includes('FUNCIONARIO')

      if (isEmployee) {
        employeesList.push(item)
        employeeTotal += amt
      } else {
        clientsList.push(item)
        clientTotal += amt
      }
    })

    return {
      clientDebts: clientsList,
      employeeDebts: employeesList,
      termSummary: {
        clientTotal,
        employeeTotal,
        total: clientTotal + employeeTotal,
      },
    }
  }, [pendingTerms])

  // Agrupamento de Clientes A Prazo
  const groupedClients = useMemo(() => {
    const map = new Map<string, { clientName: string; phone?: string; items: any[]; totalAmount: number; hasOverdue: boolean }>()

    clientDebts.forEach((tx) => {
      let name = tx.client?.name || ''
      if (!name) {
        const match = tx.description?.match(/:\s*([^[]+)/) || tx.description?.match(/-\s*([^-]+)$/)
        name = match ? match[1].trim() : 'Cliente'
      }

      const clientObj = clients.find((c: any) => c.name?.toLowerCase() === name.toLowerCase())
      const phone = clientObj?.phone || clientObj?.cellphone || ''

      const isOverdue = format(new Date(tx.data_vencimento || tx.data_emissao), 'yyyy-MM-dd') < format(new Date(), 'yyyy-MM-dd')

      const current = map.get(name) || {
        clientName: name,
        phone,
        items: [] as any[],
        totalAmount: 0,
        hasOverdue: false,
      }

      current.items.push(tx)
      current.totalAmount += Number(tx.amount || 0)
      if (isOverdue) current.hasOverdue = true

      map.set(name, current)
    })

    let list = Array.from(map.values())

    // Filtro por busca
    if (clientSearchQuery.trim()) {
      const q = clientSearchQuery.toLowerCase()
      list = list.filter((c) =>
        c.clientName.toLowerCase().includes(q) ||
        c.items.some((i) => (i.description || '').toLowerCase().includes(q))
      )
    }

    // Filtro por Status
    if (clientStatusFilter === 'overdue') {
      list = list.filter((c) => c.hasOverdue)
    } else if (clientStatusFilter === 'today') {
      const todayStr = format(new Date(), 'yyyy-MM-dd')
      list = list.filter((c) =>
        c.items.some((i) => format(new Date(i.data_vencimento || i.data_emissao), 'yyyy-MM-dd') === todayStr)
      )
    }

    // Ordenação
    if (clientSortBy === 'amount_desc') {
      list.sort((a, b) => b.totalAmount - a.totalAmount)
    } else if (clientSortBy === 'name_asc') {
      list.sort((a, b) => a.clientName.localeCompare(b.clientName))
    }

    return list
  }, [clientDebts, clients, clientSearchQuery, clientStatusFilter, clientSortBy])

  // Filtragem de Lista Plana de Clientes A Prazo
  const filteredClientRows = useMemo(() => {
    let list = [...clientDebts]

    if (clientSearchQuery.trim()) {
      const q = clientSearchQuery.toLowerCase()
      list = list.filter((tx) => {
        const desc = (tx.description || '').toLowerCase()
        return desc.includes(q)
      })
    }

    if (clientTypeFilter !== 'all') {
      list = list.filter((tx) => {
        const method = (tx.payment_method || '').toUpperCase()
        if (clientTypeFilter === 'permuta') return method.includes('PERMUTA')
        if (clientTypeFilter === 'convenio') return method.includes('CONVENIO')
        return !method.includes('PERMUTA') && !method.includes('CONVENIO')
      })
    }

    return list
  }, [clientDebts, clientSearchQuery, clientTypeFilter])

  // Agrupamento de Funcionários (Vales)
  const groupedEmployees = useMemo(() => {
    const map = new Map<string, { id: string; name: string; department?: string; role?: string; items: any[]; totalAmount: number }>()

    employeeDebts.forEach((item) => {
      const empName = item.employeeName || 'Colaborador'
      const empId = item.employeeId || empName

      const empObj = employees.find((e: any) => e.id === empId || e.name?.toLowerCase() === empName.toLowerCase())

      const current = map.get(empName) || {
        id: empId,
        name: empName,
        department: empObj?.sector?.name || empObj?.department || 'Geral',
        role: empObj?.role || 'Colaborador',
        items: [] as any[],
        totalAmount: 0,
      }

      current.items.push(item)
      current.totalAmount += Number(item.amount || 0)
      map.set(empName, current)
    })

    let list = Array.from(map.values())

    if (employeeSearchQuery.trim()) {
      const q = employeeSearchQuery.toLowerCase()
      list = list.filter((e) =>
        e.name.toLowerCase().includes(q) ||
        (e.role || '').toLowerCase().includes(q) ||
        (e.department || '').toLowerCase().includes(q)
      )
    }

    if (employeeDeptFilter !== 'all') {
      list = list.filter((e) => e.department === employeeDeptFilter)
    }

    return list
  }, [employeeDebts, employees, employeeSearchQuery, employeeDeptFilter])

  // Gerador de Link do WhatsApp para Cobrança
  const handleOpenWhatsApp = (phone: string | undefined, clientName: string, amount: number) => {
    const cleanPhone = (phone || '').replace(/\D/g, '')
    const formattedAmount = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const text = encodeURIComponent(
      `Olá ${clientName}! Tudo bem? Passando para lembrar do seu saldo em aberto no valor de ${formattedAmount}. Caso queira a chave PIX ou acertar na sua próxima visita, estamos à disposição! Muito obrigado.`
    )
    const url = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${text}` : `https://api.whatsapp.com/send?text=${text}`
    window.open(url, '_blank')
  }

  const toggleClientExpanded = (clientName: string) => {
    setExpandedClients((prev) => ({
      ...prev,
      [clientName]: !prev[clientName],
    }))
  }

  return (
    <>
      <Helmet title="Recebíveis & Liquidações" />

      <div className="flex flex-col gap-5 px-4 font-manrope md:px-0">
        {/* HEADER PRINCIPAL PADRÃO COM SELETOR DE MÊS */}
        <PageHeader
          title="Recebíveis & Liquidações"
          description="Controle integrado de maquininhas de cartão, crediário de clientes e vales de colaboradores."
        >
          <div className="mb-4 flex w-full flex-row items-center justify-between gap-2 md:mb-0 md:w-auto md:justify-end md:gap-3">
            <MonthPicker
              date={selectedMonthDate}
              setDate={setSelectedMonthDate}
            />

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['settlements-cards'] })
                queryClient.invalidateQueries({ queryKey: ['pending-settlements-cards'] })
                queryClient.invalidateQueries({ queryKey: ['pending-settlements-terms'] })
                queryClient.invalidateQueries({ queryKey: ['pending-settlements-terms-all'] })
                queryClient.invalidateQueries({ queryKey: ['settlements-terms'] })
                toast.success('Dados atualizados com sucesso!')
              }}
            >
              <RefreshCw size={13} />
              <span>Atualizar</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setReportModalOpen(true)}
              className="gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-black uppercase text-white shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
            >
              <FileText size={14} />
              <span>Relatório PDF</span>
            </Button>
          </div>
        </PageHeader>

        {/* 4 CARDS DE KPIS CONSOLIDADOS */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Cartões a Receber */}
          <div className="rounded-2xl border border-blue-200/80 bg-white p-4 shadow-sm dark:border-blue-900/40 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Cartões a Receber no Mês
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <CreditCard size={15} />
              </div>
            </div>
            <p className="mt-2 font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              {pendingCardsSummary.totalNet.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Bruto: {pendingCardsSummary.totalGross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} • {pendingCardsSummary.count} lançamentos
            </p>
          </div>

          {/* Card 2: Taxas MDR Retidas */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Taxas MDR Retidas
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                <Percent size={15} />
              </div>
            </div>
            <p className="mt-2 font-mono text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
              - {pendingCardsSummary.totalFees.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Retenção Stone, PagBank e outras
            </p>
          </div>

          {/* Card 3: Clientes a Prazo */}
          <div className="rounded-2xl border border-purple-200/80 bg-white p-4 shadow-sm dark:border-purple-900/40 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400">
                Clientes a Prazo (Fiado)
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                <Users size={15} />
              </div>
            </div>
            <p className="mt-2 font-mono text-2xl font-black tracking-tight text-purple-950 dark:text-purple-100">
              {termSummary.clientTotal.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {groupedClients.length} clientes com débito em aberto
            </p>
          </div>

          {/* Card 4: Vales de Funcionários */}
          <div className="rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-sm dark:border-emerald-900/40 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Vales de Funcionários
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <UserCheck size={15} />
              </div>
            </div>
            <p className="mt-2 font-mono text-2xl font-black tracking-tight text-emerald-950 dark:text-emerald-300">
              {termSummary.employeeTotal.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {groupedEmployees.length} colaboradores com vales no ciclo
            </p>
          </div>
        </div>

        {/* 4 ABAS DA TELA DE RECEBÍVEIS */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full space-y-4"
        >
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl border border-slate-200/80 bg-slate-100 p-1.5 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4">
            <TabsTrigger
              value="automatic"
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-blue-400"
            >
              <CreditCard size={15} />
              <span>Cartões à Receber</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.2 text-[10px] font-black text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {pendingCards.length}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="card_history"
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-emerald-400"
            >
              <CheckCircle2 size={15} />
              <span>Cartões Liquidados</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {receivedCards.length}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="term"
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-purple-400"
            >
              <Users size={15} />
              <span>Clientes a Prazo</span>
              <span className="rounded-full bg-purple-100 px-2 py-0.2 text-[10px] font-black text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                {clientDebts.length} pendentes
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="employees"
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-emerald-400"
            >
              <UserCheck size={15} />
              <span>Vales de Funcionários</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {groupedEmployees.length} colaboradores
              </span>
            </TabsTrigger>
          </TabsList>

          {/* ========================================================================= */}
          {/* ABA 1: CARTÕES À RECEBER */}
          {/* ========================================================================= */}
          <TabsContent value="automatic" className="space-y-4">
            {/* BANNER FLUTUANTE DE SELEÇÃO EM LOTE */}
            {selectedTxIds.length > 0 && (
              <div className="flex flex-col gap-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/40 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      {selectedCardsSummary.count}
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-200">
                      Cartões Selecionados
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span>
                      Bruto:{' '}
                      <strong className="font-mono">
                        {selectedCardsSummary.gross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </strong>
                    </span>
                    <span>
                      Taxas MDR:{' '}
                      <strong className="font-mono text-red-500">
                        - {selectedCardsSummary.fees.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </strong>
                    </span>
                    <span className="rounded-xl border border-blue-200 bg-white px-3 py-1 font-bold text-emerald-600 dark:border-blue-800 dark:bg-slate-900 dark:text-emerald-400">
                      Líquido a Creditar:{' '}
                      <span className="font-mono text-sm font-black">
                        {selectedCardsSummary.net.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTxIds([])}
                    className="text-xs font-bold text-slate-500 hover:text-slate-900"
                  >
                    Limpar seleção
                  </Button>

                  <Button
                    onClick={() => setTriggerModalOpen(true)}
                    className="gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase text-white shadow-md shadow-blue-600/25 hover:bg-blue-700"
                  >
                    <Rocket size={14} />
                    <span>Adiantar / Liquidar Selecionados</span>
                  </Button>
                </div>
              </div>
            )}

            {/* BARRA DE FILTROS */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Filtrar por adquirente, bandeira ou conta destino..."
                  value={cardSearchQuery}
                  onChange={(e) => setCardSearchQuery(e.target.value)}
                  className="rounded-xl pl-9 text-xs font-semibold bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={cardAcquirerFilter} onValueChange={setCardAcquirerFilter}>
                  <SelectTrigger className="w-[160px] rounded-xl text-xs font-bold">
                    <SelectValue placeholder="Adquirente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Adquirentes</SelectItem>
                    <SelectItem value="stone">Stone</SelectItem>
                    <SelectItem value="pagbank">PagBank</SelectItem>
                    <SelectItem value="cielo">Cielo</SelectItem>
                    <SelectItem value="rede">Rede</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={cardDueFilter} onValueChange={setCardDueFilter}>
                  <SelectTrigger className="w-[180px] rounded-xl text-xs font-bold">
                    <SelectValue placeholder="Vencimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Vencimentos</SelectItem>
                    <SelectItem value="today">Vencidos ou Hoje</SelectItem>
                    <SelectItem value="7days">Próximos 7 dias</SelectItem>
                    <SelectItem value="15days">Próximos 15 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* TABELA DE CARTÕES A RECEBER */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-950">
                  <TableRow>
                    <TableHead className="w-[45px] text-center">
                      <Checkbox
                        checked={isAllCardsSelected}
                        onCheckedChange={handleSelectAllCards}
                      />
                    </TableHead>
                    <TableHead className="text-xs font-black uppercase">Vencimento Previsto</TableHead>
                    <TableHead className="text-xs font-black uppercase">Data da Venda</TableHead>
                    <TableHead className="text-xs font-black uppercase">Adquirente / Bandeira</TableHead>
                    <TableHead className="text-xs font-black uppercase">Conta Destino</TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">Valor Bruto</TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">Taxa MDR (%)</TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">Valor Líquido</TableHead>
                    <TableHead className="w-[110px] text-center text-xs font-black uppercase">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingPendingCards ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-28 text-center text-xs font-bold text-slate-500">
                        Carregando lançamentos de cartões...
                      </TableCell>
                    </TableRow>
                  ) : pendingCards.length > 0 ? (
                    pendingCards.map((tx) => {
                      const bruto = Number(tx.amount || 0)
                      const liquido = Number(tx.totalValue ?? tx.amount ?? 0)
                      const feeVal = Math.max(0, bruto - liquido)
                      const feePerc = bruto > 0 ? ((feeVal / bruto) * 100).toFixed(1) : '0.0'

                      const daysDiff = differenceInCalendarDays(new Date(tx.data_vencimento), new Date())
                      const isToday = daysDiff === 0
                      const isPast = daysDiff < 0

                      const isSelected = selectedTxIds.includes(tx.id)

                      return (
                        <TableRow key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                          <TableCell className="text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleCardSelection(tx.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                                {format(new Date(tx.data_vencimento), 'dd/MM/yyyy')}
                              </span>
                              {isToday && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                  Hoje
                                </span>
                              )}
                              {isPast && (
                                <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                  Atrasado
                                </span>
                              )}
                              {!isToday && !isPast && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  Em {daysDiff}d
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">
                            {format(new Date(tx.data_emissao), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                                {tx.payment_method || 'Cartão'}
                              </span>
                              <span className="truncate text-xs text-slate-600 dark:text-slate-400">
                                {tx.description?.replace(/\[DEST:[^\]]+\]/, '')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                            {(tx as any).accounts?.name || 'Conta Padrão'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {bruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                            {feePerc}% (-{feeVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                            {liquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => triggerSettlement([tx.id])}
                              disabled={isTriggering}
                              className="h-8 rounded-xl border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200"
                            >
                              Liquidar
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="h-28 text-center text-xs font-semibold text-slate-400">
                        Nenhum cartão pendente de liquidação para {monthNames[selectedMonth - 1]} de {selectedYear}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 2: CARTÕES LIQUIDADOS (HISTÓRICO) */}
          {/* ========================================================================= */}
          <TabsContent value="card_history" className="space-y-4">
            {/* MINI KPIS */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-900/40 dark:bg-slate-900">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Líquido Depositado ({monthNames[selectedMonth - 1]})
                </span>
                <p className="mt-2 font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {receivedCardsSummary.totalNet.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <span className="text-[11px] font-semibold text-slate-500">Saldo Real Efetivado</span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Bruto Original Faturado
                </span>
                <p className="mt-2 font-mono text-2xl font-black text-slate-900 dark:text-slate-100">
                  {receivedCardsSummary.totalGross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <span className="text-[11px] font-semibold text-slate-500">Valor de Balcão</span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Taxas MDR Descontadas
                </span>
                <p className="mt-2 font-mono text-2xl font-black text-amber-600 dark:text-amber-400">
                  - {receivedCardsSummary.totalFees.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <span className="text-[11px] font-semibold text-slate-500">Retenção de Adquirentes</span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Liquidações no Mês
                </span>
                <p className="mt-2 font-mono text-2xl font-black text-slate-900 dark:text-slate-100">
                  {receivedCardsSummary.count}
                </p>
                <span className="text-[11px] font-semibold text-slate-500">Lotes Efetivados no Banco</span>
              </div>
            </div>

            {/* TABELA DE HISTÓRICO */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-950">
                  <TableRow>
                    <TableHead className="text-xs font-black uppercase">Data da Baixa</TableHead>
                    <TableHead className="text-xs font-black uppercase">Data da Venda</TableHead>
                    <TableHead className="text-xs font-black uppercase">Descrição / Maquininha</TableHead>
                    <TableHead className="text-xs font-black uppercase">Conta Destino</TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">Bruto Original</TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">Taxa Descontada</TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">Líquido Depositado</TableHead>
                    <TableHead className="w-[80px] text-center text-xs font-black uppercase">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingReceivedCards ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-28 text-center text-xs font-bold text-slate-500">
                        Carregando histórico de liquidações...
                      </TableCell>
                    </TableRow>
                  ) : receivedCards.length > 0 ? (
                    receivedCards.map((settlement) => {
                      const bruto = Number(settlement.amount || settlement.totalValue || 0)
                      const liquido = Number(settlement.totalValue || settlement.amount || 0)
                      const taxa = Math.max(0, bruto - liquido)

                      return (
                        <TableRow key={settlement.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                          <TableCell className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {format(new Date(settlement.data_vencimento), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">
                            {format(new Date(settlement.data_emissao), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {settlement.description || 'Liquidação'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                            {settlement.accounts?.name || 'Conta Padrão'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                            {bruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                            - {taxa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                            {liquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                          <TableCell className="text-center">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-orange-500 hover:bg-orange-50"
                                  title="Estornar liquidação"
                                >
                                  <Undo2 size={14} />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-3xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Estornar liquidação?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação retornará este cartão para a lista de pendentes e estornará a conciliação.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => revert({ id: settlement.id })}
                                    className="rounded-xl bg-orange-500 font-bold hover:bg-orange-600"
                                  >
                                    Sim, Estornar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-28 text-center text-xs font-semibold text-slate-400">
                        Nenhuma liquidação de cartão efetivada em {monthNames[selectedMonth - 1]} de {selectedYear}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 3: CLIENTES A PRAZO (FIADO / CONVÊNIO / PERMUTA) */}
          {/* ========================================================================= */}
          <TabsContent value="term" className="space-y-4">
            {/* BANNER INFORMATIVO */}
            <div className="flex items-center gap-3 rounded-2xl border border-purple-200 bg-purple-50/50 p-3.5 text-xs text-purple-900 dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-300">
              <span className="text-lg">💡</span>
              <p>
                <strong>Gestão de Contas a Prazo & Fiado:</strong> Controle de comandas em aberto, convênios e permutas. Envie lembretes amigáveis via WhatsApp ou dê baixa com crédito imediato no saldo da empresa.
              </p>
            </div>

            {/* BARRA DE FILTROS & AÇÕES */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-md flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar por cliente, documento ou comanda..."
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  className="rounded-xl pl-9 text-xs font-semibold bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
                  <SelectTrigger className="w-[150px] rounded-xl text-xs font-bold">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="fiado">A Prazo / Fiado</SelectItem>
                    <SelectItem value="convenio">Convênio</SelectItem>
                    <SelectItem value="permuta">Permuta</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={clientStatusFilter} onValueChange={setClientStatusFilter}>
                  <SelectTrigger className="w-[150px] rounded-xl text-xs font-bold">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="overdue">Vencidos</SelectItem>
                    <SelectItem value="today">Vence Hoje</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={clientSortBy} onValueChange={(val: any) => setClientSortBy(val)}>
                  <SelectTrigger className="w-[160px] rounded-xl text-xs font-bold">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount_desc">Maior Dívida</SelectItem>
                    <SelectItem value="name_asc">Nome do Cliente (A-Z)</SelectItem>
                  </SelectContent>
                </Select>

                {/* Alternador de Visão */}
                <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setClientViewMode('grouped')}
                    className={`h-7 px-2.5 text-xs font-bold rounded-lg transition-all ${
                      clientViewMode === 'grouped'
                        ? 'bg-white text-purple-700 shadow-xs dark:bg-slate-800 dark:text-purple-300'
                        : 'text-slate-500'
                    }`}
                  >
                    <Layers size={13} className="mr-1" />
                    Agrupado
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setClientViewMode('list')}
                    className={`h-7 px-2.5 text-xs font-bold rounded-lg transition-all ${
                      clientViewMode === 'list'
                        ? 'bg-white text-purple-700 shadow-xs dark:bg-slate-800 dark:text-purple-300'
                        : 'text-slate-500'
                    }`}
                  >
                    <List size={13} className="mr-1" />
                    Comandas
                  </Button>
                </div>
              </div>
            </div>

            {/* VISÃO 1: AGRUPADA POR CLIENTE */}
            {clientViewMode === 'grouped' ? (
              <div className="space-y-3">
                {isLoadingPendingTerms ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                    Carregando débitos de clientes...
                  </div>
                ) : groupedClients.length > 0 ? (
                  groupedClients.map((client) => {
                    const isExpanded = expandedClients[client.clientName] || false
                    const initials = client.clientName
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()

                    return (
                      <div
                        key={client.clientName}
                        className="rounded-2xl border border-slate-200 bg-white shadow-xs transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                      >
                        {/* Header do Cliente */}
                        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-xs font-black text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                              {initials}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                                  {client.clientName}
                                </span>
                                {client.hasOverdue && (
                                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                    Vencido
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">
                                {client.items.length} {client.items.length === 1 ? 'comanda em aberto' : 'comandas em aberto'}
                                {client.phone && ` • ${client.phone}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <div className="text-right">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Saldo Total Devedor
                              </span>
                              <p className="font-mono text-base font-black text-slate-900 dark:text-slate-100">
                                {client.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setClientModalTarget({
                                    clientName: client.clientName,
                                    transactions: client.items,
                                  })
                                  setClientModalOpen(true)
                                }}
                                className="h-9 gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-black uppercase text-white shadow-xs hover:bg-emerald-700 active:scale-95"
                              >
                                <CheckCircle2 size={14} />
                                <span>Receber Tudo ({client.items.length})</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenWhatsApp(client.phone, client.clientName, client.totalAmount)}
                                className="h-9 gap-1 rounded-xl border-emerald-200 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400"
                                title="Enviar cobrança pelo WhatsApp"
                              >
                                <MessageCircle size={14} />
                                <span>WhatsApp</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleClientExpanded(client.clientName)}
                                className="h-9 w-9 rounded-xl p-0 text-slate-500"
                                title={isExpanded ? 'Recolher comandas' : 'Ver comandas'}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Accordion: Detalhe das Comandas do Cliente */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                            <Table>
                              <TableHeader>
                                <TableRow className="border-none text-[11px] font-bold text-slate-400">
                                  <TableHead>Data Compra</TableHead>
                                  <TableHead>Vencimento</TableHead>
                                  <TableHead>Descrição / Comanda</TableHead>
                                  <TableHead className="text-right">Valor</TableHead>
                                  <TableHead className="w-[120px] text-center">Ação</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {client.items.map((tx) => (
                                  <TableRow key={tx.id} className="border-slate-200/50 dark:border-slate-800/60">
                                    <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                                      {format(new Date(tx.data_emissao), 'dd/MM/yyyy')}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                                      {format(new Date(tx.data_vencimento || tx.data_emissao), 'dd/MM/yyyy')}
                                    </TableCell>
                                    <TableCell className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                      {tx.description}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs font-black text-slate-900 dark:text-slate-100">
                                      {Number(tx.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setClientModalTarget({
                                            clientName: client.clientName,
                                            transactions: [tx],
                                          })
                                          setClientModalOpen(true)
                                        }}
                                        className="h-7 rounded-lg text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300"
                                      >
                                        Receber Esta
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                    Nenhum cliente com débitos a prazo encontrado para os filtros selecionados.
                  </div>
                )}
              </div>
            ) : (
              /* VISÃO 2: LISTA DETALHADA DE COMANDAS */
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-950">
                    <TableRow>
                      <TableHead className="text-xs font-black uppercase">Cliente / Contato</TableHead>
                      <TableHead className="text-xs font-black uppercase">Data Compra</TableHead>
                      <TableHead className="text-xs font-black uppercase">Vencimento Previsto</TableHead>
                      <TableHead className="text-xs font-black uppercase">Origem / Comanda</TableHead>
                      <TableHead className="text-right text-xs font-black uppercase">Valor Devedor</TableHead>
                      <TableHead className="w-[180px] text-center text-xs font-black uppercase">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClientRows.length > 0 ? (
                      filteredClientRows.map((tx) => {
                        let clientName = tx.client?.name || ''
                        if (!clientName) {
                          const match = tx.description?.match(/:\s*([^[]+)/) || tx.description?.match(/-\s*([^-]+)$/)
                          clientName = match ? match[1].trim() : 'Cliente'
                        }
                        const clientObj = clients.find((c: any) => c.name?.toLowerCase() === clientName.toLowerCase())
                        const phone = clientObj?.phone || clientObj?.cellphone || ''

                        const daysDiff = differenceInCalendarDays(new Date(tx.data_vencimento || tx.data_emissao), new Date())
                        const isOverdue = daysDiff < 0
                        const isToday = daysDiff === 0

                        return (
                          <TableRow key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                            <TableCell>
                              <span className="block text-xs font-bold text-slate-900 dark:text-slate-100">
                                {clientName}
                              </span>
                              {phone && <span className="text-[10px] text-slate-400">{phone}</span>}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-slate-500">
                              {format(new Date(tx.data_emissao), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {format(new Date(tx.data_vencimento || tx.data_emissao), 'dd/MM/yyyy')}
                                </span>
                                {isOverdue && (
                                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                    Vencido há {Math.abs(daysDiff)}d
                                  </span>
                                )}
                                {isToday && (
                                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                    Vence Hoje
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                              {tx.description}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-black text-slate-900 dark:text-slate-100">
                              {Number(tx.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setClientModalTarget({
                                      clientName,
                                      transactions: [tx],
                                    })
                                    setClientModalOpen(true)
                                  }}
                                  className="h-8 rounded-xl bg-emerald-600 px-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                                >
                                  Receber
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenWhatsApp(phone, clientName, Number(tx.amount || 0))}
                                  className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                                  title="WhatsApp"
                                >
                                  <MessageCircle size={15} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-28 text-center text-xs font-semibold text-slate-400">
                          Nenhuma comanda encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 4: VALES DE FUNCIONÁRIOS */}
          {/* ========================================================================= */}
          <TabsContent value="employees" className="space-y-4">
            {/* BANNER REGRAS DE LIQUIDAÇÃO DE VALES */}
            <div className="flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50/50 p-3.5 text-xs text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">💡</span>
                <p>
                  <strong>Regras de Liquidação de Vales:</strong> Os consumos e adiantamentos de colaboradores podem ser gerados em PDF para assinatura física, abatidos no holerite ou quitados no balcão em dinheiro/PIX.
                </p>
              </div>

              <span className="rounded-xl border border-blue-200 bg-white px-3 py-1 font-bold text-blue-800 shadow-2xs dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300">
                Total a Descontar: {termSummary.employeeTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>

            {/* BARRA DE BUSCA DE FUNCIONÁRIOS */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-md flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar por colaborador, cargo ou setor..."
                  value={employeeSearchQuery}
                  onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                  className="rounded-xl pl-9 text-xs font-semibold bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="flex items-center gap-2">
                <Select value={employeeDeptFilter} onValueChange={setEmployeeDeptFilter}>
                  <SelectTrigger className="w-[180px] rounded-xl text-xs font-bold">
                    <SelectValue placeholder="Departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Departamentos</SelectItem>
                    <SelectItem value="Cozinha">Cozinha</SelectItem>
                    <SelectItem value="Salão">Salão</SelectItem>
                    <SelectItem value="Bar">Bar</SelectItem>
                    <SelectItem value="Administrativo">Administrativo</SelectItem>
                    <SelectItem value="Geral">Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* TABELA DE VALES DE FUNCIONÁRIOS */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-950">
                  <TableRow>
                    <TableHead className="text-xs font-black uppercase">Colaborador</TableHead>
                    <TableHead className="text-xs font-black uppercase">Data do Lançamento</TableHead>
                    <TableHead className="text-xs font-black uppercase">Tipo / Descrição</TableHead>
                    <TableHead className="text-xs font-black uppercase">Origem</TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">Valor do Débito</TableHead>
                    <TableHead className="w-[260px] text-center text-xs font-black uppercase">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingPendingTerms ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-xs font-bold text-slate-500">
                        Carregando vales de colaboradores...
                      </TableCell>
                    </TableRow>
                  ) : employeeDebts.length > 0 ? (
                    employeeDebts.map((item) => {
                      const empName = item.employeeName || 'Colaborador'
                      const empObj = employees.find((e: any) => e.name?.toLowerCase() === empName.toLowerCase())
                      const role = empObj?.role || 'Equipe'
                      const sector = empObj?.sector?.name || empObj?.department || 'Operação'
                      const initials = empName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()

                      return (
                        <TableRow key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[11px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {initials}
                              </div>
                              <div>
                                <span className="block text-xs font-bold text-slate-900 dark:text-slate-100">
                                  {empName}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {role} • {sector}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                            {format(new Date(item.data_emissao || item.data_vencimento), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-800 dark:text-slate-200">
                            {item.description || 'Vale / Consumo'}
                          </TableCell>
                          <TableCell>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              Caixa Balcão
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-black text-slate-900 dark:text-slate-100">
                            {Number(item.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEmployeeModalTarget({
                                    id: item.id,
                                    name: empName,
                                    role,
                                    department: sector,
                                    items: [item],
                                    totalAmount: Number(item.amount || 0),
                                  })
                                  setEmployeeModalOpen(true)
                                }}
                                className="h-8 gap-1 rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200"
                              >
                                <Printer size={13} />
                                <span>Termo (PDF)</span>
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => {
                                  setEmployeeModalTarget({
                                    id: item.id,
                                    name: empName,
                                    role,
                                    department: sector,
                                    items: [item],
                                    totalAmount: Number(item.amount || 0),
                                  })
                                  setEmployeeModalOpen(true)
                                }}
                                className="h-8 gap-1 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                              >
                                <CheckCircle2 size={13} />
                                <span>Baixar / Acertar</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-xs font-semibold text-slate-400">
                        Nenhum vale ou consumo de colaborador pendente neste mês.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* MODAL 1: LIQUIDAÇÃO DE DÉBITOS DE CLIENTES */}
      <ClientSettleModal
        open={clientModalOpen}
        onOpenChange={setClientModalOpen}
        target={clientModalTarget}
        accounts={accounts}
      />

      {/* MODAL 2: TERMO EM PDF E ACERTO DE VALES DE COLABORADORES */}
      <EmployeeTermPdfModal
        open={employeeModalOpen}
        onOpenChange={setEmployeeModalOpen}
        employee={employeeModalTarget}
        accounts={accounts}
      />

      {/* MODAL 3: ADIANTAMENTO DE CARTÕES EM LOTE */}
      <Dialog open={triggerModalOpen} onOpenChange={setTriggerModalOpen}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <Rocket size={18} />
              </div>
              <span className="text-base font-black">
                Adiantar {selectedCardsSummary.count} {selectedCardsSummary.count === 1 ? 'Cartão' : 'Cartões'}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2 font-manrope">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Valor Bruto Total:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {selectedCardsSummary.gross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Taxas MDR:</span>
                <span className="font-mono font-bold text-red-500">
                  - {selectedCardsSummary.fees.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>

              <div className="my-3 border-t border-slate-200 dark:border-slate-800" />

              <div className="flex items-end justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400">
                    Total Líquido a Creditar no Banco
                  </span>
                  <p className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {selectedCardsSummary.net.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => triggerSettlement(selectedTxIds)}
              disabled={isTriggering}
              className="h-11 w-full gap-2 rounded-xl bg-blue-600 text-xs font-black uppercase text-white hover:bg-blue-700"
            >
              {isTriggering ? 'Processando crédito...' : 'Confirmar Adiantamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: RELATÓRIO GERAL EM PDF */}
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
