import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getEmployees } from "@/api/hr/employees"
import { createPayrollEntry } from "@/api/hr/payroll"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { EmployeeFormDialog } from "./employee-form-dialog"
import { DebtManagementDialog } from "./debt-management-dialog"
import { Users, AlertCircle, DollarSign, CalendarDays, Pencil } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

// --- Entry Dialog ---

function PayrollEntryDialog({ employeeId, employeeName }: { employeeId: string, employeeName: string }) {
    const [open, setOpen] = useState(false)
    const queryClient = useQueryClient()

    const formSchema = z.object({
        type: z.enum(["SALARIO_60", "SALARIO_40", "PONTUACAO_10", "DIA_EXTRA", "BENEFICIO", "VALE", "ERRO", "CONSUMACAO", "OTHER"]),
        description: z.string().min(3),
        amount: z.coerce.number().refine(val => val !== 0, "Valor deve ser diferente de zero"),
        referenceDate: z.string()
    })

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            type: "OTHER",
            description: "",
            amount: 0,
            referenceDate: new Date().toISOString().split('T')[0]
        }
    })

    const { mutate, isPending } = useMutation({
        mutationFn: (data: any) => createPayrollEntry({
            employee_id: employeeId,
            ...data
        }),
        onSuccess: () => {
            toast.success("Lançamento criado com sucesso!")
            queryClient.invalidateQueries({ queryKey: ['payroll-preview'] }) // Doesn't affect employee list directy but useful
            setOpen(false)
            form.reset()
        },
        onError: () => toast.error("Erro ao criar lançamento.")
    })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <DollarSign className="h-4 w-4" />
                    <span className="sr-only">Lançamento</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Novo Lançamento: {employeeName}</DialogTitle>
                    <DialogDescription>
                        Adicione um crédito ou débito (use valor negativo) para este funcionário.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => mutate(data))} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="SALARIO_60">Salário (60%)</SelectItem>
                                            <SelectItem value="SALARIO_40">Salário (40%)</SelectItem>
                                            <SelectItem value="PONTUACAO_10">Pontuação (10%)</SelectItem>
                                            <SelectItem value="DIA_EXTRA">Diária Extra</SelectItem>
                                            <SelectItem value="BENEFICIO">Benefício</SelectItem>
                                            <SelectItem value="VALE">Vale</SelectItem>
                                            <SelectItem value="ERRO">Erro/Ajuste</SelectItem>
                                            <SelectItem value="CONSUMACAO">Consumo Interno</SelectItem>
                                            <SelectItem value="OTHER">Outro (Avulso)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Ex: Adiantamento, Bônus, Vale..." />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Valor (R$)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="referenceDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data de Referência</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isPending}>Salvar Lançamento</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

// --- List ---

export function EmployeesList() {
    const navigate = useNavigate()
    const { data: employees, isLoading, isError } = useQuery({
        queryKey: ['employees'],
        queryFn: getEmployees,
    })

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Carregando funcionários...</div>
    }

    if (isError) {
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Funcionários</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{employees?.length || 0}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Colaboradores</CardTitle>
                    <CardDescription>
                        Gerencie sua equipe, cargos e benefícios.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Cargo</TableHead>
                                <TableHead>Regime</TableHead>
                                <TableHead>Remuneração Base</TableHead>
                                <TableHead>Valor Diária</TableHead>
                                <TableHead>Pontos</TableHead>
                                <TableHead>Vale Transp.</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees?.map((employee) => (
                                <TableRow key={employee.id}>
                                    <TableCell className="font-medium">{employee.name}</TableCell>
                                    <TableCell>{employee.role}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="text-xs font-normal">
                                            {employee.registrationType === 'DAILY' ? 'Diarista' :
                                                employee.registrationType === 'UNREGISTERED' ? 'Sem Registro' : 'CLT'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {employee.registrationType === 'DAILY' && (!employee.salary || Number(employee.salary) === 0)
                                            ? <span className="text-muted-foreground">---</span>
                                            : formatCurrency(Number(employee.salary || 0))}
                                    </TableCell>
                                    <TableCell>
                                        {employee.dailyRate && Number(employee.dailyRate) > 0 ? (
                                            <span>{formatCurrency(Number(employee.dailyRate))}<span className="text-xs text-muted-foreground">/dia</span></span>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {employee.points > 0 ? (
                                            <span className="font-medium">{employee.points} pts</span>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>{formatCurrency(Number(employee.transportAllowance || 0))}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={employee.isRegistered ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}>
                                            {employee.isRegistered ? "Ativo" : "Inativo"}
                                        </Badge>
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
                                                Ajustar Ponto
                                            </Button>
                                            <DebtManagementDialog employeeId={employee.id} employeeName={employee.name} />
                                            <PayrollEntryDialog employeeId={employee.id} employeeName={employee.name} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {employees?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        Nenhum funcionário cadastrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
