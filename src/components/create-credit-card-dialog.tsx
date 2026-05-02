import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createCreditCard } from "@/api/credit-cards"
import { getAccounts } from "@/api/get-accounts"
import { useEffect } from "react"

interface CreateCreditCardDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: (creditCard: any) => void
}

const creditCardSchema = z.object({
    name: z.string().min(1, "Nome do cartão é obrigatório"),
    bank: z.string().min(1, "Banco é obrigatório"),
    credit_limit: z.string().min(1, "Limite é obrigatório").refine(
        (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
        "O limite deve ser maior que zero"
    ),
    closing_day: z.string().min(1, "Dia do fechamento é obrigatório").refine(
        (val) => !isNaN(parseInt(val)) && parseInt(val) >= 1 && parseInt(val) <= 31,
        "Dia deve estar entre 1 e 31"
    ),
    due_day: z.string().min(1, "Dia do vencimento é obrigatório").refine(
        (val) => !isNaN(parseInt(val)) && parseInt(val) >= 1 && parseInt(val) <= 31,
        "Dia deve estar entre 1 e 31"
    ),
    last_four_digits: z.string().optional(),
    account_id: z.string().optional().nullable()
})

type CreditCardForm = z.infer<typeof creditCardSchema>

export function CreateCreditCardDialog({ open, onOpenChange, onSuccess }: CreateCreditCardDialogProps) {
    const queryClient = useQueryClient()

    const { data: accountsData } = useQuery({
        queryKey: ['accounts'],
        queryFn: getAccounts,
        enabled: open
    })

    const form = useForm<CreditCardForm>({
        resolver: zodResolver(creditCardSchema),
        defaultValues: {
            name: "",
            bank: "",
            credit_limit: "",
            closing_day: "",
            due_day: "",
            last_four_digits: "",
            account_id: "",
        },
    })

    useEffect(() => {
        if (open) {
            form.reset({
                name: "",
                bank: "",
                credit_limit: "",
                closing_day: "",
                due_day: "",
                last_four_digits: "",
                account_id: "",
            })
        }
    }, [open, form])

    const { mutateAsync: createNewCreditCard, isPending } = useMutation({
        mutationFn: createCreditCard,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['credit-cards'] })
            if (onSuccess) onSuccess(data)
            onOpenChange(false)
            toast.success("Cartão de crédito criado com sucesso!")
        },
        onError: (error) => {
            console.error("Erro ao criar cartão de crédito:", error)
            toast.error("Erro ao criar cartão de crédito. Verifique os dados.")
        }
    })

    async function onSubmit(data: CreditCardForm) {
        await createNewCreditCard({
            name: data.name,
            bank: data.bank,
            credit_limit: parseFloat(data.credit_limit.replace(',', '.')),
            closing_day: parseInt(data.closing_day),
            due_day: parseInt(data.due_day),
            last_four_digits: data.last_four_digits || null,
            account_id: data.account_id || null,
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-[425px]"
                onPointerDownOutside={(e) => {
                    e.preventDefault()
                }}
            >
                <DialogHeader>
                    <DialogTitle>Novo Cartão de Crédito</DialogTitle>
                    <DialogDescription>
                        Cadastre um novo cartão para calcular os vencimentos.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome do Cartão</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Cartão de Uso Diário" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="bank"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Banco</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Mercado Pago, Nubank..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="account_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Conta Vinculada (Opcional)</FormLabel>
                                    <Select
                                        onValueChange={(val) => field.onChange(val === "none" ? "" : val)}
                                        value={field.value || "none"}
                                        defaultValue={field.value || "none"}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione uma conta" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">Nenhuma</SelectItem>
                                            {accountsData?.accounts?.map((acc) => (
                                                <SelectItem key={acc.id} value={acc.id}>
                                                    {acc.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="credit_limit"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Limite do Cartão (R$)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" placeholder="Ex: 5000" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-2">
                            <FormField
                                control={form.control}
                                name="closing_day"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Dia Fechamento</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={1} max={31} placeholder="Ex: 15" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="due_day"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Dia Vencimento</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={1} max={31} placeholder="Ex: 20" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="last_four_digits"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Últimos 4 Dígitos (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: 1234" maxLength={4} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? "Criando..." : "Criar Cartão"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
