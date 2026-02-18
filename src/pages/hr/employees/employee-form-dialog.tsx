import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { createEmployee, updateEmployee, Employee } from "@/api/hr/employees"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useState } from "react"
import { PlusCircle, UserPlus, Info } from "lucide-react"

const employeeFormSchema = z.object({
    name: z.string().min(2, { message: "Nome deve ter pelo menos 2 caracteres." }),
    role: z.string().min(2, { message: "Cargo é obrigatório." }),
    registrationType: z.enum(["REGISTERED", "UNREGISTERED", "DAILY"]),
    isRegistered: z.boolean().default(true),
    admissionDate: z.string().refine((date) => new Date(date).toString() !== 'Invalid Date', { message: "Data inválida." }),
    pin: z.string().length(4, { message: "PIN deve ter 4 dígitos." }),
    salary: z.preprocess((val) => val === '' ? undefined : Number(val), z.number().optional()),
    dailyRate: z.preprocess((val) => val === '' ? undefined : Number(val), z.number().optional()),
    points: z.preprocess((val) => Number(val), z.number().int().min(0)),
    transportAllowance: z.preprocess((val) => Number(val), z.number().min(0)),
    hasCestaBasica: z.boolean().default(false),
})

type EmployeeFormValues = z.infer<typeof employeeFormSchema>

interface EmployeeFormDialogProps {
    employee?: Employee
    children?: React.ReactNode
}

export function EmployeeFormDialog({ employee, children }: EmployeeFormDialogProps) {
    const [open, setOpen] = useState(false)
    const queryClient = useQueryClient()
    const isEditing = !!employee

    const form = useForm<EmployeeFormValues>({
        resolver: zodResolver(employeeFormSchema),
        values: {
            name: employee?.name ?? "",
            role: employee?.role ?? "",
            registrationType: employee?.registrationType ?? "REGISTERED",
            isRegistered: employee?.isRegistered ?? true,
            admissionDate: employee?.admissionDate ? new Date(employee.admissionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            pin: employee?.pin ?? "",
            salary: employee?.salary !== null && employee?.salary !== undefined ? Number(employee.salary) : undefined,
            dailyRate: employee?.dailyRate !== null && employee?.dailyRate !== undefined ? Number(employee.dailyRate) : undefined,
            points: Number(employee?.points) || 0,
            transportAllowance: Number(employee?.transportAllowance) || 0,
            hasCestaBasica: employee?.hasCestaBasica ?? false,
        },
    })

    const { mutateAsync: saveEmployee, isPending } = useMutation({
        mutationFn: async (data: EmployeeFormValues) => {
            if (isEditing && employee) {
                return updateEmployee({ id: employee.id, ...data })
            }
            return createEmployee(data as any)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] })
            setOpen(false)
            if (!isEditing) {
                form.reset()
            }
            toast.success(isEditing ? "Funcionário e dados contratuais atualizados!" : "Funcionário cadastrado com sucesso!")
        },
        onError: () => {
            toast.error("Erro ao salvar funcionário.")
        }
    })

    async function onSubmit(data: EmployeeFormValues) {
        // Enforce business logic for isRegistered based on registrationType
        if (data.registrationType === 'REGISTERED') {
            data.isRegistered = true
        } else {
            data.isRegistered = false // UNREGISTERED or DAILY
        }
        await saveEmployee(data)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children ? children : (
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Novo Funcionário
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>{isEditing ? "Editar Funcionário" : "Cadastro de Funcionário"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Atualize os dados do colaborador." : "Preencha os dados do novo colaborador."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full overflow-hidden">

                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                            {/* Dados Pessoais */}
                            <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2 text-primary border-b pb-1">
                                    <UserPlus className="h-4 w-4" /> Dados Pessoais
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nome Completo</FormLabel>
                                                <FormControl><Input placeholder="João da Silva" className="rounded-md" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="role"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Cargo</FormLabel>
                                                <FormControl><Input placeholder="Ex: Cabeleireiro" className="rounded-md" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="admissionDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Admissão</FormLabel>
                                                <FormControl><Input type="date" className="rounded-md" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="pin"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>PIN (4 dígitos)</FormLabel>
                                                <FormControl><Input maxLength={4} placeholder="1234" className="rounded-md" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="registrationType"
                                        render={({ field }) => (
                                            <FormItem className="col-span-2">
                                                <FormLabel>Tipo de Contrato</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger className="rounded-md"><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="REGISTERED">Registrado (CLT)</SelectItem>
                                                        <SelectItem value="UNREGISTERED">Não Registrado</SelectItem>
                                                        <SelectItem value="DAILY">Diarista</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Remuneração */}
                            <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2 text-primary border-b pb-1">
                                    <Info className="h-4 w-4" /> Remuneração
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="salary"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Salário Base (R$)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        className="rounded-md"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        onChange={(e) => field.onChange(e.target.value)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="dailyRate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Valor da Diária (R$)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number" step="0.01" className="rounded-md" {...field}
                                                        value={field.value ?? ''}
                                                        onChange={(e) => field.onChange(e.target.value)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="points"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Pontos (Rateio)</FormLabel>
                                                <FormControl><Input type="number" className="rounded-md" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="transportAllowance"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Vale Transporte (R$)</FormLabel>
                                                <FormControl><Input type="number" step="0.01" className="rounded-md" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="hasCestaBasica"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/30">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-sm font-medium">Cesta Básica</FormLabel>
                                                <FormDescription className="text-xs">Recebe o benefício?</FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <DialogFooter className="p-6 pt-2 border-t mt-auto">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isPending} className="bg-purple-600 hover:bg-purple-700">
                                {isPending ? "Salvando..." : "Salvar Funcionário"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
