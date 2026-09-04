import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, Clock, Coffee, Eye, UserCheck } from 'lucide-react'
import { useMemo } from 'react'

import { Employee } from '@/api/hr/employees'
import { TimeClock } from '@/api/hr/time-clock'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface TodayAttendanceViewProps {
  employeesList: Employee[]
  timeClocks: TimeClock[]
  onSelectEmployee: (id: string) => void
}

export function TodayAttendanceView({
  employeesList,
  timeClocks,
  onSelectEmployee,
}: TodayAttendanceViewProps) {
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  const todayStatusData = useMemo(() => {
    return employeesList.map((emp) => {
      const tc = timeClocks.find((record) => {
        if (!record.date || record.employee_id !== emp.id) return false
        return record.date.substring(0, 10) === todayStr
      })

      let status: 'WORKING' | 'BREAK' | 'FINISHED' | 'OFF' = 'OFF'
      let statusLabel = 'Sem Registro / Folga'
      let clockInTime = '--'
      let breakTime = '--'
      let clockOutTime = '--'

      if (tc) {
        if (tc.clockIn) {
          clockInTime = format(parseISO(tc.clockIn), 'HH:mm')
        }
        if (tc.breakStart && !tc.breakEnd) {
          breakTime = `${format(parseISO(tc.breakStart), 'HH:mm')} (Em pausa)`
          status = 'BREAK'
          statusLabel = 'Em Intervalo'
        } else if (tc.breakStart && tc.breakEnd) {
          breakTime = `${format(parseISO(tc.breakStart), 'HH:mm')} - ${format(parseISO(tc.breakEnd), 'HH:mm')}`
        }

        if (tc.clockOut) {
          clockOutTime = format(parseISO(tc.clockOut), 'HH:mm')
          status = 'FINISHED'
          statusLabel = 'Expediente Encerrado'
        } else if (tc.clockIn && status !== 'BREAK') {
          status = 'WORKING'
          statusLabel = 'Em Expediente'
        }
      }

      return {
        employee: emp,
        status,
        statusLabel,
        clockInTime,
        breakTime,
        clockOutTime,
      }
    })
  }, [employeesList, timeClocks, todayStr])

  const workingCount = todayStatusData.filter((s) => s.status === 'WORKING').length
  const breakCount = todayStatusData.filter((s) => s.status === 'BREAK').length
  const finishedCount = todayStatusData.filter((s) => s.status === 'FINISHED').length
  const offCount = todayStatusData.filter((s) => s.status === 'OFF').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold">Quadro Operacional em Tempo Real</h3>
        <p className="text-xs text-muted-foreground">
          Acompanhe os turnos e batidas de hoje ({format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })})
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-4 shadow-sm dark:border-emerald-950 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Em Expediente
            </span>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
            {workingCount}
          </div>
          <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400">
            Trabalhando agora
          </p>
        </Card>

        <Card className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-4 shadow-sm dark:border-amber-950 dark:bg-amber-950/20">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Em Intervalo
            </span>
            <Coffee className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900 dark:text-amber-100">
            {breakCount}
          </div>
          <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-400">
            Pausa / Almoço
          </p>
        </Card>

        <Card className="rounded-2xl border border-blue-200/60 bg-blue-50/40 p-4 shadow-sm dark:border-blue-950 dark:bg-blue-950/20">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
              Finalizados
            </span>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-900 dark:text-blue-100">
            {finishedCount}
          </div>
          <p className="mt-1 text-xs text-blue-700/80 dark:text-blue-400">
            Saída registrada
          </p>
        </Card>

        <Card className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/30">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Sem Registro
            </span>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-200">
            {offCount}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Folga ou ainda não iniciou
          </p>
        </Card>
      </div>

      <Card className="rounded-2xl border border-slate-200/70 shadow-sm dark:border-slate-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-muted/40">
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Status Atual</TableHead>
                  <TableHead className="text-center">Entrada</TableHead>
                  <TableHead className="text-center">Intervalo</TableHead>
                  <TableHead className="text-center">Saída</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayStatusData.map((row) => (
                  <TableRow key={row.employee.id} className="transition-colors hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold dark:bg-slate-800">
                          {row.employee.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {row.employee.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {row.employee.role || 'Colaborador'}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          'gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold',
                          row.status === 'WORKING' && 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                          row.status === 'BREAK' && 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
                          row.status === 'FINISHED' && 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
                          row.status === 'OFF' && 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400'
                        )}
                      >
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full',
                            row.status === 'WORKING' && 'animate-pulse bg-emerald-500',
                            row.status === 'BREAK' && 'bg-amber-500',
                            row.status === 'FINISHED' && 'bg-blue-500',
                            row.status === 'OFF' && 'bg-slate-400'
                          )}
                        />
                        {row.statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono font-semibold">
                      {row.clockInTime}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {row.breakTime}
                    </TableCell>
                    <TableCell className="text-center font-mono font-semibold">
                      {row.clockOutTime}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 rounded-xl px-3 font-semibold text-primary hover:bg-primary/10"
                        onClick={() => onSelectEmployee(row.employee.id)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Espelho</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
