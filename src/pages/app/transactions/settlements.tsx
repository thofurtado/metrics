import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, RefreshCw, Trash2, Banknote, CheckCircle2, Rocket } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { api } from '@/lib/axios'
import { getSettlements } from '@/api/get-settlements'
import { revertSettlement } from '@/api/revert-settlement'
import { getPendingSettlements } from '@/api/get-pending-settlements'
import { getAccounts } from '@/api/get-accounts'
import { settleTermDebt } from '@/api/settle-term-debt'

import { PageHeader } from '@/components/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Pagination } from '@/components/pagination'

export function Settlements() {
  const queryClient = useQueryClient()
  
  const [pageIndex, setPageIndex] = useState(0)
  const [pendingPageIndex, setPendingPageIndex] = useState(0)
  
  // Modals state
  const [triggerModalOpen, setTriggerModalOpen] = useState(false)
  const [termModalOpen, setTermModalOpen] = useState(false)
  const [selectedTermTx, setSelectedTermTx] = useState<any>(null)
  
  // Selection
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([])
  
  // Term Debt Form state
  const [targetAccountId, setTargetAccountId] = useState('')
  const [actualMethod, setActualMethod] = useState('PIX')

  // Queries
  const { data: settlementsResult, isLoading } = useQuery({
    queryKey: ['settlements', pageIndex],
    queryFn: () => getSettlements({ pageIndex }),
  })
  const settlements = settlementsResult?.data || []

  const { data: pendingSettlementsResult, isLoading: isLoadingPending } = useQuery({
    queryKey: ['pending-settlements', pendingPageIndex],
    queryFn: () => getPendingSettlements({ pageIndex: pendingPageIndex }),
  })
  const pendingSettlements = pendingSettlementsResult?.data || []
  
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
  })

  // Auto-Settle on mount
  useEffect(() => {
    const autoSettle = async () => {
      try {
        await api.post('/trigger-settlement', undefined, { params: { onlyToday: 'true' } })
        queryClient.invalidateQueries({ queryKey: ['settlements'] })
        queryClient.invalidateQueries({ queryKey: ['pending-settlements'] })
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
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['pending-settlements'] })
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
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['pending-settlements'] })
      queryClient.invalidateQueries({ queryKey: ['finance-metrics'] })
      setTriggerModalOpen(false)
      setSelectedTxIds([])
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erro ao processar liquidações.'),
  })

  const { mutateAsync: handleSettleTerm, isPending: isSettlingTerm } = useMutation({
    mutationFn: (isWriteOff: boolean) => settleTermDebt({
      transactionId: selectedTermTx.id,
      targetAccountId: isWriteOff ? null : targetAccountId,
      actualPaymentMethod: isWriteOff ? null : actualMethod,
      isWriteOff
    }),
    onSuccess: () => {
      toast.success('Baixa realizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['pending-settlements'] })
      queryClient.invalidateQueries({ queryKey: ['finance-metrics'] })
      setTermModalOpen(false)
      setSelectedTermTx(null)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erro ao realizar baixa.'),
  })

  // Filter pending transactions
  const automaticPending = pendingSettlements.filter(tx => !['A PRAZO', 'PERMUTA'].includes(tx.payment_method?.toUpperCase()))
  const termPending = pendingSettlements.filter(tx => ['A PRAZO', 'PERMUTA'].includes(tx.payment_method?.toUpperCase()))
  
  const allAutomaticIds = automaticPending.map(t => t.id)
  const isAllSelected = allAutomaticIds.length > 0 && selectedTxIds.length === allAutomaticIds.length

  const handleSelectAll = () => {
    if (isAllSelected) setSelectedTxIds([])
    else setSelectedTxIds(allAutomaticIds)
  }

  const toggleSelection = (id: string) => {
    setSelectedTxIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  return (
    <>
      <Helmet title="Recebíveis" />
      <div className="flex flex-col gap-4 px-5 md:px-0">
        <PageHeader
          title="Recebíveis"
          description="Gestão de recebimentos futuros, liquidações de cartões e contas a prazo."
        >
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/transactions">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
            <Button variant="outline" onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['settlements'] })
              queryClient.invalidateQueries({ queryKey: ['pending-settlements'] })
            }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </PageHeader>

        <Tabs defaultValue="automatic" className="w-full mt-2">
          <TabsList className="mb-4 bg-slate-100 dark:bg-slate-900 rounded-xl p-1 h-auto">
            <TabsTrigger value="automatic" className="rounded-lg py-2.5">
              Automáticos (Cartões/Pix)
            </TabsTrigger>
            <TabsTrigger value="term" className="rounded-lg py-2.5">
              A Prazo (Clientes/Permuta)
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg py-2.5">
              Histórico de Automáticos
            </TabsTrigger>
          </TabsList>

          {/* TAB: AUTOMATICOS */}
          <TabsContent value="automatic">
            <div className="flex justify-between items-center mb-4 bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50">
              <div>
                <h3 className="font-bold text-blue-900 dark:text-blue-300">Liquidações Automáticas</h3>
                <p className="text-sm text-blue-700/80 dark:text-blue-400/80 mt-1">
                  Adiantamento de recebimentos de cartões e Pix (Liquidação invisível já roda ao abrir a tela).
                </p>
              </div>
              <Button 
                onClick={() => setTriggerModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                <Rocket className="w-4 h-4 mr-2" />
                {selectedTxIds.length > 0 ? `Adiantar ${selectedTxIds.length} Selecionados` : 'Adiantar Liquidações de Hoje'}
              </Button>
            </div>

            <div className="rounded-xl border bg-white dark:bg-slate-950 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    <TableHead className="w-[50px] text-center">
                      <Checkbox 
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        disabled={automaticPending.length === 0}
                      />
                    </TableHead>
                    <TableHead>Vencimento Previsto</TableHead>
                    <TableHead>Venda/Descrição</TableHead>
                    <TableHead>Forma Pag.</TableHead>
                    <TableHead className="text-right">Bruto (R$)</TableHead>
                    <TableHead className="text-right">Taxa</TableHead>
                    <TableHead className="text-right">Líquido Estimado (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingPending ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">Carregando pendentes...</TableCell>
                    </TableRow>
                  ) : automaticPending.length > 0 ? (
                    automaticPending.map((tx) => {
                      const taxPerc = tx.interest || 0
                      // Como a transação já foi criada líquida, tx.amount é o líquido. tx.totalValue é o bruto.
                      const bruto = tx.totalValue || tx.amount
                      const liquido = tx.amount
                      
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="text-center">
                            <Checkbox 
                              checked={selectedTxIds.includes(tx.id)}
                              onCheckedChange={() => toggleSelection(tx.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-amber-600 dark:text-amber-500">
                            {format(new Date(tx.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>{tx.description}</TableCell>
                          <TableCell className="capitalize">{tx.payment_method}</TableCell>
                          <TableCell className="text-right">
                            {bruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                          <TableCell className="text-right text-red-500">
                            {taxPerc}%
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 font-bold">
                            {liquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                        Nenhuma venda de cartão ou Pix aguardando liquidação.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {pendingSettlementsResult?.meta && pendingSettlementsResult.meta.totalPages > 1 && (
              <Pagination
                pageIndex={pendingPageIndex}
                totalCount={pendingSettlementsResult.meta.total}
                perPage={pendingSettlementsResult.meta.limit}
                onPageChange={setPendingPageIndex}
              />
            )}
          </TabsContent>

          {/* TAB: A PRAZO / PERMUTA */}
          <TabsContent value="term">
            <div className="flex justify-between items-center mb-4 bg-orange-50 dark:bg-orange-950/30 p-4 rounded-xl border border-orange-100 dark:border-orange-900/50">
              <div>
                <h3 className="font-bold text-orange-900 dark:text-orange-300">Contas A Prazo e Permutas</h3>
                <p className="text-sm text-orange-700/80 dark:text-orange-400/80 mt-1">
                  Recebimentos que dependem de acerto manual com o cliente.
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-white dark:bg-slate-950 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Descrição do Débito</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor a Receber</TableHead>
                    <TableHead className="w-[180px] text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingPending ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">Carregando contas a prazo...</TableCell>
                    </TableRow>
                  ) : termPending.length > 0 ? (
                    termPending.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium text-amber-600 dark:text-amber-500">
                          {format(new Date(tx.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-semibold">{tx.description}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                            tx.payment_method === 'PERMUTA' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {tx.payment_method}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-lg text-emerald-600">
                          {tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            size="sm" 
                            variant="default"
                            className="bg-emerald-600 hover:bg-emerald-700 font-bold shadow-sm"
                            onClick={() => {
                              setSelectedTermTx(tx)
                              setTermModalOpen(true)
                            }}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Receber
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                        Nenhuma conta a prazo pendente no momento.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {pendingSettlementsResult?.meta && pendingSettlementsResult.meta.totalPages > 1 && (
              <Pagination
                pageIndex={pendingPageIndex}
                totalCount={pendingSettlementsResult.meta.total}
                perPage={pendingSettlementsResult.meta.limit}
                onPageChange={setPendingPageIndex}
              />
            )}
          </TabsContent>

          {/* TAB: HISTORICO */}
          <TabsContent value="history">
            <div className="rounded-xl border bg-white dark:bg-slate-950 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    <TableHead>Data Emissão</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Conta Destino</TableHead>
                    <TableHead className="text-right">Bruto Original</TableHead>
                    <TableHead className="text-right">Líquido Depositado</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        Carregando histórico...
                      </TableCell>
                    </TableRow>
                  ) : settlements && settlements.length > 0 ? (
                    settlements.map((settlement) => (
                      <TableRow key={settlement.id}>
                        <TableCell className="font-medium text-slate-500">
                          {format(new Date(settlement.data_emissao), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {settlement.description || 'Liquidação'}
                        </TableCell>
                        <TableCell>
                          {settlement.accounts?.name || 'Conta Padrão'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {(settlement.totalValue || settlement.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell className="text-right text-emerald-600 font-bold">
                          {settlement.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reverter liquidação?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação marcará esta transação como Pendente novamente, e ela sairá dos relatórios de saldo atual.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => revert({ id: settlement.id })}
                                  className="bg-red-500 hover:bg-red-600 font-bold"
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
                      <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                        Nenhuma liquidação automática encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {settlementsResult?.meta && settlementsResult.meta.totalPages > 1 && (
              <Pagination
                pageIndex={pageIndex}
                totalCount={settlementsResult.meta.total}
                perPage={settlementsResult.meta.limit}
                onPageChange={setPageIndex}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* MODAL: ADIANTAR LIQUIDACOES */}
      <Dialog open={triggerModalOpen} onOpenChange={setTriggerModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Banknote size={16} />
              </div>
              {selectedTxIds.length > 0 ? `Adiantar ${selectedTxIds.length} Liquidações` : 'Liquidações Pendentes de Hoje'}
            </DialogTitle>
            <DialogDescription className="pt-2 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              {selectedTxIds.length > 0 
                ? 'Ao confirmar, as transações selecionadas entrarão no seu saldo imediatamente, independente de suas datas de vencimento reais.' 
                : 'O sistema efetivará a entrada do dinheiro líquido nos saldos bancários para os cartões vencidos até hoje.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-4">
            <Button 
              onClick={() => triggerSettlement(selectedTxIds.length > 0 ? selectedTxIds : undefined)} 
              disabled={isTriggering}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 text-sm gap-2"
            >
              {isTriggering ? 'Processando...' : (
                <>
                  <Rocket size={16} />
                  Confirmar Liquidação
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setTriggerModalOpen(false)} disabled={isTriggering}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: RECEBER A PRAZO / PERMUTA */}
      <Dialog open={termModalOpen} onOpenChange={(open) => {
        setTermModalOpen(open)
        if (!open) setSelectedTermTx(null)
      }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
              Acerto de Cliente
            </DialogTitle>
            <DialogDescription>
              Registrar o pagamento do cliente ou dar baixa na permuta.
            </DialogDescription>
          </DialogHeader>

          {selectedTermTx && (
            <div className="py-4 flex flex-col gap-5">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border">
                <p className="text-xs text-slate-500 uppercase font-bold">Referência</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">{selectedTermTx.description}</p>
                <div className="mt-3 flex justify-between items-end">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Valor</p>
                    <p className="text-2xl font-black text-emerald-600">
                      {selectedTermTx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Qual foi a forma de pagamento?</Label>
                  <Select value={actualMethod} onValueChange={setActualMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PIX">Pix</SelectItem>
                      <SelectItem value="DINHEIRO">Dinheiro Vivo</SelectItem>
                      <SelectItem value="CARTÃO DE CRÉDITO">Cartão de Crédito</SelectItem>
                      <SelectItem value="CARTÃO DE DÉBITO">Cartão de Débito</SelectItem>
                      <SelectItem value="TRANSFERÊNCIA">Transferência Bancária</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Para qual conta o dinheiro foi?</Label>
                  <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.filter(a => !a.is_transit).map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <Button 
                  onClick={() => handleSettleTerm(false)}
                  disabled={!targetAccountId || isSettlingTerm}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11"
                >
                  {isSettlingTerm ? 'Processando...' : 'Confirmar Recebimento (Gerar Saldo)'}
                </Button>
                
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground font-semibold">
                      Ou
                    </span>
                  </div>
                </div>

                <Button 
                  variant="outline"
                  onClick={() => handleSettleTerm(true)}
                  disabled={isSettlingTerm}
                  className="w-full border-orange-200 text-orange-700 hover:bg-orange-50 font-bold"
                  title="Remove da lista de cobranças sem somar dinheiro real no saldo da empresa"
                >
                  Baixar Sem Gerar Saldo (Permuta / Perdão)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
