import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

import { type FiltrosDisponiveis, getVendedoresDoPeriodo } from '@/api/vendas'
import {
  diaEHora,
  moeda,
  percentual,
  quantidade,
} from '@/utils/vendas/formatos'

import {
  Area,
  Aviso,
  CampoDeEscolha,
  FiltroDoPeriodo,
  mensagemDoErro,
} from './filtros'
import type { FiltrosComuns } from './vendas-page'

/**
 * Aba 5 — Vendedores (D2): quanto cada vendedor vendeu no período, item por item (o vendedor é de cada item: sobe do PDV
 * desde a etapa 1, D4). Tocar num vendedor mostra os produtos dele. Itens das vendas antigas ficam em "Sem vendedor".
 */
export function AbaVendedores({
  comuns,
  onComuns,
  disponiveis,
}: {
  comuns: FiltrosComuns
  onComuns: (f: FiltrosComuns) => void
  disponiveis?: FiltrosDisponiveis
}) {
  const [aberto, setAberto] = useState<string | null>(null)
  const filtros = {
    de: comuns.periodo.de,
    ate: comuns.periodo.ate,
    caixa: comuns.caixa,
    origem: comuns.origem,
  }
  const consulta = useQuery({
    queryKey: ['vendas', 'vendedores', JSON.stringify(filtros)],
    queryFn: () => getVendedoresDoPeriodo(filtros),
  })
  const d = consulta.data
  const soSemVendedor =
    !!d && d.vendedores.length > 0 && d.vendedores.every((v) => v.semVendedor)

  return (
    <div className="space-y-3">
      <Area className="space-y-3">
        <FiltroDoPeriodo
          periodo={comuns.periodo}
          onMudar={(periodo) => onComuns({ ...comuns, periodo })}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <CampoDeEscolha
            rotulo="Caixa"
            valor={comuns.caixa}
            onMudar={(caixa) => onComuns({ ...comuns, caixa })}
            opcoes={(disponiveis?.caixas ?? []).map((c) => ({
              valor: c.id,
              nome: `${c.nome}${c.abertoEm ? ` · ${diaEHora(c.abertoEm)}` : ''}${c.computador ? ` · ${c.computador}` : ''}`,
            }))}
          />
          <CampoDeEscolha
            rotulo="Origem"
            valor={comuns.origem}
            onMudar={(origem) => onComuns({ ...comuns, origem })}
            opcoes={(disponiveis?.origens ?? []).map((o) => ({
              valor: o.tipo,
              nome: o.nome,
            }))}
            todos="Todas"
          />
        </div>
      </Area>

      {soSemVendedor && (
        <Aviso tipo="vazio">
          Os itens deste período não têm vendedor. O vendedor sobe do PDV a
          partir da versão nova, quando a loja pede o código do vendedor ao
          lançar.
        </Aviso>
      )}

      {consulta.isLoading ? (
        <Aviso tipo="carregando">Somando por vendedor…</Aviso>
      ) : consulta.isError ? (
        <Aviso tipo="erro">{mensagemDoErro(consulta.error)}</Aviso>
      ) : !d || d.vendedores.length === 0 ? (
        <Aviso tipo="vazio">Nenhuma venda neste período.</Aviso>
      ) : (
        <ul className="space-y-2">
          {d.vendedores.map((v) => {
            const estaAberto = aberto === v.chave
            return (
              <li
                key={v.chave}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <button
                  type="button"
                  onClick={() => setAberto(estaAberto ? null : v.chave)}
                  aria-expanded={estaAberto}
                  className="flex min-h-11 w-full items-center justify-between gap-3 p-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="break-words font-bold">
                      {v.nome}
                      {v.numero != null && (
                        <span className="font-medium text-slate-500">
                          {' '}
                          ({v.numero})
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {quantidade(v.itens)} {v.itens === 1 ? 'item' : 'itens'}{' '}
                      em {v.vendas} {v.vendas === 1 ? 'venda' : 'vendas'} ·{' '}
                      {percentual(v.participacao)} do faturamento
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <p className="font-mono text-lg font-black">
                      {moeda(v.faturamento)}
                    </p>
                    {estaAberto ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </div>
                </button>
                {estaAberto && (
                  <ul className="divide-y divide-slate-100 border-t border-slate-100 px-3 pb-2 dark:divide-slate-800 dark:border-slate-800">
                    {v.produtos.map((p) => (
                      <li
                        key={`${p.codigo}-${p.nome}`}
                        className="flex items-center justify-between gap-3 py-2 text-sm"
                      >
                        <span className="min-w-0 break-words">
                          {quantidade(p.quantidade)} × {p.nome}
                          {p.codigo != null && (
                            <span className="text-xs text-slate-500">
                              {' '}
                              #{p.codigo}
                            </span>
                          )}
                        </span>
                        <span className="whitespace-nowrap font-mono font-bold">
                          {moeda(p.faturamento)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {d && d.vendedores.length > 0 && (
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Faturamento dos itens: {moeda(d.totais.faturamento)} ·{' '}
          {d.totais.vendedores}{' '}
          {d.totais.vendedores === 1 ? 'vendedor' : 'vendedores'}
        </p>
      )}
    </div>
  )
}
