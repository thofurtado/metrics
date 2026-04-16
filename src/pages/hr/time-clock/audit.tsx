import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { listTimeClocks, TimeClock } from "@/api/hr/time-clock"
import { getEmployees, Employee } from "@/api/hr/employees"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Printer, Search, Loader2 } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, differenceInMinutes, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

// Helper: Dates without timezone shifts
function parseDateOnly(dateStr: string): Date {
    const str = dateStr.substring(0, 10);
    const [yyyy, mm, dd] = str.split('-').map(Number);
    return new Date(yyyy, mm - 1, dd);
}

export function TimeClockAudit() {
    const today = new Date()
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth())
    const [selectedYear, setSelectedYear] = useState(today.getFullYear())
    const [employeeType, setEmployeeType] = useState<string>("all")

    // Date Range calculation
    const [dateRange, daysInMonth] = useMemo(() => {
        const date = new Date(selectedYear, selectedMonth, 1)
        const start = startOfMonth(date)
        const end = endOfMonth(date)
        const days = eachDayOfInterval({ start, end })
        return [
            {
                start: format(start, 'yyyy-MM-dd'),
                end: format(end, 'yyyy-MM-dd')
            },
            days
        ]
    }, [selectedMonth, selectedYear])

    // Fetch Employees
    const { data: employeesData } = useQuery({ 
        queryKey: ['employees'], 
        queryFn: () => getEmployees({ limit: 1000 })
    })

    const employeesList = employeesData?.data || []

    // Fetch Time Clocks
    const { data: timeClocksResponse, isLoading, refetch } = useQuery({
        queryKey: ['time-clocks-report', dateRange],
        queryFn: () => listTimeClocks({
            startDate: dateRange.start,
            endDate: dateRange.end,
            per_page: 5000 // Get all for client-side processing
        })
    })

    const timeClocks = timeClocksResponse?.data || timeClocksResponse?.timeClocks || []

    // Matrix Processing
    const reportData = useMemo(() => {
        // 1. Filter Employees
        let filteredEmployees = employeesList
        if (employeeType !== "all") {
            filteredEmployees = employeesList.filter((e: Employee) => e.registrationType === employeeType)
        }

        // 2. Map Data
        return filteredEmployees.map((emp: Employee) => {
            const history = timeClocks.filter((tc: TimeClock) => tc.employee_id === emp.id)
            
            let totalDays = 0
            let totalMinutes = 0

            const dayRecords = daysInMonth.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd')
                const tc = history.find((record: TimeClock) => {
                    if (!record.date) return false
                    return record.date.substring(0, 10) === dayStr
                })

                let statusText = "Folga"
                let isWorked = false
                let minutesWorked = 0

                if (tc) {
                    if (tc.absenceReason && tc.absenceReason !== "PRESENCA") {
                        statusText = tc.absenceReason === "ATESTADO" ? "Atestado" :
                                     tc.absenceReason === "FALTA_JUSTIFICADA" ? "F. Justific." : "Falta"
                    } else if (tc.clockIn || tc.isExtraDay) {
                        isWorked = true
                        statusText = "Presença"

                        // Calculate hours
                        if (tc.clockIn && tc.clockOut) {
                           let session = differenceInMinutes(parseISO(tc.clockOut), parseISO(tc.clockIn))
                           if (tc.breakStart && tc.breakEnd) {
                               session -= differenceInMinutes(parseISO(tc.breakEnd), parseISO(tc.breakStart))
                           }
                           minutesWorked += session > 0 ? session : 0
                        }
                        
                        if (tc.extraClockIn && tc.extraClockOut) {
                             const extraSession = differenceInMinutes(parseISO(tc.extraClockOut), parseISO(tc.extraClockIn))
                             minutesWorked += extraSession > 0 ? extraSession : 0
                        }
                    }
                } 

                if (isWorked) totalDays++
                totalMinutes += minutesWorked

                const h = Math.floor(minutesWorked / 60)
                const m = minutesWorked % 60
                const formattedHours = minutesWorked > 0 ? `${h}h${m.toString().padStart(2, '0')}` : "--"

                return {
                    day,
                    statusText,
                    minutesWorked,
                    formattedHours,
                    isWorked
                }
            })

            const totalH = Math.floor(totalMinutes / 60)
            const totalM = totalMinutes % 60

            return {
                employee: emp,
                dayRecords,
                totalDays,
                totalMinutes,
                formattedTotalHours: `${totalH}h ${totalM.toString().padStart(2, '0')}m`
            }
        })
    }, [employeesList, timeClocks, daysInMonth, employeeType])


    // Dropdowns configuration
    const months = Array.from({ length: 12 }, (_, i) => ({
        value: i, label: format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })
    }))
    const years = [2023, 2024, 2025, 2026]


    // --- EXPORT TO EXCEL (CSV) ---
    const handleExportExcel = () => {
        // Headers
        let csvContent = "Funcionario;Contrato;"
        daysInMonth.forEach(day => {
            csvContent += `${format(day, 'dd/MM')};`
        })
        csvContent += "Total Dias;Total Horas\n"

        // Rows
        reportData.forEach(row => {
            csvContent += `${row.employee.name};${row.employee.registrationType};`
            row.dayRecords.forEach(dr => {
                csvContent += dr.isWorked ? `${dr.formattedHours};` : `${dr.statusText};`
            })
            csvContent += `${row.totalDays};${row.formattedTotalHours}\n`
        })

        // Download logic
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `Relatorio_Ponto_${format(new Date(selectedYear, selectedMonth, 1), 'MM_yyyy')}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // --- EXPORT TO PDF ---
    const handleExportPDF = () => {
        window.print()
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10 time-clock-report">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Espelho Ponto (Visão Geral)</h2>
                    <p className="text-muted-foreground">Acompanhe a folha, presenças e horários de toda equipe.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleExportExcel} className="gap-2">
                        <Download className="h-4 w-4" /> Excel
                    </Button>
                    <Button variant="outline" onClick={handleExportPDF} className="gap-2">
                        <Printer className="h-4 w-4" /> Imprimir (PDF)
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="print:hidden">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Search className="h-4 w-4" /> Filtros de Competência
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-2 min-w-[150px]">
                        <label className="text-sm font-medium leading-none">Mês</label>
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
                        <label className="text-sm font-medium leading-none">Ano</label>
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
                        <label className="text-sm font-medium leading-none">Tipo de Contrato</label>
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
            <div className="hidden print:block mb-4">
                <h1 className="text-2xl font-bold">Relatório de Ponto - {format(new Date(selectedYear, selectedMonth, 1), 'MMMM yyyy', { locale: ptBR })}</h1>
                <p className="text-sm text-gray-600">Tipo de Contrato: {employeeType === 'all' ? 'Todos' : employeeType}</p>
            </div>

            {/* Matrix Data Table */}
            <Card className="border shadow-sm print:border-none print:shadow-none bg-background">
                <div className="overflow-x-auto w-full max-w-[calc(100vw-300px)] print:max-w-none print:overflow-visible rounded-md custom-scrollbar">
                    <Table className="relative min-w-max border-collapse print:text-xs">
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="w-[200px] sticky left-0 z-20 bg-muted font-bold shadow-[1px_0_0_0_rgb(226,232,240)] print:shadow-none print:static">
                                    Funcionário
                                </TableHead>
                                {daysInMonth.map(day => (
                                    <TableHead key={day.toISOString()} className="text-center w-[75px] px-1 font-semibold border-x text-xs">
                                        <div className="flex flex-col items-center">
                                            <span>{format(day, 'dd')}</span>
                                            <span className="text-[10px] text-muted-foreground font-normal uppercase">
                                                {format(day, 'E', { locale: ptBR })}
                                            </span>
                                        </div>
                                    </TableHead>
                                ))}
                                <TableHead className="w-[100px] sticky right-[100px] z-20 bg-muted font-bold text-center border-l shadow-[-1px_0_0_0_rgb(226,232,240)] print:static print:shadow-none">
                                    Total Dias
                                </TableHead>
                                <TableHead className="w-[100px] sticky right-0 z-20 bg-muted font-bold text-right border-l print:static print:shadow-none">
                                    Total Horas
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={daysInMonth.length + 3} className="h-32 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground mt-2">Carregando registros...</p>
                                    </TableCell>
                                </TableRow>
                            ) : reportData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={daysInMonth.length + 3} className="h-32 text-center text-muted-foreground">
                                        Nenhum funcionário ou registro para o perfil selecionado neste período.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                reportData.map((row) => (
                                    <TableRow key={row.employee.id} className="group hover:bg-muted/20">
                                        {/* Employee Name */}
                                        <TableCell className="sticky left-0 z-10 bg-background font-medium border-r group-hover:bg-muted/5 transition-colors shadow-[1px_0_0_0_rgb(226,232,240)] print:static print:shadow-none print:bg-transparent">
                                            <div className="flex flex-col max-w-[180px]">
                                                <span className="line-clamp-1" title={row.employee.name}>{row.employee.name}</span>
                                                <span className="text-[10px] text-muted-foreground">{row.employee.registrationType}</span>
                                            </div>
                                        </TableCell>

                                        {/* Days Generation */}
                                        {row.dayRecords.map((dr, i) => (
                                            <TableCell key={i} className="text-center p-1 border-x print:border-slate-300">
                                                {dr.isWorked ? (
                                                    <div className="flex flex-col items-center justify-center p-1 rounded-sm bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 print:bg-transparent print:text-black">
                                                        <span className="font-mono text-xs font-semibold">{dr.formattedHours}</span>
                                                    </div>
                                                ) : dr.statusText === "Falta" ? (
                                                    <span className="text-[10px] font-medium text-red-500 uppercase">{dr.statusText}</span>
                                                ) : dr.statusText === "Atestado" || dr.statusText === "F. Justific." ? (
                                                    <span className="text-[10px] font-medium text-amber-600 uppercase">{dr.statusText.substring(0, 5) + "."}</span>
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground/30 capitalize">-</span>
                                                )}
                                            </TableCell>
                                        ))}

                                        {/* Totals */}
                                        <TableCell className="sticky right-[100px] z-10 bg-background border-l text-center font-bold group-hover:bg-muted/5 transition-colors shadow-[-1px_0_0_0_rgb(226,232,240)] print:static print:shadow-none print:bg-transparent">
                                            {row.totalDays}
                                        </TableCell>
                                        <TableCell className="sticky right-0 z-10 bg-background border-l text-right font-mono font-bold group-hover:bg-muted/5 transition-colors text-emerald-600 print:static print:shadow-none print:bg-transparent">
                                            {row.formattedTotalHours}
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
