import { Download, ExternalLink, Share2 } from 'lucide-react'
import { toast } from 'sonner'

import { ImageZoomViewer } from '@/components/image-zoom-viewer'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { API_BASE_URL } from '@/lib/axios'

interface AttachmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attachmentUrl: string | null
  description: string
}

export function AttachmentModal({
  open,
  onOpenChange,
  attachmentUrl,
  description,
}: AttachmentModalProps) {
  if (!attachmentUrl) return null

  const finalUrl = attachmentUrl.startsWith('http')
    ? attachmentUrl
    : `${API_BASE_URL?.replace(/\/$/, '') || ''}${attachmentUrl.startsWith('/') ? '' : '/'}${attachmentUrl}`

  const isPdf = finalUrl.toLowerCase().includes('.pdf')

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Comprovante - ${description}`,
          text: `Confira o comprovante de ${description}`,
          url: finalUrl,
        })
      } catch (error) {
        if ((error as any).name !== 'AbortError') {
          console.error('Erro ao compartilhar', error)
          fallbackShare()
        }
      }
    } else {
      fallbackShare()
    }
  }

  const fallbackShare = () => {
    navigator.clipboard.writeText(finalUrl)
    toast.success('Link copiado para a área de transferência!')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-4xl flex-col overflow-hidden rounded-3xl bg-white p-0 dark:bg-slate-950 sm:h-[85vh]">
        <DialogHeader className="z-10 flex-shrink-0 border-b border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="truncate pr-8 text-lg font-black text-slate-800 dark:text-slate-100 sm:text-xl">
              Comprovante: {description}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 min-w-0 bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden flex-col">
          <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex items-center justify-center relative">
            {isPdf ? (
              <iframe
                src={finalUrl}
                className="h-full min-h-[50vh] w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                title="Comprovante PDF"
              />
            ) : (
              <ImageZoomViewer
                src={finalUrl}
                alt="Comprovante"
                containerClassName="w-full h-full"
              />
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-nowrap sm:p-6">
          <div className="flex min-w-[200px] flex-1 gap-2">
            <Button
              onClick={handleShare}
              className="h-12 flex-1 rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Compartilhar
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(finalUrl, '_blank')}
              className="h-12 rounded-xl border-slate-200 px-4 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-900"
              title="Abrir em nova guia"
            >
              <ExternalLink className="h-5 w-5" />
            </Button>
          </div>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-12 w-full rounded-xl font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 sm:w-auto"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
