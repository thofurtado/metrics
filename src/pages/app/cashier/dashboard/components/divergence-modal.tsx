import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { resolveDivergence } from '@/api/cashier/cashier'
import { getAccounts } from '@/api/get-accounts'
import { toast } from 'sonner'

interface DivergenceModalProps {
  isOpen: boolean
  onClose: () => void
  session: any
}

export function DivergenceModal({ isOpen, onClose, session }: DivergenceModalProps) {
  const queryClient = useQueryClient()
  const [action, setAction] = useState<'JUSTIFY' | 'DESTINATION' | null>(null)
  const [reason, setReason] = useState('')
  const [accountId, setAccountId] = useState('none')

  const { data: dbAccounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
    enabled: isOpen && action === 'DESTINATION'
  })

  // Auto-select "Caixa Central" if exists
  useEffect(() => {
    if (dbAccounts?.accounts && action === 'DESTINATION' && accountId === 'none') {
      const central = dbAccounts.accounts.find(a => a.name.toLowerCase().includes('caixa central') || a.name.toLowerCase().includes('cofre'))
      if (central) {
        setAccountId(central.id)
      } else if (dbAccounts.accounts.length > 0) {
        setAccountId(dbAccounts.accounts[0].id)
      }
    }
  }, [dbAccounts, action])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAction(null)
      setReason('')
      setAccountId('none')
    }
  }, [isOpen])

  const { mutateAsync: resolveMutate, isPending } = useMutation({
    mutationFn: resolveDivergence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-audit'] })
      queryClient.invalidateQueries({ queryKey: ['cashier-sessions'] })
      toast.success('Divergência resolvida com sucesso!')
      onClose()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao resolver divergência')
    }
  })

  const handleSubmit = async () => {
    if (!action) return toast.error('Escolha uma ação')
    if (!reason) return toast.error('Digite uma justificativa ou destino')
    
    await resolveMutate({
      session_id: session.id,
      amount: session.divergencia,
      action,
      reason,
      account_id: action === 'DESTINATION' && accountId !== 'none' ? accountId : undefined
    })
  }

  const isResolved = session.statusComparacao === 'RESOLVIDO'
  const resolution = session.resolutionDetails

  const divergencia = session.divergencia || 0
  const isFaltando = divergencia < 0
  const absDivergencia = Math.abs(divergencia).toFixed(2)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isResolved ? 'text-indigo-600' : 'text-red-600'}`}>
            {isResolved ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            {isResolved ? 'Divergência Resolvida' : 'Resolver Divergência'}
          </DialogTitle>
          <DialogDescription>
            {isFaltando ? (
              <>Faltam <strong className="text-red-500">R$ {absDivergencia}</strong> em relação à abertura do próximo caixa.</>
            ) : (
              <>Sobram <strong className="text-emerald-500">R$ {absDivergencia}</strong> em relação à abertura do próximo caixa.</>
            )}
            {!isResolved && <><br/>O que aconteceu com esse valor?</>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {isResolved ? (
            <div className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/30 dark:bg-indigo-950/20">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Ação Tomada</Label>
                <div className="font-medium text-slate-700 dark:text-slate-300">
                  {resolution?.type === 'SANGRIA_DESTINO' ? 'Destinado a Conta Bancária' : 'Justificativa Apenas'}
                </div>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Motivo / Descrição</Label>
                <div className="font-medium text-slate-700 dark:text-slate-300">
                  {resolution?.reason || 'Sem justificativa informada'}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Resolvido por</Label>
                <div className="font-medium text-slate-700 dark:text-slate-300">
                  {resolution?.author || 'Sistema'}
                </div>
              </div>

              {resolution?.type === 'SANGRIA_DESTINO' && (
                <div className="space-y-2 pt-3 border-t border-indigo-100 dark:border-indigo-900/40 mt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs text-slate-500">Conta de Destino</Label>
                      <div className="font-medium text-slate-700 dark:text-slate-300">{resolution?.bank}</div>
                    </div>
                    <Button variant="default" size="sm" className="h-8 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" asChild>
                      <a href={`/transactions?openBatch=${session.id}`} target="_blank" rel="noreferrer">
                        Ver no Financeiro
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  type="button" 
                  variant={action === 'JUSTIFY' ? 'default' : 'outline'}
                  onClick={() => setAction('JUSTIFY')}
                  className={action === 'JUSTIFY' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                >
                  <Info className="w-4 h-4 mr-2" />
                  Dar Justificativa
                </Button>
                <Button 
                  type="button" 
                  variant={action === 'DESTINATION' ? 'default' : 'outline'}
                  onClick={() => setAction('DESTINATION')}
                  className={action === 'DESTINATION' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                  disabled={!isFaltando} // Desabilita destino se for SOBRA (positivo)
                  title={!isFaltando ? 'Não é possível destinar sobras de caixa' : undefined}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Determinar Destino
                </Button>
              </div>

              {action && (
                <div className="space-y-4 animate-in fade-in zoom-in duration-200">
                  {action === 'DESTINATION' && (
                    <div className="space-y-2">
                      <Label>Conta de Destino (Opcional)</Label>
                      <Select value={accountId} onValueChange={setAccountId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione para onde foi o dinheiro" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma (Apenas Ajuste)</SelectItem>
                          {dbAccounts?.accounts?.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Ao confirmar, uma Receita será gerada nesta conta para abater o dinheiro vivo que entrou pra empresa.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Motivo / Descrição</Label>
                    <Input 
                      placeholder={action === 'DESTINATION' ? "Ex: Depositado no Itaú, Levou pra casa..." : "Ex: Dinheiro perdido, troco errado..."}
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          {isResolved ? (
            <Button onClick={onClose}>Fechar</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button disabled={!action || isPending} onClick={handleSubmit}>
                {isPending ? 'Salvando...' : 'Confirmar Resolução'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
