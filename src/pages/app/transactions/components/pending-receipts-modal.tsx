import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { api, API_BASE_URL } from '@/lib/axios'
import { FileText, Link as LinkIcon, Plus, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'

interface PendingReceiptsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLinkToExisting: (receipt: any) => void
  onCreateNew: (receipt: any) => void
}

export function PendingReceiptsModal({ open, onOpenChange, onLinkToExisting, onCreateNew }: PendingReceiptsModalProps) {
  const queryClient = useQueryClient()
  const [activeReceiptIndex, setActiveReceiptIndex] = useState<number | null>(null)

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

  const activeReceipt = activeReceiptIndex !== null ? receiptsData?.receipts?.[activeReceiptIndex] : null

  const handlePrev = () => {
    if (!receiptsData?.receipts?.length) return
    setActiveReceiptIndex((prev) => {
      if (prev === null) return null
      return prev > 0 ? prev - 1 : receiptsData.receipts.length - 1
    })
  }

  const handleNext = () => {
    if (!receiptsData?.receipts?.length) return
    setActiveReceiptIndex((prev) => {
      if (prev === null) return null
      return prev < receiptsData.receipts.length - 1 ? prev + 1 : 0
    })
  }

  const handleDeleteInFullscreen = async (filename: string) => {
    try {
      await deleteReceipt(filename)
      if (receiptsData?.receipts?.length <= 1) {
        setActiveReceiptIndex(null)
      } else {
        setActiveReceiptIndex((prev) => {
          if (prev === null) return null
          return prev > 0 ? prev - 1 : 0
        })
      }
    } catch (err) {
      // erro tratado no mutation
    }
  }

  useEffect(() => {
    if (activeReceiptIndex === null || !open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'Escape') {
        setActiveReceiptIndex(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeReceiptIndex, open, receiptsData])

  // Manter o índice ativo dentro dos limites caso a lista de comprovantes mude
  useEffect(() => {
    if (activeReceiptIndex !== null && receiptsData?.receipts) {
      if (activeReceiptIndex >= receiptsData.receipts.length) {
        setActiveReceiptIndex(receiptsData.receipts.length > 0 ? receiptsData.receipts.length - 1 : null)
      }
    }
  }, [receiptsData, activeReceiptIndex])

  // Resetar o estado ao fechar o modal principal
  useEffect(() => {
    if (!open) {
      setActiveReceiptIndex(null)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-2xl font-black text-slate-800">Comprovantes Rápidos</DialogTitle>
            {receiptsData?.receipts?.length > 0 && (
              <span className="flex h-6 px-2.5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 animate-in zoom-in duration-300">
                {receiptsData.receipts.length}
              </span>
            )}
          </div>
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

          {!isLoading && receiptsData?.receipts?.map((receipt: any, index: number) => (
            <div key={receipt.filename} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col">
              <div 
                className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setActiveReceiptIndex(index)}
              >
                {receipt.url.endsWith('.pdf') ? (
                  <FileText className="w-16 h-16 text-slate-400" />
                ) : (
                  <img src={`${API_BASE_URL}${receipt.url}`} alt={receipt.description} className="w-full h-full object-contain p-2" />
                )}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
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

      {/* Lightbox Modal em Tela Cheia */}
      {activeReceiptIndex !== null && activeReceipt && (
        <DialogPrimitive.Root open={true} onOpenChange={(open) => { if (!open) setActiveReceiptIndex(null) }}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-[9998] bg-black/85 backdrop-blur-sm" />
            <DialogPrimitive.Content className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-6 animate-in fade-in duration-200 outline-none">
              {/* Header do Lightbox */}
              <div className="flex items-center justify-between w-full max-w-7xl mx-auto border-b border-white/10 pb-4">
                <div className="text-white flex-1 mr-4">
                  <span className="text-xs text-slate-400 font-medium block mb-1">
                    {new Date(activeReceipt.date).toLocaleString('pt-BR')}
                  </span>
                  <h3 className="font-bold text-lg md:text-xl line-clamp-1 text-white" title={activeReceipt.description}>
                    {activeReceipt.description}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full w-10 h-10 transition-colors"
                  onClick={() => setActiveReceiptIndex(null)}
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>

              {/* Área Central - Imagem e Setas */}
              <div className="flex-1 flex items-center justify-between w-full max-w-7xl mx-auto my-4 gap-4 px-2">
                {/* Seta Esquerda */}
                <button
                  className="bg-white/5 hover:bg-white/15 active:scale-95 text-white p-3 rounded-full backdrop-blur-md transition-all border border-white/10 shrink-0"
                  onClick={handlePrev}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Imagem / PDF */}
                <div className="max-h-[60vh] max-w-[70vw] flex items-center justify-center select-none flex-1 overflow-hidden w-full">
                  {activeReceipt.url.endsWith('.pdf') ? (
                    <>
                      {/* Desktop View: Embed PDF inside a gorgeous iframe */}
                      <div className="hidden md:block w-full h-[55vh] max-w-4xl">
                        <iframe
                          src={`${API_BASE_URL}${activeReceipt.url}#toolbar=0`}
                          className="w-full h-full rounded-2xl border border-white/10 bg-white"
                          title="Visualização do PDF"
                        />
                      </div>
                      
                      {/* Mobile View: Fallback to the card & button */}
                      <div className="block md:hidden flex flex-col items-center justify-center text-slate-400 p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm max-w-md w-full text-center">
                        <FileText className="w-16 h-16 text-slate-300 mb-4" />
                        <span className="text-white font-semibold text-base">Documento PDF</span>
                        <a
                          href={`${API_BASE_URL}${activeReceipt.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 px-5 py-2.5 bg-white hover:bg-slate-200 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-lg shadow-white/5"
                        >
                          Abrir PDF
                        </a>
                      </div>
                    </>
                  ) : (
                    <img
                      src={`${API_BASE_URL}${activeReceipt.url}`}
                      alt={activeReceipt.description}
                      className="max-h-[60vh] max-w-[50vw] object-contain rounded-2xl shadow-2xl border border-white/10"
                    />
                  )}
                </div>

                {/* Seta Direita */}
                <button
                  className="bg-white/5 hover:bg-white/15 active:scale-95 text-white p-3 rounded-full backdrop-blur-md transition-all border border-white/10 shrink-0"
                  onClick={handleNext}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              {/* Rodapé - Ações */}
              <div className="w-full max-w-2xl mx-auto flex flex-col md:flex-row gap-3 items-center justify-center border-t border-white/10 pt-6">
                <Button
                  variant="outline"
                  className="w-full md:flex-1 font-bold border-white/20 text-white hover:bg-white/10 bg-transparent py-6 rounded-2xl text-sm transition-all"
                  onClick={() => {
                    onOpenChange(false)
                    onLinkToExisting(activeReceipt)
                    setActiveReceiptIndex(null)
                  }}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Vincular a Despesa
                </Button>
                <Button
                  className="w-full md:flex-1 font-bold bg-white text-slate-950 hover:bg-slate-100 py-6 rounded-2xl text-sm transition-all"
                  onClick={() => {
                    onOpenChange(false)
                    onCreateNew(activeReceipt)
                    setActiveReceiptIndex(null)
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Nova Despesa
                </Button>
                <Button
                  variant="destructive"
                  className="w-full md:w-auto font-bold bg-red-500/20 hover:bg-red-600 text-red-200 hover:text-white py-6 px-6 rounded-2xl text-sm transition-all"
                  onClick={() => handleDeleteInFullscreen(activeReceipt.filename)}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Descartar
                </Button>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </Dialog>
  )
}
