import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 pb-4 pt-2 md:gap-8 md:pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-tighter text-slate-900 dark:text-slate-50 md:text-4xl lg:text-5xl">
            {title}
          </h1>
          {description && (
            <p className="max-w-[600px] text-base leading-relaxed text-slate-500">
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
