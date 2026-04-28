import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { readjustTransactionGroup } from "@/api/readjust-transaction-group"

const formSchema = z.object({
    installmentsCount: z.coerce.number().min(1, "Mínimo de 1 parcela"),
    totalAmount: z.coerce.number().optional(),
    firstDueDate: z.string().min(1, "Data é obrigatória")
})

type FormData = z.infer<typeof formSchema>

interface ReadjustTransactionGroupDialogProps {
    groupId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    alreadyPaidCount: number
    alreadyPaidAmount: number
    pendingSum: number
}

export function ReadjustTransactionGroupDialog({
    groupId,
    open,
    onOpenChange,
    alreadyPaidCount,
    alreadyPaidAmount,
    pendingSum
}: ReadjustTransactionGroupDialogProps) {
    const queryClient = useQueryClient()
    const [mode, setMode] = useState<'renegotiate' | 'fix'>('renegotiate')

    const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstDueDate: new Date().toISOString().split('T')[0]
        }
    })

    const { mutateAsync, isPending } = useMutation({
        mutationFn: readjustTransactionGroup,
        onSuccess: () => {
            toast.success("Parcelamento reajustado com sucesso!")
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            queryClient.invalidateQueries({ queryKey: ['transaction-group', groupId] })
            onOpenChange(false)
            reset()
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Erro ao reajustar parcelamento.")
        }
    })

    const onSubmit = async (data: FormData) => {
        try {
            await mutateAsync({
                groupId,
                mode,
                installmentsCount: data.installmentsCount,
                totalAmount: data.totalAmount || undefined,
                firstDueDate: new Date(data.firstDueDate).toISOString()
            })
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) reset()
            onOpenChange(val)
        }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Reajustar Parcelamento</DialogTitle>
                    <DialogDescription>
                        Escolha entre renegociar as parcelas pendentes ou corrigir o valor total do contrato original.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={mode} onValueChange={(v) => setMode(v as 'renegotiate' | 'fix')} className="mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="renegotiate">Renegociar Restante</TabsTrigger>
                        <TabsTrigger value="fix">Corrigir Erro (Total)</TabsTrigger>
                    </TabsList>

                    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                        <TabsContent value="renegotiate" className="space-y-4">
                            <div className="bg-muted p-3 rounded-md text-sm">
                                <p><strong>Pago até agora:</strong> R$ {alreadyPaidAmount.toFixed(2)} ({alreadyPaidCount} parcelas)</p>
                                <p><strong>Saldo Pendente Atual:</strong> R$ {pendingSum.toFixed(2)}</p>
                            </div>
                            
                            <div className="grid gap-2">
                                <Label>Novo número de parcelas restantes</Label>
                                <Input type="number" {...register('installmentsCount')} placeholder="Ex: 5" />
                                {errors.installmentsCount && <span className="text-xs text-red-500">{errors.installmentsCount.message}</span>}
                            </div>
                            
                            <div className="grid gap-2">
                                <Label>Novo Valor Total Restante (Opcional)</Label>
                                <Input type="number" step="0.01" {...register('totalAmount')} placeholder={`Ex: ${pendingSum.toFixed(2)}`} />
                                <span className="text-xs text-muted-foreground">Deixe em branco para manter o saldo pendente atual (sem juros).</span>
                                {errors.totalAmount && <span className="text-xs text-red-500">{errors.totalAmount.message}</span>}
                            </div>
                        </TabsContent>

                        <TabsContent value="fix" className="space-y-4">
                            <div className="bg-muted p-3 rounded-md text-sm border-l-4 border-yellow-500">
                                <p>Use esta opção apenas se lançou o contrato errado. O sistema calculará o que falta baseado no novo total e no que já foi pago.</p>
                                <p className="mt-2 font-medium">Já pago: R$ {alreadyPaidAmount.toFixed(2)} em {alreadyPaidCount} vezes.</p>
                            </div>

                            <div className="grid gap-2">
                                <Label>Valor Correto (Total do Contrato)</Label>
                                <Input type="number" step="0.01" {...register('totalAmount')} placeholder="Ex: 1500.00" />
                                {errors.totalAmount && <span className="text-xs text-red-500">{errors.totalAmount.message}</span>}
                            </div>

                            <div className="grid gap-2">
                                <Label>Nº Correto de Parcelas (Total do Contrato)</Label>
                                <Input type="number" {...register('installmentsCount')} placeholder="Ex: 12" />
                                {errors.installmentsCount && <span className="text-xs text-red-500">{errors.installmentsCount.message}</span>}
                            </div>
                        </TabsContent>

                        <div className="grid gap-2 pt-2">
                            <Label>Primeiro Vencimento do Restante</Label>
                            <Input type="date" {...register('firstDueDate')} />
                            {errors.firstDueDate && <span className="text-xs text-red-500">{errors.firstDueDate.message}</span>}
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Aplicar Reajuste
                            </Button>
                        </div>
                    </form>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
