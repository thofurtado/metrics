import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2 pb-2 pt-1 border-b border-slate-100 dark:border-slate-800/60">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-50 md:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="max-w-[600px] text-xs font-medium text-slate-500 line-clamp-1">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
