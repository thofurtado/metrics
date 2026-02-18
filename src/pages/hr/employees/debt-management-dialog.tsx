import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createPayrollEntry, listPendingDebts, PayrollEntry } from "@/api/hr/payroll"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { AlertTriangle, Utensils, Wallet, Plus } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

// Schema
const formSchema = z.object({
    type: z.enum(["VALE", "ERRO", "CONSUMACAO"]),
    amount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
    description: z.string().min(3, "Descrição obrigatória"),
    referenceDate: z.string() // Default to today
})

interface DebtDialogProps {
    employeeId: string
    employeeName: string
}

export function DebtManagementDialog({ employeeId, employeeName }: DebtDialogProps) {
    const [open, setOpen] = useState(false)
    const queryClient = useQueryClient()

    // 1. Fetch Pending Debts
    const { data: debts, isLoading } = useQuery({
        queryKey: ['pending-debts', employeeId],
        queryFn: () => listPendingDebts(employeeId),
        enabled: open // Only fetch when open
    })

    // 2. Form Setup
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            type: "VALE",
            amount: 0,
            description: "",
            referenceDate: new Date().toISOString().split('T')[0]
        }
    })

    // 3. Create Mutation
    const { mutate: createDebt, isPending } = useMutation({
        mutationFn: async (data: z.infer<typeof formSchema>) => {
            // Logic for Amount:
            // VALE -> Positive (Advance)
            // ERRO/CONSUMACAO -> Negative (Debt/Expense)
            let finalAmount = data.amount
            if (data.type === "ERRO" || data.type === "CONSUMACAO") {
                finalAmount = -Math.abs(data.amount)
            } else {
                finalAmount = Math.abs(data.amount)
            }

            return createPayrollEntry({
                employee_id: employeeId,
                type: data.type,
                amount: finalAmount,
                description: data.description,
                referenceDate: data.referenceDate
            })
        },
        onSuccess: () => {
            toast.success("Débito lançado com sucesso!")
            queryClient.invalidateQueries({ queryKey: ['pending-debts', employeeId] })
            form.reset({
                type: "VALE",
                amount: 0,
                description: "",
                referenceDate: new Date().toISOString().split('T')[0]
            })
        },
        onError: () => toast.error("Erro ao lançar débito.")
    })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-orange-600 border-orange-200 hover:bg-orange-50">
                    <Wallet className="h-4 w-4" />
                    Gestão de Débitos
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Gestão de Débitos: {employeeName}</DialogTitle>
                    <DialogDescription>
                        Lance novos débitos ou visualize pendências. Serão descontados na próxima folha.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Form Section */}
                    <div className="space-y-4 border rounded-md p-4 bg-muted/50">
                        <h4 className="font-medium flex items-center gap-2">
                            <Plus className="h-4 w-4" /> Novo Lançamento
                        </h4>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit((data) => createDebt(data))} className="grid gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tipo</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Tipo" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="VALE">Vale (Adiantamento)</SelectItem>
                                                        <SelectItem value="ERRO">Erro / Quebra</SelectItem>
                                                        <SelectItem value="CONSUMACAO">Consumo Interno</SelectItem>
                                                    </SelectContent>
                                                </Select>
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
                                </div>
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Descrição</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: Quebra de copo..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex justify-end">
                                    <Button type="submit" size="sm" disabled={isPending}>
                                        {isPending ? "Lançando..." : "Lançar Débito"}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </div>

                    <Separator />

                    {/* List Section */}
                    <div className="space-y-4">
                        <h4 className="font-medium">Débitos em Aberto (Pendente)</h4>
                        {isLoading ? (
                            <p className="text-sm text-muted-foreground">Carregando...</p>
                        ) : debts?.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">Nenhum débito pendente.</p>
                        ) : (
                            <div className="border rounded-md divide-y max-h-[200px] overflow-y-auto">
                                {debts?.map((debt) => (
                                    <div key={debt.id} className="p-3 flex items-center justify-between text-sm">
                                        <div className="grid gap-1">
                                            <div className="font-medium flex items-center gap-2">
                                                {debt.type === 'VALE' && <Wallet className="h-3 w-3 text-blue-500" />}
                                                {debt.type === 'ERRO' && <AlertTriangle className="h-3 w-3 text-red-500" />}
                                                {debt.type === 'CONSUMACAO' && <Utensils className="h-3 w-3 text-orange-500" />}
                                                {debt.description}
                                            </div>
                                            <div className="text-muted-foreground text-xs">
                                                {new Date(debt.created_at || new Date()).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className={`font-medium ${Number(debt.amount) > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                            {formatCurrency(Number(debt.amount))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
