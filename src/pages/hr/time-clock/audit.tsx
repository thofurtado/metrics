import { useQuery } from '@tanstack/react-query'
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
} from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  Printer,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Employee, getEmployees } from '@/api/hr/employees'
import { listTimeClocks, TimeClock } from '@/api/hr/time-clock'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/custom-tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { MonthlySummaryView } from './monthly-summary-view'
import { TimeSheetPage } from './timesheet-page'
import { TodayAttendanceView } from './today-attendance-view'

export function TimeClockAudit() {
  const [searchParams, setSearchParams] = useSearchParams()
  const today = new Date()

  // Sub-view: 'individual' | 'monthly' | 'today'
  const [activeView, setActiveView] = useState<'individual' | 'monthly' | 'today'>('individual')

  // Month & Year state
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth())
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [employeeType, setEmployeeType] = useState<string>('all')

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
  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => getEmployees({ limit: 1000 }),
  })

  const employeesList: Employee[] = employeesData?.data || []

  // Selected Employee
  const paramEmployeeId = searchParams.get('employeeId')
  const [selectedEmployeeIdState, setSelectedEmployeeIdState] = useState<string>('')

  const selectedEmployeeId = useMemo(() => {
    if (paramEmployeeId && employeesList.some((e) => e.id === paramEmployeeId)) {
      return paramEmployeeId
    }
    if (selectedEmployeeIdState && employeesList.some((e) => e.id === selectedEmployeeIdState)) {
      return selectedEmployeeIdState
    }
    return employeesList[0]?.id || ''
  }, [paramEmployeeId, selectedEmployeeIdState, employeesList])

  const handleSelectEmployee = (id: string) => {
    setSelectedEmployeeIdState(id)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('employeeId', id)
      return next
    })
  }

  // Fetch Time Clocks
  const { data: timeClocksResponse, isLoading: isLoadingClocks } = useQuery({
    queryKey: ['time-clocks-report', dateRange],
    queryFn: () =>
      listTimeClocks({
        startDate: dateRange.start,
        endDate: dateRange.end,
        per_page: 5000,
      }),
  })

  const timeClocks: TimeClock[] =
    timeClocksResponse?.data || timeClocksResponse?.timeClocks || []

  const currentEmployeeIndex = employeesList.findIndex((e) => e.id === selectedEmployeeId)
  const handlePrevEmployee = () => {
    if (currentEmployeeIndex > 0) {
      handleSelectEmployee(employeesList[currentEmployeeIndex - 1].id)
    }
  }
  const handleNextEmployee = () => {
    if (currentEmployeeIndex < employeesList.length - 1) {
      handleSelectEmployee(employeesList[currentEmployeeIndex + 1].id)
    }
  }

  // CSV Export for monthly
  const handleExportCSV = () => {
    let csv = 'Colaborador;Regime;Cargo;Dias Trabalhados;Horas Registradas;Estimativa Total\n'
    employeesList.forEach((emp) => {
      const count = timeClocks.filter((tc) => tc.employee_id === emp.id && tc.clockIn).length
      csv += `"${emp.name}";"${emp.registrationType}";"${emp.role || ''}";${count}\n`
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `resumo_ponto_${selectedYear}_${selectedMonth + 1}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Sub-Tabs Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={activeView}
          onValueChange={(val) => setActiveView(val as any)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-3 gap-1 rounded-2xl border border-slate-200/60 bg-slate-100/60 p-1 dark:border-slate-800 dark:bg-slate-900/50 sm:w-auto">
            <TabsTrigger
              value="individual"
              className="rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 sm:text-sm"
            >
              <Users className="mr-1.5 h-4 w-4 text-blue-500" />
              Espelho Individual
            </TabsTrigger>
            <TabsTrigger
              value="monthly"
              className="rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 sm:text-sm"
            >
              <FileSpreadsheet className="mr-1.5 h-4 w-4 text-emerald-500" />
              Resumo do Mês
            </TabsTrigger>
            <TabsTrigger
              value="today"
              className="rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 sm:text-sm"
            >
              <Clock className="mr-1.5 h-4 w-4 text-amber-500" />
              Batidas de Hoje
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeView === 'monthly' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="rounded-xl shadow-sm"
            >
              <Download className="mr-1.5 h-4 w-4 text-emerald-600" />
              Exportar CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="rounded-xl shadow-sm"
            >
              <Printer className="mr-1.5 h-4 w-4 text-slate-600" />
              Imprimir
            </Button>
          </div>
        )}
      </div>

      {/* VIEW 1: ESPELHO INDIVIDUAL */}
      {activeView === 'individual' && (
        <div className="space-y-4">
          <Card className="rounded-2xl border border-slate-200/70 bg-card/60 shadow-sm backdrop-blur dark:border-slate-800">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="hidden sm:inline">Colaborador:</span>
                </div>
                <div className="w-full sm:max-w-md">
                  <Select
                    value={selectedEmployeeId}
                    onValueChange={handleSelectEmployee}
                    disabled={isLoadingEmployees}
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-background font-medium shadow-none">
                      <SelectValue placeholder="Selecione um colaborador..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {employeesList.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{emp.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({emp.role || 'Sem cargo'})
                            </span>
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {emp.registrationType === 'DAILY'
                                ? 'Diarista'
                                : emp.registrationType === 'HOURLY'
                                  ? 'Horista'
                                  : emp.registrationType === 'UNREGISTERED'
                                    ? 'Sem Registro'
                                    : 'CLT'}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <div className="text-xs text-muted-foreground">
                  {currentEmployeeIndex + 1} de {employeesList.length}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-xl"
                    onClick={handlePrevEmployee}
                    disabled={currentEmployeeIndex <= 0}
                    title="Colaborador Anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-xl"
                    onClick={handleNextEmployee}
                    disabled={currentEmployeeIndex >= employeesList.length - 1}
                    title="Próximo Colaborador"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <TimeSheetPage
            employeeId={selectedEmployeeId}
            isEmbedded={true}
            hideBackButton={true}
          />
        </div>
      )}

      {/* VIEW 2: RESUMO DO MÊS */}
      {activeView === 'monthly' && (
        <MonthlySummaryView
          employeesList={employeesList}
          timeClocks={timeClocks}
          daysInMonth={daysInMonth}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          employeeType={employeeType}
          setEmployeeType={setEmployeeType}
          isLoading={isLoadingClocks || isLoadingEmployees}
          onSelectEmployee={(id) => {
            handleSelectEmployee(id)
            setActiveView('individual')
          }}
        />
      )}

      {/* VIEW 3: BATIDAS DE HOJE */}
      {activeView === 'today' && (
        <TodayAttendanceView
          employeesList={employeesList}
          timeClocks={timeClocks}
          onSelectEmployee={(id) => {
            handleSelectEmployee(id)
            setActiveView('individual')
          }}
        />
      )}
    </div>
  )
}
