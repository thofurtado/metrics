
import { Inbox, AlertCircle } from 'lucide-react'
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
    className
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in zoom-in duration-300",
            className
        )}>
            <div className="mb-4 p-4 rounded-full bg-muted/50">
                {icon === 'inbox' ? (
                    <Inbox className="w-10 h-10 text-muted-foreground/60" />
                ) : (
                    <AlertCircle className="w-10 h-10 text-destructive/60" />
                )}
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">
                {description}
            </p>
        </div>
    )
}
