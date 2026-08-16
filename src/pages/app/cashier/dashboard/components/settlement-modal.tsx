import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Banknote, Rocket } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api } from '@/lib/axios'

interface SettlementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettlementModal({ open, onOpenChange }: SettlementModalProps) {
  const queryClient = useQueryClient()

  const { mutateAsync: triggerSettlement, isPending } = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/trigger-settlement')
      return response.data
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Liquidação processada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['cashier-sessions'] })
      onOpenChange(false)
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || 'Erro ao processar liquidações.',
      )
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Banknote size={16} />
            </div>
            Liquidações Pendentes
          </DialogTitle>
          <DialogDescription className="pt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Isso forçará a execução do repasse financeiro.
            <br />
            <br />
            O sistema buscará todas as vendas de cartões (Débito/Crédito) e Pix
            que atingiram o prazo de recebimento estipulado nas máquinas (seja
            no mesmo dia, em 1 dia, 2 dias ou 30 dias) e efetivará a entrada do
            dinheiro líquido (já com as taxas descontadas) nos saldos bancários
            do financeiro.
            <br />
            <br />
            <strong>Nota:</strong> Essas vendas já constam no totalizador do seu
            relatório de faturamento do caixa desde o dia da venda, a liquidação
            serve apenas para atualizar os seus saldos bancários disponíveis.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-3">
          <Button
            onClick={() => triggerSettlement()}
            disabled={isPending}
            className="h-12 w-full gap-2 bg-blue-600 text-sm font-bold text-white hover:bg-blue-700"
          >
            {isPending ? (
              'Processando...'
            ) : (
              <>
                <Rocket size={16} />
                Adiantar Liquidações de Hoje
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
