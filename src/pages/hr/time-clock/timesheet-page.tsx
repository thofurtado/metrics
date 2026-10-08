import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  FileText,
  GripVertical,
  Loader2,
  Moon,
  Save,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { getEmployees } from '@/api/hr/employees'
import { listHolidays } from '@/api/hr/holidays'
import {
  ApuracaoDoDia,
  apurarPonto,
  DiaEditado,
  horas,
  NOMES_DOS_AVISOS,
  percentual,
} from '@/api/hr/ponto'
import { bulkUpsertTimeClock, listTimeClocks } from '@/api/hr/time-clock'
import { AvisoRegraDoPonto } from '@/components/hr/aviso-regra-do-ponto'
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

/** "18:30" do dia da linha (ou do dia seguinte, com o 1d+) em ISO, como o salvar sempre gravou */
function montarHorario(
  dateStr: string,
  timeStr?: string,
  isNextDay?: boolean,
): string | null {
  if (!timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  const [yyyy, mm, dd] = dateStr.split('-').map(Number)
  let d = new Date(yyyy, mm - 1, dd, h, m, 0, 0)
  if (isNextDay) d = addDays(d, 1)
  return d.toISOString()
}

/** A linha do espelho, ainda não salva, no formato que a conta do servidor entende */
function diaEditadoDaLinha(r: any): DiaEditado {
  const trabalhou = r.status === 'PRESENCA'
  return {
    data: r.date,
    entrada: trabalhou ? montarHorario(r.date, r.clockIn) : null,
    saidaIntervalo: trabalhou ? montarHorario(r.date, r.breakStart) : null,
    voltaIntervalo: trabalhou ? montarHorario(r.date, r.breakEnd) : null,
    saida: trabalhou
      ? montarHorario(r.date, r.clockOut, r.clockOutNextDay)
      : null,
    entradaExtra: trabalhou ? montarHorario(r.date, r.extraClockIn) : null,
    saidaExtra: trabalhou
      ? montarHorario(r.date, r.extraClockOut, r.extraClockOutNextDay)
      : null,
    dobra: trabalhou ? !!r.isExtraDay : false,
    valorDobra: r.negotiatedValue ? Number(r.negotiatedValue) : null,
    ausencia: r.status === 'PRESENCA' || r.status === 'FOLGA' ? null : r.status,
  }
}

const moeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export interface TimeSheetPageProps {
  employeeId?: string
  hideBackButton?: boolean
  onBack?: () => void
  isEmbedded?: boolean
}

// Page Component
export function TimeSheetPage({
  employeeId: employeeIdProp,
  hideBackButton = false,
  onBack,
  isEmbedded = false,
}: TimeSheetPageProps = {}) {
  const params = useParams<{ employeeId: string }>()
  const employeeId = employeeIdProp || params.employeeId
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

  // A conta única do ponto (08/10/2026): mora no servidor. Enquanto a pessoa edita, a tela manda os dias meio segundo depois da
  // última mudança e mostra o resultado (antes cada tela fazia a sua conta, com 7h20 e 60% fixos).
  const linhasAtuais = watch('rows') || []
  const assinaturaDosDias = JSON.stringify(linhasAtuais.map(diaEditadoDaLinha))
  const [diasParaConta, setDiasParaConta] = useState<DiaEditado[] | null>(null)
  useEffect(() => {
    const espera = setTimeout(
      () => setDiasParaConta(JSON.parse(assinaturaDosDias)),
      500,
    )
    return () => clearTimeout(espera)
  }, [assinaturaDosDias])
  const { data: apuracao, isFetching: calculando } = useQuery({
    queryKey: [
      'ponto-apuracao',
      employeeId,
      format(startDate, 'yyyy-MM-dd'),
      diasParaConta,
    ],
    queryFn: () =>
      apurarPonto({
        employee_id: employeeId!,
        inicio: format(startDate, 'yyyy-MM-dd'),
        fim: format(endDate, 'yyyy-MM-dd'),
        dias: diasParaConta ?? [],
      }),
    enabled: !!employeeId && !!diasParaConta && diasParaConta.length > 0,
    placeholderData: (anterior) => anterior,
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
      queryClient.invalidateQueries({ queryKey: ['ponto-resumo'] })
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

      // A conta do PDF é a mesma da tela (vem do servidor)
      if (!apuracao) {
        toast.error('Aguarde a conta do mês terminar e tente de novo.')
        return
      }
      const rows = watch('rows') || []
      const regra = apuracao.regra
      const t = apuracao.totais
      const diaDaConta = (data: string) =>
        apuracao.dias.find((d) => d.data === data)

      const textoHoras = (row: any) => {
        const d = diaDaConta(row.date)
        if (!d) return '--'
        if (d.virtuaisMin > 0) return `${horas(d.virtuaisMin)} (virtual)`
        return d.trabalhadosMin > 0 ? horas(d.trabalhadosMin) : '--'
      }
      const textoExtras = (row: any) => {
        const d = diaDaConta(row.date)
        if (!d) return '--'
        const partes: string[] = []
        if (d.extraMin + d.extraSemanaMin > 0)
          partes.push(
            `${horas(d.extraMin + d.extraSemanaMin)} (${percentual(regra.multiplicadorExtra)})`,
          )
        if (d.extraSegundaFaixaMin > 0 && regra.multiplicadorSegundaFaixa)
          partes.push(
            `${horas(d.extraSegundaFaixaMin)} (${percentual(regra.multiplicadorSegundaFaixa)})`,
          )
        if (d.extraEspecialMin > 0)
          partes.push(
            `${horas(d.extraEspecialMin)} (${percentual(regra.multiplicadorEspecial)})`,
          )
        return partes.length ? partes.join(' + ') : '--'
      }
      const textoNoturno = (row: any) => {
        const d = diaDaConta(row.date)
        return d && d.noturnosMin > 0 ? horas(d.noturnosMin) : '--'
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
          r.negotiatedValue ? moeda(Number(r.negotiatedValue)) : '--',
          textoHoras(r),
          textoExtras(r),
          textoNoturno(r),
        ]
      })

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
            'Noturno',
          ],
        ],
        body: tableRows,
      })

      let finalY = (doc as any).lastAutoTable.finalY + 10

      // Resumo do mês pela regra da loja
      const linhasDoResumo: Array<[string, string]> = [
        [
          'Total de horas trabalhadas:',
          horas(t.trabalhadosMin) +
            (t.virtuaisMin > 0
              ? ` (+ ${horas(t.virtuaisMin)} de atestado)`
              : ''),
        ],
        [
          `Hora extra (${percentual(regra.multiplicadorExtra)}):`,
          `${horas(t.extraMin + t.extraSemanaMin)} = ${moeda(t.valorExtraNormal)}`,
        ],
      ]
      if (regra.multiplicadorSegundaFaixa && t.extraSegundaFaixaMin > 0) {
        linhasDoResumo.push([
          `Hora extra (${percentual(regra.multiplicadorSegundaFaixa)}):`,
          `${horas(t.extraSegundaFaixaMin)} = ${moeda(t.valorExtraSegundaFaixa)}`,
        ])
      }
      linhasDoResumo.push([
        `Domingo e feriado (${percentual(regra.multiplicadorEspecial)}):`,
        `${horas(t.extraEspecialMin)} = ${moeda(t.valorExtraEspecial)}`,
      ])
      linhasDoResumo.push([
        `Adicional noturno${regra.noturnoLigado ? ` (${Math.round(regra.adicionalNoturno * 100)}%)` : ''}:`,
        regra.noturnoLigado
          ? `${horas(t.noturnosMin)} = ${moeda(t.valorNoturno)}`
          : `${horas(t.noturnosMin)} (não pago pela regra da loja)`,
      ])
      const alturaDoQuadro = 22 + linhasDoResumo.length * 7

      if (finalY + alturaDoQuadro > 190) {
        doc.addPage()
        finalY = 20
      }

      doc.setDrawColor(200, 200, 200)
      doc.setFillColor(248, 250, 252) // slate-50
      doc.roundedRect(15, finalY, 140, alturaDoQuadro, 3, 3, 'FD')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(30, 41, 59) // slate-800
      doc.text('Resumo e Estimativas', 20, finalY + 7)
      doc.line(15, finalY + 10, 155, finalY + 10)

      doc.setFontSize(9)
      linhasDoResumo.forEach(([rotulo, valor], i) => {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(71, 85, 105) // slate-600
        doc.text(rotulo, 20, finalY + 16 + i * 7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(15, 23, 42)
        doc.text(valor, 80, finalY + 16 + i * 7)
      })

      const yTotal = finalY + 16 + linhasDoResumo.length * 7
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(22, 163, 74) // green-600
      doc.text('Valor estimado (extras + noturno):', 20, yTotal)
      doc.text(moeda(t.valorExtra + t.valorNoturno), 80, yTotal)

      doc.setTextColor(0, 0, 0)
      finalY += alturaDoQuadro + 10

      // Signature area
      finalY += 15
      if (finalY > 185) {
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

  if (!employeeId) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-muted-foreground dark:border-slate-800">
        <Clock className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-base font-medium">Nenhum colaborador selecionado</p>
        <p className="text-xs">
          Selecione um colaborador para abrir o espelho de ponto e editar
          batidas.
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col bg-background',
        isEmbedded ? 'w-full space-y-4' : 'h-[calc(100vh-4rem)]',
      )}
    >
      <AvisoRegraDoPonto />
      {/* Header */}
      <header
        className={cn(
          'flex flex-col justify-between gap-4 border bg-card p-4 shadow-sm xl:flex-row xl:items-center',
          isEmbedded
            ? 'rounded-2xl border-slate-200/80 dark:border-slate-800'
            : 'sticky top-0 z-30 border-b md:px-6',
        )}
      >
        <div className="flex w-full flex-col justify-between gap-4 sm:flex-row sm:items-center xl:w-auto xl:justify-start">
          <div className="flex items-center gap-4">
            {!hideBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (onBack) onBack()
                  else navigate(-1)
                }}
                title="Voltar"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
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

          {/* Resumo do mês: a conta vem do servidor (a mesma do resumo do mês e do PDF) */}
          <div className="flex flex-wrap items-center gap-2 py-1 sm:py-0">
            {(() => {
              const rows = watch('rows') || []
              const t = apuracao?.totais
              const regra = apuracao?.regra
              const extraNormalMin = t ? t.extraMin + t.extraSemanaMin : 0
              const totalExtraMin = t
                ? extraNormalMin + t.extraSegundaFaixaMin + t.extraEspecialMin
                : 0
              const avisos = t
                ? (
                    Object.entries(t.avisos) as Array<
                      [keyof typeof NOMES_DOS_AVISOS, number]
                    >
                  ).filter(([, n]) => n > 0)
                : []
              const totalDeAvisos = avisos.reduce((s, [, n]) => s + n, 0)

              return (
                <>
                  <div className="flex flex-shrink-0 items-center gap-4 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 shadow-sm">
                    <div className="flex flex-col items-center">
                      <span className="flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Horas Trabalhadas
                        {calculando && (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        )}
                      </span>
                      <span className="font-mono text-lg font-bold text-primary sm:text-xl">
                        {t ? horas(t.trabalhadosMin + t.virtuaisMin) : '--'}
                      </span>
                    </div>

                    <div className="h-6 w-px bg-border" />

                    <div className="flex flex-col items-center text-green-600">
                      <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Dias Extras
                      </span>
                      <span className="font-mono text-lg font-bold sm:text-xl">
                        {t?.dobras ??
                          rows.filter((r: any) => r.isExtraDay).length}
                      </span>
                    </div>
                  </div>

                  {employee?.registrationType === 'DAILY' && (
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <div className="flex flex-col items-end rounded-lg border border-green-100 bg-green-50/50 px-3 py-1 dark:border-green-900/50 dark:bg-green-950/30">
                        <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-green-700 dark:text-green-300">
                          Q1 (1 a 15)
                        </span>
                        <span className="font-mono text-base font-bold text-green-700 dark:text-green-300 sm:text-lg">
                          {moeda(
                            rows.filter(
                              (r: any) =>
                                r.status === 'PRESENCA' &&
                                new Date(r.date + 'T12:00:00').getDate() <= 15,
                            ).length * (employee.dailyRate || 0),
                          )}
                        </span>
                      </div>
                      <div className="flex flex-col items-end rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-1 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                        <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          Q2 (16+)
                        </span>
                        <span className="font-mono text-base font-bold text-emerald-700 dark:text-emerald-300 sm:text-lg">
                          {moeda(
                            rows.filter(
                              (r: any) =>
                                r.status === 'PRESENCA' &&
                                new Date(r.date + 'T12:00:00').getDate() > 15,
                            ).length * (employee.dailyRate || 0),
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {employee?.registrationType === 'HOURLY' && (
                    <div className="flex flex-shrink-0 flex-col items-end rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-1 dark:border-blue-900/50 dark:bg-blue-950/30">
                      <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                        Total a Pagar (Horas)
                      </span>
                      <span className="font-mono text-base font-bold text-blue-700 dark:text-blue-300 sm:text-lg">
                        {moeda(
                          ((t?.trabalhadosMin ?? 0) / 60) *
                            (Number(employee.salary) || 0),
                        )}
                      </span>
                    </div>
                  )}

                  {/* Hora extra e noturno pela regra da loja, para todo tipo de funcionário */}
                  <div className="flex flex-shrink-0 flex-col items-end rounded-lg border border-purple-100 bg-purple-50/50 px-3 py-1 shadow-sm dark:border-purple-900/50 dark:bg-purple-950/30">
                    <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                      Horas Extras e Noturno
                    </span>
                    <span className="font-mono text-base font-bold text-purple-700 dark:text-purple-300 sm:text-lg">
                      {!t || !regra ? (
                        '--'
                      ) : (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger className="flex cursor-help items-center gap-1 whitespace-nowrap border-b border-dashed border-purple-300">
                              {horas(totalExtraMin)} ={' '}
                              {moeda(t.valorExtra + t.valorNoturno)}
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              className="max-w-[300px] border-purple-800 bg-purple-900 p-3 text-xs leading-relaxed text-purple-50 shadow-xl"
                            >
                              <p className="mb-1 border-b border-purple-700 pb-1 font-semibold">
                                Pela regra da loja
                              </p>
                              <ul className="mt-2 space-y-1.5">
                                <li>
                                  <span className="opacity-70">
                                    Hora normal:
                                  </span>{' '}
                                  {moeda(apuracao!.valorHora)} · hora extra{' '}
                                  {moeda(apuracao!.valorHoraExtra)}
                                </li>
                                <li>
                                  Extra ({percentual(regra.multiplicadorExtra)}
                                  ): {horas(extraNormalMin)} ={' '}
                                  {moeda(t.valorExtraNormal)}
                                  {t.extraSemanaMin > 0
                                    ? ` (${horas(t.extraSemanaMin)} pela semana)`
                                    : ''}
                                </li>
                                {regra.multiplicadorSegundaFaixa &&
                                  t.extraSegundaFaixaMin > 0 && (
                                    <li>
                                      Extra (
                                      {percentual(
                                        regra.multiplicadorSegundaFaixa,
                                      )}
                                      ): {horas(t.extraSegundaFaixaMin)} ={' '}
                                      {moeda(t.valorExtraSegundaFaixa)}
                                    </li>
                                  )}
                                <li>
                                  Domingo e feriado (
                                  {percentual(regra.multiplicadorEspecial)}):{' '}
                                  {horas(t.extraEspecialMin)} ={' '}
                                  {moeda(t.valorExtraEspecial)}
                                </li>
                                <li>
                                  Noturno: {horas(t.noturnosMin)}
                                  {regra.noturnoLigado
                                    ? ` (${Math.round(regra.adicionalNoturno * 100)}%) = ${moeda(t.valorNoturno)}`
                                    : ' (a regra da loja não paga)'}
                                </li>
                                {employee?.registrationType === 'DAILY' &&
                                  !regra.diaristaRecebeExtra && (
                                    <li className="text-amber-200">
                                      A regra da loja não paga hora extra de
                                      diarista: as horas aparecem, sem valor.
                                    </li>
                                  )}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </span>
                  </div>

                  {/* Avisos do mês (D18): só avisam */}
                  {avisos.length > 0 && (
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
                          <AlertTriangle className="h-4 w-4" />
                          {totalDeAvisos}{' '}
                          {totalDeAvisos === 1 ? 'aviso' : 'avisos'}
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          className="max-w-[300px] text-xs"
                        >
                          <ul className="space-y-1">
                            {avisos.map(([tipo, n]) => (
                              <li key={tipo}>
                                {NOMES_DOS_AVISOS[tipo]}: {n}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-2 text-muted-foreground">
                            Só avisam: nada impede salvar ou fechar o mês. O
                            detalhe está em cada dia.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
                    apuracao={apuracao?.dias.find((d) => d.data === field.date)}
                    regraMultiplicadorExtra={apuracao?.regra.multiplicadorExtra}
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
  apuracao,
  regraMultiplicadorExtra,
}: {
  index: number
  register: any
  watch: any
  setValue: any
  day: Date
  dailyRate: number
  holidays?: any[]
  apuracao?: ApuracaoDoDia
  regraMultiplicadorExtra?: number
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

  // As horas do dia vêm da conta do servidor (a mesma do topo, do resumo do mês e do PDF)
  const horasDoDia = (() => {
    if (!apuracao) return '…'
    if (apuracao.virtuaisMin > 0)
      return `${horas(apuracao.virtuaisMin)} (virtual)`
    if (status !== 'PRESENCA' || apuracao.trabalhadosMin <= 0) return '--'
    return horas(apuracao.trabalhadosMin)
  })()
  const extraDoDia = apuracao
    ? apuracao.extraMin +
      apuracao.extraSegundaFaixaMin +
      apuracao.extraSemanaMin
    : 0

  return (
    <TableRow
      className={cn(
        'transition-colors hover:bg-muted/10',
        { 'bg-blue-50/50 dark:bg-blue-950/20': isWeekend && !holiday },
        isNationalHoliday && 'bg-green-50/60 dark:bg-green-950/20',
        isMunicipalHoliday && 'bg-sky-50/60 dark:bg-sky-950/20',
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
              ? 'bg-green-50/50 dark:bg-green-950/20'
              : 'bg-transparent text-muted-foreground',
          )}
          step="0.01"
          disabled={!isExtraDay}
          {...register(`rows.${index}.negotiatedValue`)}
          onKeyDown={(e) => handleKeyDown(e)}
        />
      </TableCell>

      <TableCell className="bg-muted/5 pr-6 text-right font-mono text-sm">
        <div className="flex flex-col items-end gap-0.5">
          <span>{horasDoDia}</span>
          {apuracao &&
            (extraDoDia > 0 ||
              apuracao.extraEspecialMin > 0 ||
              apuracao.noturnosMin > 0) && (
              <span className="flex flex-wrap justify-end gap-1.5 text-[10px] font-semibold">
                {extraDoDia > 0 && (
                  <span
                    className="text-purple-600"
                    title={
                      apuracao.extraSemanaMin > 0
                        ? 'Inclui a extra pela semana (acima da jornada semanal)'
                        : undefined
                    }
                  >
                    +{horas(extraDoDia)}
                    {regraMultiplicadorExtra
                      ? ` ${percentual(regraMultiplicadorExtra)}`
                      : ''}
                  </span>
                )}
                {apuracao.extraEspecialMin > 0 && (
                  <span className="text-rose-600">
                    +{horas(apuracao.extraEspecialMin)} 100%
                  </span>
                )}
                {apuracao.noturnosMin > 0 && (
                  <span className="flex items-center gap-0.5 text-indigo-600">
                    <Moon className="h-2.5 w-2.5" />
                    {horas(apuracao.noturnosMin)}
                  </span>
                )}
              </span>
            )}
          {apuracao && apuracao.avisos.length > 0 && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600"
                >
                  <AlertTriangle className="h-3 w-3" />{' '}
                  {apuracao.avisos.length === 1
                    ? 'aviso'
                    : `${apuracao.avisos.length} avisos`}
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[280px] text-xs">
                  <ul className="space-y-1">
                    {apuracao.avisos.map((a) => (
                      <li key={a.tipo}>{a.texto}</li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
