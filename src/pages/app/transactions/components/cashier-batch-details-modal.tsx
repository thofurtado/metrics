import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Landmark, Users, CreditCard, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getSessionDetails } from '@/api/cashier/cashier'
import dayjs from 'dayjs'
import { ScrollArea } from '@/components/ui/scroll-area'

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

  const { data, isLoading } = useQuery({
    queryKey: ['cashier-session', sessionId],
    queryFn: () => getSessionDetails(sessionId!),
    enabled: open && !!sessionId,
  })

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
        <DialogHeader className="bg-slate-900 px-6 py-5 text-white">
          <DialogTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
            <Landmark className="h-5 w-5 text-amber-500" />
            Detalhes do Lote de Caixa
          </DialogTitle>
          {data?.session && (
            <p className="text-sm font-medium text-slate-400">
              {dayjs(data.session.opened_at).format('DD/MM/YYYY')} —{' '}
              {dayjs(data.session.opened_at).hour() < 16 ? 'Almoço' : 'Jantar'}
            </p>
          )}
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
            <ScrollArea className="max-h-[60vh] pr-4">
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
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
