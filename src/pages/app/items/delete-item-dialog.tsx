import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { deleteItem } from '@/api/delete-item'
import {
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeleteItemDialogProps {
    id: string
    name: string
    onSuccess?: () => void
}

export function DeleteItemDialog({ id, name, onSuccess }: DeleteItemDialogProps) {
    const queryClient = useQueryClient()

    const { mutateAsync: deleteItemFn, isPending } = useMutation({
        mutationFn: () => deleteItem(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] })
            toast.success('Item excluído com sucesso!')
            onSuccess?.()
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Erro ao excluir item.')
        },
    })

    return (
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Deseja excluir "{name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o item e
                    suas referências de estoque.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                    className="bg-red-500 hover:bg-red-600"
                    onClick={() => deleteItemFn()}
                    disabled={isPending}
                >
                    {isPending ? 'Excluindo...' : 'Excluir'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    )
}
