import { useQueryClient } from '@tanstack/react-query'
import { Camera, Image as ImageIcon, Loader2, Plus, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { deleteFileProduct, uploadFileProduct } from '@/api/upload-file'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { compressImage } from '@/lib/image-compression'
import { cn, resolveImageUrl } from '@/lib/utils'

interface ProductPhotoDialogProps {
  product: {
    id: string
    name: string
    image_url?: string | null
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ProductPhotoDialog({
  product,
  open,
  onOpenChange,
  onSuccess,
}: ProductPhotoDialogProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Reseta o estado quando abre/fecha
  useEffect(() => {
    if (open) {
      setSelectedFile(null)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
    }
  }, [open])

  // Processa o arquivo selecionado, colado ou arrastado
  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('O arquivo selecionado não é uma imagem válida.')
      return
    }

    try {
      // Comprime no cliente para ~80KB-180KB mantendo resolução 1200x1200px
      const optimized = await compressImage(file)
      setSelectedFile(optimized)

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(URL.createObjectURL(optimized))
      toast.success('Imagem pronta para envio!')
    } catch (err) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  // Captura Ctrl + V de qualquer lugar enquanto o modal estiver aberto
  useEffect(() => {
    if (!open) return

    const handlePaste = (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData
      if (!clipboardData) return

      if (clipboardData.files && clipboardData.files.length > 0) {
        for (let i = 0; i < clipboardData.files.length; i++) {
          const file = clipboardData.files[i]
          if (file.type.startsWith('image/')) {
            e.preventDefault()
            e.stopPropagation()
            handleFileProcess(file)
            return
          }
        }
      }

      if (clipboardData.items && clipboardData.items.length > 0) {
        for (let i = 0; i < clipboardData.items.length; i++) {
          const item = clipboardData.items[i]
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (file) {
              e.preventDefault()
              e.stopPropagation()
              handleFileProcess(file)
              return
            }
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste, true)
    return () => {
      window.removeEventListener('paste', handlePaste, true)
    }
  }, [open, previewUrl])

  // Salva a nova imagem via PUT
  const handleSavePhoto = async () => {
    if (!selectedFile) return

    setIsSaving(true)
    try {
      await uploadFileProduct(product.id, selectedFile, 'PUT')
      toast.success('Foto do produto atualizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao atualizar foto:', err)
      toast.error('Erro ao enviar imagem. Verifique a conexão.')
    } finally {
      setIsSaving(false)
    }
  }

  // Remove a imagem via DELETE
  const handleDeletePhoto = async () => {
    setIsDeleting(true)
    try {
      await deleteFileProduct(product.id)
      toast.success('Foto removida com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao deletar foto:', err)
      toast.error('Erro ao remover imagem.')
    } finally {
      setIsDeleting(false)
    }
  }

  const currentDisplayUrl = previewUrl || (product.image_url ? resolveImageUrl(product.image_url) : null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden rounded-2xl p-0 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 bg-slate-50/60 p-5 text-left dark:border-slate-800 dark:bg-slate-900/30">
          <div className="flex items-center gap-2 text-primary">
            <Camera className="h-5 w-5" />
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              Foto do Cardápio
            </DialogTitle>
          </div>
          <DialogDescription className="truncate text-xs font-semibold text-slate-500">
            {product.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-5">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileProcess(e.target.files[0])
              }
            }}
          />

          {/* Área Principal de Visualização / Dropzone */}
          {currentDisplayUrl ? (
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-inner dark:border-slate-800 dark:bg-slate-950">
              <div className="relative aspect-video w-full overflow-hidden">
                <img
                  src={currentDisplayUrl}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
                {selectedFile && (
                  <span className="absolute bottom-2 left-2 rounded-lg bg-emerald-600 px-2 py-0.5 text-[10px] font-black uppercase text-white shadow-md">
                    Nova Foto (Pendente de Salvar)
                  </span>
                )}
              </div>

              {/* Barra de Ações sobre a imagem */}
              <div className="flex items-center justify-between border-t border-slate-200/80 bg-white/95 p-3 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/90">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 gap-1.5 rounded-lg text-xs font-bold"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Trocar Foto
                  </Button>
                  <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Ctrl + V
                  </span>
                </div>

                {!selectedFile && product.image_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isDeleting || isSaving}
                    onClick={handleDeletePhoto}
                    className="h-8 gap-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Remover Foto
                  </Button>
                )}

                {selectedFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null)
                      if (previewUrl) URL.revokeObjectURL(previewUrl)
                      setPreviewUrl(null)
                    }}
                    className="h-8 text-xs font-bold text-slate-500 hover:text-slate-700"
                  >
                    Cancelar troca
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsDragging(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsDragging(false)
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsDragging(false)
                const file = e.dataTransfer.files?.[0]
                if (file) handleFileProcess(file)
              }}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all',
                isDragging
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                  : 'border-slate-200 bg-slate-50/50 hover:border-primary/50 hover:bg-primary/5 dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-primary/40'
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
                <Camera className="h-6 w-6" />
              </div>
              <h4 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                Selecione ou Cole a Imagem
              </h4>
              <p className="mt-1 max-w-[260px] text-xs text-muted-foreground">
                Arraste uma foto, clique para selecionar ou cole com <strong>Ctrl + V</strong>
              </p>
              <span className="mt-3 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                JPG, PNG ou WEBP • Otimização Instantânea
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/30 sm:justify-between">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm" className="rounded-xl font-bold">
              Fechar
            </Button>
          </DialogClose>

          {selectedFile && (
            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              onClick={handleSavePhoto}
              className="gap-1.5 rounded-xl font-bold"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Salvar Foto (PUT)
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
