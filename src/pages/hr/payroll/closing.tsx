import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Calculator,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  Info,
  Trash2,
  Clock,
  Users,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { getAccounts } from '@/api/get-accounts'
import {
  calculateRateio,
  confirmPayroll,
  deletePayrollBatch,
  generatePayrollBatch,
  getExtrasPreview,
  getPayrollPreview,
  PayrollType,
  updatePayrollEntry,
} from '@/api/hr/payroll'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
import { formatCurrency } from '@/lib/utils'

/** Parse a date-only string (or ISO with T00:00:00Z) into a local Date without timezone shift */
function parseDateOnly(dateStr: string): Date {
  const str = dateStr.substring(0, 10)
  const [yyyy, mm, dd] = str.split('-').map(Number)
  return new Date(yyyy, mm - 1, dd)
}

// --- Dialogs ---

function CalculateRateioDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false)

  // Default to previous month logic
  const today = new Date()
  const defaultDate = new Date()
  defaultDate.setMonth(defaultDate.getMonth() - 1)

  const formSchema = z.object({
    totalRevenue: z.coerce.number().min(0, 'Faturamento deve ser positivo'),
    lostPercentage: z.coerce.number().min(0).max(100, 'Porcentagem inválida'),
    month: z.coerce.number().min(1).max(12),
    year: z.coerce.number().min(2000),
    paymentDate: z.string().min(1, 'Data de pagamento obrigatória'),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      totalRevenue: 0,
      lostPercentage: 0,
      month: defaultDate.getMonth() + 1,
      year: defaultDate.getFullYear(),
      paymentDate: today.toISOString().split('T')[0],
    },
  })

  const month = form.watch('month')
  const year = form.watch('year')

  const { data: extrasData } = useQuery({
    queryKey: ['rateio-extras', month, year],
    queryFn: () => getExtrasPreview(month, year),
    enabled: open && !!month && !!year,
  })

  const totalExtras = extrasData?.totalExtras || 0

  const { mutate: calculate, isPending } = useMutation({
    mutationFn: calculateRateio,
    onSuccess: () => {
      toast.success('Pontuação calculada com sucesso!')
      onSuccess()
      setOpen(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao calcular pontuação')
    },
  })

  // Watch for preview
  const revenue = form.watch('totalRevenue')
  const loss = form.watch('lostPercentage')
  // Formula: NetRevenue = Revenue - (Revenue * Loss%)
  const netRevenue = revenue - revenue * (loss / 100)
  // Formula: Base = NetRevenue - Extras
  const baseForRateio = Math.max(0, netRevenue - totalExtras)
  // Formula: Pool = Base * 10%
  const distributableAmount = baseForRateio * 0.1

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Calculator className="h-4 w-4" />
          Calcular Pontuação (10%)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cálculo de Pontuação (Rateio)</DialogTitle>
          <DialogDescription>
            Informe Faturamento e Perda para calcular o rateio.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => calculate(data as any))}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalRevenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">
                      Faturamento Total (R$)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        className="rounded-md bg-white dark:bg-slate-950"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lostPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-red-500">
                      % de Perda Estimada
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        className="rounded-md bg-white dark:bg-slate-950"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3 rounded-lg border bg-slate-50 p-4 dark:bg-slate-900/50">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Faturamento Líquido (Est.):</span>
                <span>{formatCurrency(netRevenue)}</span>
              </div>

              {/* EXTRAS ROW */}
              <div className="flex items-center justify-between text-sm text-amber-600 dark:text-amber-500">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    Total de Extras (Deduzido):
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Info className="h-4 w-4 cursor-pointer hover:text-amber-800" />
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                      <div className="border-b bg-muted/50 p-3 text-sm font-medium">
                        Detalhamento de Extras
                      </div>
                      <div className="max-h-60 space-y-2 overflow-y-auto p-2">
                        {extrasData?.breakdown?.length ? (
                          extrasData.breakdown.map((item: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-start justify-between border-b pb-1 text-xs last:border-0 last:pb-0"
                            >
                              <div>
                                <div className="font-medium">
                                  {item.employeeName}
                                </div>
                                <div className="text-muted-foreground">
                                  {item.description}
                                </div>
                              </div>
                              <div className="font-bold">
                                {formatCurrency(item.value)}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-2 text-center text-xs text-muted-foreground">
                            Nenhum extra encontrado.
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <span className="-ml-2 font-bold">
                  {formatCurrency(totalExtras)}
                </span>
              </div>

              <div className="mt-2 flex justify-between border-t pt-2 text-lg font-bold">
                <span className="text-purple-700 dark:text-purple-400">
                  Disponível para Rateio (10%):
                </span>
                <span className="text-purple-700 dark:text-purple-400">
                  {formatCurrency(distributableAmount)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Mês Ref.</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(Number(v))}
                      defaultValue={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-md">
                          <SelectValue placeholder="Mês" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent withPortal={false}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(
                          (m) => (
                            <SelectItem key={m} value={String(m)}>
                              {new Date(0, m - 1).toLocaleString('default', {
                                month: 'long',
                              })}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Ano</FormLabel>
                    <FormControl>
                      <Input type="number" className="rounded-md" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Data Pagamento</FormLabel>
                    <FormControl>
                      <Input type="date" className="rounded-md" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={isPending}
                className="w-full rounded-md bg-purple-600 text-white hover:bg-purple-700"
              >
                {isPending ? 'Calculando...' : 'Calcular e Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function GenerateBatchDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<PayrollType>('SALARIO_60')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const { mutate, isPending } = useMutation({
    mutationFn: () => generatePayrollBatch(type, date),
    onSuccess: () => {
      toast.success('Lote gerado com sucesso!')
      onSuccess()
      setOpen(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao gerar lote')
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CalendarDays className="h-4 w-4" />
          Gerar Folha (Lote)
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar Lote de Pagamento</DialogTitle>
          <DialogDescription>
            Gera pagamentos fixos (Salário ou Benefícios) para todos os
            funcionários elegíveis.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tipo de Pagamento</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent withPortal={false}>
                <SelectItem value="SALARIO_60">Salário (Dia 05)</SelectItem>
                <SelectItem value="VALE">Vale (Dia 20)</SelectItem>
                <SelectItem value="CESTA_BASICA">Cesta Básica</SelectItem>
                <SelectItem value="VALE_TRANSPORTE">Vale Transporte</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data de Referência</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutate()} disabled={isPending}>
            {isPending ? 'Gerando...' : 'Gerar Lote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmPayrollDialog({
  totalAmount,
  onSuccess,
}: {
  totalAmount: number
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [accountId, setAccountId] = useState('')

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
  })

  const { mutate, isPending } = useMutation({
    mutationFn: () => confirmPayroll(accountId),
    onSuccess: () => {
      toast.success('Pagamentos confirmados e transação criada!')
      onSuccess()
      setOpen(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao confirmar pagamentos')
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" disabled={totalAmount <= 0}>
          <CheckCircle2 className="h-4 w-4" />
          Confirmar Fechamento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Fechamento de Mês</DialogTitle>
          <DialogDescription>
            Isso irá gerar uma transação de SAÍDA no valor total de{' '}
            {formatCurrency(totalAmount)} e marcar todos os itens pendentes como
            PAGOS.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Conta para Débito</Label>
            <Select onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta..." />
              </SelectTrigger>
              <SelectContent withPortal={false}>
                {accountsData?.accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.balance)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutate()}
            disabled={!accountId || isPending || totalAmount <= 0}
          >
            {isPending
              ? 'Processando...'
              : `Confirmar ${formatCurrency(totalAmount)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function getPayrollLabel(type: string) {
  if (!type) return ''
  switch (type) {
    case 'SALARIO_60':
      return 'Salário Mensal (Saldo)'
    case 'VALE':
      return 'Vale (Adiantamento)'
    case 'CESTA_BASICA':
      return 'Cesta Básica'
    case 'VALE_TRANSPORTE':
      return 'Vale Transporte'
    case 'PONTUACAO_10':
      return 'Pontuação (Rateio)'
    case 'DIA_EXTRA':
      return 'Dia Extra'
    case 'ERRO':
      return 'Erro / Ajuste'
    case 'CONSUMACAO':
      return 'Consumação'
    default:
      return type.replace(/_/g, ' ')
  }
}

// --- Group Details Modal ---

function GroupDetailsModal({
  group,
  onSuccess,
}: {
  group: any
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<any[]>([])

  // Recalculation state
  const [revenue, setRevenue] = useState<string>('')
  const [loss, setLoss] = useState<string>('')
  const isRateio = group?.type === 'PONTUACAO_10'

  useEffect(() => {
    if (group?.entries) {
      setEntries(group.entries)
    }
  }, [group, open])

  const { mutate: updateEntry } = useMutation({
    mutationFn: (data: { id: string; amount: number }) =>
      updatePayrollEntry(data.id, { amount: data.amount }),
    onSuccess: () => {
      toast.success('Valor atualizado')
      onSuccess() // Refresh parent queries
    },
    onError: () => toast.error('Erro ao atualizar valor'),
  })

  const { mutate: recalculate, isPending: isRecalculating } = useMutation({
    mutationFn: async () => {
      const rev = Number(revenue)
      const l = Number(loss)
      if (isNaN(rev) || isNaN(l)) throw new Error('Valores inválidos')

      // 1. Delete
      await deletePayrollBatch(group.type, group.date)
      // 2. Calculate
      await calculateRateio({
        totalRevenue: rev,
        lostPercentage: l,
        month: new Date(group.date).getMonth() + 1,
        year: new Date(group.date).getFullYear(),
        paymentDate: group.date,
      })
    },
    onSuccess: () => {
      toast.success('Rateio recalculado!')
      onSuccess()
      setOpen(false)
    },
    onError: (err) => toast.error('Erro ao recalcular: ' + err.message),
  })

  const handleAmountChange = (id: string, newAmount: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, amount: newAmount } : e)),
    )
  }

  const handleBlur = (
    id: string,
    currentAmount: string,
    originalAmount: number,
  ) => {
    const val = Number(currentAmount)
    if (!isNaN(val) && val !== Number(originalAmount)) {
      updateEntry({ id, amount: val })
    }
  }

  if (!group) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="mr-2 h-4 w-4" />
          Detalhes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Detalhes: {getPayrollLabel(group?.type || '')}
          </DialogTitle>
          <DialogDescription>
            Data de Referência: {parseDateOnly(group.date).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        {isRateio && (
          <div className="mb-4 space-y-4 rounded-lg border bg-slate-50 p-4 dark:bg-slate-900/50">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Calculator className="h-4 w-4" /> Recalcular Rateio (Isto
              substituirá os valores atuais)
            </h4>
            <div className="grid grid-cols-3 items-end gap-4">
              <div className="space-y-2">
                <Label>Novo Faturamento</Label>
                <Input
                  type="number"
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value)}
                  placeholder="Ex: 50000"
                />
              </div>
              <div className="space-y-2">
                <Label>Nova % Perda</Label>
                <Input
                  type="number"
                  value={loss}
                  onChange={(e) => setLoss(e.target.value)}
                  placeholder="Ex: 5"
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => recalculate()}
                disabled={!revenue || isRecalculating}
              >
                {isRecalculating ? 'Recalculando...' : 'Recalcular Agora'}
              </Button>
            </div>
          </div>
        )}

        <div className="py-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[150px] text-right">
                  Valor (R$)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {entry.employee?.name || '---'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.employee?.role || '---'}
                  </TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step="0.01"
                      value={entry.amount}
                      onChange={(e) =>
                        handleAmountChange(entry.id, e.target.value)
                      }
                      onBlur={(e) =>
                        handleBlur(entry.id, e.target.value, entry.amount)
                      }
                      className="h-8 text-right"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- Main Page ---

export function PayrollClosing() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-preview'],
    queryFn: getPayrollPreview,
  })

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['payroll-preview'] })

  const { mutate: deleteBatch } = useMutation({
    mutationFn: (data: { type: string; date: string }) =>
      deletePayrollBatch(data.type, data.date),
    onSuccess: () => {
      toast.success('Lote excluído com sucesso')
      refresh()
    },
    onError: () => toast.error('Erro ao excluir lote'),
  })

  const confirmDelete = (group: any) => {
    if (
      confirm(
        `Tem certeza que deseja excluir o lote ${group.type} de ${parseDateOnly(group.date).toLocaleDateString()}?`,
      )
    ) {
      deleteBatch({ type: group.type, date: group.date })
    }
  }

  if (isLoading)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Carregando dados de folha...
      </div>
    )

  const summary = data?.summary || { totalAmount: 0, byType: {} }
  const entries = data?.entries || []

  // Grouping
  const groups: Record<string, any> = {}
  entries.forEach((entry: any) => {
    const dateKey = parseDateOnly(entry.referenceDate)
      .toISOString()
      .split('T')[0]
    const key = `${entry.type}-${dateKey}`

    if (!groups[key]) {
      groups[key] = {
        id: key,
        type: entry.type,
        date: entry.referenceDate,
        totalAmount: 0,
        entries: [],
      }
    }
    groups[key].totalAmount += Number(entry.amount)
    groups[key].entries.push(entry)
  })

  const groupedList = Object.values(groups)

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Fechamento de Folha & Lotes
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Apuração de salários, rateio de gorjetas, adiantamentos e confirmação bancária.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/hr/payroll/history')}
            className="rounded-xl shadow-sm"
          >
            <CalendarDays className="mr-1.5 h-4 w-4 text-muted-foreground" />
            Histórico
          </Button>
          <GenerateBatchDialog onSuccess={refresh} />
          <CalculateRateioDialog onSuccess={refresh} />
        </div>
      </div>

      {/* Modern KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-emerald-50/20 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/50">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total a Pagar
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CircleDollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 sm:text-3xl">
            {formatCurrency(summary.totalAmount)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {entries.length} lançamentos pendentes
          </p>
        </Card>

        <Card className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-blue-50/20 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/50">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Rateio (10%)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Calculator className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            {formatCurrency(summary.byType.PONTUACAO_10 || 0)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Gorjetas apuradas no período
          </p>
        </Card>

        <Card className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-purple-50/20 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/50">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Salários Fixos (CLT)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            {formatCurrency(summary.byType.SALARIO_60 || 0)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Saldo de salário mensal
          </p>
        </Card>

        <Card className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-amber-50/20 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/50">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Lotes Pendentes
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            {groupedList.length}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Lotes prontos para confirmação
          </p>
        </Card>
      </div>

      {/* Grouped Payments Table & Cards */}
      <Card className="rounded-2xl border border-slate-200/70 shadow-sm dark:border-slate-800">
        <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-bold sm:text-lg">
              Prévia de Pagamentos por Lote
            </CardTitle>
            <CardDescription>
              Revise os valores e datas de cada grupo antes de confirmar o lote financeiro.
            </CardDescription>
          </div>
          <ConfirmPayrollDialog
            totalAmount={summary.totalAmount}
            onSuccess={refresh}
          />
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-muted/40">
                  <TableHead className="w-[240px]">Tipo de Pagamento</TableHead>
                  <TableHead>Data de Previsão</TableHead>
                  <TableHead className="text-center">Colaboradores</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="w-[140px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      Nenhum lote de pagamento pendente. Clique em "Gerar Lote" ou "Calcular Rateio" acima.
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedList.map((group) => (
                    <TableRow key={group.id} className="transition-colors hover:bg-muted/30">
                      <TableCell>
                        <Badge variant="outline" className="rounded-lg font-semibold">
                          {getPayrollLabel(group.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {parseDateOnly(group.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold dark:bg-slate-800">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {group.entries.length}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(group.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <GroupDetailsModal group={group} onSuccess={refresh} />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => confirmDelete(group)}
                            className="h-8 w-8 rounded-lg p-0 text-destructive hover:bg-destructive/10"
                            title="Excluir Lote"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3 p-4 md:hidden">
            {groupedList.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhum lote de pagamento pendente.
              </div>
            ) : (
              groupedList.map((group) => (
                <div
                  key={group.id}
                  className="space-y-3 rounded-2xl border border-slate-200/80 bg-card p-4 shadow-sm dark:border-slate-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="outline" className="text-xs font-bold">
                        {getPayrollLabel(group.type)}
                      </Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Previsão: {parseDateOnly(group.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold dark:bg-slate-800">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {group.entries.length} pessoas
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800/60">
                    <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(group.totalAmount)}
                    </span>
                    <div className="flex items-center gap-1">
                      <GroupDetailsModal group={group} onSuccess={refresh} />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDelete(group)}
                        className="h-8 w-8 rounded-lg p-0 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between rounded-b-2xl border-t bg-slate-50/50 p-4 dark:bg-slate-900/50">
          <span className="text-xs text-muted-foreground">
            Lançamentos consolidados
          </span>
          <div className="text-sm font-medium text-muted-foreground">
            Total Previsto:{' '}
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summary.totalAmount)}
            </span>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
