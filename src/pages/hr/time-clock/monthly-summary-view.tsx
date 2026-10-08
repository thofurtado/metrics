import { useQuery } from '@tanstack/react-query'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Moon,
  Search,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { Employee } from '@/api/hr/employees'
import {
  horas,
  NOMES_DOS_AVISOS,
  resumoDoPonto,
  TipoDeAviso,
} from '@/api/hr/ponto'
import { TimeClock } from '@/api/hr/time-clock'
import { AvisoRegraDoPonto } from '@/components/hr/aviso-regra-do-ponto'
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
  /** Não são mais usados: a conta vem do servidor (ficam para não mexer em quem chama) */
  timeClocks?: TimeClock[]
  daysInMonth?: Date[]
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

  // A conta do mês vem do servidor: a mesma do espelho e do PDF (08/10/2026). Antes esta tela fazia a sua (7h20, sem
  // tolerância, tudo a 60%).
  const inicio = format(
    startOfMonth(new Date(selectedYear, selectedMonth, 1)),
    'yyyy-MM-dd',
  )
  const fim = format(
    endOfMonth(new Date(selectedYear, selectedMonth, 1)),
    'yyyy-MM-dd',
  )
  const { data: resumo, isLoading: calculando } = useQuery({
    queryKey: ['ponto-resumo', inicio, fim],
    queryFn: () => resumoDoPonto({ inicio, fim }),
  })

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
      const t = resumo?.linhas.find((l) => l.employee.id === emp.id)?.totais
      const totalDays = t ? t.diasTrabalhados + t.dobras : 0
      const totalMinutes = t?.trabalhadosMin ?? 0
      const overtimeMinutes = t
        ? t.extraMin +
          t.extraSegundaFaixaMin +
          t.extraEspecialMin +
          t.extraSemanaMin
        : 0
      const noturnosMin = t?.noturnosMin ?? 0
      const extrasENoturno = t ? t.valorExtra + t.valorNoturno : 0
      const avisos = t
        ? (Object.entries(t.avisos) as Array<[TipoDeAviso, number]>).filter(
            ([, n]) => n > 0,
          )
        : []

      let estimatedTotal = 0
      if (emp.registrationType === 'DAILY') {
        estimatedTotal =
          (t?.diasTrabalhados ?? 0) * (Number(emp.dailyRate) || 0) +
          (t?.valorDobras ?? 0) +
          extrasENoturno
      } else if (emp.registrationType === 'HOURLY') {
        estimatedTotal =
          (totalMinutes / 60) * (Number(emp.salary) || 0) + extrasENoturno
      } else {
        estimatedTotal = (Number(emp.salary) || 0) + extrasENoturno
      }

      return {
        employee: emp,
        totalDays,
        totalMinutes,
        formattedTotalHours: horas(totalMinutes),
        formattedOvertime: overtimeMinutes > 0 ? horas(overtimeMinutes) : '--',
        overtimeMinutes,
        noturnosMin,
        avisos,
        estimatedTotal,
      }
    })
  }, [employeesList, resumo, employeeType, searchTerm])

  const totalMonthHoursWorked = useMemo(() => {
    return horas(
      monthlySummaryData.reduce((acc, row) => acc + row.totalMinutes, 0),
    )
  }, [monthlySummaryData])

  const totalMonthOvertime = useMemo(() => {
    return horas(
      monthlySummaryData.reduce((acc, row) => acc + row.overtimeMinutes, 0),
    )
  }, [monthlySummaryData])

  const totalNoturno = useMemo(
    () =>
      horas(monthlySummaryData.reduce((acc, row) => acc + row.noturnosMin, 0)),
    [monthlySummaryData],
  )

  const totalEstimatedPayroll = useMemo(() => {
    return monthlySummaryData.reduce((acc, row) => acc + row.estimatedTotal, 0)
  }, [monthlySummaryData])

  return (
    <div className="space-y-6">
      <AvisoRegraDoPonto />

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
                  <SelectItem
                    key={m.value}
                    value={String(m.value)}
                    className="capitalize"
                  >
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
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            Pela regra da loja · <Moon className="h-3 w-3" /> {totalNoturno}{' '}
            entre 22h e 5h
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
            Consolidado de Ponto -{' '}
            {format(new Date(selectedYear, selectedMonth, 1), 'MMMM yyyy', {
              locale: ptBR,
            })}
          </CardTitle>
          <CardDescription>
            Resumo claro e legível de presença, total de horas e valores por
            colaborador.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-muted/40">
                  <TableHead className="w-[280px]">Colaborador</TableHead>
                  <TableHead>Regime</TableHead>
                  <TableHead className="text-center">
                    Dias Trabalhados
                  </TableHead>
                  <TableHead className="text-center">Total Horas</TableHead>
                  <TableHead className="text-center">Horas Extras</TableHead>
                  <TableHead className="text-center">Noturno</TableHead>
                  <TableHead className="text-center">Avisos</TableHead>
                  <TableHead className="text-right">Estimativa Bruta</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading || calculando ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="h-32 text-center text-muted-foreground"
                    >
                      Carregando consolidado...
                    </TableCell>
                  </TableRow>
                ) : monthlySummaryData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="h-32 text-center text-muted-foreground"
                    >
                      Nenhum registro encontrado para esta competência.
                    </TableCell>
                  </TableRow>
                ) : (
                  monthlySummaryData.map((row) => (
                    <TableRow
                      key={row.employee.id}
                      className="transition-colors hover:bg-muted/30"
                    >
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
                        <Badge
                          variant="outline"
                          className="rounded-lg font-medium"
                        >
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
                      <TableCell className="text-center font-mono">
                        {row.noturnosMin > 0 ? (
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {horas(row.noturnosMin)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.avisos.length > 0 ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"
                            title={row.avisos
                              .map(
                                ([tipo, n]) =>
                                  `${NOMES_DOS_AVISOS[tipo]}: ${n}`,
                              )
                              .join('\n')}
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {row.avisos.reduce((s, [, n]) => s + n, 0)}
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
