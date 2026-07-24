import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

interface ExtractionOverlayProps {
  isLoading: boolean
}

export function ExtractionOverlay({ isLoading }: ExtractionOverlayProps) {
  if (!isLoading) return null

  return (
    <div
      className={cn(
        'absolute inset-0 z-[100] flex flex-col items-center justify-center p-8 text-center transition-all duration-300',
        'rounded-3xl border-2 border-dashed border-red-500/20 bg-background/60 backdrop-blur-[6px]',
      )}
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-red-500/10 blur-2xl" />
        <Loader2 className="relative h-12 w-12 animate-spin text-red-500" />
      </div>
      <h3 className="mb-2 text-xl font-black tracking-tight text-foreground">
        Processando código...
      </h3>
      <p className="max-w-[200px] text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
        Estamos extraindo as informações do documento capturado pela câmera.
      </p>
      <div className="mt-8 flex justify-center gap-1">
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-500 [animation-delay:-0.3s]" />
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-500 [animation-delay:-0.15s]" />
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-500" />
      </div>
    </div>
  )
}
