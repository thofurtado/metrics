import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/axios'
import { FileText, Link as LinkIcon, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

interface PendingReceiptsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLinkToExisting: (receipt: any) => void
  onCreateNew: (receipt: any) => void
}

export function PendingReceiptsModal({ open, onOpenChange, onLinkToExisting, onCreateNew }: PendingReceiptsModalProps) {
  const queryClient = useQueryClient()
  const { data: receiptsData, isLoading } = useQuery({
    queryKey: ['pending-receipts'],
    queryFn: async () => {
      const response = await api.get('/uploads/receipts')
      return response.data
    },
    enabled: open
  })

  const { mutateAsync: deleteReceipt, isPending: isDeleting } = useMutation({
    mutationFn: async (filename: string) => {
      await api.delete(`/uploads/receipts/${filename}`)
    },
    onSuccess: () => {
      toast.success('Comprovante descartado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['pending-receipts'] })
    },
    onError: () => {
      toast.error('Erro ao descartar comprovante.')
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-800">Comprovantes Rápidos</DialogTitle>
          <DialogDescription>
            Aqui estão os comprovantes enviados pelo celular que ainda não foram vinculados a nenhuma despesa.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6 max-h-[60vh] overflow-y-auto">
          {isLoading && <div className="col-span-full text-center text-sm text-slate-500 py-10">Carregando comprovantes...</div>}
          
          {!isLoading && receiptsData?.receipts?.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <FileText className="w-12 h-12 mb-4 text-slate-300" />
              <p className="font-semibold">Nenhum comprovante pendente</p>
              <p className="text-xs">Eles aparecerão aqui quando você enviar pelo celular.</p>
            </div>
          )}

          {!isLoading && receiptsData?.receipts?.map((receipt: any) => (
            <div key={receipt.filename} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col">
              <div className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center">
                {receipt.url.endsWith('.pdf') ? (
                  <FileText className="w-16 h-16 text-slate-400" />
                ) : (
                  <img src={`${import.meta.env.VITE_API_URL}${receipt.url}`} alt={receipt.description} className="w-full h-full object-cover" />
                )}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="w-8 h-8 rounded-full shadow-lg"
                    onClick={() => deleteReceipt(receipt.filename)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-4 flex flex-col flex-1">
                <p className="text-xs text-slate-500 mb-1">{new Date(receipt.date).toLocaleString('pt-BR')}</p>
                <p className="font-bold text-slate-800 text-sm mb-4 line-clamp-2 flex-1" title={receipt.description}>
                  {receipt.description}
                </p>
                
                <div className="flex gap-2 mt-auto">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs px-0 font-bold border-slate-200 text-slate-600 hover:bg-slate-50"
                    onClick={() => {
                      onOpenChange(false)
                      onLinkToExisting(receipt)
                    }}
                  >
                    <LinkIcon className="w-3 h-3 mr-1" />
                    Vincular
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 text-xs px-0 font-bold bg-slate-900 text-white hover:bg-slate-800"
                    onClick={() => {
                      onOpenChange(false)
                      onCreateNew(receipt)
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Criar Despesa
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
