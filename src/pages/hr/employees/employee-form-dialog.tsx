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
import { useState, useEffect } from "react"
import { PlusCircle, UserPlus, Info, Banknote, UserX, AlertTriangle, CalendarDays } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const employeeFormSchema = z.object({
    name: z.string().min(2, { message: "Nome deve ter pelo menos 2 caracteres." }),
    role: z.string().min(2, { message: "Cargo é obrigatório." }),
    registrationType: z.string(), // We handle logic manually
    isRegistered: z.boolean().default(true),
    admissionDate: z.string().refine((date) => new Date(date).toString() !== 'Invalid Date', { message: "Data inválida." }),
    pin: z.string().length(4, { message: "PIN deve ter 4 dígitos." }),
    salary: z.preprocess((val) => val === '' ? 0 : Number(val), z.number().default(0)),
    dailyRate: z.preprocess((val) => val === '' ? 0 : Number(val), z.number().default(0)),
    points: z.preprocess((val) => val === '' ? 0 : Number(val), z.number().int().min(0).default(0)),
    transportAllowance: z.preprocess((val) => val === '' ? 0 : Number(val), z.number().min(0).default(0)),
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
        defaultValues: {
            name: "",
            role: "",
            registrationType: "REGISTERED",
            isRegistered: true,
            admissionDate: new Date().toISOString().split('T')[0],
            pin: "",
            salary: undefined,
            dailyRate: undefined,
            points: 0,
            transportAllowance: 0,
            hasCestaBasica: false,
        },
    })

    // Reset form when opening/changing employee
    useEffect(() => {
        if (open) {
            form.reset({
                name: employee?.name ?? "",
                role: employee?.role ?? "",
                registrationType: employee?.isRegistered === false ? "DISMISSED" : (employee?.registrationType ?? "REGISTERED"),
                isRegistered: employee?.isRegistered ?? true,
                admissionDate: employee?.admissionDate ? new Date(employee.admissionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                pin: employee?.pin ?? "",
                salary: employee?.salary !== null && employee?.salary !== undefined ? Number(employee.salary) : undefined,
                dailyRate: employee?.dailyRate !== null && employee?.dailyRate !== undefined ? Number(employee.dailyRate) : undefined,
                points: Number(employee?.points) || 0,
                transportAllowance: Number(employee?.transportAllowance) || 0,
                hasCestaBasica: employee?.hasCestaBasica ?? false,
            })
        }
    }, [open, employee, form])

    const { mutateAsync: saveEmployee, isPending } = useMutation({
        mutationFn: async (data: EmployeeFormValues) => {
            // Transform "DISMISSED" back to valid data
            let submissionData: any = { ...data }

            if (data.registrationType === 'DISMISSED') {
                submissionData.isRegistered = false
                // Keep previous type if available, otherwise default to UNREGISTERED to satisfy enum
                submissionData.registrationType = employee?.registrationType || 'UNREGISTERED'
            } else {
                submissionData.isRegistered = true // Active if not dismissed
            }

            if (isEditing && employee) {
                return updateEmployee({ id: employee.id, ...submissionData })
            }
            return createEmployee(submissionData)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] })
            queryClient.invalidateQueries({ queryKey: ['employee-summary'] })
            setOpen(false)
            toast.success(isEditing ? "Funcionário atualizado!" : "Funcionário cadastrado!")
        },
        onError: (error: any) => {
            if (error.response?.data?.message === 'PIN_ALREADY_EXISTS') {
                toast.error("Este PIN já está em uso por outro colaborador.")
                form.setError("pin", { message: "PIN já existe" })
            } else {
                toast.error("Erro ao salvar funcionário. Verifique os dados.")
            }
        }
    })

    async function onSubmit(data: EmployeeFormValues) {
        await saveEmployee(data)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children ? children : (
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Novo Colaborador
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 bg-muted/20 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        {isEditing ? <UserPlus className="h-5 w-5 text-blue-600" /> : <PlusCircle className="h-5 w-5 text-green-600" />}
                        {isEditing ? `Editar: ${employee?.name}` : "Novo Colaborador"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Atualize as informações contratuais e pessoais." : "Preencha os dados obrigatórios para cadastro."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">

                            {/* Section 1: Identification */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <div className="h-px flex-1 bg-border" />
                                    Identificação
                                    <div className="h-px flex-1 bg-border" />
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nome Completo <span className="text-red-500">*</span></FormLabel>
                                                <FormControl><Input placeholder="Ex: João da Silva" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="pin"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>PIN de Acesso (4 dígitos) <span className="text-red-500">*</span></FormLabel>
                                                <FormControl><Input maxLength={4} placeholder="0000" className="font-mono" {...field} /></FormControl>
                                                <FormDescription>Usado para bater ponto.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Section 2: Contract */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <div className="h-px flex-1 bg-border" />
                                    Dados Contratuais
                                    <div className="h-px flex-1 bg-border" />
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="role"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Cargo / Função <span className="text-red-500">*</span></FormLabel>
                                                <FormControl><Input placeholder="Ex: Atendente" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="admissionDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Data de Admissão</FormLabel>
                                                <FormControl><Input type="date" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="registrationType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Regime de Contratação</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent portal={false}>
                                                        <SelectItem value="REGISTERED">Registrado (CLT)</SelectItem>
                                                        <SelectItem value="UNREGISTERED">Sem Registro (Estágio/Outro)</SelectItem>
                                                        <SelectItem value="DAILY">Diarista (Freelance)</SelectItem>
                                                        {isEditing && (
                                                            <>
                                                                <div className="h-px my-1 bg-border" />
                                                                <SelectItem value="DISMISSED" className="text-red-600 focus:text-red-700 font-medium">
                                                                    <div className="flex items-center gap-2">
                                                                        <UserX className="h-4 w-4" /> Desligado / Inativo
                                                                    </div>
                                                                </SelectItem>
                                                            </>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Section 3: Remuneration */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <div className="h-px flex-1 bg-border" />
                                    Remuneração & Benefícios
                                    <div className="h-px flex-1 bg-border" />
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/10 p-4 rounded-lg border">
                                    <FormField
                                        control={form.control}
                                        name="salary"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2">
                                                    <Banknote className="h-4 w-4 text-green-600" /> Salário Base (R$)
                                                </FormLabel>
                                                <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="dailyRate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2">
                                                    <CalendarDays className="h-4 w-4 text-blue-600" /> Valor da Diária (R$)
                                                </FormLabel>
                                                <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)} /></FormControl>
                                                <FormDescription className="text-xs">Apenas para Diaristas.</FormDescription>
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
                                                <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="points"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Pontos (Rateio)</FormLabel>
                                                <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                                                <FormDescription>Peso para divisão da caixinha (0-10).</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="hasCestaBasica"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-white">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base font-medium">Cesta Básica</FormLabel>
                                                <FormDescription>O colaborador tem direito a receber cesta básica mensal?</FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                        </div>

                        <DialogFooter className="p-6 pt-4 bg-muted/20 border-t">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 min-w-[150px]">
                                {isPending ? "Salvando..." : isEditing ? "Salvar Alterações" : "Cadastrar"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
