import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, FileText, QrCode, Receipt } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'
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
        return <QrCode className="h-10 w-10 text-emerald-600" />
      case 'BOLETO':
        return <FileText className="h-10 w-10 text-blue-600" />
      case 'NFCE':
        return <Receipt className="h-10 w-10 text-orange-600" />
      default:
        return <Receipt className="h-10 w-10 text-slate-600" />
    }
  }

  const getTypeLabel = () => {
    switch (data.type) {
      case 'PIX':
        return 'Pix Detectado'
      case 'BOLETO':
        return 'Boleto Detectado'
      case 'NFCE':
        return 'Nota Fiscal Detectada'
      default:
        return 'Dados Capturados'
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="overflow-hidden rounded-3xl p-0 sm:max-w-[400px]">
        <div className="flex flex-col items-center border-b border-border/50 bg-slate-50 p-8 text-center dark:bg-slate-900/50">
          <div
            className={cn(
              'mb-4 flex h-20 w-20 items-center justify-center rounded-2xl shadow-sm',
              data.type === 'PIX' && 'bg-emerald-100 dark:bg-emerald-900/30',
              data.type === 'BOLETO' && 'bg-blue-100 dark:bg-blue-900/30',
              data.type === 'NFCE' && 'bg-orange-100 dark:bg-orange-900/30',
            )}
          >
            {getIcon()}
          </div>
          <ResponsiveDialogTitle className="text-2xl font-black tracking-tight text-foreground">
            {getTypeLabel()}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="mt-1 text-slate-500">
            Revisar dados extraídos via câmera.
          </ResponsiveDialogDescription>
        </div>

        <div className="space-y-5 p-6">
          <div className="space-y-1">
            <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Valor
            </span>
            <div className="text-3xl font-bold tabular-nums text-foreground">
              {data.amount.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Vencimento
              </span>
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {data.dueDate
                  ? format(new Date(data.dueDate), "dd 'de' MMMM", {
                      locale: ptBR,
                    })
                  : 'Não identificado'}
              </div>
            </div>
            <div className="space-y-1">
              <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Tipo
              </span>
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {data.type}
              </div>
            </div>
          </div>

          <div className="space-y-1 rounded-xl border border-dashed bg-muted/30 p-3">
            <span className="text-[10px] font-bold uppercase leading-none tracking-widest text-slate-400">
              Descrição / Emissor
            </span>
            <div className="line-clamp-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              {data.description || 'Sem descrição identificada'}
            </div>
          </div>
        </div>

        <ResponsiveDialogFooter className="gap-3 border-t border-border/50 bg-slate-50 p-6 dark:bg-slate-900/50">
          <Button
            variant="outline"
            className="h-14 flex-1 rounded-2xl border-border/70 font-bold text-slate-600 dark:text-slate-400"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className={cn(
              'h-14 flex-1 rounded-2xl font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]',
              data.type === 'PIX' &&
                'bg-emerald-600 shadow-emerald-500/20 hover:bg-emerald-700',
              data.type === 'BOLETO' &&
                'bg-blue-600 shadow-blue-500/20 hover:bg-blue-700',
              data.type === 'NFCE' &&
                'bg-orange-600 shadow-orange-500/20 hover:bg-orange-700',
            )}
            autoFocus
            onClick={() => onConfirm(data)}
          >
            <Check className="mr-2 h-5 w-5 stroke-[3px]" />
            Confirmar
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
