import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  CreditCard,
  ExternalLink,
  Info,
  Landmark,
  Loader2,
  Receipt,
  RefreshCcw,
  TrendingDown,
  Undo2,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { getSessionDetails, revertCashierAudit } from '@/api/cashier/cashier'
import { revertTransactionStatus } from '@/api/revert-transaction-status'
import { updateStatusTransaction } from '@/api/update-transaction-status'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface CashierBatchDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string | null
}

export function CashierBatchDetailsModal({
  open,
  onOpenChange,
  sessionId,
}: CashierBatchDetailsModalProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [transactionToToggle, setTransactionToToggle] = useState<any>(null)
  const [isReverting, setIsReverting] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['cashier-session', sessionId],
    queryFn: () => getSessionDetails(sessionId!),
    enabled: open && !!sessionId,
  })

  const { mutateAsync: switchStatus } = useMutation({
    mutationFn: updateStatusTransaction,
    onSuccess: () => {
      toast.success('Transação marcada como paga!')
      queryClient.invalidateQueries({
        queryKey: ['cashier-session', sessionId],
      })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: () => toast.error('Erro ao marcar como paga.'),
  })

  const { mutateAsync: revertStatus } = useMutation({
    mutationFn: revertTransactionStatus,
    onSuccess: () => {
      toast.success('Transação marcada como pendente!')
      queryClient.invalidateQueries({
        queryKey: ['cashier-session', sessionId],
      })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: () => toast.error('Erro ao marcar como pendente.'),
  })

  const { mutateAsync: revertAudit } = useMutation({
    mutationFn: revertCashierAudit,
    onSuccess: () => {
      toast.success('Conferência revertida com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['cashier-sessions'] })
      onOpenChange(false)
    },
    onError: () => toast.error('Erro ao reverter conferência.'),
  })

  async function handleToggleConfirm() {
    if (!transactionToToggle) return
    const tx = transactionToToggle
    try {
      if (tx.confirmed) {
        await revertStatus({ id: tx.id })
      } else {
        await switchStatus({
          id: tx.id,
          amount: tx.amount,
          data_vencimento: new Date(tx.data_vencimento),
          accountId: tx.account_id,
        })
      }
    } finally {
      setTransactionToToggle(null)
    }
  }

  const computeResumo = (entriesList: any[], transactionsList: any[] = []) => {
    const res: any = {
      CASA: {
        total: 0,
        detalhado: {} as Record<string, number>,
        entries: {} as Record<string, any[]>,
      },
      BANCOS: {} as Record<string, number>,
      BANCOS_ENTRIES: {} as Record<string, any[]>,
      SAIDAS: {
        totalDespesas: 0,
        totalVales: 0,
        totalRecolhimento: 0,
        totalGeral: 0,
        list: [] as any[],
      },
      TOTAL: 0,
    }

    const padraoCasa = [
      'funcionário',
      'funcionario',
      'pró-labore',
      'pro-labore',
      'cortesia',
      'permuta',
      'a prazo',
    ]

    for (const entry of entriesList || []) {
      const amount = Number(entry.amount || 0)
      const method = (entry.payment_method || '').trim()
      const bank = (entry.bank || '').toUpperCase().trim()
      const normMethod = method.toLowerCase()
      const normIdent = (entry.identification || '').toLowerCase()

      // Tratamento de Saídas / Sangrias
      if (entry.is_withdrawal) {
        if (entry.type === 'SANGRIA_DESTINO') {
          const bankKey = `${bank || 'Caixa Central'} Dinheiro (Físico)`
          res.BANCOS[bankKey] = (res.BANCOS[bankKey] || 0) + amount
          if (!res.BANCOS_ENTRIES[bankKey]) res.BANCOS_ENTRIES[bankKey] = []
          res.BANCOS_ENTRIES[bankKey].push(entry)
          continue
        }

        const isVale =
          Boolean(entry.employee_id) ||
          normIdent.includes('vale') ||
          normIdent.includes('vt') ||
          normIdent.includes('funcionario') ||
          entry.type === 'WITHDRAWAL_EMPLOYEE'

        const isRecolhimentoDono =
          entry.type === 'WITHDRAWAL_OWNER' ||
          normIdent.includes('samir') ||
          normIdent.includes('manobra') ||
          normIdent.includes('troco') ||
          normIdent.includes('cofre') ||
          normIdent.includes('recolhimento') ||
          (normIdent === 'sangria' && !entry.sector_id)

        let categoriaSaida = 'DESPESA'
        if (isVale) {
          categoriaSaida = 'VALE'
          res.SAIDAS.totalVales += amount
          res.SAIDAS.totalDespesas += amount
        } else if (isRecolhimentoDono) {
          categoriaSaida = 'RECOLHIMENTO'
          res.SAIDAS.totalRecolhimento += amount
        } else {
          categoriaSaida = 'DESPESA'
          res.SAIDAS.totalDespesas += amount
        }
        res.SAIDAS.totalGeral += amount

        res.SAIDAS.list.push({
          ...entry,
          categoriaSaida,
        })
        continue
      }

      if (entry.is_tip) continue

      res.TOTAL += amount

      if (
        bank === 'CONTA DA CASA' ||
        padraoCasa.some((p) => normMethod.includes(p))
      ) {
        res.CASA.total += amount
        const key = method || 'A Prazo'
        res.CASA.detalhado[key] = (res.CASA.detalhado[key] || 0) + amount

        if (!res.CASA.entries[key]) res.CASA.entries[key] = []
        res.CASA.entries[key].push(entry)
      } else if (
        normMethod.includes('dinheiro') ||
        bank === 'CAIXA' ||
        bank === 'CAIXA CENTRAL'
      ) {
        // ENTRADA DE DINHEIRO FÍSICO (CAIXA CENTRAL)
        const bankKey = 'Caixa Central Dinheiro (Físico)'
        res.BANCOS[bankKey] = (res.BANCOS[bankKey] || 0) + amount

        if (!res.BANCOS_ENTRIES[bankKey]) res.BANCOS_ENTRIES[bankKey] = []
        res.BANCOS_ENTRIES[bankKey].push(entry)
      } else if (bank && bank !== 'CAIXA') {
        const bankKey = `${bank} ${method}`
        res.BANCOS[bankKey] = (res.BANCOS[bankKey] || 0) + amount

        if (!res.BANCOS_ENTRIES[bankKey]) res.BANCOS_ENTRIES[bankKey] = []
        res.BANCOS_ENTRIES[bankKey].push(entry)
      }
    }
    return res
  }

  const resumo = data?.entries ? computeResumo(data.entries, data?.transactions || []) : null
  const bancosKeys = (resumo ? Object.keys(resumo.BANCOS) : []).sort((a, b) => {
    if (a.includes('Dinheiro')) return -1
    if (b.includes('Dinheiro')) return 1
    return a.localeCompare(b)
  })
  const casaKeys = resumo ? Object.keys(resumo.CASA.detalhado) : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden rounded-3xl border border-slate-200/50 bg-slate-50 p-0 shadow-2xl dark:border-slate-800/50 dark:bg-[#0A0A0A]">
        {/* Header Elegante */}
        <DialogHeader className="relative flex flex-row items-start justify-between overflow-hidden border-b border-slate-200/60 bg-white px-8 pb-6 pt-8 dark:border-slate-800/60 dark:bg-[#111]">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10" />

          <div className="relative z-10">
            <DialogTitle className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                <Receipt className="h-5 w-5" />
              </div>
              Lançamento Caixa Financeiro
            </DialogTitle>
            {data?.session && (
              <p className="mt-2 flex items-center gap-2 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                <span>
                  {dayjs(data.session.opened_at).format('DD MMMM YYYY')}
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span>
                  {dayjs(data.session.opened_at).hour() < 16
                    ? 'Turno Almoço'
                    : 'Turno Jantar'}
                </span>
              </p>
            )}
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <a
              href={`/cashier/session/${sessionId}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-[13px] font-bold text-blue-700 transition-all hover:bg-blue-100 active:scale-95 dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Ver no Caixa</span>
            </a>
            <button
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-[13px] font-semibold text-slate-700 transition-all hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              title="Fechar Janela"
            >
              <span className="hidden sm:inline">Fechar</span>
            </button>
          </div>
        </DialogHeader>

        <div className="px-8 py-6">
          {isLoading ? (
            <div className="flex h-[400px] items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-500" />
                <span className="text-sm font-medium">
                  Buscando liquidações...
                </span>
              </div>
            </div>
          ) : !resumo ? (
            <div className="flex h-[400px] items-center justify-center text-sm font-medium text-slate-500">
              Nenhuma movimentação registrada neste lote.
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              /* Grand Total Card */
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/50 bg-white p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:border-slate-800/50 dark:bg-[#111] md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Faturamento (Vendas)
                    </h3>
                    <div
                      className="cursor-help text-slate-400 transition-colors hover:text-slate-600"
                      title="Soma de todas as vendas do turno (Cartões, PIX, Dinheiro, Vales e Fiado)."
                    >
                      <Info className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-lg font-medium text-slate-400">
                      R$
                    </span>
                    <span className="text-4xl font-bold tracking-tighter text-slate-900 dark:text-white">
                      {resumo.TOTAL.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-emerald-50 px-3.5 py-2.5 dark:bg-emerald-500/10">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-500/70">
                      Valores Imediatos
                    </span>
                    <span className="mt-0.5 block text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      R${' '}
                      {Object.values(resumo.BANCOS)
                        .reduce((a: any, b: any) => a + b, 0)
                        .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="rounded-xl bg-orange-50 px-3.5 py-2.5 dark:bg-orange-500/10">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-orange-600/70 dark:text-orange-500/70">
                      Vales / Fiado
                    </span>
                    <span className="mt-0.5 block text-sm font-bold text-orange-700 dark:text-orange-400">
                      R${' '}
                      {resumo.CASA.total.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 dark:bg-rose-500/10">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-600/70 dark:text-rose-500/70">
                      Saídas Gaveta
                    </span>
                    <span className="mt-0.5 block text-sm font-bold text-rose-700 dark:text-rose-400">
                      R$ -
                      {resumo.SAIDAS.totalGeral.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs Section */}
              <Tabs defaultValue="cartoes" className="w-full">
                <TabsList className="grid h-12 w-full grid-cols-3 rounded-xl bg-slate-200/50 p-1 dark:bg-[#1A1A1A]">
                  <TabsTrigger
                    value="cartoes"
                    className="h-full rounded-lg text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-[#2A2A2A]"
                  >
                    <CreditCard className="mr-2 h-4 w-4" /> Valores Imediatos
                  </TabsTrigger>
                  <TabsTrigger
                    value="saidas"
                    className="h-full rounded-lg text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-[#2A2A2A]"
                  >
                    <TrendingDown className="mr-2 h-4 w-4 text-rose-500" /> Saídas ({resumo?.SAIDAS?.list?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger
                    value="prazo"
                    className="h-full rounded-lg text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-[#2A2A2A]"
                  >
                    <Users className="mr-2 h-4 w-4" /> Vales & Fiado
                  </TabsTrigger>
                </TabsList>

                <div className="custom-scrollbar mt-6 max-h-[40vh] overflow-y-auto pr-2">
                  <TabsContent
                    value="cartoes"
                    className="m-0 focus-visible:outline-none"
                  >
                    {bancosKeys.length === 0 ? (
                      <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                        <span className="text-sm text-slate-500">
                          Nenhum cartão registrado.
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {bancosKeys.map((bancoKey) => {
                          const isDinheiro = bancoKey.includes('Dinheiro')
                          const [banco, ...metodoArr] = bancoKey.split(' ')
                          const metodo = metodoArr.join(' ')

                          const tx = isDinheiro
                            ? data?.transactions?.find(
                                (t: any) =>
                                  t.operation === 'income' &&
                                  ((t.payment_method || '').toUpperCase() === 'DINHEIRO' ||
                                   (t.description || '').toUpperCase().includes('VENDAS EM DINHEIRO') ||
                                   (t.description || '').toUpperCase().includes('DINHEIRO')),
                              )
                            : data?.transactions?.find(
                                (t: any) =>
                                  (t.payment_method || '').toLowerCase() ===
                                    metodo.toLowerCase() &&
                                  (t.description || '')
                                    .toUpperCase()
                                    .includes(banco.toUpperCase()),
                              )

                          return (
                            <div
                              key={bancoKey}
                              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-all hover:border-blue-500/30 dark:border-slate-800 dark:bg-[#141414]"
                            >
                              <div className="flex items-center justify-between p-5">
                                <button
                                  onClick={() =>
                                    setExpandedSection(
                                      expandedSection === `banco-${bancoKey}`
                                        ? null
                                        : `banco-${bancoKey}`,
                                    )
                                  }
                                  className="flex flex-1 items-center gap-4 text-left"
                                >
                                  <div className={cn(
                                    "flex h-12 w-12 items-center justify-center rounded-2xl border shadow-inner",
                                    isDinheiro
                                      ? "border-emerald-200/50 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:border-emerald-800/50 dark:from-emerald-950/40 dark:to-emerald-900/40"
                                      : "border-slate-200/50 bg-gradient-to-br from-slate-100 to-slate-200 dark:border-slate-700/50 dark:from-slate-800 dark:to-slate-900"
                                  )}>
                                    {isDinheiro ? (
                                      <Banknote className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                                    ) : (
                                      <CreditCard className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                                    )}
                                  </div>
                                  <div>
                                    <span className="block text-base font-bold tracking-tight text-slate-900 dark:text-white">
                                      {bancoKey}
                                    </span>
                                    <span className="mt-0.5 block text-[12px] font-medium text-slate-500">
                                      {isDinheiro ? 'Entrada em Espécie • Caixa Central' : 'Captura Eletrônica'}
                                    </span>
                                  </div>
                                </button>

                                <div className="flex items-center gap-6">
                                  {tx && (
                                    <div className="flex flex-col items-end">
                                      {tx.confirmed ? (
                                        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-600 dark:text-emerald-400">
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                          <span className="text-[10px] font-bold uppercase tracking-widest">
                                            Liquidado
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-blue-600 dark:text-blue-400">
                                          <RefreshCcw className="h-3 w-3 animate-spin-slow" />
                                          <span className="text-[10px] font-bold uppercase tracking-widest">
                                            Pendente
                                          </span>
                                        </div>
                                      )}
                                      {!tx.confirmed && tx.data_vencimento && (
                                        <span className="mt-1.5 block text-[11px] font-medium text-slate-400">
                                          Previsto:{' '}
                                          {dayjs(tx.data_vencimento).format(
                                            'DD/MM/YY',
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="font-mono text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                      R${' '}
                                      {resumo.BANCOS[bancoKey].toLocaleString(
                                        'pt-BR',
                                        { minimumFractionDigits: 2 },
                                      )}
                                    </span>
                                    <ChevronDown
                                      className={cn(
                                        'h-4 w-4 text-slate-400 transition-transform duration-200',
                                        expandedSection ===
                                          `banco-${bancoKey}` && 'rotate-180',
                                      )}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Details accordion */}
                              <div
                                className={cn(
                                  'grid transition-all duration-300 ease-in-out',
                                  expandedSection === `banco-${bancoKey}`
                                    ? 'grid-rows-[1fr] opacity-100'
                                    : 'grid-rows-[0fr] opacity-0',
                                )}
                              >
                                <div className="overflow-hidden">
                                  <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 p-5 pt-3 dark:border-slate-800/60 dark:bg-black/20">
                                    <div className="flex items-center justify-between px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                      <span>Origem / Referência</span>
                                      <span>Valor Creditado</span>
                                    </div>
                                    {resumo.BANCOS_ENTRIES[bancoKey].map(
                                      (l: any) => (
                                        <div
                                          key={l.id}
                                          className="flex items-center justify-between rounded-xl border border-slate-200/50 bg-white px-4 py-3 text-slate-600 shadow-sm transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-[#1A1A1A] dark:hover:border-slate-700"
                                        >
                                          <span className="text-[13px] font-medium dark:text-slate-300">
                                            {l.identification ||
                                              l.origin ||
                                              'Venda Caixa'}
                                          </span>
                                          <span className="font-mono text-[13px] font-bold dark:text-slate-200">
                                            R${' '}
                                            {Number(l.amount).toLocaleString(
                                              'pt-BR',
                                              { minimumFractionDigits: 2 },
                                            )}
                                          </span>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </TabsContent>

                                    <TabsContent
                    value="saidas"
                    className="m-0 focus-visible:outline-none"
                  >
                    {!resumo.SAIDAS.list || resumo.SAIDAS.list.length === 0 ? (
                      <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                        <span className="text-sm text-slate-500">
                          Nenhuma sangria ou saída registrada neste lote.
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                              Despesas Operacionais & Vales
                            </span>
                            <span className="mt-1 block font-mono text-xl font-bold text-amber-900 dark:text-amber-200">
                              R$ {resumo.SAIDAS.totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-amber-700/70 dark:text-amber-400/70">
                              Gera transação de despesa / desconto financeiro
                            </span>
                          </div>
                          <div className="rounded-xl border border-blue-200/60 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                              Recolhimento Cofre / Dono
                            </span>
                            <span className="mt-1 block font-mono text-xl font-bold text-blue-900 dark:text-blue-200">
                              R$ {resumo.SAIDAS.totalRecolhimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-blue-700/70 dark:text-blue-400/70">
                              Adiantamento Caixa Central (sem despesa contábil)
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2.5">
                          {resumo.SAIDAS.list.map((s: any) => {
                            const isRecolhimento = s.categoriaSaida === 'RECOLHIMENTO'
                            const isVale = s.categoriaSaida === 'VALE'
                            const identificacao = s.identification || s.origin || (isRecolhimento ? 'Recolhimento Cofre / Dono' : isVale ? 'Vale Funcionário' : 'Despesa Loja')

                            return (
                              <div
                                key={s.id}
                                className={cn(
                                  "flex items-center justify-between rounded-2xl border p-4 shadow-sm transition-all",
                                  isRecolhimento
                                    ? "border-blue-200/70 bg-blue-50/30 hover:border-blue-400/50 dark:border-blue-900/50 dark:bg-[#111827]"
                                    : isVale
                                      ? "border-purple-200/70 bg-purple-50/30 hover:border-purple-400/50 dark:border-purple-900/50 dark:bg-[#1f162b]"
                                      : "border-slate-200/60 bg-white hover:border-amber-400/50 dark:border-slate-800 dark:bg-[#141414]"
                                )}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "flex h-11 w-11 items-center justify-center rounded-xl border shadow-inner",
                                    isRecolhimento
                                      ? "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                      : isVale
                                        ? "border-purple-200 bg-purple-100 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                        : "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  )}>
                                    {isRecolhimento ? (
                                      <Landmark className="h-5 w-5" />
                                    ) : isVale ? (
                                      <UserCheck className="h-5 w-5" />
                                    ) : (
                                      <TrendingDown className="h-5 w-5" />
                                    )}
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                                        {identificacao}
                                      </span>
                                      <span className={cn(
                                        "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                        isRecolhimento
                                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                          : isVale
                                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                      )}>
                                        {isRecolhimento ? '🏦 Cofre / Dono' : isVale ? '👤 Vale RH' : '🛒 Despesa / Compra'}
                                      </span>
                                    </div>
                                    <span className="mt-0.5 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                      {isRecolhimento
                                        ? 'Adiantamento Caixa Central • Não afeta despesas do DRE'
                                        : isVale
                                          ? (s.employee?.name ? `Funcionário: ${s.employee.name} • Folha RH` : 'Desconto em Folha RH')
                                          : 'Saída em Dinheiro • Despesa Operacional'}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className={cn(
                                    "font-mono text-lg font-bold tracking-tight",
                                    isRecolhimento ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400"
                                  )}>
                                    R$ -{Number(s.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent
                    value="prazo"
                    className="m-0 focus-visible:outline-none"
                  >
                    {casaKeys.length === 0 ? (
                      <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                        <span className="text-sm text-slate-500">
                          Nenhum lançamento a prazo.
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {casaKeys.map((forma) => (
                          <div
                            key={forma}
                            className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-all hover:border-rose-500/30 dark:border-slate-800 dark:bg-[#141414]"
                          >
                            <button
                              onClick={() =>
                                setExpandedSection(
                                  expandedSection === `casa-${forma}`
                                    ? null
                                    : `casa-${forma}`,
                                )
                              }
                              className="flex items-center justify-between p-5 text-left"
                            >
                              <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-200/50 bg-gradient-to-br from-rose-50 to-rose-100 shadow-inner dark:border-rose-800/50 dark:from-rose-950/40 dark:to-rose-900/40">
                                  <Users className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                                </div>
                                <div>
                                  <span className="block text-base font-bold tracking-tight text-slate-900 dark:text-white">
                                    {forma}
                                  </span>
                                  <span className="mt-0.5 block text-[12px] font-medium text-slate-500">
                                    Acerto a prazo / Vale
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="font-mono text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                  R${' '}
                                  {resumo.CASA.detalhado[forma].toLocaleString(
                                    'pt-BR',
                                    { minimumFractionDigits: 2 },
                                  )}
                                </span>
                                <ChevronDown
                                  className={cn(
                                    'h-4 w-4 text-slate-400 transition-transform duration-200',
                                    expandedSection === `casa-${forma}` &&
                                      'rotate-180',
                                  )}
                                />
                              </div>
                            </button>

                            <div
                              className={cn(
                                'grid transition-all duration-300 ease-in-out',
                                expandedSection === `casa-${forma}`
                                  ? 'grid-rows-[1fr] opacity-100'
                                  : 'grid-rows-[0fr] opacity-0',
                              )}
                            >
                              <div className="overflow-hidden">
                                <div className="flex flex-col gap-2 border-t border-slate-100 bg-rose-50/30 p-5 pt-3 dark:border-slate-800/60 dark:bg-black/20">
                                  <div className="flex items-center justify-between px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    <span>Identificação / Nome</span>
                                    <span>Valor</span>
                                  </div>
                                  {resumo.CASA.entries[forma].map((l: any) => {
                                    const entityName =
                                      l.client?.name ||
                                      l.employee?.name ||
                                      l.identification ||
                                      'Não Identificado'
                                    return (
                                      <div
                                        key={l.id}
                                        className="flex items-center justify-between rounded-xl border border-slate-200/50 bg-white px-4 py-3 text-slate-600 shadow-sm transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-[#1A1A1A] dark:hover:border-slate-700"
                                      >
                                        <span className="max-w-[200px] truncate text-[13px] font-medium dark:text-slate-300">
                                          {entityName}
                                        </span>
                                        <span className="font-mono text-[13px] font-bold dark:text-slate-200">
                                          R${' '}
                                          {Number(l.amount).toLocaleString(
                                            'pt-BR',
                                            { minimumFractionDigits: 2 },
                                          )}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
              <div className="flex justify-end border-t border-slate-200 pb-2 pt-4 dark:border-slate-800">
                <button
                  onClick={() => setIsReverting(true)}
                  className="flex items-center gap-2 rounded-lg bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40"
                >
                  <Undo2 className="h-4 w-4" />
                  <span>Desfazer Fechamento</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Alertas de reversão mantidos */}
      <AlertDialog open={isReverting} onOpenChange={setIsReverting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverter Conferência do Caixa?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a <strong>desfazer</strong> o fechamento deste
              caixa. Todas as transações financeiras geradas por este lote serão{' '}
              <strong>excluídas</strong> do financeiro, e o caixa voltará para o
              status pendente para ser conferido novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revertAudit(sessionId!)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Sim, Reverter Caixa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!transactionToToggle}
        onOpenChange={(open) => !open && setTransactionToToggle(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar status de pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a marcar este lançamento como{' '}
              {transactionToToggle?.confirmed ? 'PENDENTE' : 'PAGO'}. Isso irá
              refletir imediatamente no saldo da conta e nos relatórios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleConfirm}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
