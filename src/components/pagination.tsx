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
  onPageChange: (pageIndex: number) => Promise<void> | void
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
  const startItem = totalCount === 0 ? 0 : pageIndex * perPage + 1
  const endItem = totalCount === 0 ? 0 : Math.min((pageIndex + 1) * perPage, totalCount)

  const canNextPage = pages > pageIndex + 1
  const canPreviousPage = pageIndex > 0

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between w-full gap-6 p-6 bg-card/60 backdrop-blur-xl rounded-2xl border border-border shadow-2xl transition-all duration-300">
      {/* Left side: Results Info */}
      <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-muted-foreground font-medium order-2 lg:order-1 lg:w-[300px] justify-start">
        <div className="flex items-center gap-2 whitespace-nowrap bg-muted/40 px-4 py-2 rounded-full border border-border/30">
          <span>Mostrando</span>
          <span className="text-primary font-bold">{startItem}</span>
          <span>-</span>
          <span className="text-primary font-bold">{endItem}</span>
          <span>de</span>
          <span className="text-foreground font-bold">{totalCount}</span>
        </div>
      </div>

      {/* Center: Essential Navigation */}
      <div className="flex items-center justify-center gap-2 bg-muted/20 p-1.5 rounded-2xl border border-border order-1 lg:order-2 w-full lg:w-auto">
        <div className="flex items-center gap-1.5">
          <button
            disabled={!canPreviousPage}
            onClick={() => onPageChange(0)}
            className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 rounded-xl disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all duration-200 group"
            title="Primeira Página"
          >
            <ChevronsLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <button
            disabled={!canPreviousPage}
            onClick={() => onPageChange(pageIndex - 1)}
            className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 rounded-xl disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all duration-200 group"
            title="Página Anterior"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Page numbers: Dynamic visibility */}
        <div className="flex items-center gap-1.5 px-1.5 border-x border-border mx-1">
          {[...Array(pages)].map((_, i) => {
            const pageNum = i + 1;
            const isActive = i === pageIndex;

            // Show first, last, current, and neighbors
            const shouldShow =
              pageNum === 1 ||
              pageNum === pages ||
              Math.abs(pageNum - (pageIndex + 1)) <= 1;

            if (shouldShow) {
              return (
                <button
                  key={i}
                  onClick={() => onPageChange(i)}
                  className={`min-w-[44px] h-11 flex items-center justify-center text-sm font-bold rounded-xl transition-all duration-300 ${isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110 z-10'
                    : 'text-muted-foreground hover:text-primary-foreground hover:bg-primary/90 hover:scale-105'
                    }`}
                >
                  {pageNum}
                </button>
              );
            }

            // Ellipsis logic
            if (
              pageNum === (pageIndex + 1) - 2 ||
              pageNum === (pageIndex + 1) + 2
            ) {
              return <span key={i} className="w-8 flex justify-center text-muted-foreground text-lg font-bold opacity-50">...</span>;
            }

            return null;
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            disabled={!canNextPage}
            onClick={() => onPageChange(pageIndex + 1)}
            className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 rounded-xl disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all duration-200 group"
            title="Próxima Página"
          >
            <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button
            disabled={!canNextPage}
            onClick={() => onPageChange(pages - 1)}
            className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 rounded-xl disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all duration-200 group"
            title="Última Página"
          >
            <ChevronsRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Right side: Per Page Selector */}
      <div className="flex items-center justify-end gap-3 order-3 lg:w-[300px]">
        {onPerPageChange && (
          <div className="flex items-center gap-3 bg-muted/40 py-1.5 pl-4 pr-1.5 rounded-full border border-border/30">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Itens por página:</span>
            <Select value={String(perPage)} onValueChange={onPerPageChange}>
              <SelectTrigger className="h-8 w-[76px] bg-card border-border rounded-full text-foreground hover:bg-muted transition-colors text-xs font-bold">
                <SelectValue placeholder={String(perPage)} />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground min-w-[80px]">
                {[6, 12, 24, 48, 100].map(val => (
                  <SelectItem key={val} value={String(val)} className="focus:bg-primary focus:text-primary-foreground transition-colors cursor-pointer text-xs font-medium py-2">
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

