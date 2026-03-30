import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExtractionOverlayProps {
  isLoading: boolean
}

export function ExtractionOverlay({ isLoading }: ExtractionOverlayProps) {
  if (!isLoading) return null

  return (
    <div className={cn(
      "absolute inset-0 z-[100] flex flex-col items-center justify-center p-8 text-center transition-all duration-300",
      "bg-background/60 backdrop-blur-[6px] rounded-3xl border-2 border-dashed border-red-500/20"
    )}>
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-red-500/10 blur-2xl rounded-full scale-150 animate-pulse" />
        <Loader2 className="w-12 h-12 text-red-500 animate-spin relative" />
      </div>
      <h3 className="text-xl font-black tracking-tight text-foreground mb-2">Processando código...</h3>
      <p className="text-slate-500 dark:text-slate-400 font-medium text-sm max-w-[200px] leading-relaxed">
        Estamos extraindo as informações do documento capturado pela câmera.
      </p>
      <div className="mt-8 flex justify-center gap-1">
        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" />
      </div>
    </div>
  )
}
