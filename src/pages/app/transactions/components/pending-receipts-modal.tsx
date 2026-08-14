import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Link as LinkIcon,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ImageZoomViewer } from '@/components/image-zoom-viewer'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { api, API_BASE_URL } from '@/lib/axios'

interface PendingReceiptsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLinkToExisting: (receipt: any) => void
  onCreateNew: (receipt: any) => void
}

export function PendingReceiptsModal({
  open,
  onOpenChange,
  onLinkToExisting,
  onCreateNew,
}: PendingReceiptsModalProps) {
  const queryClient = useQueryClient()
  const [activeReceiptIndex, setActiveReceiptIndex] = useState<number | null>(
    null,
  )
  const [receiptToDelete, setReceiptToDelete] = useState<{
    filename: string
    isFullscreen?: boolean
  } | null>(null)

  const { data: receiptsData, isLoading } = useQuery({
    queryKey: ['pending-receipts'],
    queryFn: async () => {
      const response = await api.get('/uploads/receipts?per_page=100')
      return response.data
    },
    enabled: open,
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
    },
  })

  const activeReceipt =
    activeReceiptIndex !== null
      ? receiptsData?.receipts?.[activeReceiptIndex]
      : null

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

  const handleConfirmDeleteReceipt = async () => {
    if (!receiptToDelete) return
    const { filename, isFullscreen } = receiptToDelete

    try {
      if (isFullscreen) {
        await handleDeleteInFullscreen(filename)
      } else {
        await deleteReceipt(filename)
      }
    } finally {
      // Pequeno delay para garantir a transição de estados do Radix UI
      setTimeout(() => {
        setReceiptToDelete(null)
      }, 50)
      
      // Fallback de segurança para garantir que a tela destrave caso o Radix falhe 
      // ao tentar devolver o foco para um elemento que foi recém excluído da DOM.
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto'
      }, 500)
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
        setActiveReceiptIndex(
          receiptsData.receipts.length > 0
            ? receiptsData.receipts.length - 1
            : null,
        )
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
            <DialogTitle className="text-2xl font-black text-slate-800">
              Comprovantes Rápidos
            </DialogTitle>
            {receiptsData?.receipts?.length > 0 && (
              <span className="flex h-6 items-center justify-center rounded-full border border-slate-200/50 bg-slate-100 px-2.5 text-xs font-bold text-slate-700 duration-300 animate-in zoom-in dark:border-slate-700/50 dark:bg-slate-800 dark:text-slate-300">
                {receiptsData.receipts.length}
              </span>
            )}
          </div>
          <DialogDescription>
            Aqui estão os comprovantes enviados pelo celular que ainda não foram
            vinculados a nenhuma despesa.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 grid max-h-[60vh] grid-cols-1 gap-4 overflow-y-auto sm:grid-cols-2 md:grid-cols-3">
          {isLoading && (
            <div className="col-span-full py-10 text-center text-sm text-slate-500">
              Carregando comprovantes...
            </div>
          )}

          {!isLoading && receiptsData?.receipts?.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-slate-500">
              <FileText className="mb-4 h-12 w-12 text-slate-300" />
              <p className="font-semibold">Nenhum comprovante pendente</p>
              <p className="text-xs">
                Eles aparecerão aqui quando você enviar pelo celular.
              </p>
            </div>
          )}

          {!isLoading &&
            receiptsData?.receipts?.map((receipt: any, index: number) => (
              <div
                key={receipt.filename}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div
                  className="relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden bg-slate-100 transition-opacity hover:opacity-90"
                  onClick={() => setActiveReceiptIndex(index)}
                >
                  {receipt.url.endsWith('.pdf') ? (
                    <FileText className="h-16 w-16 text-slate-400" />
                  ) : (
                    <img
                      src={`${API_BASE_URL}${receipt.url}`}
                      alt={receipt.description}
                      className="h-full w-full object-contain p-2"
                    />
                  )}
                  <div
                    className="absolute right-2 top-2 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8 rounded-full shadow-lg"
                      onClick={() =>
                        setReceiptToDelete({
                          filename: receipt.filename,
                          isFullscreen: false,
                        })
                      }
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <p className="mb-1 text-xs text-slate-500">
                    {new Date(receipt.date).toLocaleString('pt-BR')}
                  </p>
                  <p
                    className="mb-2 line-clamp-2 flex-1 text-sm font-bold text-slate-800"
                    title={receipt.description}
                  >
                    {receipt.description}
                  </p>
                  {receipt.value != null && (
                    <p className="mb-4 text-sm font-bold text-emerald-600">
                      {Number(receipt.value).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </p>
                  )}

                  <div className="mt-auto flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-slate-200 px-0 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      onClick={() => {
                        onOpenChange(false)
                        onLinkToExisting(receipt)
                      }}
                    >
                      <LinkIcon className="mr-1 h-3 w-3" />
                      Vincular
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-slate-900 px-0 text-xs font-bold text-white hover:bg-slate-800"
                      onClick={() => {
                        onOpenChange(false)
                        onCreateNew(receipt)
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" />
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
        <DialogPrimitive.Root
          open={true}
          onOpenChange={(open) => {
            if (!open) setActiveReceiptIndex(null)
          }}
        >
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-[9998] bg-black/85 backdrop-blur-sm" />
            <DialogPrimitive.Content className="fixed inset-0 z-[9999] flex flex-col justify-between bg-slate-950/95 p-6 outline-none backdrop-blur-md duration-200 animate-in fade-in">
              {/* Header do Lightbox */}
              <div className="mx-auto flex w-full max-w-7xl items-center justify-between border-b border-white/10 pb-4">
                <div className="mr-4 flex-1 text-white">
                  <span className="mb-1 block text-xs font-medium text-slate-400">
                    {new Date(activeReceipt.date).toLocaleString('pt-BR')}
                  </span>
                  <h3
                    className="line-clamp-1 text-lg font-bold text-white md:text-xl"
                    title={activeReceipt.description}
                  >
                    {activeReceipt.description}
                  </h3>
                  {activeReceipt.value != null && (
                    <span className="mt-1 block text-sm font-bold text-emerald-400">
                      {Number(activeReceipt.value).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                  onClick={() => setActiveReceiptIndex(null)}
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>

              {/* Área Central - Imagem e Setas */}
              <div className="mx-auto my-4 flex w-full max-w-7xl flex-1 items-center justify-between gap-4 px-2">
                {/* Seta Esquerda */}
                <button
                  className="shrink-0 rounded-full border border-white/10 bg-white/5 p-3 text-white backdrop-blur-md transition-all hover:bg-white/15 active:scale-95"
                  onClick={handlePrev}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                {/* Imagem / PDF */}
                <div className="flex h-[75vh] w-full max-w-[85vw] flex-1 select-none items-center justify-center overflow-hidden md:h-[80vh]">
                  {activeReceipt.url.endsWith('.pdf') ? (
                    <>
                      {/* Desktop View: Embed PDF inside a gorgeous iframe */}
                      <div className="hidden h-[75vh] w-full max-w-4xl md:block">
                        <iframe
                          src={`${API_BASE_URL}${activeReceipt.url}#toolbar=0`}
                          className="h-full w-full rounded-2xl border border-white/10 bg-white"
                          title="Visualização do PDF"
                        />
                      </div>

                      {/* Mobile View: Fallback to the card & button */}
                      <div className="block flex w-full max-w-md flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-slate-400 backdrop-blur-sm md:hidden">
                        <FileText className="mb-4 h-16 w-16 text-slate-300" />
                        <span className="text-base font-semibold text-white">
                          Documento PDF
                        </span>
                        <a
                          href={`${API_BASE_URL}${activeReceipt.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-white/5 transition-all hover:bg-slate-200"
                        >
                          Abrir PDF
                        </a>
                      </div>
                    </>
                  ) : (
                    <ImageZoomViewer
                      src={`${API_BASE_URL}${activeReceipt.url}`}
                      alt={activeReceipt.description}
                      containerClassName="h-full w-full"
                    />
                  )}
                </div>

                {/* Seta Direita */}
                <button
                  className="shrink-0 rounded-full border border-white/10 bg-white/5 p-3 text-white backdrop-blur-md transition-all hover:bg-white/15 active:scale-95"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>

              {/* Rodapé - Ações */}
              <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-3 border-t border-white/10 pt-6 md:flex-row">
                <Button
                  variant="outline"
                  className="w-full rounded-2xl border-white/20 bg-transparent py-6 text-sm font-bold text-white transition-all hover:bg-white/10 md:flex-1"
                  onClick={() => {
                    onOpenChange(false)
                    onLinkToExisting(activeReceipt)
                    setActiveReceiptIndex(null)
                  }}
                >
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Vincular a Despesa
                </Button>
                <Button
                  className="w-full rounded-2xl bg-white py-6 text-sm font-bold text-slate-950 transition-all hover:bg-slate-100 md:flex-1"
                  onClick={() => {
                    onOpenChange(false)
                    onCreateNew(activeReceipt)
                    setActiveReceiptIndex(null)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Nova Despesa
                </Button>
                <Button
                  variant="destructive"
                  className="w-full rounded-2xl bg-red-500/20 px-6 py-6 text-sm font-bold text-red-200 transition-all hover:bg-red-600 hover:text-white md:w-auto"
                  onClick={() =>
                    setReceiptToDelete({
                      filename: activeReceipt.filename,
                      isFullscreen: true,
                    })
                  }
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Descartar
                </Button>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE DELETAR COMPROVANTE */}
      <AlertDialog
        open={!!receiptToDelete}
        onOpenChange={(open) => {
          if (!open) setReceiptToDelete(null)
        }}
      >
        <AlertDialogContent className="max-w-md rounded-3xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              Deletar Comprovante?
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Tem certeza que deseja descartar e excluir permanentemente este
              comprovante? Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row sm:gap-3">
            <AlertDialogCancel
              onClick={() => setReceiptToDelete(null)}
              disabled={isDeleting}
              className="rounded-xl border-slate-200 text-xs font-bold dark:border-slate-800"
            >
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              className="rounded-xl font-bold"
              disabled={isDeleting}
              onClick={handleConfirmDeleteReceipt}
            >
              {isDeleting ? 'Excluindo...' : 'Sim, Deletar'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
