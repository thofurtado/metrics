import { AlertCircle, Inbox } from 'lucide-react'

import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: 'inbox' | 'error'
  className?: string
}

export function EmptyState({
  title = 'Nenhum item encontrado',
  description = 'Não há dados para exibir no momento.',
  icon = 'inbox',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4 py-12 text-center duration-300 animate-in fade-in zoom-in',
        className,
      )}
    >
      <div className="mb-4 rounded-full bg-muted/50 p-4">
        {icon === 'inbox' ? (
          <Inbox className="h-10 w-10 text-muted-foreground/60" />
        ) : (
          <AlertCircle className="h-10 w-10 text-destructive/60" />
        )}
      </div>
      <h3 className="mb-1 text-xl font-semibold text-foreground">{title}</h3>
      <p className="mx-auto max-w-[250px] text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  )
}
