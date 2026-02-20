import { useState, useMemo } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { listTimeClocks, updateTimeClock, TimeClock } from "@/api/hr/time-clock"
import { getEmployees } from "@/api/hr/employees"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Search, Pencil, CalendarDays, AlertTriangle, TrendingUp, CheckCircle2, XCircle, Calendar, Filter } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { differenceInMinutes, parseISO, format, isWeekend, startOfMonth, endOfMonth } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn, formatCurrency } from "@/lib/utils"

// --- Helpers ---
const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "--:--"
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const calculateWorkedMinutes = (tc: TimeClock) => {
    if (!tc.clockIn || !tc.clockOut) return 0
    let total = differenceInMinutes(parseISO(tc.clockOut), parseISO(tc.clockIn))
    if (tc.breakStart && tc.breakEnd) {
        const breakDuration = differenceInMinutes(parseISO(tc.breakEnd), parseISO(tc.breakStart))
        total -= breakDuration
    }
    return total > 0 ? total : 0
}

const minutesToHHMM = (minutes: number) => {
    const absMinutes = Math.abs(minutes)
    const h = Math.floor(absMinutes / 60)
    const m = absMinutes % 60
    return `${minutes < 0 ? '-' : ''}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

// --- Components ---

function EditTimeClockDialog({ timeClock, onSuccess }: { timeClock: TimeClock, onSuccess: () => void }) {
    const [open, setOpen] = useState(false)
    const [data, setData] = useState({
        clockIn: timeClock.clockIn ? new Date(timeClock.clockIn).toISOString().slice(0, 16) : "",
        breakStart: timeClock.breakStart ? new Date(timeClock.breakStart).toISOString().slice(0, 16) : "",
        breakEnd: timeClock.breakEnd ? new Date(timeClock.breakEnd).toISOString().slice(0, 16) : "",
        clockOut: timeClock.clockOut ? new Date(timeClock.clockOut).toISOString().slice(0, 16) : "",
        isExtraDay: timeClock.isExtraDay || false,
        negotiatedValue: timeClock.negotiatedValue || 0,
        notes: timeClock.notes || ""
    })

    const { mutate, isPending } = useMutation({
        mutationFn: () => updateTimeClock(timeClock.id, {
            ...data,
            clockIn: data.clockIn || null,
            breakStart: data.breakStart || null,
            breakEnd: data.breakEnd || null,
            clockOut: data.clockOut || null,
        }),
        onSuccess: () => {
            toast.success("Registro atualizado!")
            onSuccess()
            setOpen(false)
        },
        onError: () => toast.error("Erro ao atualizar registro.")
    })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Editar Ponto: {new Date(timeClock.date).toLocaleDateString()}</DialogTitle>
                    <DialogDescription>
                        Ajuste os horários e marque diárias extras.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Iniciar Expediente</Label>
                            <Input type="datetime-local" value={data.clockIn} onChange={e => setData({ ...data, clockIn: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Fim de Expediente</Label>
                            <Input type="datetime-local" value={data.clockOut} onChange={e => setData({ ...data, clockOut: e.target.value })} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Pausa para Almoço</Label>
                            <Input type="datetime-local" value={data.breakStart} onChange={e => setData({ ...data, breakStart: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Retorno do Almoço</Label>
                            <Input type="datetime-local" value={data.breakEnd} onChange={e => setData({ ...data, breakEnd: e.target.value })} />
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 border p-2 rounded bg-muted/20">
                        <Checkbox id="extraday" checked={data.isExtraDay} onCheckedChange={(c) => setData({ ...data, isExtraDay: !!c })} />
                        <Label htmlFor="extraday" className="cursor-pointer">Diária Extra (Rateio Negociado)</Label>
                    </div>

                    {data.isExtraDay && (
                        <div className="space-y-2 animate-in slide-in-from-top-2">
                            <Label>Valor Negociado (R$)</Label>
                            <Input type="number" value={data.negotiatedValue} onChange={e => setData({ ...data, negotiatedValue: Number(e.target.value) })} />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Observações</Label>
                        <Textarea value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })} placeholder="Motivo do ajuste..." />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => mutate()} disabled={isPending}>Salvar Alterações</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// --- Closing Conference Dialog ---

function ClosingConferenceDialog({
    month,
    year,
    clocks,
    onConfirm
}: {
    month: number,
    year: number,
    clocks: TimeClock[],
    onConfirm: () => void
}) {
    const [open, setOpen] = useState(false)

    // Group totals by employee
    const employeeTotals = useMemo(() => {
        const totals: Record<string, { name: string, balance: number, extraDays: number }> = {}
        const EXPECTED_MINUTES_PER_DAY = 8 * 60 + 48

        clocks.forEach(tc => {
            const empId = tc.employee_id
            if (!totals[empId]) {
                totals[empId] = {
                    name: tc.employee?.name || 'Desconhecido',
                    balance: 0,
                    extraDays: 0
                }
            }

            if (tc.isExtraDay) {
                totals[empId].extraDays++
            } else if (tc.clockIn && tc.clockOut) {
                const worked = calculateWorkedMinutes(tc)
                const isWeekendDay = isWeekend(parseISO(tc.date))
                const balance = worked - ((!isWeekendDay) ? EXPECTED_MINUTES_PER_DAY : 0) // If weekend, all worked is positive balance? Or standard 0? 

                totals[empId].balance += balance
            }
        })
        return Object.values(totals).sort((a, b) => b.balance - a.balance)
    }, [clocks])

    const totalBalance = employeeTotals.reduce((acc, curr) => acc + curr.balance, 0)
    const totalExtras = employeeTotals.reduce((acc, curr) => acc + curr.extraDays, 0)

    const handleConfirm = () => {
        setOpen(false)
        toast.promise(
            new Promise((resolve) => setTimeout(resolve, 2000)),
            {
                loading: 'Processando fechamento...',
                success: () => {
                    onConfirm()
                    return 'Conferência realizada com sucesso! Dados prontos para o Financeiro.'
                },
                error: 'Erro ao processar fechamento'
            }
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Conferência de Fechamento
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Conferência de Fechamento: {format(new Date(year, month, 1), 'MMMM/yyyy', { locale: ptBR })}</DialogTitle>
                    <DialogDescription>
                        Revise os saldos de horas antes de enviar para o financeiro.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-4 py-4">
                    <Card className="bg-slate-50 border-slate-200">
                        <CardHeader className="p-3">
                            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Saldo Total</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <div className={cn("text-2xl font-bold", totalBalance > 0 ? "text-emerald-600" : "text-red-500")}>
                                {minutesToHHMM(totalBalance)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-50 border-slate-200">
                        <CardHeader className="p-3">
                            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Diárias Extras</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <div className="text-2xl font-bold text-slate-700">
                                {totalExtras}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-50 border-slate-200">
                        <CardHeader className="p-3">
                            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Status</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <div className="text-2xl font-bold text-blue-600">
                                Aguardando Validação
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>Colaborador</TableHead>
                                <TableHead className="text-center w-[120px]">Diárias Extras</TableHead>
                                <TableHead className="text-right w-[150px]">Saldo de Horas</TableHead>
                                <TableHead className="text-right">Ação Sugerida</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employeeTotals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        Nenhum registro encontrado para este período.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                employeeTotals.map((emp, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">{emp.name}</TableCell>
                                        <TableCell className="text-center">
                                            {emp.extraDays > 0 ? <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">{emp.extraDays}</Badge> : '-'}
                                        </TableCell>
                                        <TableCell className={cn("text-right font-mono font-bold", emp.balance > 0 ? "text-emerald-600" : emp.balance <= -10 ? "text-red-500" : "text-muted-foreground")}>
                                            {minutesToHHMM(emp.balance)}
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">
                                            {emp.balance > 600 ? "Pagamento de HE" : emp.balance > 0 ? "Banco de Horas" : emp.balance < 0 ? "Desconto/Banco" : "---"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleConfirm} className="bg-emerald-600 hover:bg-emerald-700 ml-2">
                        Confirmar e Processar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// --- Main Page Component ---

export function TimeClockAudit() {
    const navigate = useNavigate()
    const today = new Date()

    // Filters State
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth())
    const [selectedYear, setSelectedYear] = useState(today.getFullYear())
    const [employeeId, setEmployeeId] = useState<string>("all")
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'overtime' | 'missing'>('all')

    // Calculated Date Range
    const dateRange = useMemo(() => {
        const date = new Date(selectedYear, selectedMonth, 1)
        return {
            start: format(startOfMonth(date), 'yyyy-MM-dd'),
            end: format(endOfMonth(date), 'yyyy-MM-dd')
        }
    }, [selectedMonth, selectedYear])

    // Fetch Employees
    const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: getEmployees })

    // Fetch Time Clocks
    const { data: timeClocksResponse, refetch, isLoading } = useQuery({
        queryKey: ['time-clocks', dateRange, employeeId],
        queryFn: () => listTimeClocks({
            startDate: dateRange.start,
            endDate: dateRange.end,
            employee_id: employeeId === 'all' ? undefined : employeeId,
            per_page: 1000 // Get all for client-side processing/aggregation
        })
    })

    const timeClocks = timeClocksResponse?.data || []

    // --- Computed Metrics ---

    const metrics = useMemo(() => {
        let totalOvertimeMinutes = 0
        let inconsistencies = 0
        let absences = 0
        let estimatedCost = 0

        const EXPECTED_MINUTES_PER_DAY = 8 * 60 + 48 // 8h48m typical

        timeClocks.forEach(tc => {
            const worked = calculateWorkedMinutes(tc)
            const isWeekendDay = isWeekend(parseISO(tc.date))
            const isFuture = parseISO(tc.date) > new Date()

            // Check Inconsistency
            if (!isFuture) {
                if ((tc.clockIn && !tc.clockOut) || (!tc.clockIn && tc.clockOut)) {
                    inconsistencies++
                }
            }

            // Check Absence (No punch on weekday)
            if (!tc.clockIn && !tc.isExtraDay && !isWeekendDay && !isFuture) {
                absences++
            }

            // Calculate Balance
            if (tc.clockIn && tc.clockOut && !tc.isExtraDay) {
                const balance = worked - EXPECTED_MINUTES_PER_DAY
                if (balance > 0) {
                    totalOvertimeMinutes += balance
                    // Estimate Cost (Example: base salary 2000 / 220h * 1.5) - just a placeholder
                    // We need employee data for real calculation
                    estimatedCost += (balance / 60) * (15) // R$15/h estimated base
                }
            }
        })

        return {
            formattedOvertime: minutesToHHMM(totalOvertimeMinutes),
            inconsistencies,
            absences,
            estimatedCost: formatCurrency(estimatedCost)
        }
    }, [timeClocks])

    // --- Filtering Logic ---
    const filteredClocks = useMemo(() => {
        return timeClocks.filter(tc => {
            const worked = calculateWorkedMinutes(tc)
            const EXPECTED = 8 * 60 + 48
            const date = parseISO(tc.date)
            const isWeekendDay = isWeekend(date)
            const isFuture = date > new Date()

            if (statusFilter === 'pending') return !tc.isVerified && !tc.isExtraDay && !isFuture
            if (statusFilter === 'overtime') return worked > EXPECTED
            if (statusFilter === 'missing') return !tc.clockIn && !isWeekendDay && !isFuture && !tc.isExtraDay

            return true
        })
    }, [timeClocks, statusFilter])


    // Helpers for Select
    const months = Array.from({ length: 12 }, (_, i) => ({
        value: i, label: format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })
    }))

    const years = [2023, 2024, 2025, 2026]

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gestão de Ponto</h2>
                    <p className="text-muted-foreground">Central de auditoria e fechamento mensal.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => refetch()} className="gap-2">
                        <Search className="h-4 w-4" />
                        Atualizar data
                    </Button>

                    <ClosingConferenceDialog
                        month={selectedMonth}
                        year={selectedYear}
                        clocks={timeClocks}
                        onConfirm={() => {
                            // Logic to navigate or update
                            // toast.success("Fechamento realizado parcialmente (Simulação)") 
                            navigate('/hr?tab=payroll')
                        }}
                    />
                </div>
            </div>

            {/* Competence & Employee Filters */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Filter className="h-4 w-4" /> Filtros de Competência
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-2 min-w-[150px]">
                        <Label>Mês de Competência</Label>
                        <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map(m => (
                                    <SelectItem key={m.value} value={String(m.value)} className="capitalize">
                                        {m.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 min-w-[100px]">
                        <Label>Ano</Label>
                        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(y => (
                                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 min-w-[250px] flex-1">
                        <Label>Colaborador</Label>
                        <Select value={employeeId} onValueChange={setEmployeeId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um colaborador" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Colaboradores</SelectItem>
                                {employees?.map(emp => (
                                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                            Banco de Horas
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold flex items-baseline gap-2">
                            {metrics.formattedOvertime}
                            <span className="text-xs text-muted-foreground font-normal">extras</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Custo Estimado: {metrics.estimatedCost}</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                            Inconsistências
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-amber-600">{metrics.inconsistencies}</div>
                        <p className="text-xs text-muted-foreground mt-1">Registros ímpares ou esquecidos</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                            Absenteísmo
                            <XCircle className="h-4 w-4 text-red-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-red-600">{metrics.absences}</div>
                        <p className="text-xs text-muted-foreground mt-1">Dias sem registro (exceto feriados)</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                            Status da Folha
                            <Calendar className="h-4 w-4 text-blue-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-blue-600">Aberto</div>
                        <p className="text-xs text-muted-foreground mt-1">Fechamento previsto: {format(new Date(selectedYear, selectedMonth, 25), 'dd/MM')}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Data Table */}
            <Card>
                <CardHeader className="p-4 border-b flex flex-row items-center justify-between bg-muted/40">
                    <div>
                        <CardTitle className="text-base">Detalhamento de Registros</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="font-normal text-muted-foreground">Competência: {format(new Date(selectedYear, selectedMonth, 1), 'MMMM/yyyy', { locale: ptBR })}</Badge>
                            <Badge variant="outline" className="font-normal text-muted-foreground">Registros: {filteredClocks.length}</Badge>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Label className="text-xs uppercase font-bold text-muted-foreground mr-1">Filtro Rápido:</Label>
                        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                            <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as Ocorrências</SelectItem>
                                <SelectItem value="overtime">Apenas Horas Extras</SelectItem>
                                <SelectItem value="missing">Faltas e Atrasos</SelectItem>
                                <SelectItem value="pending">Pendentes de Validação</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="w-[100px]">Data</TableHead>
                                <TableHead>Colaborador</TableHead>
                                <TableHead className="text-center w-[80px]">Entrada</TableHead>
                                <TableHead className="text-center w-[80px]">Saída Almoço</TableHead>
                                <TableHead className="text-center w-[80px]">Volta Almoço</TableHead>
                                <TableHead className="text-center w-[80px]">Saída</TableHead>
                                <TableHead className="text-right w-[80px]">Total</TableHead>
                                <TableHead className="text-right w-[80px]">Saldo</TableHead>
                                <TableHead className="text-center w-[120px]">Status</TableHead>
                                <TableHead className="text-right w-[100px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-32 text-center animate-pulse">
                                        Carregando registros...
                                    </TableCell>
                                </TableRow>
                            ) : filteredClocks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                                        Nenhum registro encontrado para os filtros selecionados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredClocks.map(tc => {
                                    const workedMinutes = calculateWorkedMinutes(tc)
                                    const balance = workedMinutes - (8 * 60 + 48) // Using 8:48 as standard
                                    const isWeekendDay = isWeekend(parseISO(tc.date))

                                    return (
                                        <TableRow key={tc.id} className={cn(
                                            "transition-colors",
                                            !tc.clockIn && !isWeekendDay && !tc.isExtraDay && parseISO(tc.date) < new Date() ? "bg-red-50/40 hover:bg-red-50/60 dark:bg-red-900/10 dark:hover:bg-red-900/20" : "hover:bg-muted/50"
                                        )}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{format(parseISO(tc.date), 'dd/MM')}</span>
                                                    <span className="text-[10px] text-muted-foreground uppercase">{format(parseISO(tc.date), 'EEE', { locale: ptBR })}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium line-clamp-1 text-sm">{tc.employee?.name}</div>
                                            </TableCell>
                                            <TableCell className="text-center text-xs font-mono text-muted-foreground">{formatTime(tc.clockIn)}</TableCell>
                                            <TableCell className="text-center text-xs font-mono text-muted-foreground">{formatTime(tc.breakStart)}</TableCell>
                                            <TableCell className="text-center text-xs font-mono text-muted-foreground">{formatTime(tc.breakEnd)}</TableCell>
                                            <TableCell className="text-center text-xs font-mono text-muted-foreground">{formatTime(tc.clockOut)}</TableCell>
                                            <TableCell className="text-right font-mono font-bold text-xs">{minutesToHHMM(workedMinutes)}</TableCell>
                                            <TableCell className={cn(
                                                "text-right font-mono font-bold text-xs",
                                                balance > 0 ? "text-emerald-600" : balance < -10 ? "text-red-500" : "text-muted-foreground"
                                            )}>
                                                {!tc.isExtraDay && !isWeekendDay ? minutesToHHMM(balance) : '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {tc.isExtraDay ? (
                                                    <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-200 border-transparent">Diária Extra</Badge>
                                                ) : isWeekendDay ? (
                                                    <Badge variant="outline" className="text-[10px] text-muted-foreground">Fim de Semana</Badge>
                                                ) : !tc.clockIn && parseISO(tc.date) < new Date() ? (
                                                    <Badge variant="destructive" className="text-[10px]">Falta</Badge>
                                                ) : balance > 0 ? (
                                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-transparent text-[10px]">Extra</Badge>
                                                ) : !tc.clockOut ? (
                                                    <Badge variant="outline" className="border-amber-500 text-amber-600 text-[10px]">Incompleto</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600">Regular</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                        onClick={() => navigate(`/hr/timesheet/${tc.employee_id}`)}
                                                        title="Ver Espelho Detalhado"
                                                    >
                                                        <CalendarDays className="h-4 w-4" />
                                                    </Button>
                                                    <EditTimeClockDialog timeClock={tc} onSuccess={refetch} />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
