import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { getEmployees, getEmployeeSummary } from "@/api/hr/employees"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { formatCurrency } from "@/lib/utils"
import { EmployeeFormDialog } from "./employee-form-dialog"
import { DebtManagementDialog } from "./debt-management-dialog"
import { Users, AlertCircle, CalendarDays, Pencil, Search, Check, X, Bus, Filter } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Label } from "@/components/ui/label"
import { Pagination } from "@/components/pagination"

export function EmployeesList() {
    const navigate = useNavigate()
    const [page, setPage] = useState(1)
    const [searchTerm, setSearchTerm] = useState("")
    const [debouncedTerm, setDebouncedTerm] = useState("")

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

    const { data: employeesResult, isLoading, isError: isQueryError } = useQuery({
        queryKey: ['employees', page, debouncedTerm, filterStatus],
        queryFn: () => getEmployees({
            page,
            limit: 10,
            name: debouncedTerm,
            isRegistered: filterStatus
        })
    })

    const { data: summary } = useQuery({
        queryKey: ['employee-summary'],
        queryFn: getEmployeeSummary,
    })

    const employees = employeesResult?.data || []
    const meta = employeesResult?.meta

    if (isQueryError) {
        return (
            <div className="p-8 flex flex-col items-center gap-2 text-red-500">
                <AlertCircle className="h-8 w-8" />
                <p>Erro ao carregar lista de funcionários.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Recursos Humanos</h2>
                    <p className="text-muted-foreground">Gestão de funcionários, folha e ponto.</p>
                </div>
                <EmployeeFormDialog />
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="col-span-4 md:col-span-2 lg:col-span-1 bg-primary text-primary-foreground">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
                        <Users className="h-4 w-4 opacity-70" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{summary?.total || 0}</div>
                        <p className="text-xs opacity-70 mt-1">Colaboradores na base</p>
                    </CardContent>
                </Card>
                <div className="col-span-4 md:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Registrados (CLT)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary?.registered || 0}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Sem Registro</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">{summary?.unregistered || 0}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Diaristas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{summary?.daily || 0}</div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                    <div className="flex flex-col lg:flex-row lg:items-center flex-wrap gap-4 p-4 bg-muted/20 border border-border/50 rounded-2xl">
                        <div className="flex flex-row items-center gap-3 w-full lg:w-auto">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-full border border-border/50 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all flex-1 lg:w-[300px]">
                                <Search className="h-4 w-4 text-primary opacity-70" />
                                <input
                                    placeholder="Buscar por nome..."
                                    className="bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground w-full"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4 w-full lg:w-auto">
                            <div className="flex items-center gap-3 bg-background py-1.5 px-4 rounded-full border border-border/50">
                                <Filter className="h-4 w-4 text-primary opacity-70" />
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="status-filter" className="text-xs font-bold uppercase tracking-tight text-muted-foreground cursor-pointer whitespace-nowrap">
                                        {filterStatus ? "Ativos" : "Inativos"}
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
                                    onClick={() => setSearchTerm("")}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors flex-shrink-0"
                                    title="Limpar Busca"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Cargo</TableHead>
                                    <TableHead>Regime</TableHead>
                                    <TableHead>Remuneração</TableHead>
                                    <TableHead className="text-center">V. Transporte</TableHead>
                                    <TableHead className="text-center">Cesta B.</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">Carregando...</TableCell>
                                    </TableRow>
                                ) : employees.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            Nenhum colaborador encontrado ({filterStatus ? 'Ativo' : 'Inativo'}).
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    employees.map((employee) => (
                                        <TableRow key={employee.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{employee.name}</span>
                                                    <span className="text-xs text-muted-foreground">PIN: {employee.pin}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{employee.role}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-xs font-normal">
                                                    {employee.registrationType === 'DAILY' ? 'Diarista' :
                                                        employee.registrationType === 'UNREGISTERED' ? 'Sem Registro' : 'CLT'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {employee.registrationType === 'DAILY'
                                                    ? `${formatCurrency(Number(employee.dailyRate || 0))}/dia`
                                                    : formatCurrency(Number(employee.salary || 0))}
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground">
                                                {Number(employee.transportAllowance) > 0 ? (
                                                    <div className="flex items-center justify-center gap-1 text-slate-700 font-medium text-xs">
                                                        <Bus className="h-3 w-3" />
                                                        {formatCurrency(Number(employee.transportAllowance))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs opacity-50">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {employee.hasCestaBasica ? (
                                                    <div className="flex justify-center text-green-600"><Check className="h-4 w-4" /></div>
                                                ) : (
                                                    <div className="flex justify-center text-muted-foreground/30"><X className="h-4 w-4" /></div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <EmployeeFormDialog employee={employee}>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <Pencil className="h-4 w-4" />
                                                            <span className="sr-only">Editar</span>
                                                        </Button>
                                                    </EmployeeFormDialog>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 border-dashed"
                                                        onClick={() => navigate(`/hr/timesheet/${employee.id}`)}
                                                    >
                                                        <CalendarDays className="h-4 w-4 mr-2" />
                                                        Ponto
                                                    </Button>
                                                    <DebtManagementDialog employeeId={employee.id} employeeName={employee.name} />
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
