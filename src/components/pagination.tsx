import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

export interface PaginationProps {
  pageIndex: number
  totalCount: number
  perPage: number
  onPageChange: (newPageIndex: number) => Promise<void> | void
  onPerPageChange?: (perPage: string) => void
}

export function Pagination({
  pageIndex,
  perPage,
  totalCount,
  onPageChange,
  onPerPageChange,
}: PaginationProps) {
  const pages = Math.ceil(totalCount / perPage) || 1
  const page = pageIndex + 1
  const from = totalCount === 0 ? 0 : (page - 1) * perPage + 1
  const to = totalCount === 0 ? 0 : Math.min(page * perPage, totalCount)

  const canNextPage = pages > pageIndex + 1
  const canPreviousPage = pageIndex > 0

  return (
    <div className="flex w-full flex-col items-center justify-between gap-6 rounded-2xl border border-border bg-card/60 p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 lg:flex-row">
      {/* Left side: Results Info */}
      <div className="order-2 flex flex-col items-center justify-start gap-4 text-sm font-medium text-muted-foreground sm:flex-row lg:order-1 lg:w-[300px]">
        <div className="flex items-center gap-2 whitespace-nowrap rounded-full border border-border/30 bg-muted/40 px-4 py-2">
          <span>Mostrando</span>
          <span className="font-bold text-primary">{from}</span>
          <span>-</span>
          <span className="font-bold text-primary">{to}</span>
          <span>de</span>
          <span className="font-bold text-foreground">{totalCount}</span>
        </div>
      </div>

      {/* Center: Essential Navigation */}
      <div className="order-1 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-muted/20 p-1.5 lg:order-2 lg:w-auto">
        <div className="flex items-center gap-1.5">
          <button
            disabled={!canPreviousPage}
            onClick={() => onPageChange(0)}
            className="group flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:scale-105 hover:bg-primary/90 hover:text-primary-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:scale-100"
            title="Primeira Página"
          >
            <ChevronsLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
          </button>
          <button
            disabled={!canPreviousPage}
            onClick={() => onPageChange(pageIndex - 1)}
            className="group flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:scale-105 hover:bg-primary/90 hover:text-primary-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:scale-100"
            title="Página Anterior"
          >
            <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
          </button>
        </div>

        {/* Page numbers: Dynamic visibility */}
        <div className="mx-1 flex items-center gap-1.5 border-x border-border px-1.5">
          {[...Array(pages)].map((_, i) => {
            const pageNum = i + 1
            const isActive = i === pageIndex

            // Show first, last, current, and neighbors
            const shouldShow =
              pageNum === 1 ||
              pageNum === pages ||
              Math.abs(pageNum - (pageIndex + 1)) <= 1

            if (shouldShow) {
              return (
                <button
                  key={i}
                  onClick={() => onPageChange(i)}
                  className={`flex h-11 min-w-[44px] items-center justify-center rounded-xl text-sm font-bold transition-all duration-300 ${
                    isActive
                      ? 'z-10 scale-110 bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                      : 'text-muted-foreground hover:scale-105 hover:bg-primary/90 hover:text-primary-foreground'
                  }`}
                >
                  {pageNum}
                </button>
              )
            }

            // Ellipsis logic
            if (
              pageNum === pageIndex + 1 - 2 ||
              pageNum === pageIndex + 1 + 2
            ) {
              return (
                <span
                  key={i}
                  className="flex w-8 justify-center text-lg font-bold text-muted-foreground opacity-50"
                >
                  ...
                </span>
              )
            }

            return null
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            disabled={!canNextPage}
            onClick={() => onPageChange(pageIndex + 1)}
            className="group flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:scale-105 hover:bg-primary/90 hover:text-primary-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:scale-100"
            title="Próxima Página"
          >
            <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            disabled={!canNextPage}
            onClick={() => onPageChange(pages - 1)}
            className="group flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:scale-105 hover:bg-primary/90 hover:text-primary-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:scale-100"
            title="Última Página"
          >
            <ChevronsRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Right side: Per Page Selector */}
      <div className="order-3 flex items-center justify-end gap-3 lg:w-[300px]">
        {onPerPageChange && (
          <div className="flex items-center gap-3 rounded-full border border-border/30 bg-muted/40 py-1.5 pl-4 pr-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Itens por página:
            </span>
            <Select value={String(perPage)} onValueChange={onPerPageChange}>
              <SelectTrigger className="h-8 w-[76px] rounded-full border-border bg-card text-xs font-bold text-foreground transition-colors hover:bg-muted">
                <SelectValue placeholder={String(perPage)} />
              </SelectTrigger>
              <SelectContent className="min-w-[80px] border-border bg-popover text-popover-foreground">
                {[6, 12, 24, 48, 100].map((val) => (
                  <SelectItem
                    key={val}
                    value={String(val)}
                    className="cursor-pointer py-2 text-xs font-medium transition-colors focus:bg-primary focus:text-primary-foreground"
                  >
                    {val}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}
