import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Landmark, Users, CreditCard, Loader2, ChevronDown, ChevronUp, DollarSign, CheckCircle2, Circle, Undo2 } from 'lucide-react'
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
      BANCOS_ENTRIES: {} as Record<string, any[]>
    }

    const padraoCasa = ['funcionário', 'pró-labore', 'cortesia', 'permuta', 'a prazo']

    for (const entry of entriesList || []) {
      const amount = Number(entry.amount || 0)
      const method = (entry.payment_method || '').trim()
      const bank = (entry.bank || '').toUpperCase().trim()

      if (entry.is_withdrawal || entry.is_tip) continue

      const normMethod = method.toLowerCase()
      
      if (bank === 'CONTA DA CASA' || padraoCasa.some(p => normMethod.includes(p))) {
        res.CASA.total += amount
        const key = method || 'A Prazo'
        res.CASA.detalhado[key] = (res.CASA.detalhado[key] || 0) + amount
        
        if (!res.CASA.entries[key]) res.CASA.entries[key] = []
        res.CASA.entries[key].push(entry)
      } 
      else if (bank && bank !== 'CAIXA' && normMethod !== 'dinheiro') {
        res.BANCOS[bank] = (res.BANCOS[bank] || 0) + amount
        
        if (!res.BANCOS_ENTRIES[bank]) res.BANCOS_ENTRIES[bank] = []
        res.BANCOS_ENTRIES[bank].push(entry)
      }
    }
    return res
  }

  const resumo = data?.entries ? computeResumo(data.entries) : null
  const bancosKeys = resumo ? Object.keys(resumo.BANCOS) : []
  const casaKeys = resumo ? Object.keys(resumo.CASA.detalhado) : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden rounded-2xl border-none p-0 shadow-2xl">
        <DialogHeader className="bg-slate-900 px-6 py-5 text-white flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
              <Landmark className="h-5 w-5 text-amber-500" />
              Detalhes do Lote
            </DialogTitle>
            {data?.session && (
              <p className="text-sm font-medium text-slate-400 mt-1">
                {dayjs(data.session.opened_at).format('DD/MM/YYYY')} —{' '}
                {dayjs(data.session.opened_at).hour() < 16 ? 'Almoço' : 'Jantar'}
              </p>
            )}
          </div>
          <button
            onClick={() => setIsReverting(true)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            title="Reverter Conferência"
          >
            <Undo2 className="h-4 w-4" />
            <span className="hidden sm:inline">Desfazer</span>
          </button>
        </DialogHeader>

        <div className="bg-slate-50 p-6 dark:bg-slate-950">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : !resumo ? (
            <div className="flex h-40 items-center justify-center text-sm font-medium text-slate-500">
              Dados não encontrados.
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="flex flex-col gap-6">
                <div>
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                    <CreditCard className="h-4 w-4 text-emerald-500" />
                    Valores Creditados
                  </h4>
                  {bancosKeys.length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhum lançamento eletrônico.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {bancosKeys.map(banco => (
                        <div key={banco} className="flex flex-col rounded-xl bg-white shadow-sm dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden">
                          <button 
                            onClick={() => setExpandedSection(expandedSection === `banco-${banco}` ? null : `banco-${banco}`)}
                            className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
                          >
                            <span className="font-bold text-slate-700 dark:text-slate-300">{banco}</span>
                            <div className="flex items-center gap-3">
                              <span className="font-black text-emerald-600">
                                R$ {resumo.BANCOS[banco].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              {expandedSection === `banco-${banco}` ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </div>
                          </button>
                          {expandedSection === `banco-${banco}` && resumo.BANCOS_ENTRIES[banco] && (
                            <div className="bg-slate-50/80 p-3 pt-0 text-xs border-t border-slate-100 dark:border-slate-800 dark:bg-slate-950/50 flex flex-col gap-2">
                              {resumo.BANCOS_ENTRIES[banco].map((l: any) => (
                                <div key={l.id} className="flex justify-between items-center text-slate-500">
                                  <span>{l.identification || l.origin || 'Venda'} - <span className="font-semibold text-slate-700 dark:text-slate-300">{l.payment_method}</span></span>
                                  <span className="font-mono text-slate-600 dark:text-slate-400">R$ {Number(l.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                    <Users className="h-4 w-4 text-rose-500" />
                    Vales & A Prazo
                  </h4>
                  {casaKeys.length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhum lançamento a prazo.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {casaKeys.map(forma => (
                        <div key={forma} className="flex flex-col rounded-xl bg-white shadow-sm dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden">
                          <button 
                            onClick={() => setExpandedSection(expandedSection === `casa-${forma}` ? null : `casa-${forma}`)}
                            className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
                          >
                            <span className="font-bold text-slate-700 dark:text-slate-300">{forma}</span>
                            <div className="flex items-center gap-3">
                              <span className="font-black text-rose-600">
                                R$ {resumo.CASA.detalhado[forma].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              {expandedSection === `casa-${forma}` ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </div>
                          </button>
                          {expandedSection === `casa-${forma}` && resumo.CASA.entries[forma] && (
                            <div className="bg-slate-50/80 p-3 pt-0 text-xs border-t border-slate-100 dark:border-slate-800 dark:bg-slate-950/50 flex flex-col gap-2">
                              {resumo.CASA.entries[forma].map((l: any) => {
                                const entityName = l.client?.name || l.employee?.name || l.identification || 'Não Identificado'
                                return (
                                  <div key={l.id} className="flex justify-between items-center text-slate-500">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{entityName}</span>
                                    <span className="font-mono text-slate-600 dark:text-slate-400">R$ {Number(l.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {data?.transactions && (
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                      <DollarSign className="h-4 w-4 text-indigo-500" />
                      Lançamentos no Financeiro
                    </h4>
                    <div className="flex flex-col gap-2">
                      {data.transactions
                        .filter((t: any) => t.operation !== 'cashier_summary')
                        .sort((a: any, b: any) => {
                          if (a.confirmed !== b.confirmed) {
                            return a.confirmed ? 1 : -1
                          }
                          const dateA = new Date(a.created_at || a.data_emissao || 0).getTime()
                          const dateB = new Date(b.created_at || b.data_emissao || 0).getTime()
                          return dateB - dateA
                        })
                        .map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                              {tx.description}
                            </span>
                            <span className="font-mono text-slate-500 dark:text-slate-400 text-xs">
                              R$ {Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <button
                            onClick={() => setTransactionToToggle(tx)}
                            className={cn(
                              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all hover:opacity-80",
                              tx.confirmed 
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            )}
                          >
                            {tx.confirmed ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" /> Pago
                              </>
                            ) : (
                              <>
                                <Circle className="h-3.5 w-3.5" /> Pendente
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                      {data.transactions.filter((t: any) => t.operation !== 'cashier_summary').length === 0 && (
                        <p className="text-sm text-slate-500">Nenhum lançamento encontrado.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>

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
            <AlertDialogAction onClick={handleToggleConfirm} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
