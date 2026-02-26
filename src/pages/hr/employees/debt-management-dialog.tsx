import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createPayrollEntry, listPendingDebts } from "@/api/hr/payroll"
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
import { AlertTriangle, Utensils, Wallet, Plus, Trash2, History } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

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
            toast.success("Lançamento registrado com sucesso!")
            queryClient.invalidateQueries({ queryKey: ['pending-debts', employeeId] })
            form.reset({
                type: "VALE",
                amount: 0,
                description: "",
                referenceDate: new Date().toISOString().split('T')[0]
            })
        },
        onError: () => toast.error("Erro ao registrar lançamento.")
    })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700">
                    <Wallet className="h-4 w-4" />
                    Débitos / Vales
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] gap-0 p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2 bg-muted/30">
                    <DialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5 text-orange-600" />
                        Gestão Financeira: {employeeName}
                    </DialogTitle>
                    <DialogDescription>
                        Gerencie vales, adiantamentos e débitos (quebras/consumo) para desconto em folha.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col md:flex-row h-[500px]">
                    {/* Left: Form */}
                    <div className="w-full md:w-1/2 p-6 border-r flex flex-col gap-4 bg-muted/10">
                        <div className="flex items-center gap-2 mb-2 font-medium text-sm uppercase tracking-wider text-muted-foreground">
                            <Plus className="h-4 w-4" /> Novo Lançamento
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit((data) => createDebt(data))} className="flex flex-col gap-4 flex-1">
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tipo de Lançamento</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-background">
                                                        <SelectValue placeholder="Selecione..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent withPortal={false}>
                                                    <SelectItem value="VALE">
                                                        <div className="flex items-center gap-2">
                                                            <Wallet className="h-4 w-4 text-emerald-600" /> Vale (Adiantamento)
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="ERRO">
                                                        <div className="flex items-center gap-2">
                                                            <AlertTriangle className="h-4 w-4 text-red-600" /> Erro / Quebra
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="CONSUMACAO">
                                                        <div className="flex items-center gap-2">
                                                            <Utensils className="h-4 w-4 text-orange-600" /> Consumo Interno
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="amount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Valor (R$)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.01" placeholder="0.00" className="bg-background" {...field} />
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
                                                <FormLabel>Data</FormLabel>
                                                <FormControl>
                                                    <Input type="date" className="bg-background" {...field} />
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
                                            <FormLabel>Descrição / Motivo</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: Quebra de copo, adiantamento..." className="bg-background" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="mt-auto pt-4">
                                    <Button type="submit" className="w-full" disabled={isPending}>
                                        {isPending ? "Processando..." : "Confirmar Lançamento"}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </div>

                    {/* Right: List */}
                    <div className="w-full md:w-1/2 flex flex-col bg-background">
                        <div className="p-4 border-b bg-muted/5 flex items-center justify-between">
                            <h4 className="font-semibold text-sm">Histórico Pendente</h4>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full border">
                                {debts?.length || 0} itens
                            </span>
                        </div>

                        <ScrollArea className="flex-1 p-4">
                            {isLoading ? (
                                <p className="text-sm text-center py-8 text-muted-foreground">Carregando...</p>
                            ) : debts?.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-50">
                                    <History className="h-8 w-8 mb-2" />
                                    <p className="text-sm">Nenhum lançamento pendente.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {debts?.map((debt) => (
                                        <div key={debt.id} className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
                                            <div className="flex gap-3">
                                                <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${debt.type === 'VALE' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium leading-none">{debt.description}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span>{new Date(debt.referenceDate || debt.created_at).toLocaleDateString()}</span>
                                                        <span>•</span>
                                                        <span className="uppercase">{debt.type}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-mono text-sm font-semibold ${Number(debt.amount) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {formatCurrency(Number(debt.amount))}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
