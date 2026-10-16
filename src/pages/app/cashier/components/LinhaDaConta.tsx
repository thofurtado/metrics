import { ChevronDown, ChevronUp, Equal, Info } from 'lucide-react'
import { useState } from 'react'

import type { ContaDasVendas } from '@/api/vendas'
import { cn } from '@/lib/utils'
import { moeda } from '@/utils/vendas/formatos'

/**
 * A conta única (D11 do Thomás, 16/10/2026): "Total vendido" × "Total recebido" e a linha que explica a diferença
 * (a prazo, aplicativos a receber, caixinha) — a mesma conta da nuvem no Dashboard, na Conferência de caixa e em Vendas.
 * variante "linha": só a frase (embaixo dos cartões do Dashboard); "bloco": os dois totais, a frase e, ao tocar, por forma.
 */
export function LinhaDaConta({
  conta,
  carregando,
  erro,
  variante = 'bloco',
  titulo,
  className,
}: {
  conta?: ContaDasVendas | null
  carregando?: boolean
  erro?: boolean
  variante?: 'bloco' | 'linha'
  titulo?: string
  className?: string
}) {
  const [aberto, setAberto] = useState(false)

  if (carregando) {
    return (
      <div
        className={cn(
          'animate-pulse rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400',
          className,
        )}
      >
        Calculando vendido e recebido…
      </div>
    )
  }
  if (erro || !conta) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200',
          className,
        )}
      >
        <Info className="h-4 w-4 shrink-0" />
        Não deu para calcular o vendido e o recebido agora. Atualize a página
        para tentar de novo.
      </div>
    )
  }

  const bate = conta.diferenca.linha.startsWith('Vendido e recebido batem')

  if (variante === 'linha') {
    return (
      <div
        className={cn(
          'flex flex-wrap items-start gap-x-3 gap-y-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200',
          className,
        )}
      >
        <Equal
          className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
          aria-hidden
        />
        <p className="min-w-0 flex-1 break-words font-semibold">
          {conta.diferenca.linha}
        </p>
        {conta.diferenca.canceladas && (
          <p className="w-full pl-7 text-xs font-medium text-slate-500 dark:text-slate-400">
            {conta.diferenca.canceladas}
          </p>
        )}
      </div>
    )
  }

  return (
    <section
      aria-label={titulo || 'Vendido e recebido'}
      className={cn(
        'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
    >
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Total vendido
          </p>
          <p className="font-mono text-2xl font-black text-slate-900 dark:text-slate-50">
            {moeda(conta.vendido.total)}
          </p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {conta.vendido.quantidade === 1
              ? '1 venda'
              : `${conta.vendido.quantidade} vendas`}
            {conta.vendido.quantidade > 0 &&
              ` · ticket médio ${moeda(conta.vendido.ticketMedio)}`}
            {conta.vendido.lancamentosSemVenda > 0 &&
              ` · ${moeda(conta.vendido.lancadoSemVenda)} lançado no caixa da web`}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Total recebido
          </p>
          <p className="font-mono text-2xl font-black text-emerald-700 dark:text-emerald-400">
            {moeda(conta.recebido.total)}
          </p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Dinheiro {moeda(conta.recebido.dinheiro)} · Pix, cartões e vale{' '}
            {moeda(conta.recebido.eletronico)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Diferença
          </p>
          <p
            className={cn(
              'font-mono text-2xl font-black',
              bate
                ? 'text-slate-400 dark:text-slate-500'
                : 'text-amber-700 dark:text-amber-400',
            )}
          >
            {moeda(conta.diferenca.valor)}
          </p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {bate ? 'Vendido e recebido batem' : 'Explicada na linha abaixo'}
          </p>
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        <p className="break-words text-sm font-semibold text-slate-800 dark:text-slate-100">
          {conta.diferenca.linha}
        </p>
        {conta.diferenca.canceladas && (
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {conta.diferenca.canceladas}
          </p>
        )}
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          aria-expanded={aberto}
          className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
        >
          {aberto ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          {aberto ? 'Esconder por forma' : 'Ver por forma de pagamento'}
        </button>
      </div>

      {aberto && (
        <div className="grid grid-cols-1 gap-4 border-t border-slate-100 p-4 dark:border-slate-800 md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Recebido (formas que se contam)
            </h4>
            {conta.recebido.porForma.length === 0 ? (
              <p className="text-sm text-slate-500">Nada recebido.</p>
            ) : (
              <ul className="space-y-2">
                {conta.recebido.porForma.map((f) => (
                  <li
                    key={f.forma}
                    className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/60"
                  >
                    <div className="flex items-center justify-between gap-2 text-sm font-bold">
                      <span>{f.forma}</span>
                      <span className="font-mono">{moeda(f.total)}</span>
                    </div>
                    {f.maquininhas.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {f.maquininhas.map((m) => (
                          <li
                            key={m.nome}
                            className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400"
                          >
                            <span className="min-w-0 break-words">
                              {m.nome}
                            </span>
                            <span className="font-mono">{moeda(m.total)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Vendido sem receber agora (sem contagem física)
            </h4>
            {conta.semContagem.porForma.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nada a prazo nem de aplicativo.
              </p>
            ) : (
              <ul className="space-y-2">
                {conta.semContagem.porForma.map((f) => (
                  <li
                    key={`${f.tipo}-${f.forma}`}
                    className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold dark:bg-slate-950/60"
                  >
                    <span className="min-w-0 break-words">
                      {f.tipo === 'PRAZO'
                        ? `A prazo · ${f.forma}`
                        : `${f.forma} (a receber do aplicativo)`}
                    </span>
                    <span className="font-mono">{moeda(f.total)}</span>
                  </li>
                ))}
              </ul>
            )}
            {conta.caixinha > 0 && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Caixinha recebida (não é venda):{' '}
                <strong className="font-mono">{moeda(conta.caixinha)}</strong>
              </p>
            )}
            {(conta.vendido.taxas.total > 0 || conta.vendido.descontos > 0) && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Itens {moeda(conta.vendido.itens)}
                {conta.vendido.taxas.entrega > 0 &&
                  ` + entrega ${moeda(conta.vendido.taxas.entrega)}`}
                {conta.vendido.taxas.servico > 0 &&
                  ` + serviço ${moeda(conta.vendido.taxas.servico)}`}
                {conta.vendido.taxas.couvert > 0 &&
                  ` + couvert ${moeda(conta.vendido.taxas.couvert)}`}
                {conta.vendido.descontos > 0 &&
                  ` − descontos ${moeda(conta.vendido.descontos)}`}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
