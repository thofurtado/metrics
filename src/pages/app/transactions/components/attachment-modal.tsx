import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Share2, Download, ExternalLink } from 'lucide-react'
import { API_BASE_URL } from '@/lib/axios'
import { toast } from 'sonner'

interface AttachmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attachmentUrl: string | null
  description: string
}

export function AttachmentModal({ open, onOpenChange, attachmentUrl, description }: AttachmentModalProps) {
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
      <DialogContent className="max-w-4xl p-0 overflow-hidden flex flex-col h-[90vh] sm:h-[85vh] rounded-3xl bg-white dark:bg-slate-950">
        <DialogHeader className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 flex-shrink-0 z-10">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 truncate pr-8">
              Comprovante: {description}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center">
            {isPdf ? (
              <iframe 
                src={finalUrl} 
                className="w-full h-full min-h-[50vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                title="Comprovante PDF"
              />
            ) : (
              <img 
                src={finalUrl} 
                alt="Comprovante" 
                className="max-w-full max-h-full object-contain rounded-xl shadow-sm"
              />
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 flex-shrink-0 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
          <div className="flex-1 min-w-[200px] flex gap-2">
            <Button 
              onClick={handleShare}
              className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white font-bold rounded-xl h-12"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Compartilhar
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(finalUrl, '_blank')}
              className="px-4 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl h-12"
              title="Abrir em nova guia"
            >
              <ExternalLink className="w-5 h-5" />
            </Button>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto h-12 rounded-xl font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
