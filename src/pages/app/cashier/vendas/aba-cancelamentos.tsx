import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { getCancelamentosDasVendas } from '@/api/vendas'
import { cn } from '@/lib/utils'
import {
  diaEHora,
  moeda,
  numeroDaVenda,
  quantidade,
} from '@/utils/vendas/formatos'

import {
  Area,
  Aviso,
  CampoDeEscolha,
  FiltroDoPeriodo,
  mensagemDoErro,
  type PeriodoEscolhido,
} from './filtros'

/**
 * Aba 4 — Cancelamentos (D12 do Thomás, 16/10/2026): vendas e itens cancelados no PDV, com motivo, quem, quando e se voltou
 * ao estoque ("Devolver ao estoque" vira entrada; "Desperdício" mantém a baixa). Filtros por motivo, pessoa e tipo.
 * Substitui a aba antiga "Cancelamentos & Desperdício", que mostrava exemplos fixos quando a consulta falhava.
 */
export function AbaCancelamentos({
  periodo,
  onPeriodo,
  onAbrirVenda,
}: {
  periodo: PeriodoEscolhido
  onPeriodo: (p: PeriodoEscolhido) => void
  onAbrirVenda: (id: string) => void
}) {
  const [motivo, setMotivo] = useState('')
  const [pessoa, setPessoa] = useState('')
  const [tipo, setTipo] = useState('')
  const consulta = useQuery({
    queryKey: [
      'vendas',
      'cancelamentos',
      periodo.de,
      periodo.ate,
      motivo,
      pessoa,
      tipo,
    ],
    queryFn: () =>
      getCancelamentosDasVendas({
        de: periodo.de,
        ate: periodo.ate,
        motivo,
        pessoa,
        tipo,
      }),
  })
  const d = consulta.data
  const comFiltro = !!(motivo || pessoa || tipo)

  return (
    <div className="space-y-3">
      <Area className="space-y-3">
        <FiltroDoPeriodo periodo={periodo} onMudar={onPeriodo} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <CampoDeEscolha
            rotulo="Motivo"
            valor={motivo}
            onMudar={setMotivo}
            opcoes={(d?.motivos ?? []).map((m) => ({ valor: m, nome: m }))}
          />
          <CampoDeEscolha
            rotulo="Quem cancelou"
            valor={pessoa}
            onMudar={setPessoa}
            opcoes={(d?.pessoas ?? []).map((p) => ({ valor: p, nome: p }))}
            todos="Todas as pessoas"
          />
          <CampoDeEscolha
            rotulo="O que foi cancelado"
            valor={tipo}
            onMudar={setTipo}
            opcoes={[
              { valor: 'vendas', nome: 'Vendas inteiras' },
              { valor: 'itens', nome: 'Itens' },
            ]}
            todos="Vendas e itens"
          />
        </div>
      </Area>

      {d && (
        <Area>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Numero
              rotulo="Cancelamentos"
              valor={String(d.totais.quantidade)}
            />
            <Numero rotulo="Valor cancelado" valor={moeda(d.totais.valor)} />
            <Numero
              rotulo="Vendas inteiras · itens"
              valor={`${d.totais.vendasInteiras} · ${d.totais.itens}`}
            />
            <Numero
              rotulo="Voltaram ao estoque"
              valor={`${d.totais.voltaramAoEstoque} (${moeda(d.totais.valorQueVoltou)})`}
            />
          </div>
        </Area>
      )}

      {consulta.isLoading ? (
        <Aviso tipo="carregando">Carregando os cancelamentos…</Aviso>
      ) : consulta.isError ? (
        <Aviso tipo="erro">{mensagemDoErro(consulta.error)}</Aviso>
      ) : !d || d.cancelamentos.length === 0 ? (
        <Aviso tipo="vazio">
          Nenhum cancelamento{' '}
          {comFiltro ? 'com esses filtros' : 'neste período'}.
        </Aviso>
      ) : (
        <ul className="space-y-2">
          {d.cancelamentos.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-bold">
                    {c.daVendaInteira
                      ? 'Venda inteira'
                      : `${quantidade(c.quantidade)} × ${c.produto}`}
                    {c.origem && (
                      <span className="font-medium text-slate-500">
                        {' '}
                        · {c.origem}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Motivo: {c.motivo}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {c.quem ?? 'Quem cancelou não veio do PDV'} ·{' '}
                    {diaEHora(c.quando)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="font-mono font-black">{moeda(c.valor)}</p>
                  <span
                    className={cn(
                      'whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-bold',
                      c.voltouAoEstoque
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                    )}
                  >
                    {c.voltouAoEstoque
                      ? 'Voltou ao estoque'
                      : 'Não voltou ao estoque'}
                  </span>
                </div>
              </div>
              {c.venda && (
                <button
                  type="button"
                  onClick={() => onAbrirVenda(c.venda!.id)}
                  className="mt-2 inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-3 text-sm font-bold text-blue-700 hover:bg-blue-50 dark:border-slate-700 dark:text-blue-400 dark:hover:bg-blue-950/40"
                >
                  Abrir a venda {numeroDaVenda(c.venda)}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {rotulo}
      </p>
      <p className="font-mono text-lg font-black text-slate-900 dark:text-slate-50">
        {valor}
      </p>
    </div>
  )
}
