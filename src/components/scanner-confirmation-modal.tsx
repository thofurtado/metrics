import { Button } from '@/components/ui/button'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from '@/components/ui/responsive-dialog'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileText, QrCode, Receipt, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ExtractedData {
  amount: number
  dueDate?: string
  description: string
  type: 'PIX' | 'BOLETO' | 'NFCE'
  rawCode: string
}

interface ScannerConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: ExtractedData | null
  onConfirm: (data: ExtractedData) => void
}

export function ScannerConfirmationModal({
  open,
  onOpenChange,
  data,
  onConfirm,
}: ScannerConfirmationModalProps) {
  if (!data) return null

  const getIcon = () => {
    switch (data.type) {
      case 'PIX':
        return <QrCode className="w-10 h-10 text-emerald-600" />
      case 'BOLETO':
        return <FileText className="w-10 h-10 text-blue-600" />
      case 'NFCE':
        return <Receipt className="w-10 h-10 text-orange-600" />
      default:
        return <Receipt className="w-10 h-10 text-slate-600" />
    }
  }

  const getTypeLabel = () => {
    switch (data.type) {
      case 'PIX': return 'Pix Detectado'
      case 'BOLETO': return 'Boleto Detectado'
      case 'NFCE': return 'Nota Fiscal Detectada'
      default: return 'Dados Capturados'
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-[400px] p-0 overflow-hidden rounded-3xl">
        <div className="bg-slate-50 dark:bg-slate-900/50 p-8 flex flex-col items-center text-center border-b border-border/50">
          <div className={cn(
            "w-20 h-20 rounded-2xl flex items-center justify-center mb-4 shadow-sm",
            data.type === 'PIX' && "bg-emerald-100 dark:bg-emerald-900/30",
            data.type === 'BOLETO' && "bg-blue-100 dark:bg-blue-900/30",
            data.type === 'NFCE' && "bg-orange-100 dark:bg-orange-900/30",
          )}>
            {getIcon()}
          </div>
          <ResponsiveDialogTitle className="text-2xl font-black tracking-tight text-foreground">
            {getTypeLabel()}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-slate-500 mt-1">
            Revisar dados extraídos via câmera.
          </ResponsiveDialogDescription>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor</span>
            <div className="text-3xl font-bold tabular-nums text-foreground">
              {data.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vencimento</span>
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {data.dueDate ? format(new Date(data.dueDate), "dd 'de' MMMM", { locale: ptBR }) : 'Não identificado'}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tipo</span>
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {data.type}
              </div>
            </div>
          </div>

          <div className="space-y-1 p-3 bg-muted/30 rounded-xl border border-dashed">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Descrição / Emissor</span>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400 line-clamp-2">
              {data.description || 'Sem descrição identificada'}
            </div>
          </div>
        </div>

        <ResponsiveDialogFooter className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-border/50 gap-3">
          <Button 
            variant="outline" 
            className="flex-1 h-14 rounded-2xl font-bold text-slate-600 dark:text-slate-400 border-border/70"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button 
            className={cn(
              "flex-1 h-14 rounded-2xl font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]",
              data.type === 'PIX' && "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20",
              data.type === 'BOLETO' && "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20",
              data.type === 'NFCE' && "bg-orange-600 hover:bg-orange-700 shadow-orange-500/20",
            )}
            autoFocus
            onClick={() => onConfirm(data)}
          >
            <Check className="w-5 h-5 mr-2 stroke-[3px]" />
            Confirmar
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
