
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createSector } from "@/api/create-sector"
import { useEffect } from "react"

interface CreateSectorDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: (sector: any) => void
    defaultType?: 'in' | 'out'
}

const sectorSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    type: z.enum(["in", "out"]),
    budget: z.string().optional(),
})

type SectorForm = z.infer<typeof sectorSchema>

export function CreateSectorDialog({ open, onOpenChange, onSuccess, defaultType = 'out' }: CreateSectorDialogProps) {
    const queryClient = useQueryClient()

    const form = useForm<SectorForm>({
        resolver: zodResolver(sectorSchema),
        defaultValues: {
            name: "",
            type: defaultType,
            budget: "",
        },
    })

    useEffect(() => {
        if (open) {
            form.reset({
                name: "",
                type: defaultType,
                budget: "",
            })
        }
    }, [open, defaultType, form])

    const { mutateAsync: createNewSector, isPending } = useMutation({
        mutationFn: createSector,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['sectors'] })
            if (onSuccess) onSuccess(data)
            onOpenChange(false)
            toast.success("Categoria criada com sucesso!")
        },
        onError: (error) => {
            console.error("Erro ao criar categoria (Sector):", error)
            toast.error("Erro ao criar categoria. Verifique o console para mais detalhes.")
        }
    })

    async function onSubmit(data: SectorForm) {
        await createNewSector({
            name: data.name,
            type: data.type,
            budget: data.budget ? parseFloat(data.budget.replace(',', '.')) : null,
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
                    <DialogTitle>Nova Categoria</DialogTitle>
                    <DialogDescription>
                        Categorize suas receitas e despesas.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome da Categoria</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Alimentação, Vendas..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o tipo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="in">Receita (Entrada)</SelectItem>
                                            <SelectItem value="out">Despesa (Saída)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="budget"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Orçamento Mensal (Meta)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" placeholder="Opcional" {...field} />
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
                                {isPending ? "Criando..." : "Criar Categoria"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
