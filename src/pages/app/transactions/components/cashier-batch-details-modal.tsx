import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Landmark, Users, CreditCard, Loader2, ChevronDown, ChevronUp, 
  CheckCircle2, Circle, Undo2, Banknote, Wallet, Receipt, RefreshCcw, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { getSessionDetails, revertCashierAudit } from '@/api/cashier/cashier'
import { updateStatusTransaction } from '@/api/update-transaction-status'
import { revertTransactionStatus } from '@/api/revert-transaction-status'
import dayjs from 'dayjs'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
      queryClient.invalidateQueries({ queryKey: ['cashier-session', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: () => toast.error('Erro ao marcar como paga.')
  })

  const { mutateAsync: revertStatus } = useMutation({
    mutationFn: revertTransactionStatus,
    onSuccess: () => {
      toast.success('Transação marcada como pendente!')
      queryClient.invalidateQueries({ queryKey: ['cashier-session', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: () => toast.error('Erro ao marcar como pendente.')
  })

  const { mutateAsync: revertAudit } = useMutation({
    mutationFn: revertCashierAudit,
    onSuccess: () => {
      toast.success('Conferência revertida com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['cashier-sessions'] })
      onOpenChange(false)
    },
    onError: () => toast.error('Erro ao reverter conferência.')
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
          accountId: tx.account_id
        })
      }
    } finally {
      setTransactionToToggle(null)
    }
  }

  const computeResumo = (entriesList: any[]) => {
    const res: any = {
      CASA: { total: 0, detalhado: {} as Record<string, number>, entries: {} as Record<string, any[]> },
      BANCOS: {} as Record<string, number>,
      BANCOS_ENTRIES: {} as Record<string, any[]>,
      TOTAL: 0
    }

    const padraoCasa = ['funcionário', 'pró-labore', 'cortesia', 'permuta', 'a prazo']

    for (const entry of entriesList || []) {
      const amount = Number(entry.amount || 0)
      const method = (entry.payment_method || '').trim()
      const bank = (entry.bank || '').toUpperCase().trim()

      if ((entry.is_withdrawal && entry.type !== 'SANGRIA_DESTINO') || entry.is_tip) continue
      
      if (entry.type !== 'SANGRIA_DESTINO') {
        res.TOTAL += amount
      }

      const normMethod = method.toLowerCase()
      
      if (bank === 'CONTA DA CASA' || padraoCasa.some(p => normMethod.includes(p))) {
        res.CASA.total += amount
        const key = method || 'A Prazo'
        res.CASA.detalhado[key] = (res.CASA.detalhado[key] || 0) + amount
        
        if (!res.CASA.entries[key]) res.CASA.entries[key] = []
        res.CASA.entries[key].push(entry)
      } 
      else if ((bank && bank !== 'CAIXA' && normMethod !== 'dinheiro') || entry.type === 'SANGRIA_DESTINO') {
        const bankKey = entry.type === 'SANGRIA_DESTINO' ? `${bank} Dinheiro (Físico)` : `${bank} ${method}`
        res.BANCOS[bankKey] = (res.BANCOS[bankKey] || 0) + amount
        
        if (!res.BANCOS_ENTRIES[bankKey]) res.BANCOS_ENTRIES[bankKey] = []
        res.BANCOS_ENTRIES[bankKey].push(entry)
      }
    }
    return res
  }

  const resumo = data?.entries ? computeResumo(data.entries) : null
  const bancosKeys = resumo ? Object.keys(resumo.BANCOS) : []
  const casaKeys = resumo ? Object.keys(resumo.CASA.detalhado) : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden rounded-3xl border border-slate-200/50 p-0 shadow-2xl dark:border-slate-800/50 bg-slate-50 dark:bg-[#0A0A0A]">
        {/* Header Elegante */}
        <DialogHeader className="relative overflow-hidden bg-white px-8 pt-8 pb-6 dark:bg-[#111] flex flex-row items-start justify-between border-b border-slate-200/60 dark:border-slate-800/60">
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
                <span>{dayjs(data.session.opened_at).format('DD MMMM YYYY')}</span>
                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span>{dayjs(data.session.opened_at).hour() < 16 ? 'Turno Almoço' : 'Turno Jantar'}</span>
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
                <span className="text-sm font-medium">Buscando liquidações...</span>
              </div>
            </div>
          ) : !resumo ? (
            <div className="flex h-[400px] items-center justify-center text-sm font-medium text-slate-500">
              Nenhuma movimentação registrada neste lote.
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              
              {/* Grand Total Card */}
              <div className="flex items-center justify-between rounded-2xl bg-white p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:bg-[#111] border border-slate-200/50 dark:border-slate-800/50">
                <div>
                  <h3 className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                    Total Declarado no Lote
                  </h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-lg font-medium text-slate-400">R$</span>
                    <span className="text-4xl font-bold tracking-tighter text-slate-900 dark:text-white">
                      {resumo.TOTAL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                
                <div className="hidden sm:flex gap-4">
                  <div className="rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-500/70">Valores Imediatos</span>
                    <span className="block mt-0.5 text-base font-bold text-emerald-700 dark:text-emerald-400">
                      R$ {Object.values(resumo.BANCOS).reduce((a:any, b:any) => a + b, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="rounded-xl bg-orange-50 px-4 py-3 dark:bg-orange-500/10">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-orange-600/70 dark:text-orange-500/70">Vales / Fiado</span>
                    <span className="block mt-0.5 text-base font-bold text-orange-700 dark:text-orange-400">
                      R$ {resumo.CASA.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs Section */}
              <Tabs defaultValue="cartoes" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-200/50 dark:bg-[#1A1A1A] rounded-xl p-1 h-12">
                  <TabsTrigger value="cartoes" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-[#2A2A2A] text-[13px] font-medium h-full">
                    <CreditCard className="mr-2 h-4 w-4" /> Valores Imediatos (Cartões e Dinheiro)
                  </TabsTrigger>
                  <TabsTrigger value="prazo" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-[#2A2A2A] text-[13px] font-medium h-full">
                    <Users className="mr-2 h-4 w-4" /> Vales, Cortesias & Fiado
                  </TabsTrigger>
                </TabsList>

                <div className="mt-6 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  <TabsContent value="cartoes" className="m-0 focus-visible:outline-none">
                    {bancosKeys.length === 0 ? (
                      <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                        <span className="text-sm text-slate-500">Nenhum cartão registrado.</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {bancosKeys.map(bancoKey => {
                          const [banco, ...metodoArr] = bancoKey.split(' ')
                          const metodo = metodoArr.join(' ')
                          
                          const tx = data?.transactions?.find((t: any) => 
                            (t.payment_method || '').toLowerCase() === metodo.toLowerCase() && 
                            (t.description || '').toUpperCase().includes(banco.toUpperCase())
                          )

                          return (
                            <div key={bancoKey} className="group flex flex-col rounded-2xl bg-white shadow-sm dark:bg-[#141414] border border-slate-200/60 dark:border-slate-800 overflow-hidden transition-all hover:border-blue-500/30">
                              <div className="flex items-center justify-between p-5">
                                <button 
                                  onClick={() => setExpandedSection(expandedSection === `banco-${bancoKey}` ? null : `banco-${bancoKey}`)}
                                  className="flex flex-1 items-center gap-4 text-left"
                                >
                                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
                                    <CreditCard className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                                  </div>
                                  <div>
                                    <span className="block font-bold text-slate-900 dark:text-white text-base tracking-tight">{bancoKey}</span>
                                    <span className="text-[12px] text-slate-500 font-medium mt-0.5 block">Captura Eletrônica</span>
                                  </div>
                                </button>
                                
                                <div className="flex items-center gap-6">
                                  {tx && (
                                    <div className="flex flex-col items-end">
                                      {tx.confirmed ? (
                                        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-600 dark:text-emerald-400">
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                          <span className="text-[10px] font-bold uppercase tracking-widest">Liquidado</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-blue-600 dark:text-blue-400">
                                          <RefreshCcw className="h-3 w-3 animate-spin-slow" />
                                          <span className="text-[10px] font-bold uppercase tracking-widest">Pendente</span>
                                        </div>
                                      )}
                                      {!tx.confirmed && tx.data_vencimento && (
                                        <span className="text-[11px] font-medium text-slate-400 mt-1.5 block">
                                          Previsto: {dayjs(tx.data_vencimento).format('DD/MM/YY')}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="font-mono text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                      R$ {resumo.BANCOS[bancoKey].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                    <ChevronDown className={cn(
                                      "h-4 w-4 text-slate-400 transition-transform duration-200", 
                                      expandedSection === `banco-${bancoKey}` && "rotate-180"
                                    )} />
                                  </div>
                                </div>
                              </div>
                              
                              {/* Details accordion */}
                              <div className={cn(
                                "grid transition-all duration-300 ease-in-out",
                                expandedSection === `banco-${bancoKey}` ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                              )}>
                                <div className="overflow-hidden">
                                  <div className="bg-slate-50 p-5 pt-3 border-t border-slate-100 dark:border-slate-800/60 dark:bg-black/20 flex flex-col gap-2">
                                    <div className="flex items-center justify-between px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                      <span>Origem / Referência</span>
                                      <span>Valor Creditado</span>
                                    </div>
                                    {resumo.BANCOS_ENTRIES[bancoKey].map((l: any) => (
                                      <div key={l.id} className="flex justify-between items-center text-slate-600 bg-white dark:bg-[#1A1A1A] px-4 py-3 rounded-xl border border-slate-200/50 dark:border-slate-800 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-slate-700">
                                        <span className="font-medium text-[13px] dark:text-slate-300">{l.identification || l.origin || 'Venda Caixa'}</span>
                                        <span className="font-mono text-[13px] font-bold dark:text-slate-200">R$ {Number(l.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="prazo" className="m-0 focus-visible:outline-none">
                    {casaKeys.length === 0 ? (
                      <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                        <span className="text-sm text-slate-500">Nenhum lançamento a prazo.</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {casaKeys.map(forma => (
                          <div key={forma} className="group flex flex-col rounded-2xl bg-white shadow-sm dark:bg-[#141414] border border-slate-200/60 dark:border-slate-800 overflow-hidden transition-all hover:border-rose-500/30">
                            <button 
                              onClick={() => setExpandedSection(expandedSection === `casa-${forma}` ? null : `casa-${forma}`)}
                              className="flex items-center justify-between p-5 text-left"
                            >
                              <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/40 dark:to-rose-900/40 border border-rose-200/50 dark:border-rose-800/50 shadow-inner">
                                  <Users className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                                </div>
                                <div>
                                  <span className="block font-bold text-slate-900 dark:text-white text-base tracking-tight">{forma}</span>
                                  <span className="text-[12px] text-slate-500 font-medium mt-0.5 block">Acerto a prazo / Vale</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="font-mono text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                  R$ {resumo.CASA.detalhado[forma].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                <ChevronDown className={cn(
                                  "h-4 w-4 text-slate-400 transition-transform duration-200", 
                                  expandedSection === `casa-${forma}` && "rotate-180"
                                )} />
                              </div>
                            </button>
                            
                            <div className={cn(
                              "grid transition-all duration-300 ease-in-out",
                              expandedSection === `casa-${forma}` ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                            )}>
                              <div className="overflow-hidden">
                                <div className="bg-rose-50/30 p-5 pt-3 border-t border-slate-100 dark:border-slate-800/60 dark:bg-black/20 flex flex-col gap-2">
                                  <div className="flex items-center justify-between px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    <span>Identificação / Nome</span>
                                    <span>Valor</span>
                                  </div>
                                  {resumo.CASA.entries[forma].map((l: any) => {
                                    const entityName = l.client?.name || l.employee?.name || l.identification || 'Não Identificado'
                                    return (
                                      <div key={l.id} className="flex justify-between items-center text-slate-600 bg-white dark:bg-[#1A1A1A] px-4 py-3 rounded-xl border border-slate-200/50 dark:border-slate-800 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-slate-700">
                                        <span className="font-medium text-[13px] dark:text-slate-300 truncate max-w-[200px]">{entityName}</span>
                                        <span className="font-mono text-[13px] font-bold dark:text-slate-200">R$ {Number(l.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
              <div className="flex justify-end pt-4 pb-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setIsReverting(true)}
                  className="flex items-center gap-2 rounded-lg bg-red-50 text-red-600 px-5 py-2.5 text-sm font-semibold transition-all hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40"
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
              Você está prestes a <strong>desfazer</strong> o fechamento deste caixa. 
              Todas as transações financeiras geradas por este lote serão <strong>excluídas</strong> do financeiro, 
              e o caixa voltará para o status pendente para ser conferido novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => revertAudit(sessionId!)} 
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sim, Reverter Caixa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!transactionToToggle} onOpenChange={(open) => !open && setTransactionToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar status de pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a marcar este lançamento como {transactionToToggle?.confirmed ? 'PENDENTE' : 'PAGO'}.
              Isso irá refletir imediatamente no saldo da conta e nos relatórios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleConfirm} className="bg-blue-600 hover:bg-blue-700 text-white">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
