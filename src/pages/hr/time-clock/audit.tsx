import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { listTimeClocks, updateTimeClock, TimeClockFilters, TimeClock } from "@/api/hr/time-clock"
import { getEmployees } from "@/api/hr/employees"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Search, Pencil, CalendarDays } from "lucide-react"
import { useNavigate } from "react-router-dom"

// Helper
const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "--:--"
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function EditTimeClockDialog({ timeClock, onSuccess }: { timeClock: TimeClock, onSuccess: () => void }) {
    const [open, setOpen] = useState(false)
    // Local state for editing. In a real app, use React Hook Form.
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
                <Button variant="ghost" size="icon">
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

                    <div className="flex items-center space-x-2 border p-2 rounded">
                        <Checkbox id="extraday" checked={data.isExtraDay} onCheckedChange={(c) => setData({ ...data, isExtraDay: !!c })} />
                        <Label htmlFor="extraday">Diária Extra (Rateio Negociado)</Label>
                    </div>

                    {data.isExtraDay && (
                        <div className="space-y-2">
                            <Label>Valor Negociado (R$)</Label>
                            <Input type="number" value={data.negotiatedValue} onChange={e => setData({ ...data, negotiatedValue: Number(e.target.value) })} />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Observações</Label>
                        <Textarea value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })} />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => mutate()} disabled={isPending}>Salvar Alterações</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export function TimeClockAudit() {
    const navigate = useNavigate()
    const [filters, setFilters] = useState<Partial<TimeClockFilters> & { employee_id: string }>({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        employee_id: "all"
    })

    // Fetch employees for select
    const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: getEmployees })

    const { data: timeClocksData, refetch } = useQuery({
        queryKey: ['time-clocks', filters],
        queryFn: () => listTimeClocks({
            ...filters,
            employee_id: filters.employee_id === 'all' ? undefined : filters.employee_id
        })
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <h2 className="text-3xl font-bold tracking-tight">Gestão de Ponto</h2>

                {/* Filters */}
                <Card>
                    <CardHeader className="p-4">
                        <CardTitle className="text-sm">Filtros</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex flex-wrap gap-4 items-end">
                        <div className="space-y-2 min-w-[200px]">
                            <Label>Funcionário</Label>
                            <Select value={filters.employee_id} onValueChange={(v) => setFilters({ ...filters, employee_id: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Funcionários</SelectItem>
                                    {employees?.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Data Início</Label>
                            <Input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Data Fim</Label>
                            <Input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
                        </div>
                        <Button onClick={() => refetch()} variant="secondary">
                            <Search className="h-4 w-4 mr-2" />
                            Filtrar
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Summary if exists */}
            {timeClocksData?.summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-muted/30 border-muted-foreground/10">
                        <CardContent className="p-4 flex flex-col items-center justify-center">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider italic">Total de Horas</span>
                            <span className="text-xl font-mono font-bold text-primary">{timeClocksData.summary.totalHours || '0h'}</span>
                        </CardContent>
                    </Card>
                    <Card className="bg-muted/30 border-muted-foreground/10 text-green-600">
                        <CardContent className="p-4 flex flex-col items-center justify-center">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider italic">Dias Extras</span>
                            <span className="text-xl font-mono font-bold">{timeClocksData.summary.extraDays || 0}</span>
                        </CardContent>
                    </Card>
                    <Card className="bg-muted/30 border-muted-foreground/10">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-blue-600">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider italic">Dias Trabalhados</span>
                            <span className="text-xl font-mono font-bold">{timeClocksData.summary.workedDays || 0}</span>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Funcionário</TableHead>
                                <TableHead>Iniciar Expediente</TableHead>
                                <TableHead>Pausa para Almoço</TableHead>
                                <TableHead>Retorno do Almoço</TableHead>
                                <TableHead>Fim de Expediente</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(timeClocksData?.timeClocks || timeClocksData?.data)?.map(tc => (
                                <TableRow key={tc.id}>
                                    <TableCell>{new Date(tc.date).toLocaleDateString()}</TableCell>
                                    <TableCell className="font-medium">{tc.employee?.name || '---'}</TableCell>
                                    <TableCell>{formatTime(tc.clockIn)}</TableCell>
                                    <TableCell>{formatTime(tc.breakStart)}</TableCell>
                                    <TableCell>{formatTime(tc.breakEnd)}</TableCell>
                                    <TableCell>{formatTime(tc.clockOut)}</TableCell>
                                    <TableCell>
                                        {tc.isExtraDay && <Badge variant="secondary">Diária Extra</Badge>}
                                        {!tc.isVerified && !tc.isExtraDay && <Badge variant="outline" className="ml-1 text-xs">Pendente</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right flex items-center justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                                            onClick={() => navigate(`/hr/timesheet/${tc.employee?.id || tc.employee_id}`)}
                                            title="Gerenciar Espelho Mensal"
                                        >
                                            <CalendarDays className="h-4 w-4" />
                                        </Button>
                                        <EditTimeClockDialog timeClock={tc} onSuccess={refetch} />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {((timeClocksData?.timeClocks?.length === 0) || (timeClocksData?.data?.length === 0)) && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        Nenhum registro encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

        </div>
    )
}
