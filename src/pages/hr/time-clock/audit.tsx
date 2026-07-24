import { useQuery } from '@tanstack/react-query'
import {
  differenceInMinutes,
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Download, Loader2, Printer, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Employee, getEmployees } from '@/api/hr/employees'
import { listTimeClocks, TimeClock } from '@/api/hr/time-clock'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { cn } from '@/lib/utils'

// Helper: Dates without timezone shifts
function parseDateOnly(dateStr: string): Date {
  const str = dateStr.substring(0, 10)
  const [yyyy, mm, dd] = str.split('-').map(Number)
  return new Date(yyyy, mm - 1, dd)
}

export function TimeClockAudit() {
  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth())
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [employeeType, setEmployeeType] = useState<string>('all')

  // Date Range calculation
  const [dateRange, daysInMonth] = useMemo(() => {
    const date = new Date(selectedYear, selectedMonth, 1)
    const start = startOfMonth(date)
    const end = endOfMonth(date)
    const days = eachDayOfInterval({ start, end })
    return [
      {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
      },
      days,
    ]
  }, [selectedMonth, selectedYear])

  // Fetch Employees
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => getEmployees({ limit: 1000 }),
  })

  const employeesList = employeesData?.data || []

  // Fetch Time Clocks
  const {
    data: timeClocksResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['time-clocks-report', dateRange],
    queryFn: () =>
      listTimeClocks({
        startDate: dateRange.start,
        endDate: dateRange.end,
        per_page: 5000, // Get all for client-side processing
      }),
  })

  const timeClocks =
    timeClocksResponse?.data || timeClocksResponse?.timeClocks || []

  // Matrix Processing
  const reportData = useMemo(() => {
    // 1. Filter Employees
    let filteredEmployees = employeesList
    if (employeeType !== 'all') {
      filteredEmployees = employeesList.filter(
        (e: Employee) => e.registrationType === employeeType,
      )
    }

    // 2. Map Data
    return filteredEmployees.map((emp: Employee) => {
      const history = timeClocks.filter(
        (tc: TimeClock) => tc.employee_id === emp.id,
      )

      let totalDays = 0
      let totalMinutes = 0

      const dayRecords = daysInMonth.map((day) => {
        const dayStr = format(day, 'yyyy-MM-dd')
        const tc = history.find((record: TimeClock) => {
          if (!record.date) return false
          return record.date.substring(0, 10) === dayStr
        })

        let statusText = 'Folga'
        let isWorked = false
        let minutesWorked = 0

        if (tc) {
          if (tc.absenceReason && tc.absenceReason !== 'PRESENCA') {
            statusText =
              tc.absenceReason === 'ATESTADO'
                ? 'Atestado'
                : tc.absenceReason === 'FALTA_JUSTIFICADA'
                  ? 'F. Justific.'
                  : 'Falta'
          } else if (tc.clockIn || tc.isExtraDay) {
            isWorked = true
            statusText = 'Presença'

            // Calculate hours
            if (tc.clockIn && tc.clockOut) {
              let session = differenceInMinutes(
                parseISO(tc.clockOut),
                parseISO(tc.clockIn),
              )
              if (session < 0) session += 24 * 60 // Tratamento de cruzamento de meia noite

              if (tc.breakStart && tc.breakEnd) {
                let breakSession = differenceInMinutes(
                  parseISO(tc.breakEnd),
                  parseISO(tc.breakStart),
                )
                if (breakSession < 0) breakSession += 24 * 60
                session -= breakSession
              }
              minutesWorked += session > 0 ? session : 0
            }

            if (tc.extraClockIn && tc.extraClockOut) {
              let extraSession = differenceInMinutes(
                parseISO(tc.extraClockOut),
                parseISO(tc.extraClockIn),
              )
              if (extraSession < 0) extraSession += 24 * 60
              minutesWorked += extraSession > 0 ? extraSession : 0
            }
          }
        }

        if (isWorked) totalDays++
        totalMinutes += minutesWorked

        const h = Math.floor(minutesWorked / 60)
        const m = minutesWorked % 60
        const formattedHours =
          minutesWorked > 0 ? `${h}h${m.toString().padStart(2, '0')}` : '--'

        return {
          day,
          statusText,
          minutesWorked,
          formattedHours,
          isWorked,
        }
      })

      const totalH = Math.floor(totalMinutes / 60)
      const totalM = totalMinutes % 60

      const q1Value =
        emp.registrationType === 'DAILY'
          ? dayRecords.filter((dr) => dr.isWorked && dr.day.getDate() <= 15)
              .length * (emp.dailyRate || 0)
          : 0
      const q2Value =
        emp.registrationType === 'DAILY'
          ? dayRecords.filter((dr) => dr.isWorked && dr.day.getDate() > 15)
              .length * (emp.dailyRate || 0)
          : 0

      let totalValue = 0
      if (emp.registrationType === 'DAILY') {
        totalValue = totalDays * (emp.dailyRate || 0)
      } else if (emp.registrationType === 'HOURLY') {
        totalValue = (totalMinutes / 60) * (Number(emp.salary) || 0)
      }

      return {
        employee: emp,
        dayRecords,
        totalDays,
        totalMinutes,
        formattedTotalHours: `${totalH}h ${totalM.toString().padStart(2, '0')}m`,
        q1Value,
        q2Value,
        totalValue,
      }
    })
  }, [employeesList, timeClocks, daysInMonth, employeeType])

  // Dropdowns configuration
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2024, i, 1), 'MMMM', { locale: ptBR }),
  }))
  const years = [2023, 2024, 2025, 2026]

  // --- EXPORT TO EXCEL (CSV) ---
  const handleExportExcel = () => {
    // Headers
    let csvContent = 'Funcionario;Contrato;'
    daysInMonth.forEach((day) => {
      csvContent += `${format(day, 'dd/MM')};`
    })
    csvContent += 'Total Dias;Total Horas'
    if (employeeType === 'DAILY') {
      csvContent += ';Q1 (Dias 1-15);Q2 (16+)'
    }
    csvContent += ';Valor Total Estimado\n'

    // Rows
    reportData.forEach((row) => {
      csvContent += `${row.employee.name};${row.employee.registrationType};`
      row.dayRecords.forEach((dr) => {
        csvContent += dr.isWorked
          ? `${dr.formattedHours};`
          : `${dr.statusText};`
      })
      csvContent += `${row.totalDays};${row.formattedTotalHours}`
      if (employeeType === 'DAILY') {
        csvContent += `;${row.q1Value};${row.q2Value}`
      }
      csvContent += `;${row.totalValue}`
      csvContent += '\n'
    })

    // Download logic
    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `Relatorio_Ponto_${format(new Date(selectedYear, selectedMonth, 1), 'MM_yyyy')}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // --- EXPORT TO PDF ---
  const handleExportPDF = () => {
    window.print()
  }

  return (
    <div className="time-clock-report space-y-6 pb-10 duration-500 animate-in fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Espelho Ponto (Visão Geral)
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Acompanhe a folha, presenças e horários de toda equipe.
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            className="flex-1 gap-2 sm:flex-initial"
          >
            <Download className="h-4 w-4" /> Excel
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPDF}
            className="flex-1 gap-2 sm:flex-initial"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Search className="h-4 w-4" /> Filtros de Competência
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Mês</label>
            <Select
              value={String(selectedMonth)}
              onValueChange={(v) => setSelectedMonth(Number(v))}
            >
              <SelectTrigger>
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

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Ano</label>
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => setSelectedYear(Number(v))}
            >
              <SelectTrigger>
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

          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <label className="text-sm font-medium leading-none">
              Tipo de Contrato
            </label>
            <Select value={employeeType} onValueChange={setEmployeeType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Vínculos</SelectItem>
                <SelectItem value="REGISTERED">Mensalistas (CLT)</SelectItem>
                <SelectItem value="HOURLY">Horistas</SelectItem>
                <SelectItem value="DAILY">Diaristas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Print Header */}
      <div className="mb-4 hidden print:block">
        <h1 className="text-2xl font-bold">
          Relatório de Ponto -{' '}
          {format(new Date(selectedYear, selectedMonth, 1), 'MMMM yyyy', {
            locale: ptBR,
          })}
        </h1>
        <p className="text-sm text-gray-600">
          Tipo de Contrato: {employeeType === 'all' ? 'Todos' : employeeType}
        </p>
      </div>

      {/* Matrix Data Table */}
      <Card className="overflow-hidden border bg-background shadow-sm print:border-none print:shadow-none">
        <div className="custom-scrollbar w-full max-w-full overflow-x-auto rounded-md print:overflow-visible">
          <Table className="relative min-w-max border-collapse print:text-xs">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="sticky left-0 z-20 w-[200px] bg-muted font-bold shadow-[1px_0_0_0_rgb(226,232,240)] print:static print:shadow-none">
                  Funcionário
                </TableHead>
                {daysInMonth.map((day) => (
                  <TableHead
                    key={day.toISOString()}
                    className="w-[75px] border-x px-1 text-center text-xs font-semibold"
                  >
                    <div className="flex flex-col items-center">
                      <span>{format(day, 'dd')}</span>
                      <span className="text-[10px] font-normal uppercase text-muted-foreground">
                        {format(day, 'E', { locale: ptBR })}
                      </span>
                    </div>
                  </TableHead>
                ))}
                <TableHead
                  className={cn(
                    'z-20 w-[90px] border-l bg-muted text-center font-bold print:static print:shadow-none',
                    employeeType === 'DAILY'
                      ? 'sticky right-[430px]'
                      : 'sticky right-[230px]',
                  )}
                >
                  Total Dias
                </TableHead>
                <TableHead
                  className={cn(
                    'z-20 w-[100px] border-l bg-muted text-center font-bold print:static print:shadow-none',
                    employeeType === 'DAILY'
                      ? 'sticky right-[330px]'
                      : 'sticky right-[130px]',
                  )}
                >
                  Total Horas
                </TableHead>
                {employeeType === 'DAILY' && (
                  <>
                    <TableHead className="sticky right-[230px] z-20 w-[100px] border-l bg-muted text-right font-bold text-green-700 print:static print:shadow-none">
                      <div className="flex flex-col items-end leading-tight">
                        <span>Q1 (1 a 15)</span>
                        <span className="text-[10px] font-normal uppercase opacity-80">
                          (R$)
                        </span>
                      </div>
                    </TableHead>
                    <TableHead className="sticky right-[130px] z-20 w-[100px] border-l bg-muted text-right font-bold text-emerald-700 print:static print:shadow-none">
                      <div className="flex flex-col items-end leading-tight">
                        <span>Q2 (16+)</span>
                        <span className="text-[10px] font-normal uppercase opacity-80">
                          (R$)
                        </span>
                      </div>
                    </TableHead>
                  </>
                )}
                <TableHead className="sticky right-0 z-20 w-[130px] border-l bg-muted pr-4 text-right font-bold text-blue-700 shadow-[-1px_0_0_0_rgb(226,232,240)] print:static print:shadow-none">
                  <div className="flex flex-col items-end leading-tight">
                    <span>Valor a Pagar</span>
                    <span className="text-[10px] font-normal uppercase opacity-80">
                      (em R$)
                    </span>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={daysInMonth.length + 3}
                    className="h-32 text-center"
                  >
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Carregando registros...
                    </p>
                  </TableCell>
                </TableRow>
              ) : reportData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={daysInMonth.length + 3}
                    className="h-32 text-center text-muted-foreground"
                  >
                    Nenhum funcionário ou registro para o perfil selecionado
                    neste período.
                  </TableCell>
                </TableRow>
              ) : (
                reportData.map((row) => (
                  <TableRow
                    key={row.employee.id}
                    className="group hover:bg-muted/20"
                  >
                    {/* Employee Name */}
                    <TableCell className="sticky left-0 z-10 border-r bg-background font-medium shadow-[1px_0_0_0_rgb(226,232,240)] transition-colors group-hover:bg-muted/5 print:static print:bg-transparent print:shadow-none">
                      <div className="flex max-w-[180px] flex-col">
                        <span
                          className="line-clamp-1"
                          title={row.employee.name}
                        >
                          {row.employee.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {row.employee.registrationType}
                        </span>
                      </div>
                    </TableCell>

                    {/* Days Generation */}
                    {row.dayRecords.map((dr, i) => (
                      <TableCell
                        key={i}
                        className="border-x p-1 text-center print:border-slate-300"
                      >
                        {dr.isWorked ? (
                          <div className="flex flex-col items-center justify-center rounded-sm bg-emerald-50 p-1 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 print:bg-transparent print:text-black">
                            <span className="font-mono text-xs font-semibold">
                              {dr.formattedHours}
                            </span>
                          </div>
                        ) : dr.statusText === 'Falta' ? (
                          <span className="text-[10px] font-medium uppercase text-red-500">
                            {dr.statusText}
                          </span>
                        ) : dr.statusText === 'Atestado' ||
                          dr.statusText === 'F. Justific.' ? (
                          <span className="text-[10px] font-medium uppercase text-amber-600">
                            {dr.statusText.substring(0, 5) + '.'}
                          </span>
                        ) : (
                          <span className="text-[10px] capitalize text-muted-foreground/30">
                            -
                          </span>
                        )}
                      </TableCell>
                    ))}

                    {/* Totals */}
                    <TableCell
                      className={cn(
                        'z-10 border-l bg-background text-center font-bold transition-colors group-hover:bg-muted/5 print:static print:bg-transparent print:shadow-none',
                        employeeType === 'DAILY'
                          ? 'sticky right-[430px]'
                          : 'sticky right-[230px]',
                        employeeType !== 'DAILY' &&
                          'shadow-[-1px_0_0_0_rgb(226,232,240)]',
                      )}
                    >
                      {row.totalDays}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'z-10 border-l bg-background text-center font-mono font-bold text-emerald-600 transition-colors group-hover:bg-muted/5 print:static print:bg-transparent print:shadow-none',
                        employeeType === 'DAILY'
                          ? 'sticky right-[330px]'
                          : 'sticky right-[130px]',
                      )}
                    >
                      {row.formattedTotalHours}
                    </TableCell>
                    {employeeType === 'DAILY' && (
                      <>
                        <TableCell className="sticky right-[230px] z-10 border-l bg-green-50/30 px-2 text-right font-mono font-semibold tracking-tighter text-green-700 group-hover:bg-green-50 print:static print:bg-transparent print:shadow-none">
                          {row.q1Value.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="sticky right-[130px] z-10 border-l bg-emerald-50/30 px-2 text-right font-mono font-semibold tracking-tighter text-emerald-700 group-hover:bg-emerald-50 print:static print:bg-transparent print:shadow-none">
                          {row.q2Value.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="sticky right-0 z-10 border-l bg-blue-50/30 px-4 text-right font-mono font-bold tracking-tighter text-blue-700 shadow-[-1px_0_0_0_rgb(226,232,240)] group-hover:bg-blue-50 print:static print:bg-transparent print:shadow-none">
                      {row.totalValue > 0
                        ? row.totalValue.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Print Styles Injection */}
      <style>
        {`
                @media print {
                    @page { size: landscape; margin: 10mm; }
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .print\\:hidden { display: none !important; }
                    .print\\:block { display: block !important; }
                    nav, header, footer, aside, .sidebar { display: none !important; }
                    main { padding: 0 !important; margin: 0 !important; overflow: visible !important; }
                    .time-clock-report { margin: 0; padding: 0; }
                    table { page-break-inside: auto; border-collapse: collapse; width: 100%; border: 1px solid #ccc; font-size: 8px !important; }
                    tr { page-break-inside: avoid; page-break-after: auto }
                    td, th { border: 1px solid #ccc !important; padding: 2px !important; }
                    .custom-scrollbar { overflow: visible !important; max-width: none !important; }
                    body > * { overflow: visible !important; }
                }
                .custom-scrollbar::-webkit-scrollbar {
                    height: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: hsl(var(--muted)); 
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: hsl(var(--muted-foreground) / 0.5); 
                    border-radius: 4px;
                }
                `}
      </style>
    </div>
  )
}
