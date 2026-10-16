import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Loader2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import type { NotaDaLinha } from '@/api/vendas'
import { cn } from '@/lib/utils'

/** Selo da nota fiscal: palavra + cor (nunca só a cor). Venda antiga sem a nota na nuvem = "—". */
export function SeloDaNota({ nota }: { nota: NotaDaLinha | null }) {
  if (!nota) return <span className="text-slate-400">—</span>
  const s = nota.situacao.toUpperCase()
  const cor =
    s === 'AUTORIZADA'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
      : s === 'SEM_NOTA' || s === 'CANCELADA'
        ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
        : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300'
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-bold',
        cor,
      )}
    >
      {nota.rotulo ?? nota.situacao}
      {nota.numero ? ` · nº ${nota.numero}` : ''}
    </span>
  )
}

export function SeloCancelada() {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-black uppercase text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
      Cancelada
    </span>
  )
}

/** Anterior / Próxima com "Página 2 de 7". */
export function Paginacao({
  pagina,
  total,
  porPagina,
  onPagina,
}: {
  pagina: number
  total: number
  porPagina: number
  onPagina: (p: number) => void
}) {
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  if (paginas <= 1) return null
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        disabled={pagina <= 1}
        onClick={() => onPagina(pagina - 1)}
        className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        <ChevronLeft className="h-4 w-4" /> Anterior
      </button>
      <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
        Página {pagina} de {paginas}
      </span>
      <button
        type="button"
        disabled={pagina >= paginas}
        onClick={() => onPagina(pagina + 1)}
        className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        Próxima <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

/** CSV e PDF (D10): o botão diz "Gerando…" enquanto busca tudo, e avisa se não deu. */
export function BotoesDeExportar({
  onCsv,
  onPdf,
  desligado,
}: {
  onCsv: () => Promise<void>
  onPdf: () => Promise<void>
  desligado?: boolean
}) {
  const [gerando, setGerando] = useState<'csv' | 'pdf' | null>(null)
  const rodar = async (tipo: 'csv' | 'pdf', fn: () => Promise<void>) => {
    setGerando(tipo)
    try {
      await fn()
    } catch {
      toast.error('Não deu para gerar o arquivo. Tente de novo.')
    } finally {
      setGerando(null)
    }
  }
  const estilo =
    'inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
  return (
    <div className="flex gap-2">
      <button
        type="button"
        className={estilo}
        disabled={desligado || gerando !== null}
        onClick={() => rodar('csv', onCsv)}
      >
        {gerando === 'csv' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
        )}
        {gerando === 'csv' ? 'Gerando…' : 'CSV'}
      </button>
      <button
        type="button"
        className={estilo}
        disabled={desligado || gerando !== null}
        onClick={() => rodar('pdf', onPdf)}
      >
        {gerando === 'pdf' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4 text-red-600" />
        )}
        {gerando === 'pdf' ? 'Gerando…' : 'PDF'}
      </button>
    </div>
  )
}

/** Espera o texto parar de mudar (busca enquanto digita, sem uma consulta por letra); limpar vale na hora. */
export function useTextoAssentado(valor: string, ms = 350): string {
  const [assentado, setAssentado] = useState(valor)
  useEffect(() => {
    if (valor.trim() === '') {
      setAssentado('')
      return
    }
    const t = setTimeout(() => setAssentado(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return assentado
}
