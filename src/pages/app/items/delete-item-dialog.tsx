import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { deleteItem } from '@/api/delete-item'
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface DeleteItemDialogProps {
  id: string
  name: string
  onSuccess?: () => void
}

export function DeleteItemDialog({
  id,
  name,
  onSuccess,
}: DeleteItemDialogProps) {
  const queryClient = useQueryClient()

  const { mutateAsync: deleteItemFn, isPending } = useMutation({
    mutationFn: async () => deleteItem(id),
    onSuccess: async (resultado) => {
      // Invalidate all related queries to ensure cache consistency
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['items'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['services'] }),
        queryClient.invalidateQueries({ queryKey: ['supplies'] }),
      ])

      // Mergulho 15:E8: desativado não é "removido": a pessoa precisa saber que o item continua no histórico
      if (resultado?.inactivated) {
        toast.info(
          resultado.message ||
            'O item tem histórico e foi desativado (não apagado).',
        )
      } else {
        toast.success('Item removido com sucesso!')
      }
      onSuccess?.()
    },
    onError: (err: any) => {
      console.error('[Delete Item Mutation Error]:', err)
      const errorMessage =
        err.response?.data?.message ||
        'Falha ao processar a exclusão. Tente novamente.'
      toast.error(errorMessage)
    },
  })

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Deseja excluir "{name}"?</AlertDialogTitle>
        <AlertDialogDescription>
          Item sem vendas nem movimentações é excluído de vez. Item com
          histórico é desativado: sai das listas e continua nos relatórios.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
        <Button
          variant="destructive"
          onClick={(e: React.MouseEvent) => {
            e.preventDefault()
            deleteItemFn()
          }}
          disabled={isPending}
          className="gap-2"
        >
          {isPending ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Excluindo...
            </>
          ) : (
            'Excluir'
          )}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}
