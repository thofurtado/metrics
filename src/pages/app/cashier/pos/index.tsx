import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { getActiveSession, openSession, closeSession, createEntry, getPaymentMethods, getPOSMachines, getPaymentConditions } from '@/api/cashier/cashier'
import { getCategories } from '@/api/get-categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/utils/format-currency'

export function CashierPOS() {
  const queryClient = useQueryClient()
  const { data: session, isLoading } = useQuery({
    queryKey: ['active-cashier-session'],
    queryFn: getActiveSession,
    retry: false
  })

  if (isLoading) {
    return <div className="p-8">Carregando PDV...</div>
  }

  if (!session) {
    return <OpenSessionForm />
  }

  return <POSInterface session={session} />
}

function OpenSessionForm() {
  const queryClient = useQueryClient()
  const [initialBalance, setInitialBalance] = useState('')
  
  const mutation = useMutation({
    mutationFn: openSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-cashier-session'] })
      toast.success('Caixa aberto com sucesso')
    },
    onError: (error) => {
      toast.error('Erro ao abrir caixa')
    }
  })

  return (
    <div className="flex h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Abrir Caixa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Fundo de Troco (R$)</label>
            <Input
              type="number"
              step="0.01"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="Ex: 100.00"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={() => mutation.mutate({ initial_balance: parseFloat(initialBalance || '0') })}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Abrindo...' : 'Abrir Caixa'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

function POSInterface({ session }: { session: any }) {
  const queryClient = useQueryClient()
  const [type, setType] = useState<'INCOME'|'EXPENSE'>('INCOME')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [methodId, setMethodId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [conditionId, setConditionId] = useState('')

  const { data: methods } = useQuery({ queryKey: ['payment-methods'], queryFn: getPaymentMethods })
  const { data: conditions } = useQuery({ queryKey: ['payment-conditions'], queryFn: getPaymentConditions })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: getCategories })

  const entryMutation = useMutation({
    mutationFn: createEntry,
    onSuccess: () => {
      toast.success('Lançamento registrado')
      setAmount('')
      setDescription('')
      // Idealmente, recarregar a lista de lançamentos aqui
    },
    onError: () => toast.error('Erro ao registrar lançamento')
  })

  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [reportedAmounts, setReportedAmounts] = useState<Record<number, string>>({})

  const closeMutation = useMutation({
    mutationFn: closeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-cashier-session'] })
      toast.success('Caixa fechado com sucesso')
      setCloseDialogOpen(false)
    },
    onError: () => toast.error('Erro ao fechar caixa')
  })

  const handleCloseSession = () => {
    const formattedAmounts = Object.entries(reportedAmounts).map(([id, amount]) => ({
      payment_method_id: Number(id),
      reported_amount: parseFloat(amount || '0')
    }))
    closeMutation.mutate({ reported_amounts: formattedAmounts })
  }

  return (
    <div className="flex h-full flex-col p-4 md:p-8 space-y-4">
      <div className="flex items-center justify-between bg-card p-4 rounded-lg shadow-sm border">
        <div>
          <h2 className="text-xl font-bold">PDV - Caixa Aberto</h2>
          <p className="text-sm text-muted-foreground">ID: {session.id} | Abertura: {new Date(session.opened_at).toLocaleString()}</p>
        </div>
        <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">Fechar Caixa</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Fechamento de Caixa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">Informe os valores contados em gaveta/maquineta para cada método de pagamento:</p>
              {methods?.map((m) => (
                <div key={m.id} className="flex items-center gap-4">
                  <span className="w-1/3 text-sm">{m.name}</span>
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={reportedAmounts[m.id] || ''}
                    onChange={(e) => setReportedAmounts({ ...reportedAmounts, [m.id]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCloseSession} disabled={closeMutation.isPending}>Confirmar Fechamento</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Novo Lançamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button 
                variant={type === 'INCOME' ? 'default' : 'outline'} 
                className="flex-1"
                onClick={() => setType('INCOME')}
              >
                Entrada
              </Button>
              <Button 
                variant={type === 'EXPENSE' ? 'destructive' : 'outline'} 
                className="flex-1"
                onClick={() => setType('EXPENSE')}
              >
                Saída
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Valor (R$)</label>
                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Método de Pagamento</label>
                <Select value={methodId} onValueChange={setMethodId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {methods?.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria</label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {categories?.categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Condição</label>
                <Select value={conditionId} onValueChange={setConditionId}>
                  <SelectTrigger><SelectValue placeholder="Opcional..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {conditions?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            
            <Button 
              className="w-full"
              onClick={() => {
                entryMutation.mutate({
                  type,
                  amount: parseFloat(amount),
                  description,
                  payment_method_id: methodId ? Number(methodId) : undefined,
                  category_id: categoryId ? Number(categoryId) : undefined,
                  condition_id: conditionId && conditionId !== 'none' ? Number(conditionId) : undefined
                })
              }}
              disabled={entryMutation.isPending || !amount}
            >
              Registrar {type === 'INCOME' ? 'Entrada' : 'Saída'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo do Caixa</CardTitle>
          </CardHeader>
          <CardContent>
            {/* To be implemented: list of recent entries or session totals */}
            <p className="text-sm text-muted-foreground">O histórico de lançamentos desta sessão aparecerá aqui.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
