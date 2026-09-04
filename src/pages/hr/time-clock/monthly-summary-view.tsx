import {
  differenceInMinutes,
  format,
  parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Search,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { Employee } from '@/api/hr/employees'
import { TimeClock } from '@/api/hr/time-clock'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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

interface MonthlySummaryViewProps {
  employeesList: Employee[]
  timeClocks: TimeClock[]
  daysInMonth: Date[]
  selectedMonth: number
  setSelectedMonth: (m: number) => void
  selectedYear: number
  setSelectedYear: (y: number) => void
  employeeType: string
  setEmployeeType: (t: string) => void
  isLoading?: boolean
  onSelectEmployee: (id: string) => void
}

export function MonthlySummaryView({
  employeesList,
  timeClocks,
  daysInMonth,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  employeeType,
  setEmployeeType,
  isLoading = false,
  onSelectEmployee,
}: MonthlySummaryViewProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2024, i, 1), 'MMMM', { locale: ptBR }),
  }))
  const years = [2023, 2024, 2025, 2026]

  const monthlySummaryData = useMemo(() => {
    let filtered = employeesList

    if (employeeType !== 'all') {
      filtered = filtered.filter((e) => e.registrationType === employeeType)
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((e) => e.name.toLowerCase().includes(term))
    }

    return filtered.map((emp) => {
      const history = timeClocks.filter((tc) => tc.employee_id === emp.id)

      let totalDays = 0
      let totalMinutes = 0
      let overtimeMinutes = 0

      daysInMonth.forEach((day) => {
        const dayStr = format(day, 'yyyy-MM-dd')
        const tc = history.find((record) => {
          if (!record.date) return false
          return record.date.substring(0, 10) === dayStr
        })

        if (tc && (tc.clockIn || tc.isExtraDay) && (!tc.absenceReason || tc.absenceReason === 'PRESENCA')) {
          totalDays++
          let session = 0

          if (tc.clockIn && tc.clockOut) {
            let s = differenceInMinutes(parseISO(tc.clockOut), parseISO(tc.clockIn))
            if (s < 0) s += 24 * 60
            if (tc.breakStart && tc.breakEnd) {
              let b = differenceInMinutes(parseISO(tc.breakEnd), parseISO(tc.breakStart))
              if (b < 0) b += 24 * 60
              s -= b
            }
            session += s > 0 ? s : 0
          }

          if (tc.extraClockIn && tc.extraClockOut) {
            let xs = differenceInMinutes(parseISO(tc.extraClockOut), parseISO(tc.extraClockIn))
            if (xs < 0) xs += 24 * 60
            session += xs > 0 ? xs : 0
          }

          totalMinutes += session

          if (session > 440) {
            overtimeMinutes += session - 440
          }
        }
      })

      const totalH = Math.floor(totalMinutes / 60)
      const totalM = totalMinutes % 60
      const ovtH = Math.floor(overtimeMinutes / 60)
      const ovtM = overtimeMinutes % 60

      let estimatedTotal = 0
      if (emp.registrationType === 'DAILY') {
        const dailyRate = Number(emp.dailyRate) || 0
        estimatedTotal = totalDays * dailyRate
      } else if (emp.registrationType === 'HOURLY') {
        const hourlyRate = Number(emp.salary) || 0
        estimatedTotal = (totalMinutes / 60) * hourlyRate
      } else if (emp.registrationType === 'REGISTERED') {
        const salary = Number(emp.salary) || 0
        const hourlyBase = salary / 220
        const overtimeValue = (overtimeMinutes / 60) * (hourlyBase * 1.6)
        estimatedTotal = salary + overtimeValue
      }

      return {
        employee: emp,
        totalDays,
        totalMinutes,
        formattedTotalHours: `${totalH}h ${totalM.toString().padStart(2, '0')}m`,
        formattedOvertime: overtimeMinutes > 0 ? `${ovtH}h ${ovtM.toString().padStart(2, '0')}m` : '--',
        overtimeMinutes,
        estimatedTotal,
      }
    })
  }, [employeesList, timeClocks, daysInMonth, employeeType, searchTerm])

  const totalMonthHoursWorked = useMemo(() => {
    const totalMin = monthlySummaryData.reduce((acc, row) => acc + row.totalMinutes, 0)
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    return `${h}h ${m.toString().padStart(2, '0')}m`
  }, [monthlySummaryData])

  const totalMonthOvertime = useMemo(() => {
    const totalOvt = monthlySummaryData.reduce((acc, row) => acc + row.overtimeMinutes, 0)
    const h = Math.floor(totalOvt / 60)
    const m = totalOvt % 60
    return `${h}h ${m.toString().padStart(2, '0')}m`
  }, [monthlySummaryData])

  const totalEstimatedPayroll = useMemo(() => {
    return monthlySummaryData.reduce((acc, row) => acc + row.estimatedTotal, 0)
  }, [monthlySummaryData])

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <Card className="rounded-2xl border border-slate-200/70 bg-card/60 shadow-sm backdrop-blur dark:border-slate-800">
        <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Mês de Referência
            </label>
            <Select
              value={String(selectedMonth)}
              onValueChange={(v) => setSelectedMonth(Number(v))}
            >
              <SelectTrigger className="h-10 rounded-xl bg-background shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)} className="capitalize">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Ano
            </label>
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => setSelectedYear(Number(v))}
            >
              <SelectTrigger className="h-10 rounded-xl bg-background shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Regime de Contrato
            </label>
            <Select value={employeeType} onValueChange={setEmployeeType}>
              <SelectTrigger className="h-10 rounded-xl bg-background shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Vínculos</SelectItem>
                <SelectItem value="REGISTERED">Mensalistas (CLT)</SelectItem>
                <SelectItem value="HOURLY">Horistas</SelectItem>
                <SelectItem value="DAILY">Diaristas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Buscar Colaborador
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nome do colaborador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 rounded-xl bg-background pl-9 shadow-none"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50/50 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/50">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Colaboradores
            </span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-50">
            {monthlySummaryData.length}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Apurados na competência
          </p>
        </Card>

        <Card className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50/50 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/50">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Horas Trabalhadas
            </span>
            <Clock className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-50">
            {totalMonthHoursWorked}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Expediente apurado
          </p>
        </Card>

        <Card className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50/50 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/50">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Horas Extras
            </span>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-50">
            {totalMonthOvertime}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Excedentes acumulados
          </p>
        </Card>

        <Card className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50/50 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/50">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Estimativa Folha
            </span>
            <CheckCircle2 className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-50">
            {formatCurrency(totalEstimatedPayroll)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Total bruto estimado
          </p>
        </Card>
      </div>

      {/* Table */}
      <Card className="rounded-2xl border border-slate-200/70 shadow-sm dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">
            Consolidado de Ponto - {format(new Date(selectedYear, selectedMonth, 1), 'MMMM yyyy', { locale: ptBR })}
          </CardTitle>
          <CardDescription>
            Resumo claro e legível de presença, total de horas e valores por colaborador.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-muted/40">
                  <TableHead className="w-[280px]">Colaborador</TableHead>
                  <TableHead>Regime</TableHead>
                  <TableHead className="text-center">Dias Trabalhados</TableHead>
                  <TableHead className="text-center">Total Horas</TableHead>
                  <TableHead className="text-center">Horas Extras</TableHead>
                  <TableHead className="text-right">Estimativa Bruta</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      Carregando consolidado...
                    </TableCell>
                  </TableRow>
                ) : monthlySummaryData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      Nenhum registro encontrado para esta competência.
                    </TableCell>
                  </TableRow>
                ) : (
                  monthlySummaryData.map((row) => (
                    <TableRow key={row.employee.id} className="transition-colors hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                            {row.employee.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {row.employee.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {row.employee.role || 'Geral'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-lg font-medium">
                          {row.employee.registrationType === 'DAILY'
                            ? 'Diarista'
                            : row.employee.registrationType === 'HOURLY'
                              ? 'Horista'
                              : row.employee.registrationType === 'UNREGISTERED'
                                ? 'Sem Registro'
                                : 'CLT'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {row.totalDays} dias
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold">
                        {row.formattedTotalHours}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {row.overtimeMinutes > 0 ? (
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            +{row.formattedOvertime}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(row.estimatedTotal)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 rounded-xl px-3 font-semibold text-primary hover:bg-primary/10"
                          onClick={() => onSelectEmployee(row.employee.id)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Espelho</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
