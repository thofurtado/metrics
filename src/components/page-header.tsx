import { ReactNode } from "react"


interface PageHeaderProps {
    title: string
    description?: string
    children?: ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
    return (
        <div className="flex flex-col gap-4 md:gap-8 pb-4 md:pb-6 pt-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                    <h1 className="font-merienda text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                            {description}
                        </p>
                    )}
                </div>
                {children && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {children}
                    </div>
                )}
            </div>
        </div>
    )
}
