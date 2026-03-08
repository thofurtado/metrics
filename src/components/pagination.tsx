import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'

import { Button } from './ui/button'

export interface PaginationProps {
  pageIndex: number
  totalCount: number
  perPage: number
  onPageChange: (pageIndex: number) => Promise<void> | void
}

export function Pagination({
  pageIndex,
  perPage,
  totalCount,
  onPageChange,
}: PaginationProps) {
  const pages = Math.ceil(totalCount / perPage) || 1
  const startItem = totalCount === 0 ? 0 : pageIndex * perPage + 1
  const endItem = totalCount === 0 ? 0 : Math.min((pageIndex + 1) * perPage, totalCount)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 mt-6 p-4 bg-slate-900/50 rounded-xl border border-slate-800 shadow-xl">
      <div className="text-sm text-slate-400 font-medium">
        Exibindo <span className="text-slate-200 font-semibold">{startItem}-{endItem}</span> de{' '}
        <span className="text-slate-200 font-semibold">{totalCount}</span> itens
      </div>

      <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-lg border border-slate-800 shadow-sm">
        <button
          disabled={pageIndex === 0}
          onClick={() => onPageChange(0)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
          title="Primeira Página"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          disabled={pageIndex === 0}
          onClick={() => onPageChange(pageIndex - 1)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
          title="Página Anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 px-2">
          {[...Array(pages)].map((_, i) => {
            // Note: Data fetching pages are 0-indexed across the app
            const pageForDisplay = i + 1;
            const indexValue = i;
            const isActive = indexValue === pageIndex;

            if (pageForDisplay === 1 || pageForDisplay === pages || (pageForDisplay >= pageIndex && pageForDisplay <= pageIndex + 2)) {
              return (
                <button
                  key={indexValue}
                  onClick={() => onPageChange(indexValue)}
                  className={`min-w-[32px] h-8 flex items-center justify-center text-sm font-medium rounded-md transition-all ${isActive
                      ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                >
                  {pageForDisplay}
                </button>
              );
            }
            if (pageForDisplay === (pageIndex + 1) - 2 || pageForDisplay === (pageIndex + 1) + 2) {
              return <span key={indexValue} className="text-slate-600 px-1">...</span>;
            }
            return null;
          })}
        </div>

        <button
          disabled={pages <= pageIndex + 1}
          onClick={() => onPageChange(pageIndex + 1)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
          title="Próxima Página"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          disabled={pages <= pageIndex + 1}
          onClick={() => onPageChange(pages - 1)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
          title="Última Página"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
