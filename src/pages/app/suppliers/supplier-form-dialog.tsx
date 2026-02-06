import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSupplier } from '@/api/create-supplier'
import { updateSupplier } from '@/api/update-supplier'
import { useEffect } from 'react'

const supplierSchema = z.object({
    name: z.string().min(1, 'Nome obrigatório'),
    document: z.string().optional().or(z.literal('')),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
})

type SupplierSchema = z.infer<typeof supplierSchema>

interface SupplierFormDialogProps {
    supplierToEdit?: {
        id: string
        name: string
        document: string | null
        email: string | null
        phone: string | null
    } | null
    onOpenChange: (open: boolean) => void
}

export function SupplierFormDialog({ supplierToEdit, onOpenChange }: SupplierFormDialogProps) {
    const queryClient = useQueryClient()

    const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<SupplierSchema>({
        resolver: zodResolver(supplierSchema),
        defaultValues: {
            name: '',
            document: '',
            email: '',
            phone: '',
        }
    })

    useEffect(() => {
        if (supplierToEdit) {
            reset({
                name: supplierToEdit.name,
                document: supplierToEdit.document ?? '',
                email: supplierToEdit.email ?? '',
                phone: supplierToEdit.phone ?? '',
            })
        } else {
            reset({
                name: '',
                document: '',
                email: '',
                phone: '',
            })
        }
    }, [supplierToEdit, reset])

    const { mutateAsync: createSupplierFn } = useMutation({
        mutationFn: createSupplier,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
            onOpenChange(false)
            reset()
        }
    })

    const { mutateAsync: updateSupplierFn } = useMutation({
        mutationFn: updateSupplier,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
            onOpenChange(false)
            reset()
        }
    })

    async function handleSaveSupplier(data: SupplierSchema) {
        try {
            if (supplierToEdit) {
                await updateSupplierFn({ id: supplierToEdit.id, ...data })
            } else {
                await createSupplierFn(data)
            }
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{supplierToEdit ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
                <DialogDescription>
                    Preencha os dados abaixo.
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(handleSaveSupplier)} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" {...register('name')} />
                    {errors.name && <span className="text-red-500 text-sm">{errors.name.message}</span>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="document">Documento (CPF/CNPJ)</Label>
                    <Input id="document" {...register('document')} placeholder="000.000.000-00" />
                    {errors.document && <span className="text-red-500 text-sm">{errors.document.message}</span>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" {...register('email')} />
                        {errors.email && <span className="text-red-500 text-sm">{errors.email.message}</span>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input id="phone" {...register('phone')} placeholder="(00) 00000-0000" />
                        {errors.phone && <span className="text-red-500 text-sm">{errors.phone.message}</span>}
                    </div>
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting}>Salvar</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    )
}
