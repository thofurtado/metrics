import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  Bus,
  CalendarDays,
  Check,
  Filter,
  Pencil,
  Search,
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

  // Debounce Logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm)
      setPage(1)
    }, 500)
    return () => clearTimeout(handler)
  }, [searchTerm])

  // Let's implement the switch as: Checked = Show Inactive, Unchecked = Show Active?
  // Or better: "Mostrar Inativos" toggle.
  // If we want allow toggling between the two states strictly:
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
      <div className="flex flex-col items-center gap-2 p-8 text-red-500">
        <AlertCircle className="h-8 w-8" />
        <p>Erro ao carregar lista de funcionários.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Recursos Humanos
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Gestão de funcionários, folha e ponto.
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <EmployeeFormDialog />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
            <Users className="h-4 w-4 opacity-70" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold sm:text-4xl">
              {summary?.total || 0}
            </div>
            <p className="mt-1 text-xs opacity-70">Colaboradores na base</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Registrados (CLT)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.registered || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sem Registro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {summary?.unregistered || 0}
            </div>
          </CardContent>
        </Card>
        <div className="col-span-1 grid grid-cols-2 gap-4 sm:col-span-2 lg:col-span-1">
          <Card>
            <CardHeader className="px-3 pb-2 sm:px-6">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Horistas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-2xl font-bold text-slate-600">
                {summary?.hourly || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="px-3 pb-2 sm:px-6">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Diaristas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-2xl font-bold text-blue-600">
                {summary?.daily || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <CardTitle>Colaboradores</CardTitle>
              <CardDescription>
                Gerencie sua equipe, cargos e benefícios.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Premium Filter Bar */}
          <div className="flex flex-col flex-wrap gap-4 rounded-2xl border border-border/50 bg-muted/20 p-4 sm:flex-row sm:items-center">
            <div className="flex w-full flex-1 flex-row items-center gap-3 sm:w-auto">
              <div className="flex w-full items-center gap-2 rounded-full border border-border/50 bg-background px-3 py-1.5 transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20 sm:max-w-xs">
                <Search className="h-4 w-4 text-primary opacity-70" />
                <input
                  placeholder="Buscar por nome..."
                  className="w-full border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex w-full items-center gap-4 sm:w-auto">
              <div className="flex w-full items-center justify-between gap-3 rounded-full border border-border/50 bg-background px-4 py-1.5 sm:w-auto sm:justify-start">
                <Filter className="h-4 w-4 text-primary opacity-70" />
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="status-filter"
                    className="cursor-pointer whitespace-nowrap text-xs font-bold uppercase tracking-tight text-muted-foreground"
                  >
                    {filterStatus ? 'Ativos' : 'Inativos'}
                  </Label>
                  <Switch
                    id="status-filter"
                    checked={filterStatus}
                    onCheckedChange={setFilterStatus}
                    className="scale-90 data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-slate-400"
                  />
                </div>
              </div>

              {searchTerm && (
                <Button
                  onClick={() => setSearchTerm('')}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 flex-shrink-0 rounded-full transition-colors hover:bg-red-500/10 hover:text-red-500"
                  title="Limpar Busca"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Cargo</TableHead>
                  <TableHead>Regime</TableHead>
                  <TableHead>Remuneração</TableHead>
                  <TableHead className="hidden text-center sm:table-cell">
                    V. Transporte
                  </TableHead>
                  <TableHead className="hidden text-center md:table-cell">
                    Cesta B.
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum colaborador encontrado (
                      {filterStatus ? 'Ativo' : 'Inativo'}).
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="max-w-[120px] truncate sm:max-w-none">
                            {employee.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            PIN: {employee.pin}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {employee.role}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-xs font-normal"
                        >
                          {employee.registrationType === 'DAILY'
                            ? 'Diarista'
                            : employee.registrationType === 'HOURLY'
                              ? 'Horista'
                              : employee.registrationType === 'UNREGISTERED'
                                ? 'Sem Registro'
                                : 'CLT'}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {employee.registrationType === 'DAILY'
                          ? `${formatCurrency(Number(employee.dailyRate || 0))}/dia`
                          : employee.registrationType === 'HOURLY'
                            ? `${formatCurrency(Number(employee.salary || 0))}/hora`
                            : formatCurrency(Number(employee.salary || 0))}
                      </TableCell>
                      <TableCell className="hidden text-center text-muted-foreground sm:table-cell">
                        {Number(employee.transportAllowance) > 0 ? (
                          <div className="flex items-center justify-center gap-1 text-xs font-medium text-slate-700">
                            <Bus className="h-3 w-3" />
                            {formatCurrency(
                              Number(employee.transportAllowance),
                            )}
                          </div>
                        ) : (
                          <span className="text-xs opacity-50">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-center md:table-cell">
                        {employee.hasCestaBasica ? (
                          <div className="flex justify-center text-green-600">
                            <Check className="h-4 w-4" />
                          </div>
                        ) : (
                          <div className="flex justify-center text-muted-foreground/30">
                            <X className="h-4 w-4" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 sm:gap-2">
                          <EmployeeFormDialog employee={employee}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Button>
                          </EmployeeFormDialog>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-dashed px-2 sm:px-3"
                            onClick={() =>
                              navigate(`/hr/timesheet/${employee.id}`)
                            }
                          >
                            <CalendarDays className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Ponto</span>
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

          {/* Pagination Control */}
          {meta && (
            <Pagination
              pageIndex={page - 1}
              totalCount={meta.total}
              perPage={10}
              onPageChange={(newIndex) => setPage(newIndex + 1)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
