import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getPayrollPreview, calculateRateio, generatePayrollBatch, confirmPayroll, updatePayrollEntry, deletePayrollBatch, PayrollType, getExtrasPreview } from "@/api/hr/payroll"
import { getAccounts } from "@/api/get-accounts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { CircleDollarSign, Calculator, CheckCircle2, AlertTriangle, CalendarDays, Eye, Trash2, Info } from "lucide-react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// --- Dialogs ---

function CalculateRateioDialog({ onSuccess }: { onSuccess: () => void }) {
    const [open, setOpen] = useState(false)

    // Default to previous month logic
    const today = new Date()
    const defaultDate = new Date()
    defaultDate.setMonth(defaultDate.getMonth() - 1)

    const formSchema = z.object({
        totalRevenue: z.coerce.number().min(0, "Faturamento deve ser positivo"),
        lostPercentage: z.coerce.number().min(0).max(100, "Porcentagem inválida"),
        month: z.coerce.number().min(1).max(12),
        year: z.coerce.number().min(2000),
        paymentDate: z.string().min(1, "Data de pagamento obrigatória"),
    })

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            totalRevenue: 0,
            lostPercentage: 0,
            month: defaultDate.getMonth() + 1,
            year: defaultDate.getFullYear(),
            paymentDate: today.toISOString().split('T')[0],
        }
    })

    const month = form.watch("month")
    const year = form.watch("year")

    const { data: extrasData } = useQuery({
        queryKey: ['rateio-extras', month, year],
        queryFn: () => getExtrasPreview(month, year),
        enabled: open && !!month && !!year
    })

    const totalExtras = extrasData?.totalExtras || 0

    const { mutate: calculate, isPending } = useMutation({
        mutationFn: calculateRateio,
        onSuccess: () => {
            toast.success("Pontuação calculada com sucesso!")
            onSuccess()
            setOpen(false)
        },
        onError: (err: Error) => {
            toast.error(err.message || "Erro ao calcular pontuação")
        }
    })

    // Watch for preview
    const revenue = form.watch("totalRevenue")
    const loss = form.watch("lostPercentage")
    // Formula: NetRevenue = Revenue - (Revenue * Loss%)
    const netRevenue = revenue - (revenue * (loss / 100))
    // Formula: Base = NetRevenue - Extras
    const baseForRateio = Math.max(0, netRevenue - totalExtras)
    // Formula: Pool = Base * 10%
    const distributableAmount = baseForRateio * 0.10

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
                    <form onSubmit={form.handleSubmit((data) => calculate(data as any))} className="space-y-4">

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="totalRevenue"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold">Faturamento Total (R$)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" className="bg-white dark:bg-slate-950 rounded-md" {...field} />
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
                                        <FormLabel className="font-bold text-red-500">% de Perda Estimada</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.1" className="bg-white dark:bg-slate-950 rounded-md" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border space-y-3">
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Faturamento Líquido (Est.):</span>
                                <span>{formatCurrency(netRevenue)}</span>
                            </div>

                            {/* EXTRAS ROW */}
                            <div className="flex justify-between items-center text-sm text-amber-600 dark:text-amber-500">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">Total de Extras (Deduzido):</span>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Info className="h-4 w-4 cursor-pointer hover:text-amber-800" />
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80 p-0" align="start">
                                            <div className="p-3 border-b bg-muted/50 font-medium text-sm">
                                                Detalhamento de Extras
                                            </div>
                                            <div className="max-h-60 overflow-y-auto p-2 space-y-2">
                                                {extrasData?.breakdown?.length ? (
                                                    extrasData.breakdown.map((item: any, idx: number) => (
                                                        <div key={idx} className="text-xs flex justify-between items-start border-b pb-1 last:border-0 last:pb-0">
                                                            <div>
                                                                <div className="font-medium">{item.employeeName}</div>
                                                                <div className="text-muted-foreground">{item.description}</div>
                                                            </div>
                                                            <div className="font-bold">{formatCurrency(item.value)}</div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-xs text-center text-muted-foreground py-2">Nenhum extra encontrado.</div>
                                                )}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <span className="font-bold -ml-2">{formatCurrency(totalExtras)}</span>
                            </div>

                            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                                <span className="text-purple-700 dark:text-purple-400">Disponível para Rateio (10%):</span>
                                <span className="text-purple-700 dark:text-purple-400">{formatCurrency(distributableAmount)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="month"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold">Mês Ref.</FormLabel>
                                        <Select onValueChange={v => field.onChange(Number(v))} defaultValue={String(field.value)}>
                                            <FormControl>
                                                <SelectTrigger className="rounded-md">
                                                    <SelectValue placeholder="Mês" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent withPortal={false}>
                                                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                                    <SelectItem key={m} value={String(m)}>
                                                        {new Date(0, m - 1).toLocaleString('default', { month: 'long' })}
                                                    </SelectItem>
                                                ))}
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
                            <Button type="submit" disabled={isPending} className="bg-purple-600 hover:bg-purple-700 text-white rounded-md w-full">
                                {isPending ? "Calculando..." : "Calcular e Salvar"}
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
            toast.success("Lote gerado com sucesso!")
            onSuccess()
            setOpen(false)
        },
        onError: (err: Error) => {
            toast.error(err.message || "Erro ao gerar lote")
        }
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
                        Gera pagamentos fixos (Salário ou Benefícios) para todos os funcionários elegíveis.
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
                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => mutate()} disabled={isPending}>
                        {isPending ? "Gerando..." : "Gerar Lote"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function ConfirmPayrollDialog({ totalAmount, onSuccess }: { totalAmount: number, onSuccess: () => void }) {
    const [open, setOpen] = useState(false)
    const [accountId, setAccountId] = useState("")

    const { data: accountsData } = useQuery({
        queryKey: ['accounts'],
        queryFn: getAccounts
    })

    const { mutate, isPending } = useMutation({
        mutationFn: () => confirmPayroll(accountId),
        onSuccess: () => {
            toast.success("Pagamentos confirmados e transação criada!")
            onSuccess()
            setOpen(false)
        },
        onError: (err: Error) => {
            toast.error(err.message || "Erro ao confirmar pagamentos")
        }
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
                        Isso irá gerar uma transação de SAÍDA no valor total de {formatCurrency(totalAmount)} e marcar todos os itens pendentes como PAGOS.
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
                                {accountsData?.accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        {acc.name} ({formatCurrency(acc.balance)})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={() => mutate()} disabled={!accountId || isPending || totalAmount <= 0}>
                        {isPending ? "Processando..." : `Confirmar ${formatCurrency(totalAmount)}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function getPayrollLabel(type: string) {
    if (!type) return ''
    switch (type) {
        case 'SALARIO_60': return 'Salário Mensal (Saldo)'
        case 'VALE': return 'Vale (Adiantamento)'
        case 'CESTA_BASICA': return 'Cesta Básica'
        case 'VALE_TRANSPORTE': return 'Vale Transporte'
        case 'PONTUACAO_10': return 'Pontuação (Rateio)'
        case 'DIA_EXTRA': return 'Dia Extra'
        case 'ERRO': return 'Erro / Ajuste'
        case 'CONSUMACAO': return 'Consumação'
        default: return type.replace(/_/g, ' ')
    }
}

// --- Group Details Modal ---

function GroupDetailsModal({ group, onSuccess }: { group: any, onSuccess: () => void }) {
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
        mutationFn: (data: { id: string, amount: number }) => updatePayrollEntry(data.id, { amount: data.amount }),
        onSuccess: () => {
            toast.success("Valor atualizado")
            onSuccess() // Refresh parent queries
        },
        onError: () => toast.error("Erro ao atualizar valor")
    })

    const { mutate: recalculate, isPending: isRecalculating } = useMutation({
        mutationFn: async () => {
            const rev = Number(revenue)
            const l = Number(loss)
            if (isNaN(rev) || isNaN(l)) throw new Error("Valores inválidos")

            // 1. Delete
            await deletePayrollBatch(group.type, group.date)
            // 2. Calculate
            await calculateRateio({
                totalRevenue: rev,
                lostPercentage: l,
                month: new Date(group.date).getMonth() + 1,
                year: new Date(group.date).getFullYear(),
                paymentDate: group.date
            })
        },
        onSuccess: () => {
            toast.success("Rateio recalculado!")
            onSuccess()
            setOpen(false)
        },
        onError: (err) => toast.error("Erro ao recalcular: " + err.message)
    })

    const handleAmountChange = (id: string, newAmount: string) => {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, amount: newAmount } : e))
    }

    const handleBlur = (id: string, currentAmount: string, originalAmount: number) => {
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
                    <Eye className="h-4 w-4 mr-2" />
                    Detalhes
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Detalhes: {getPayrollLabel(group?.type || '')}</DialogTitle>
                    <DialogDescription>
                        Data de Referência: {new Date(group.date).toLocaleDateString()}
                    </DialogDescription>
                </DialogHeader>

                {isRateio && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border mb-4 space-y-4">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                            <Calculator className="h-4 w-4" /> Recalcular Rateio (Isto substituirá os valores atuais)
                        </h4>
                        <div className="grid grid-cols-3 gap-4 items-end">
                            <div className="space-y-2">
                                <Label>Novo Faturamento</Label>
                                <Input
                                    type="number"
                                    value={revenue}
                                    onChange={e => setRevenue(e.target.value)}
                                    placeholder="Ex: 50000"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Nova % Perda</Label>
                                <Input
                                    type="number"
                                    value={loss}
                                    onChange={e => setLoss(e.target.value)}
                                    placeholder="Ex: 5"
                                />
                            </div>
                            <Button variant="secondary" onClick={() => recalculate()} disabled={!revenue || isRecalculating}>
                                {isRecalculating ? "Recalculando..." : "Recalcular Agora"}
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
                                <TableHead className="text-right w-[150px]">Valor (R$)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell className="font-medium">{entry.employee?.name || '---'}</TableCell>
                                    <TableCell className="text-muted-foreground">{entry.employee?.role || '---'}</TableCell>
                                    <TableCell>{entry.description}</TableCell>
                                    <TableCell className="text-right">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={entry.amount}
                                            onChange={(e) => handleAmountChange(entry.id, e.target.value)}
                                            onBlur={(e) => handleBlur(entry.id, e.target.value, entry.amount)}
                                            className="text-right h-8"
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
        queryFn: getPayrollPreview
    })

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['payroll-preview'] })

    const { mutate: deleteBatch } = useMutation({
        mutationFn: (data: { type: string, date: string }) => deletePayrollBatch(data.type, data.date),
        onSuccess: () => {
            toast.success("Lote excluído com sucesso")
            refresh()
        },
        onError: () => toast.error("Erro ao excluir lote")
    })

    const confirmDelete = (group: any) => {
        if (confirm(`Tem certeza que deseja excluir o lote ${group.type} de ${new Date(group.date).toLocaleDateString()}?`)) {
            deleteBatch({ type: group.type, date: group.date })
        }
    }

    if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando dados de folha...</div>

    const summary = data?.summary || { totalAmount: 0, byType: {} }
    const entries = data?.entries || []

    // Grouping
    const groups: Record<string, any> = {}
    entries.forEach((entry: any) => {
        const dateKey = new Date(entry.referenceDate).toISOString().split('T')[0]
        const key = `${entry.type}-${dateKey}`

        if (!groups[key]) {
            groups[key] = {
                id: key,
                type: entry.type,
                date: entry.referenceDate,
                totalAmount: 0,
                entries: []
            }
        }
        groups[key].totalAmount += Number(entry.amount)
        groups[key].entries.push(entry)
    })

    const groupedList = Object.values(groups)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Fechamento de Mês</h2>
                    <p className="text-muted-foreground">Gestão de pagamentos, rateio e auditoria final.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => navigate('/hr/payroll/history')}>
                        <CalendarDays className="h-4 w-4 mr-2" />
                        Histórico
                    </Button>
                    <GenerateBatchDialog onSuccess={refresh} />
                    <CalculateRateioDialog onSuccess={refresh} />
                </div>
            </div>

            {/* Resume Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total a Pagar</CardTitle>
                        <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.totalAmount)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {entries.length} lançamentos pendentes
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rateio (10%)</CardTitle>
                        <Calculator className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.byType['PONTUACAO_10'] || 0)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Salários Fixos</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.byType['SALARIO_60'] || 0)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* List */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Prévia de Pagamentos (Agrupado)</CardTitle>
                        <CardDescription>
                            Revise os valores por grupo antes de confirmar.
                        </CardDescription>
                    </div>
                    <ConfirmPayrollDialog totalAmount={summary.totalAmount} onSuccess={refresh} />
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tipo de Pagamento</TableHead>
                                <TableHead>Data de Previsão de Pagamento</TableHead>
                                <TableHead>Qtd. Funcionários</TableHead>
                                <TableHead className="text-right">Valor Total</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groupedList.map(group => (
                                <TableRow key={group.id}>
                                    <TableCell>
                                        <Badge variant="outline">{getPayrollLabel(group.type)}</Badge>
                                    </TableCell>
                                    <TableCell>{new Date(group.date).toLocaleDateString()}</TableCell>
                                    <TableCell>{group.entries.length}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(group.totalAmount)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <GroupDetailsModal group={group} onSuccess={refresh} />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => confirmDelete(group)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {groupedList.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        Nenhum pagamento pendente.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t flex justify-end">
                    <div className="text-sm text-muted-foreground">
                        Total Geral: <span className="font-bold text-foreground">{formatCurrency(summary.totalAmount)}</span>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
