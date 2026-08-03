import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addDays,
  differenceInMinutes,
  eachDayOfInterval,
  endOfMonth,
  format,
  getISOWeek,
  parseISO,
  startOfMonth,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  ArrowLeft,
  Clock,
  FileText,
  GripVertical,
  Loader2,
  Save,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { getEmployees } from '@/api/hr/employees'
import { listHolidays } from '@/api/hr/holidays'
import { bulkUpsertTimeClock, listTimeClocks } from '@/api/hr/time-clock'
import { MonthPicker } from '@/components/MonthPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/** Parse a date-only string (or ISO with T00:00:00Z) into a local Date without timezone shift */
function parseDateOnly(dateStr: string): Date {
  const str = dateStr.substring(0, 10)
  const [yyyy, mm, dd] = str.split('-').map(Number)
  return new Date(yyyy, mm - 1, dd)
}

// Page Component
export function TimeSheetPage() {
  const { employeeId } = useParams<{ employeeId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // State
  const [month, setMonth] = useState<Date>(new Date())
  const [isSaving, setIsSaving] = useState(false)

  // Queries
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => getEmployees({ limit: 1000 }),
  })
  const employee = employeesData?.data?.find((e) => e.id === employeeId)

  const { startDate, endDate, days } = useMemo(() => {
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const daysInterval = eachDayOfInterval({ start, end })
    return { startDate: start, endDate: end, days: daysInterval }
  }, [month])

  const { data: timeClocks, isLoading } = useQuery({
    queryKey: ['time-clocks-mirror', employeeId, month.toISOString()],
    queryFn: () =>
      listTimeClocks({
        employee_id: employeeId!,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        per_page: 32,
      }),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: holidaysData } = useQuery({
    queryKey: ['holidays', month.getFullYear()],
    queryFn: () => listHolidays(month.getFullYear()),
    staleTime: 10 * 60 * 1000,
  })

  const { register, control, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      rows: [] as any[],
    },
  })

  const { fields, replace } = useFieldArray({
    control,
    name: 'rows',
  })

  // Sync form with data
  useEffect(() => {
    if (!isLoading && timeClocks) {
      const list = timeClocks.timeClocks || timeClocks.data || []
      const newRows = days.map((day) => {
        const dayStr = format(day, 'yyyy-MM-dd')
        const dayClock = list.find((tc) => {
          if (!tc.date) return false
          const tcDateStr = tc.date.split('T')[0]
          return tcDateStr === dayStr
        })
        const formatTime = (iso?: string | null) =>
          iso ? format(parseISO(iso), 'HH:mm') : ''

        const isNextDay = (iso?: string | null) => {
          if (!iso) return false
          const normalizedIsoDate = format(parseISO(iso), 'yyyy-MM-dd')
          return normalizedIsoDate !== dayStr
        }

        let status = 'PRESENCA'
        if (!dayClock) {
          status = 'FOLGA'
        } else if (dayClock.absenceReason) {
          status = dayClock.absenceReason
        } else if (!dayClock.clockIn) {
          status = 'FOLGA'
        }

        return {
          date: dayStr,
          day,
          status,
          clockIn: formatTime(dayClock?.clockIn),
          breakStart: formatTime(dayClock?.breakStart),
          breakEnd: formatTime(dayClock?.breakEnd),
          clockOut: formatTime(dayClock?.clockOut),
          clockOutNextDay: isNextDay(dayClock?.clockOut),
          extraClockIn: formatTime(dayClock?.extraClockIn),
          extraClockOut: formatTime(dayClock?.extraClockOut),
          extraClockOutNextDay: isNextDay(dayClock?.extraClockOut),
          isExtraDay: dayClock?.isExtraDay ?? false,
          negotiatedValue: dayClock?.negotiatedValue ?? undefined,
          overtimeMinutes: (dayClock as any)?.overtimeMinutes ?? 0,
          overtimeValue: (dayClock as any)?.overtimeValue ?? 0,
          calculation_memory: (dayClock as any)?.calculation_memory ?? null,
        }
      })
      replace(newRows)
    }
  }, [isLoading, timeClocks, month, replace, days])

  const onSubmit = async (data: any) => {
    if (!employeeId) return
    setIsSaving(true)
    try {
      const entries = data.rows
        .filter(
          (r: any) =>
            r.status === 'PRESENCA' ||
            r.status === 'ATESTADO' ||
            r.status === 'FALTA_JUSTIFICADA' ||
            r.status === 'FALTA_INJUSTIFICADA',
        )
        .map((r: any) => {
          const buildDateTime = (timeStr?: string, isNextDay?: boolean) => {
            if (!timeStr) return null
            const [h, m] = timeStr.split(':').map(Number)
            const [yyyy, mm, dd] = r.date.split('-').map(Number)
            let d = new Date(yyyy, mm - 1, dd, h, m, 0, 0)
            if (isNextDay) d = addDays(d, 1)
            return d.toISOString()
          }

          const st = r.status
          const isWorked = st === 'PRESENCA'
          const isJustified = st === 'ATESTADO' || st === 'FALTA_JUSTIFICADA'
          const finalAbsenceReason = st === 'PRESENCA' ? null : st

          return {
            employee_id: employeeId,
            date: r.date,
            clockIn: isWorked ? buildDateTime(r.clockIn) : null,
            breakStart: isWorked ? buildDateTime(r.breakStart) : null,
            breakEnd: isWorked ? buildDateTime(r.breakEnd) : null,
            clockOut: isWorked
              ? buildDateTime(r.clockOut, r.clockOutNextDay)
              : null,
            extraClockIn: isWorked ? buildDateTime(r.extraClockIn) : null,
            extraClockOut: isWorked
              ? buildDateTime(r.extraClockOut, r.extraClockOutNextDay)
              : null,
            isExtraDay: isWorked ? r.isExtraDay : false,
            absenceReason: finalAbsenceReason,
            isJustifiedAbsence: isJustified,
            negotiatedValue: r.negotiatedValue
              ? Number(r.negotiatedValue)
              : null,
            isVerified: true,
            notes: 'Edição em lote via Espelho',
          }
        })

      await bulkUpsertTimeClock(entries)
      toast.success('Mês salvo com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['time-clocks-mirror'] })
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar mês.')
    } finally {
      setIsSaving(false)
    }
  }

  const exportToPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      // Headings / Header Section
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('METRICS', 15, 15)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Espelho de Ponto Individual`, 15, 20)

      // Month/Year
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(
        `Mês: ${format(month, 'MMMM / yyyy', { locale: ptBR })}`.toUpperCase(),
        195,
        15,
        { align: 'right' },
      )

      // Horizontal line
      doc.setDrawColor(200, 200, 200)
      doc.line(15, 23, 195, 23)

      // Employee Details
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text('Colaborador:', 15, 29)
      doc.setFont('helvetica', 'normal')
      doc.text(employee?.name || 'N/D', 38, 29)

      doc.setFont('helvetica', 'bold')
      doc.text('Cargo:', 15, 34)
      doc.setFont('helvetica', 'normal')
      doc.text(employee?.role || 'N/D', 27, 34)

      doc.setFont('helvetica', 'bold')
      doc.text('Regime:', 110, 29)
      doc.setFont('helvetica', 'normal')
      const regType =
        employee?.registrationType === 'DAILY'
          ? 'Diarista'
          : employee?.registrationType === 'HOURLY'
            ? 'Horista'
            : employee?.registrationType === 'UNREGISTERED'
              ? 'Sem Registro'
              : 'CLT'
      doc.text(regType, 124, 29)

      doc.setFont('helvetica', 'bold')
      doc.text('Remuneração:', 110, 34)
      doc.setFont('helvetica', 'normal')
      const salaryValue =
        employee?.registrationType === 'DAILY'
          ? `${Number(employee?.dailyRate || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/dia`
          : `${Number(employee?.salary || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}${employee?.registrationType === 'HOURLY' ? '/hora' : ''}`
      doc.text(salaryValue, 133, 34)

      doc.line(15, 37, 282, 37)

      // Rows data processing
      const rows = watch('rows') || []

      const calculateNetHours = (row: any) => {
        if (row.status === 'ATESTADO' || row.status === 'FALTA_JUSTIFICADA')
          return '7h 20m'
        if (row.status !== 'PRESENCA') return '--'

        const setTime = (t: string, isNext?: boolean) => {
          if (!t) return null
          const [h, m] = t.split(':').map(Number)
          const d = parseDateOnly(row.date)
          d.setHours(h, m, 0, 0)
          const isAutoNextDay = h < 4
          if (isNext || isAutoNextDay) d.setDate(d.getDate() + 1)
          return d
        }

        let total = 0
        const cin = setTime(row.clockIn)
        const bout = setTime(row.breakStart)
        const bin = setTime(row.breakEnd)
        const cout = setTime(row.clockOut, row.clockOutNextDay)
        const xcin = setTime(row.extraClockIn)
        const xcout = setTime(row.extraClockOut, row.extraClockOutNextDay)

        if (cin && bout) {
          total += differenceInMinutes(bout, cin)
        } else if (cin && cout && !bout && !bin) {
          total += differenceInMinutes(cout, cin)
        }

        if (bin && cout) {
          total += differenceInMinutes(cout, bin)
        }

        if (xcin && xcout) {
          total += differenceInMinutes(xcout, xcin)
        }

        if (total <= 0) return '--'

        const h = Math.floor(Math.abs(total) / 60)
        const m = Math.abs(total) % 60
        return `${h}h ${m.toString().padStart(2, '0')}m`
      }

      const tableRows = rows.map((r: any) => {
        const parsedDay = parseDateOnly(r.date)
        const formatTime = (time: string, nextDay?: boolean) =>
          time ? `${time}${nextDay ? ' (+1d)' : ''}` : ''

        const statusStr =
          r.status === 'PRESENCA'
            ? 'Presença'
            : r.status === 'FOLGA'
              ? 'Folga'
              : r.status === 'ATESTADO'
                ? 'Atestado'
                : r.status === 'FALTA_JUSTIFICADA'
                  ? 'F. Justificada'
                  : r.status === 'FALTA_INJUSTIFICADA'
                    ? 'F. Injustificada'
                    : r.status

        const list = timeClocks?.timeClocks || timeClocks?.data || []
        const dayClock: any = list.find((tc: any) => tc.date?.split('T')[0] === r.date)

        const getOvertimeStr = (row: any, originalDayClock: any) => {
          const ovtMins = originalDayClock?.overtimeMinutes ?? row.overtimeMinutes
          const calcMem = originalDayClock?.calculation_memory ?? row.calculation_memory

          if (!ovtMins || ovtMins <= 0) return '--'
          const h = Math.floor(ovtMins / 60)
          const m = ovtMins % 60
          const timeStr = `${h}h${m > 0 ? ` ${m.toString().padStart(2, '0')}m` : ''}`
          
          let percent = ''
          if (calcMem && calcMem.multiplier) {
              if (calcMem.multiplier === 1.6) percent = ' (60%)'
              else if (calcMem.multiplier >= 2.0) percent = ' (100%)'
          }
          return timeStr + percent
        }

        return [
          format(parsedDay, 'dd/MM (EEE)', { locale: ptBR }),
          formatTime(r.clockIn),
          formatTime(r.breakStart),
          formatTime(r.breakEnd),
          formatTime(r.clockOut, r.clockOutNextDay),
          formatTime(r.extraClockIn),
          formatTime(r.extraClockOut, r.extraClockOutNextDay),
          statusStr,
          r.isExtraDay ? 'Sim' : 'Não',
          r.negotiatedValue
            ? Number(r.negotiatedValue).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })
            : '--',
          calculateNetHours(r),
          getOvertimeStr(r, dayClock),
        ]
      })

      // Call autoTable
      autoTable(doc, {
        startY: 40,
        margin: { left: 15, right: 15 },
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
          halign: 'center',
          font: 'helvetica',
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        head: [
          [
            'Data',
            'Entrada 1',
            'Saída 1',
            'Entrada 2',
            'Saída 2',
            'Entrada 3',
            'Saída 3',
            'Status',
            'Extra?',
            'Valor',
            'Horas',
            'H. Extras',
          ],
        ],
        body: tableRows,
      })

      // Capture final position
      let finalY = (doc as any).lastAutoTable.finalY + 10

      // Page bounds check
      if (finalY > 260) {
        doc.addPage()
        finalY = 20
      }

      // Summary Text
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)

      const totalHoursFormatted = timeClocks?.summary?.totalHours || '--'
      doc.text(`Total de Horas Trabalhadas: ${totalHoursFormatted}`, 15, finalY)

      const totalExtraDays =
        timeClocks?.summary?.extraDays ??
        rows.filter((r: any) => r.isExtraDay).length
      doc.text(`Dias Extras: ${totalExtraDays}`, 15, finalY + 5)
      
      const ovt60 = timeClocks?.summary?.totalOvertimeMinutes60 || 0
      const ovt100 = timeClocks?.summary?.totalOvertimeMinutes100 || 0
      if (ovt60 > 0 || ovt100 > 0) {
        let txt = 'Horas Extras Estimadas:'
        if (ovt60 > 0) {
           const h = Math.floor(ovt60 / 60)
           const m = ovt60 % 60
           txt += ` ${h}h${m.toString().padStart(2, '0')}m (60%)`
        }
        if (ovt100 > 0) {
           const h = Math.floor(ovt100 / 60)
           const m = ovt100 % 60
           txt += `${ovt60 > 0 ? ' | ' : ' '}${h}h${m.toString().padStart(2, '0')}m (100%)`
        }
        doc.text(txt, 15, finalY + 10)
      }

      // Signature area
      finalY += 15
      if (finalY > 275) {
        doc.addPage()
        finalY = 25
      }

      doc.line(15, finalY, 120, finalY)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text('Assinatura do Colaborador', 15, finalY + 4)

      doc.line(150, finalY, 255, finalY)
      doc.text('Assinatura do Gestor / Empresa', 150, finalY + 4)

      doc.save(
        `Espelho_Ponto_${employee?.name ? employee.name.replace(/\\s+/g, '_') : 'colaborador'}_${format(month, 'MM_yyyy')}.pdf`,
      )
      toast.success('PDF gerado com sucesso!')
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      toast.error('Erro ao gerar o PDF.')
    }
  }

  if (!employeeId) return <div>Funcionário não encontrado</div>

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 flex flex-col justify-between gap-4 border-b bg-card p-4 shadow-sm md:px-6 xl:flex-row xl:items-center">
        <div className="flex w-full flex-col justify-between gap-4 sm:flex-row sm:items-center xl:w-auto xl:justify-start">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              title="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                Espelho de Ponto
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                <span className="font-medium text-foreground">
                  {employee?.name}
                </span>
                <span className="hidden sm:inline">•</span>
                <span>{employee?.role}</span>
              </div>
            </div>
          </div>

          {/* Summary Logic */}
          <div className="flex items-center gap-4 overflow-x-auto py-1 sm:py-0">
            {(() => {
              const rows = watch('rows') || []
              // Estimativa DIÁRIA (espelha a lógica do backend):
              // Para cada dia, apura o excedente acima da jornada diária (7h20 = 440min).
              // Se for Domingo/Feriado: excedente vai para 100%; caso contrário: 60%.
              let estimatedOvt60 = 0 // minutos de HE a 60%
              let estimatedOvt100 = 0 // minutos de HE a 100%
              let totalMinutes60 = 0 // total trabalhado em dias normais (para exibição de horas)
              let totalMinutes100 = 0 // total trabalhado em Dom/Feriado (para exibição de horas)
              let dsrcMinutes = 0
              const DAILY_WORKLOAD = 440 // 7h20
              const TOLERANCE = 10 // 10 minutos de tolerância CLT
              // weeksWithPresence: semanas que tiveram ao menos 1 dia trabalhado ou justificado
              const weeksWithPresence = new Set<string>()
              const weeksWithInjustFalta = new Set<string>()

              rows.forEach((row: any) => {
                const d = new Date(row.date + 'T12:00:00')
                const weekKey = `${d.getFullYear()}-W${getISOWeek(d)}`

                if (
                  row.status === 'ATESTADO' ||
                  row.status === 'FALTA_JUSTIFICADA'
                ) {
                  totalMinutes60 += DAILY_WORKLOAD
                  weeksWithPresence.add(weekKey)
                  return
                }

                if (row.status === 'FALTA_INJUSTIFICADA') {
                  weeksWithInjustFalta.add(weekKey)
                  weeksWithPresence.add(weekKey)
                  return
                }

                if (row?.status !== 'PRESENCA') return

                const setTime = (t: string, nextDay?: boolean) => {
                  if (!t) return null
                  const [h, m] = t.split(':').map(Number)
                  const isAutoNextDay = h < 4
                  return (h + (nextDay || isAutoNextDay ? 24 : 0)) * 60 + m
                }

                const cin = setTime(row.clockIn, false)
                const bin = setTime(row.breakStart, false)
                const bout = setTime(row.breakEnd, false)
                const cout = setTime(row.clockOut, row.clockOutNextDay)
                const xcin = setTime(row.extraClockIn, false)
                const xcout = setTime(
                  row.extraClockOut,
                  row.extraClockOutNextDay,
                )

                // Só conta horas se houver ao menos entrada + saída
                let workedDayMins = 0
                if (
                  cin !== null &&
                  bin !== null &&
                  bout !== null &&
                  cout !== null
                ) {
                  workedDayMins = bin - cin + (cout - bout)
                } else if (
                  cin !== null &&
                  cout !== null &&
                  bin === null &&
                  bout === null
                ) {
                  workedDayMins = cout - cin
                }
                // Se só tem entrada sem saída, workedDayMins permanece 0 (registro incompleto)
                if (xcin !== null && xcout !== null) {
                  workedDayMins += xcout - xcin
                }

                // Só marca presença na semana se tiver ao menos entrada registrada
                if (cin !== null) {
                  weeksWithPresence.add(weekKey)
                }

                // Excedente diário (com tolerância)
                const excess = workedDayMins - DAILY_WORKLOAD
                const dailyOvt = excess > TOLERANCE ? excess : 0

                const isSunday = d.getDay() === 0
                const isHoliday = holidaysData?.holidays?.some((h: any) =>
                  h.date.startsWith(row.date),
                )

                if (isHoliday) {
                  totalMinutes100 += workedDayMins
                  estimatedOvt100 += workedDayMins // Feriado é 100% o dia todo
                } else if (isSunday) {
                  totalMinutes100 += workedDayMins
                  estimatedOvt100 += dailyOvt
                } else {
                  totalMinutes60 += workedDayMins
                  estimatedOvt60 += dailyOvt
                }
              })

              // DSR: 1 por semana que teve presença e sem falta injustificada
              weeksWithPresence.forEach((w) => {
                if (!weeksWithInjustFalta.has(w)) {
                  dsrcMinutes += 440
                }
              })

              // Horas trabalhadas = apenas horas reais (sem DSR, que é remuneração contábil)
              const totalMinutes = totalMinutes60 + totalMinutes100

              const isNegative = totalMinutes < 0
              const absMins = Math.abs(totalMinutes)
              const h = Math.floor(absMins / 60)
              const m = absMins % 60
              const formattedHours = `${isNegative ? '-' : ''}${h}h ${m.toString().padStart(2, '0')}m`

              return (
                <>
                  <div className="flex flex-shrink-0 items-center gap-4 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 shadow-sm">
                    {/* Saldo de Horas */}
                    <div className="flex flex-col items-center">
                      <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Horas Trabalhadas
                      </span>
                      <span
                        className={cn(
                          'font-mono text-lg font-bold sm:text-xl',
                          'text-primary',
                        )}
                      >
                        {timeClocks?.summary?.totalHours || formattedHours}
                      </span>
                    </div>

                    <div className="h-6 w-px bg-border" />

                    {/* Dias Extras */}
                    <div className="flex flex-col items-center text-green-600">
                      <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Dias Extras
                      </span>
                      <span className="font-mono text-lg font-bold sm:text-xl">
                        {timeClocks?.summary?.extraDays ??
                          rows.filter((r: any) => r.isExtraDay).length}
                      </span>
                    </div>
                  </div>

                  {employee?.registrationType === 'DAILY' && (
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <div className="flex flex-col items-end rounded-lg border border-green-100 bg-green-50/50 px-3 py-1">
                        <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-green-700">
                          Q1 (1 a 15)
                        </span>
                        <span className="font-mono text-base font-bold text-green-700 sm:text-lg">
                          {(() => {
                            const workedQ1 = rows.filter(
                              (r: any) =>
                                r.status === 'PRESENCA' &&
                                new Date(r.date + 'T12:00:00').getDate() <= 15,
                            ).length
                            const rate = employee.dailyRate || 0
                            return (workedQ1 * rate).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })
                          })()}
                        </span>
                      </div>
                      <div className="flex flex-col items-end rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-1">
                        <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                          Q2 (16+)
                        </span>
                        <span className="font-mono text-base font-bold text-emerald-700 sm:text-lg">
                          {(() => {
                            const workedQ2 = rows.filter(
                              (r: any) =>
                                r.status === 'PRESENCA' &&
                                new Date(r.date + 'T12:00:00').getDate() > 15,
                            ).length
                            const rate = employee.dailyRate || 0
                            return (workedQ2 * rate).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })
                          })()}
                        </span>
                      </div>
                    </div>
                  )}

                  {employee?.registrationType === 'HOURLY' && (
                    <div className="flex flex-shrink-0 flex-col items-end rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-1">
                      <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                        Total a Pagar (Horas)
                      </span>
                      <span className="font-mono text-base font-bold text-blue-700 sm:text-lg">
                        {(() => {
                          const rate = Number(employee.salary) || 0
                          const totalValue =
                            ((totalMinutes60 + totalMinutes100) / 60) * rate
                          return totalValue.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })
                        })()}
                      </span>
                    </div>
                  )}

                  {employee?.registrationType === 'REGISTERED' && (
                    <div className="flex flex-shrink-0 flex-col items-end rounded-lg border border-purple-100 bg-purple-50/50 px-3 py-1 shadow-sm">
                      <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-purple-700">
                        Horas Extras (Estimativa)
                      </span>
                      <span className="font-mono text-base font-bold text-purple-700 sm:text-lg">
                        {(() => {
                          const rate = Number(employee.salary) || 0
                          const hourlyRate = rate / 220

                          const overtimeHourlyRate60 = hourlyRate * 1.6 // 60%
                          const overtimeHourlyRate100 = hourlyRate * 2.0 // 100%

                          const summaryResult = timeClocks?.summary

                          // Preferência pelo backend (linha a linha), caso contrário usa estimativa diária
                          const finalOvt60 =
                            summaryResult?.totalOvertimeMinutes60 ??
                            estimatedOvt60
                          const finalOvt100 =
                            summaryResult?.totalOvertimeMinutes100 ??
                            estimatedOvt100

                          const value60 =
                            summaryResult?.totalOvertimeValue60 ??
                            (finalOvt60 / 60) * overtimeHourlyRate60
                          const value100 =
                            summaryResult?.totalOvertimeValue100 ??
                            (finalOvt100 / 60) * overtimeHourlyRate100
                          const totalValue = value60 + value100

                          if (finalOvt60 <= 0 && finalOvt100 <= 0)
                            return '0h00 - R$ 0,00'

                          const totalOvtMins = finalOvt60 + finalOvt100
                          const h = Math.floor(totalOvtMins / 60)
                          const m = totalOvtMins % 60
                          const formattedHE = `${h}h${m.toString().padStart(2, '0')}`

                          const formatMins = (mins: number) =>
                            `${Math.floor(mins / 60)}h${(mins % 60).toString().padStart(2, '0')}`

                          return (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger className="flex cursor-help items-center gap-1 whitespace-nowrap border-b border-dashed border-purple-300">
                                  {formattedHE} ={' '}
                                  {totalValue.toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  })}
                                </TooltipTrigger>
                                <TooltipContent
                                  side="bottom"
                                  className="max-w-[280px] border-purple-800 bg-purple-900 p-3 text-xs leading-relaxed text-purple-50 shadow-xl"
                                >
                                  <p className="mb-1 border-b border-purple-700 pb-1 font-semibold">
                                    Cálculo de Hora Extra
                                  </p>
                                  <ul className="mt-2 space-y-2">
                                    <li>
                                      <span className="opacity-70">
                                        Salário-base:
                                      </span>{' '}
                                      R$ {rate.toFixed(2)} (R${' '}
                                      {hourlyRate.toFixed(2)}/h)
                                    </li>
                                    {finalOvt60 > 0 && (
                                      <li className="rounded bg-purple-800/50 p-1.5">
                                        <span className="block font-semibold opacity-70">
                                          Dias Normais (+60%):
                                        </span>
                                        {formatMins(finalOvt60)} ={' '}
                                        {value60.toLocaleString('pt-BR', {
                                          style: 'currency',
                                          currency: 'BRL',
                                        })}
                                      </li>
                                    )}
                                    {finalOvt100 > 0 && (
                                      <li className="rounded bg-purple-800/50 p-1.5">
                                        <span className="block font-semibold opacity-70">
                                          Dom/Feriado (+100%):
                                        </span>
                                        {formatMins(finalOvt100)} ={' '}
                                        {value100.toLocaleString('pt-BR', {
                                          style: 'currency',
                                          currency: 'BRL',
                                        })}
                                      </li>
                                    )}
                                    <li className="mt-1 border-t border-purple-700 pt-1 font-bold text-purple-200">
                                      Total:{' '}
                                      {totalValue.toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                      })}
                                    </li>
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        })()}
                      </span>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:flex-nowrap xl:w-auto">
          <div className="flex flex-shrink-0 items-center gap-2 rounded-md border bg-background/50 p-1">
            <MonthPicker date={month} setDate={setMonth} />
          </div>
          <Button
            onClick={exportToPDF}
            variant="outline"
            className="flex-1 shadow-md sm:flex-initial"
          >
            <FileText className="mr-2 h-4 w-4" />
            Exportar para PDF
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving || isLoading}
            className="w-full flex-1 shadow-md sm:w-[180px] sm:flex-initial"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar Alterações
          </Button>
        </div>
      </header>

      {/* Grid */}
      <div className="w-full max-w-full flex-1 overflow-x-auto p-0">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Table className="border-collapse">
            <TableHeader className="sticky top-0 z-20 bg-muted shadow-sm">
              <TableRow className="border-b-2 border-muted-foreground/20">
                <TableHead className="w-[100px] bg-muted pl-6 font-bold">
                  Data
                </TableHead>
                <TableHead className="w-[85px] bg-muted text-center text-xs font-bold">
                  Entrada 1
                </TableHead>
                <TableHead className="w-[85px] bg-muted text-center text-xs font-bold">
                  Saída 1
                </TableHead>
                <TableHead className="w-[85px] bg-muted text-center text-xs font-bold">
                  Entrada 2
                </TableHead>
                <TableHead className="w-[85px] bg-muted text-center text-xs font-bold">
                  Saída 2
                </TableHead>
                <TableHead className="w-[85px] bg-muted text-center text-xs font-bold">
                  Entrada 3
                </TableHead>
                <TableHead className="w-[85px] bg-muted text-center text-xs font-bold">
                  Saída 3
                </TableHead>
                <TableHead className="w-[110px] bg-muted text-center text-xs font-bold">
                  Status
                </TableHead>
                <TableHead className="w-[60px] bg-muted text-center text-xs font-bold">
                  Extra?
                </TableHead>
                <TableHead className="w-[90px] bg-muted pr-2 text-xs font-bold">
                  Valor
                </TableHead>
                <TableHead className="w-[80px] bg-muted pr-4 text-right text-xs font-bold">
                  Saldo
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : (
                fields.map((field: any, index) => (
                  <MirrorRowField
                    key={field.id}
                    index={index}
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    day={parseDateOnly(field.date)}
                    dailyRate={employee?.dailyRate || 0}
                    holidays={holidaysData?.holidays}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </form>
      </div>
    </div>
  )
}

// Subcomponents

function MirrorRowField({
  index,
  register,
  watch,
  setValue,
  day,
  dailyRate,
  holidays,
}: {
  index: number
  register: any
  watch: any
  setValue: any
  day: Date
  dailyRate: number
  holidays?: any[]
}) {
  const isWeekend = day.getDay() === 0 || day.getDay() === 6

  // Holiday detection
  const dayStr = format(day, 'yyyy-MM-dd')
  const holiday = holidays?.find((h) => h.date?.startsWith(dayStr))
  const isNationalHoliday = holiday?.type === 'NATIONAL'
  const isMunicipalHoliday =
    holiday?.type === 'MUNICIPAL' ||
    holiday?.type === 'STATE' ||
    holiday?.type === 'CUSTOM'

  const status = watch(`rows.${index}.status`)
  const isWorked = status === 'PRESENCA'
  const isExtraDay = watch(`rows.${index}.isExtraDay`)
  const clockIn = watch(`rows.${index}.clockIn`)
  const breakStart = watch(`rows.${index}.breakStart`)
  const breakEnd = watch(`rows.${index}.breakEnd`)
  const clockOut = watch(`rows.${index}.clockOut`)
  const extraClockIn = watch(`rows.${index}.extraClockIn`)
  const extraClockOut = watch(`rows.${index}.extraClockOut`)
  const clockOutNextDay = watch(`rows.${index}.clockOutNextDay`)
  const extraClockOutNextDay = watch(`rows.${index}.extraClockOutNextDay`)

  const [isDraggingOver, setIsDraggingOver] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, fieldName: string) => {
    e.dataTransfer.setData('fieldName', fieldName)
  }

  const handleDrop = (e: React.DragEvent, targetField: string) => {
    e.preventDefault()
    setIsDraggingOver(null)
    const sourceField = e.dataTransfer.getData('fieldName')
    if (sourceField && sourceField !== targetField) {
      const sourceVal = watch(`rows.${index}.${sourceField}`)
      const targetVal = watch(`rows.${index}.${targetField}`)

      setValue(`rows.${index}.${sourceField}`, targetVal)
      setValue(`rows.${index}.${targetField}`, sourceVal)
      toast.info('Horários trocados com sucesso!')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const form = e.currentTarget.form
      if (!form) return

      const inputs = Array.from(form.elements).filter(
        (el) => el instanceof HTMLInputElement && !el.hidden && !el.disabled,
      ) as HTMLInputElement[]

      const currentIndex = inputs.indexOf(e.currentTarget)
      const nextInput = inputs[currentIndex + 1]

      if (nextInput) {
        nextInput.focus()
      }
    }
  }

  const openPicker = (id: string) => {
    const el = document.getElementById(id) as HTMLInputElement
    if (el && el.showPicker) {
      el.showPicker()
    }
  }

  const calculateHours = (
    cin?: string,
    bout?: string,
    bin?: string,
    cout?: string,
    xcin?: string,
    xcout?: string,
  ) => {
    let total = 0
    const setTime = (t: string, isNext?: boolean) => {
      if (!t) return new Date()
      const [h, m] = t.split(':').map(Number)
      let d = new Date(day)
      d.setHours(h, m, 0, 0)
      const isAutoNextDay = h < 4
      if (isNext || isAutoNextDay) d = addDays(d, 1)
      return d
    }

    if (cin && bout) {
      total += differenceInMinutes(setTime(bout), setTime(cin))
    } else if (cin && cout && !bout && !bin) {
      total += differenceInMinutes(setTime(cout, clockOutNextDay), setTime(cin))
    }

    if (bin && cout) {
      total += differenceInMinutes(setTime(cout, clockOutNextDay), setTime(bin))
    }

    if (xcin && xcout) {
      total += differenceInMinutes(
        setTime(xcout, extraClockOutNextDay),
        setTime(xcin),
      )
    }

    if (total <= 0) return '--'

    const h = Math.floor(Math.abs(total) / 60)
    const m = Math.abs(total) % 60
    return `${h}h ${m.toString().padStart(2, '0')}m`
  }

  const netHours = calculateHours(
    clockIn,
    breakStart,
    breakEnd,
    clockOut,
    extraClockIn,
    extraClockOut,
  )

  const getDisplayHours = () => {
    if (status === 'ATESTADO' || status === 'FALTA_JUSTIFICADA')
      return '7h 20m (virtual)'
    if (status !== 'PRESENCA') return '--'
    return netHours
  }

  return (
    <TableRow
      className={cn(
        'transition-colors hover:bg-muted/10',
        { 'bg-blue-50/50': isWeekend && !holiday },
        isNationalHoliday && 'bg-green-50/60',
        isMunicipalHoliday && 'bg-sky-50/60',
      )}
    >
      <TableCell className="border-r py-2 pl-6 font-medium">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold">
              {format(day, 'dd/MM')}
            </span>
            {holiday && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none',
                  isNationalHoliday && 'bg-green-100 text-green-700',
                  isMunicipalHoliday && 'bg-sky-100 text-sky-700',
                )}
              >
                {isNationalHoliday ? 'NAC' : 'MUN'}
              </span>
            )}
          </div>
          <span className="text-xs capitalize text-muted-foreground">
            {format(day, 'EEE', { locale: ptBR })}
          </span>
          {holiday && (
            <span
              className={cn(
                'text-[10px] font-medium leading-tight',
                isNationalHoliday ? 'text-green-600' : 'text-sky-600',
              )}
            >
              {holiday.name}
            </span>
          )}
        </div>
        <input type="hidden" {...register(`rows.${index}.date`)} />
      </TableCell>

      <TableCell
        className={cn(
          'group relative border-r p-0',
          isDraggingOver === 'clockIn' && 'bg-primary/10',
        )}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          setIsDraggingOver('clockIn')
        }}
        onDragLeave={() => setIsDraggingOver(null)}
        onDrop={(e) => handleDrop(e, 'clockIn')}
      >
        <div className="flex items-center px-1">
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'clockIn')}
            className="shrink-0 cursor-grab opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-100"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground/30" />
          </div>
          <Input
            type="time"
            {...register(`rows.${index}.clockIn`)}
            className="h-9 min-w-0 flex-1 border-0 bg-transparent px-1 text-center shadow-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            disabled={!isWorked}
            onKeyDown={(e) => handleKeyDown(e)}
            id={`clockIn-${index}`}
          />
          <button
            type="button"
            onClick={() => openPicker(`clockIn-${index}`)}
            className="shrink-0 p-1 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
            disabled={!isWorked}
          >
            <Clock className="h-3.5 w-3.5" />
          </button>
        </div>
      </TableCell>
      <TableCell
        className={cn(
          'group relative border-r p-0',
          isDraggingOver === 'breakStart' && 'bg-primary/10',
        )}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          setIsDraggingOver('breakStart')
        }}
        onDragLeave={() => setIsDraggingOver(null)}
        onDrop={(e) => handleDrop(e, 'breakStart')}
      >
        <div className="flex items-center px-1">
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'breakStart')}
            className="shrink-0 cursor-grab opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-100"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground/30" />
          </div>
          <Input
            type="time"
            {...register(`rows.${index}.breakStart`)}
            className="h-9 min-w-0 flex-1 border-0 bg-transparent px-1 text-center shadow-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            disabled={!isWorked}
            onKeyDown={(e) => handleKeyDown(e)}
            id={`breakStart-${index}`}
          />
          <button
            type="button"
            onClick={() => openPicker(`breakStart-${index}`)}
            className="shrink-0 p-1 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
            disabled={!isWorked}
          >
            <Clock className="h-3.5 w-3.5" />
          </button>
        </div>
      </TableCell>
      <TableCell
        className={cn(
          'group relative border-r p-0',
          isDraggingOver === 'breakEnd' && 'bg-primary/10',
        )}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          setIsDraggingOver('breakEnd')
        }}
        onDragLeave={() => setIsDraggingOver(null)}
        onDrop={(e) => handleDrop(e, 'breakEnd')}
      >
        <div className="flex items-center px-1">
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'breakEnd')}
            className="shrink-0 cursor-grab opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-100"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground/30" />
          </div>
          <Input
            type="time"
            {...register(`rows.${index}.breakEnd`)}
            className="h-9 min-w-0 flex-1 border-0 bg-transparent px-1 text-center shadow-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            disabled={!isWorked}
            onKeyDown={(e) => handleKeyDown(e)}
            id={`breakEnd-${index}`}
          />
          <button
            type="button"
            onClick={() => openPicker(`breakEnd-${index}`)}
            className="shrink-0 p-1 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
            disabled={!isWorked}
          >
            <Clock className="h-3.5 w-3.5" />
          </button>
        </div>
      </TableCell>
      <TableCell
        className={cn(
          'group relative border-r p-0',
          isDraggingOver === 'clockOut' && 'bg-primary/10',
        )}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          setIsDraggingOver('clockOut')
        }}
        onDragLeave={() => setIsDraggingOver(null)}
        onDrop={(e) => handleDrop(e, 'clockOut')}
      >
        <div className="flex items-center px-1">
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'clockOut')}
            className="shrink-0 cursor-grab opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-100"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground/30" />
          </div>
          <Input
            type="time"
            {...register(`rows.${index}.clockOut`)}
            className="h-9 min-w-0 flex-1 border-0 bg-transparent px-1 text-center shadow-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            disabled={!isWorked}
            onKeyDown={(e) => handleKeyDown(e)}
            id={`clockOut-${index}`}
          />
          <button
            type="button"
            onClick={() => openPicker(`clockOut-${index}`)}
            className="shrink-0 p-1 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
            disabled={!isWorked}
          >
            <Clock className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() =>
              setValue(`rows.${index}.clockOutNextDay`, !clockOutNextDay)
            }
            className={cn(
              'whitespace-nowrap rounded px-1 py-0.5 text-[10px] font-bold transition-colors',
              clockOutNextDay
                ? 'text-primary hover:bg-primary/5'
                : 'text-slate-300 hover:text-slate-400',
            )}
            disabled={!isWorked}
          >
            1d+
          </button>
        </div>
      </TableCell>
      <TableCell
        className={cn(
          'group relative border-r p-0',
          isDraggingOver === 'extraClockIn' && 'bg-primary/10',
        )}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          setIsDraggingOver('extraClockIn')
        }}
        onDragLeave={() => setIsDraggingOver(null)}
        onDrop={(e) => handleDrop(e, 'extraClockIn')}
      >
        <div className="flex items-center px-1">
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'extraClockIn')}
            className="shrink-0 cursor-grab opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-100"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground/30" />
          </div>
          <Input
            type="time"
            {...register(`rows.${index}.extraClockIn`)}
            className="h-9 min-w-0 flex-1 border-0 bg-transparent px-1 text-center shadow-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            disabled={!isWorked}
            onKeyDown={(e) => handleKeyDown(e)}
            id={`extraClockIn-${index}`}
          />
          <button
            type="button"
            onClick={() => openPicker(`extraClockIn-${index}`)}
            className="shrink-0 p-1 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
            disabled={!isWorked}
          >
            <Clock className="h-3.5 w-3.5" />
          </button>
        </div>
      </TableCell>
      <TableCell
        className={cn(
          'group relative border-r p-0',
          isDraggingOver === 'extraClockOut' && 'bg-primary/10',
        )}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          setIsDraggingOver('extraClockOut')
        }}
        onDragLeave={() => setIsDraggingOver(null)}
        onDrop={(e) => handleDrop(e, 'extraClockOut')}
      >
        <div className="flex items-center px-1">
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'extraClockOut')}
            className="shrink-0 cursor-grab opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-100"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground/30" />
          </div>
          <Input
            type="time"
            {...register(`rows.${index}.extraClockOut`)}
            className="h-9 min-w-0 flex-1 border-0 bg-transparent px-1 text-center shadow-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            disabled={!isWorked}
            onKeyDown={(e) => handleKeyDown(e)}
            id={`extraClockOut-${index}`}
          />
          <button
            type="button"
            onClick={() => openPicker(`extraClockOut-${index}`)}
            className="shrink-0 p-1 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
            disabled={!isWorked}
          >
            <Clock className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() =>
              setValue(
                `rows.${index}.extraClockOutNextDay`,
                !extraClockOutNextDay,
              )
            }
            className={cn(
              'whitespace-nowrap rounded px-1 py-0.5 text-[10px] font-bold transition-colors',
              extraClockOutNextDay
                ? 'text-primary hover:bg-primary/5'
                : 'text-slate-300 hover:text-slate-400',
            )}
            disabled={!isWorked}
          >
            1d+
          </button>
        </div>
      </TableCell>

      <TableCell className="border-r p-1 text-center">
        <div className="flex h-full items-center justify-center">
          <select
            {...register(`rows.${index}.status`)}
            className={cn(
              'h-8 w-full rounded border bg-background px-1 text-[11px]',
              status === 'ATESTADO' && 'font-semibold text-blue-600',
              status === 'FALTA_INJUSTIFICADA' && 'font-semibold text-red-600',
              status === 'FALTA_JUSTIFICADA' && 'font-semibold text-amber-600',
              status === 'FOLGA' && 'italic text-muted-foreground',
              status === 'PRESENCA' && 'text-foreground',
            )}
            onKeyDown={(e: any) => handleKeyDown(e)}
          >
            <option value="PRESENCA">Presença</option>
            <option value="FOLGA">Folga</option>
            <option value="ATESTADO">Atestado</option>
            <option value="FALTA_JUSTIFICADA">F. Justificada</option>
            <option value="FALTA_INJUSTIFICADA">F. Injustificada</option>
          </select>
        </div>
      </TableCell>

      <TableCell className="border-r p-0 text-center">
        <div className="flex h-full items-center justify-center">
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
            {...register(`rows.${index}.isExtraDay`, {
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                const isChecked = e.target.checked
                if (isChecked && dailyRate && Number(dailyRate) > 0) {
                  const currentVal = watch(`rows.${index}.negotiatedValue`)
                  if (!currentVal || Number(currentVal) === 0) {
                    setValue(`rows.${index}.negotiatedValue`, Number(dailyRate))
                    toast.info(
                      `Valor da diária preenchido: R$ ${Number(dailyRate).toFixed(2)}`,
                      { duration: 1500 },
                    )
                  }
                }
              },
            })}
            disabled={!isWorked}
            onKeyDown={(e) => handleKeyDown(e as any)}
          />
        </div>
      </TableCell>

      <TableCell className="border-r p-1">
        <Input
          type="number"
          placeholder="0,00"
          className={cn(
            'h-8 border-0 text-right shadow-none focus-visible:ring-1',
            isExtraDay
              ? 'bg-green-50/50'
              : 'bg-transparent text-muted-foreground',
          )}
          step="0.01"
          disabled={!isExtraDay}
          {...register(`rows.${index}.negotiatedValue`)}
          onKeyDown={(e) => handleKeyDown(e)}
        />
      </TableCell>

      <TableCell className="bg-muted/5 pr-6 text-right font-mono text-sm">
        {getDisplayHours()}
      </TableCell>
    </TableRow>
  )
}
