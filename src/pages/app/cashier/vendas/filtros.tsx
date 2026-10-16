import { Search, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import {
  atalhoDoPeriodo,
  ATALHOS_DO_PERIODO,
  periodoDoAtalho,
} from '@/utils/vendas/formatos'

/** Período escolhido (dias operacionais, AAAA-MM-DD). */
export interface PeriodoEscolhido {
  de: string
  ate: string
}

const estiloCampo =
  'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 sm:text-sm'

/** Atalhos (Hoje, Ontem, 7 dias, Este mês, Mês passado) e as duas datas. */
export function FiltroDoPeriodo({
  periodo,
  onMudar,
}: {
  periodo: PeriodoEscolhido
  onMudar: (p: PeriodoEscolhido) => void
}) {
  const ativo = atalhoDoPeriodo(periodo)
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
      <div role="group" aria-label="Período" className="flex flex-wrap gap-1.5">
        {ATALHOS_DO_PERIODO.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-pressed={ativo === a.id}
            onClick={() => onMudar(periodoDoAtalho(a.id))}
            className={cn(
              'min-h-11 rounded-xl border px-3 text-sm font-bold transition-colors',
              ativo === a.id
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
            )}
          >
            {a.nome}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 lg:w-[22rem]">
        <label className="flex flex-col gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
          De
          <input
            type="date"
            value={periodo.de}
            max={periodo.ate}
            onChange={(e) =>
              e.target.value &&
              onMudar({
                de: e.target.value,
                ate:
                  periodo.ate < e.target.value ? e.target.value : periodo.ate,
              })
            }
            className={estiloCampo}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
          Até
          <input
            type="date"
            value={periodo.ate}
            min={periodo.de}
            onChange={(e) =>
              e.target.value &&
              onMudar({
                de: periodo.de > e.target.value ? e.target.value : periodo.de,
                ate: e.target.value,
              })
            }
            className={estiloCampo}
          />
        </label>
      </div>
    </div>
  )
}

/** Lista de escolha com rótulo sempre visível; o primeiro item é "todos". */
export function CampoDeEscolha({
  rotulo,
  valor,
  onMudar,
  opcoes,
  todos = 'Todos',
}: {
  rotulo: string
  valor: string
  onMudar: (v: string) => void
  opcoes: { valor: string; nome: string }[]
  todos?: string
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
      {rotulo}
      <select
        value={valor}
        onChange={(e) => onMudar(e.target.value)}
        className={estiloCampo}
      >
        <option value="">{todos}</option>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.nome}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Campo de texto com rótulo e o X para limpar. */
export function CampoDeTexto({
  rotulo,
  valor,
  onMudar,
  dica,
  busca,
}: {
  rotulo: string
  valor: string
  onMudar: (v: string) => void
  dica?: string
  busca?: boolean
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
      {rotulo}
      <span className="relative block">
        {busca && (
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
        )}
        <input
          type="search"
          value={valor}
          placeholder={dica}
          onChange={(e) => onMudar(e.target.value)}
          className={cn(estiloCampo, busca && 'pl-9', valor && 'pr-11')}
        />
        {valor && (
          <button
            type="button"
            onClick={() => onMudar('')}
            aria-label={`Limpar ${rotulo.toLowerCase()}`}
            className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </span>
    </label>
  )
}

/** Caixa com o título da área (todas as abas usam o mesmo cartão). */
export function Area({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Estado vazio, de carregando ou de erro, em palavras. */
export function Aviso({
  tipo,
  children,
}: {
  tipo: 'vazio' | 'carregando' | 'erro'
  children: ReactNode
}) {
  return (
    <div
      role={tipo === 'erro' ? 'alert' : 'status'}
      className={cn(
        'rounded-2xl border p-6 text-center text-sm font-semibold',
        tipo === 'erro'
          ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200'
          : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400',
        tipo === 'carregando' && 'animate-pulse',
      )}
    >
      {children}
    </div>
  )
}

/** Mensagem da nuvem (ex.: "Escolha um período de até 1 ano.") ou uma genérica. */
export function mensagemDoErro(erro: unknown): string {
  const e = erro as { response?: { data?: { message?: string } } } | null
  return (
    e?.response?.data?.message ||
    'Não deu para carregar. Confira a internet e tente de novo.'
  )
}
