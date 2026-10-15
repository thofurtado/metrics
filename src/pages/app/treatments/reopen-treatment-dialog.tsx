import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { reopenTreatment } from '@/api/reopen-treatment'
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface ReopenTreatmentDialogProps {
  treatmentId: string
  onSuccess?: () => void
}

// Fase 1 do Mergulho (16:A1): reabrir uma O.S. resolvida. A nuvem estorna os recebimentos (tira do saldo da conta o que
// já tinha entrado), tira da conta a prazo do cliente o que ainda não foi pago, devolve as peças ao estoque e volta a O.S.
// para "Pendente". Para cancelar uma O.S. resolvida: reabrir e depois escolher "Cancelado" em "Atender".
export function ReopenTreatmentDialog({
  treatmentId,
  onSuccess,
}: ReopenTreatmentDialogProps) {
  const queryClient = useQueryClient()

  const { mutateAsync: reopen, isPending } = useMutation({
    mutationFn: () => reopenTreatment(treatmentId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['treatments'] }),
        queryClient.invalidateQueries({ queryKey: ['treatment', treatmentId] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
        queryClient.invalidateQueries({ queryKey: ['metrics'] }),
      ])
      toast.success('Atendimento reaberto. Ele voltou para Pendente.')
      onSuccess?.()
    },
    onError: (err) => {
      const message = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      toast.error(
        message || 'Não foi possível reabrir o atendimento. Tente novamente.',
      )
    },
  })

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          Reabrir a O.S. #{treatmentId.slice(0, 8)}?
        </AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Tudo o que o fechamento fez será desfeito:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                os recebimentos saem do financeiro (o que já tinha entrado sai
                do saldo da conta);
              </li>
              <li>o que ficou a prazo sai da conta do cliente;</li>
              <li>as peças e os insumos voltam para o estoque;</li>
              <li>a O.S. volta para Pendente e pode ser editada.</li>
            </ul>
            <p>
              Se o cliente já pagou parte do a prazo desta O.S., a reabertura
              não é feita.
            </p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>Voltar</AlertDialogCancel>
        <Button
          variant="destructive"
          onClick={(e: React.MouseEvent) => {
            e.preventDefault()
            reopen()
          }}
          disabled={isPending}
        >
          {isPending ? 'Reabrindo...' : 'Reabrir O.S.'}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}
