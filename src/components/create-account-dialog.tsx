
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
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
import { createAccount } from "@/api/create-account"
import { useEffect } from "react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface CreateAccountDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: (account: any) => void
}

const accountSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    description: z.string().optional(),
    balance: z.string().default("0"),
    type: z.enum(["current", "cash", "investment"]).default("current"), // Not persisted yet but good for UI
})

type AccountForm = z.infer<typeof accountSchema>

export function CreateAccountDialog({ open, onOpenChange, onSuccess }: CreateAccountDialogProps) {
    const queryClient = useQueryClient()

    const form = useForm<AccountForm>({
        resolver: zodResolver(accountSchema),
        defaultValues: {
            name: "",
            description: "",
            balance: "0",
            type: "current",
        },
    })

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            form.reset({
                name: "",
                description: "",
                balance: "0",
                type: "current",
            })
        }
    }, [open, form])

    const { mutateAsync: createNewAccount, isPending } = useMutation({
        mutationFn: createAccount,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            if (onSuccess) onSuccess(data)
            onOpenChange(false)
            toast.success("Conta criada com sucesso!")
        },
        onError: () => {
            toast.error("Erro ao criar conta")
        }
    })

    async function onSubmit(data: AccountForm) {
        // Map form data to API payload
        // Appending Type to description as a workaround if backend doesn't support 'type' field yet
        const descriptionWithType = data.type
            ? `${data.description || ''} [Tipo: ${data.type}]`.trim()
            : data.description;

        await createNewAccount({
            name: data.name,
            description: descriptionWithType || null,
            balance: parseFloat(data.balance.replace(',', '.')) || 0,
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-[425px]"
                onPointerDownOutside={(e) => {
                    // Prevent closing parent modal
                    e.preventDefault()
                }}
            >
                <DialogHeader>
                    <DialogTitle>Nova Conta</DialogTitle>
                    <DialogDescription>
                        Crie uma nova conta para gerenciar seus recursos.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome da Conta</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Nubank, Caixa..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="balance"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Saldo Inicial</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Simulated Type Field */}
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Tipo de Conta</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex flex-col space-y-1"
                                        >
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="current" />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    Conta Corrente
                                                </FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="cash" />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    Dinheiro / Caixa Físico
                                                </FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="investment" />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    Investimento
                                                </FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Detalhes adicionais..." {...field} />
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
                                {isPending ? "Criando..." : "Criar Conta"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
