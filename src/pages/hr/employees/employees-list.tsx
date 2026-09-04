import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  Bus,
  CalendarDays,
  Check,
  Filter,
  Pencil,
  Search,
  ShieldCheck,
  UserCheck,
  UserMinus,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getEmployees, getEmployeeSummary } from '@/api/hr/employees'
import { Pagination } from '@/components/pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'

import { DebtManagementDialog } from './debt-management-dialog'
import { EmployeeFormDialog } from './employee-form-dialog'

export function EmployeesList() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState('')

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm)
      setPage(1)
    }, 400)
    return () => clearTimeout(handler)
  }, [searchTerm])

  const [filterStatus, setFilterStatus] = useState<boolean>(true) // true = Active, false = Inactive

  const {
    data: employeesResult,
    isLoading,
    isError: isQueryError,
  } = useQuery({
    queryKey: ['employees', page, debouncedTerm, filterStatus],
    queryFn: () =>
      getEmployees({
        page,
        limit: 10,
        name: debouncedTerm,
        isRegistered: filterStatus,
      }),
  })

  const { data: summary } = useQuery({
    queryKey: ['employee-summary'],
    queryFn: getEmployeeSummary,
  })

  const employees = employeesResult?.data || []
  const meta = employeesResult?.meta

  if (isQueryError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-12 text-destructive">
        <AlertCircle className="h-10 w-10 opacity-80" />
        <p className="font-semibold">Erro ao carregar lista de funcionários.</p>
        <p className="text-xs text-muted-foreground">Tente atualizar a página ou verifique a conexão.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Modern KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-blue-50/20 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/50">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Geral
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            {summary?.total || 0}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Colaboradores cadastrados
          </p>
        </Card>

        <Card className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-emerald-50/20 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/50">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Registrados (CLT)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            {summary?.registered || 0}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Vínculo formal celetista
          </p>
        </Card>

        <Card className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-amber-50/20 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/50">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Diaristas & Horistas
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            {(summary?.daily || 0) + (summary?.hourly || 0)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary?.daily || 0} diaristas • {summary?.hourly || 0} horistas
          </p>
        </Card>

        <Card className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50/30 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/50">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Sem Registro
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400">
              <UserMinus className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            {summary?.unregistered || 0}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Contratos informais / outros
          </p>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card className="rounded-2xl border border-slate-200/70 shadow-sm dark:border-slate-800">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-bold sm:text-lg">
                Lista de Integrantes
              </CardTitle>
              <CardDescription>
                Filtre por nome ou alterne entre colaboradores ativos e inativos.
              </CardDescription>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 sm:w-64 sm:flex-initial">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Buscar colaborador..."
                  className="h-9 w-full rounded-xl border border-slate-200/80 bg-background pl-9 pr-8 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-background px-3 py-1.5 dark:border-slate-800">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <Label
                  htmlFor="status-filter"
                  className="cursor-pointer text-xs font-bold uppercase tracking-tight text-muted-foreground"
                >
                  {filterStatus ? 'Ativos' : 'Inativos'}
                </Label>
                <Switch
                  id="status-filter"
                  checked={filterStatus}
                  onCheckedChange={setFilterStatus}
                  className="scale-75 data-[state=checked]:bg-emerald-600"
                />
              </div>

              <EmployeeFormDialog />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-0 sm:p-6 sm:pt-0">
          {/* Desktop Table View */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800 md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-muted/40">
                  <TableHead className="w-[260px]">Colaborador</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Regime</TableHead>
                  <TableHead>Remuneração</TableHead>
                  <TableHead className="text-center">V. Transporte</TableHead>
                  <TableHead className="text-center">Cesta Básica</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      Carregando colaboradores...
                    </TableCell>
                  </TableRow>
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      Nenhum colaborador encontrado ({filterStatus ? 'Ativo' : 'Inativo'}).
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee) => (
                    <TableRow key={employee.id} className="transition-colors hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                            {employee.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {employee.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              PIN: {employee.pin}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-300">
                        {employee.role || 'Geral'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-lg font-medium">
                          {employee.registrationType === 'DAILY'
                            ? 'Diarista'
                            : employee.registrationType === 'HOURLY'
                              ? 'Horista'
                              : employee.registrationType === 'UNREGISTERED'
                                ? 'Sem Registro'
                                : 'CLT'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-semibold whitespace-nowrap">
                        {employee.registrationType === 'DAILY'
                          ? `${formatCurrency(Number(employee.dailyRate || 0))}/dia`
                          : employee.registrationType === 'HOURLY'
                            ? `${formatCurrency(Number(employee.salary || 0))}/h`
                            : formatCurrency(Number(employee.salary || 0))}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {Number(employee.transportAllowance) > 0 ? (
                          <div className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <Bus className="h-3 w-3" />
                            {formatCurrency(Number(employee.transportAllowance))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {employee.hasCestaBasica ? (
                          <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 p-1 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <EmployeeFormDialog employee={employee}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-foreground"
                              title="Editar Colaborador"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </EmployeeFormDialog>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 rounded-xl px-2.5 text-xs font-semibold shadow-none"
                            onClick={() =>
                              navigate(`/hr?tab=time-clock&employeeId=${employee.id}`)
                            }
                          >
                            <CalendarDays className="h-3.5 w-3.5 text-amber-500" />
                            <span>Ponto</span>
                          </Button>
                          <DebtManagementDialog
                            employeeId={employee.id}
                            employeeName={employee.name}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards View */}
          <div className="space-y-3 p-4 md:hidden">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Carregando colaboradores...
              </div>
            ) : employees.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhum colaborador encontrado ({filterStatus ? 'Ativo' : 'Inativo'}).
              </div>
            ) : (
              employees.map((employee) => (
                <div
                  key={employee.id}
                  className="space-y-3 rounded-2xl border border-slate-200/80 bg-card p-4 shadow-sm dark:border-slate-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                        {employee.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100">
                          {employee.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {employee.role || 'Geral'} • PIN: {employee.pin}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-medium">
                      {employee.registrationType === 'DAILY'
                        ? 'Diarista'
                        : employee.registrationType === 'HOURLY'
                          ? 'Horista'
                          : employee.registrationType === 'UNREGISTERED'
                            ? 'Sem Registro'
                            : 'CLT'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-y border-slate-100 py-2.5 text-xs dark:border-slate-800/60">
                    <div>
                      <span className="block text-muted-foreground">Remuneração:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {employee.registrationType === 'DAILY'
                          ? `${formatCurrency(Number(employee.dailyRate || 0))}/dia`
                          : employee.registrationType === 'HOURLY'
                            ? `${formatCurrency(Number(employee.salary || 0))}/h`
                            : formatCurrency(Number(employee.salary || 0))}
                      </span>
                    </div>
                    <div>
                      <span className="block text-muted-foreground">Benefícios:</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {Number(employee.transportAllowance) > 0 ? 'VT ativo' : 'Sem VT'}{' '}
                        • {employee.hasCestaBasica ? 'Cesta ativa' : 'Sem Cesta'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <EmployeeFormDialog employee={employee}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 rounded-xl px-3 text-xs"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Editar</span>
                      </Button>
                    </EmployeeFormDialog>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 rounded-xl px-3 text-xs font-semibold"
                      onClick={() =>
                        navigate(`/hr?tab=time-clock&employeeId=${employee.id}`)
                      }
                    >
                      <CalendarDays className="h-3.5 w-3.5 text-amber-500" />
                      <span>Ponto</span>
                    </Button>
                    <DebtManagementDialog
                      employeeId={employee.id}
                      employeeName={employee.name}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {meta && (
            <div className="p-4 sm:p-0">
              <Pagination
                pageIndex={page - 1}
                totalCount={meta.total}
                perPage={10}
                onPageChange={(newIndex) => setPage(newIndex + 1)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
