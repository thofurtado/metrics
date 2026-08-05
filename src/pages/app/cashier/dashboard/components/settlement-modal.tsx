import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/axios'
import { Banknote, Rocket } from 'lucide-react'

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
      toast.error(err?.response?.data?.message || 'Erro ao processar liquidações.')
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Banknote size={16} />
            </div>
            Liquidações Pendentes
          </DialogTitle>
          <DialogDescription className="pt-2">
            Isso forçará a execução do processo automático.
            <br/><br/>
            Todas as transações na <strong>Conta Transitória</strong> que têm vencimento para <strong>hoje ou dias anteriores</strong> (incluindo as de D+0) serão imediatamente confirmadas e os valores cairão na sua Conta Real, já descontando as taxas configuradas na máquina no momento da venda.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button 
            onClick={() => triggerSettlement()} 
            disabled={isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 text-sm gap-2"
          >
            {isPending ? 'Processando...' : (
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
