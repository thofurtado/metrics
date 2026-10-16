import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { type FiltrosDisponiveis, getProdutosVendidos } from '@/api/vendas'
import {
  baixarCsvDosProdutos,
  pdfDosProdutos,
} from '@/utils/vendas/exportar-pdf'
import {
  diaEHora,
  moeda,
  percentual,
  quantidade,
  textoDoPeriodo,
} from '@/utils/vendas/formatos'

import {
  Area,
  Aviso,
  CampoDeEscolha,
  CampoDeTexto,
  FiltroDoPeriodo,
  mensagemDoErro,
} from './filtros'
import { BotoesDeExportar, useTextoAssentado } from './pecas'
import type { FiltrosComuns } from './vendas-page'

/**
 * Aba 3 — Produtos vendidos (D2): produto a produto no período, com quantidade, faturamento, custo, margem e participação.
 * Filtros: origem, caixa e vendedor. O custo é o congelado na venda (não o de hoje); venda antiga sem custo fica fora da margem.
 * Custo e margem só para quem pode ver (a regra de acesso de hoje, D9).
 */
export function AbaProdutos({
  comuns,
  onComuns,
  disponiveis,
}: {
  comuns: FiltrosComuns
  onComuns: (f: FiltrosComuns) => void
  disponiveis?: FiltrosDisponiveis
}) {
  const [busca, setBusca] = useState('')
  const produto = useTextoAssentado(busca)
  const filtros = {
    de: comuns.periodo.de,
    ate: comuns.periodo.ate,
    caixa: comuns.caixa,
    origem: comuns.origem,
    vendedor: comuns.vendedor,
    produto,
  }
  const consulta = useQuery({
    queryKey: ['vendas', 'produtos', JSON.stringify(filtros)],
    queryFn: () => getProdutosVendidos(filtros),
  })
  const d = consulta.data
  const veCusto = !!d?.veCusto
  const comFiltro = !!(
    comuns.caixa ||
    comuns.origem ||
    comuns.vendedor ||
    produto
  )

  return (
    <div className="space-y-3">
      <Area className="space-y-3">
        <FiltroDoPeriodo
          periodo={comuns.periodo}
          onMudar={(periodo) => onComuns({ ...comuns, periodo })}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
            rotulo="Vendedor"
            valor={comuns.vendedor}
            onMudar={(vendedor) => onComuns({ ...comuns, vendedor })}
            opcoes={[
              ...(disponiveis?.vendedores ?? []).map((v) => ({
                valor: v.chave,
                nome: v.numero ? `${v.nome} (${v.numero})` : v.nome,
              })),
              { valor: 'sem', nome: 'Sem vendedor' },
            ]}
          />
          <CampoDeTexto
            rotulo="Produto"
            valor={busca}
            onMudar={setBusca}
            dica="Nome ou código"
            busca
          />
        </div>
      </Area>

      {d && (
        <Area>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Numero
              rotulo="Faturamento dos itens"
              valor={moeda(d.totais.faturamento)}
            />
            <Numero
              rotulo="Produtos diferentes"
              valor={String(d.totais.produtos)}
            />
            {veCusto && <Numero rotulo="Custo" valor={moeda(d.totais.custo)} />}
            {veCusto && (
              <Numero
                rotulo="Margem"
                valor={
                  d.totais.margem == null
                    ? '—'
                    : `${moeda(d.totais.margem)} (${percentual(d.totais.margemPercentual)})`
                }
              />
            )}
          </div>
          {!comFiltro && (
            <p className="mt-3 border-t border-slate-100 pt-2 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
              Itens {moeda(d.conta.vendido.itens)}
              {d.conta.vendido.descontos > 0 &&
                ` − descontos na venda ${moeda(d.conta.vendido.descontos)}`}
              {d.conta.vendido.taxas.total > 0 &&
                ` + entrega, serviço e couvert ${moeda(d.conta.vendido.taxas.total)}`}
              {` = Total vendido ${moeda(d.conta.vendido.vendas)}`}
              {d.conta.vendido.lancadoSemVenda > 0 &&
                ` (mais ${moeda(d.conta.vendido.lancadoSemVenda)} lançado no caixa da web, sem itens)`}
            </p>
          )}
          {veCusto && (d.totais.itensSemCusto ?? 0) > 0 && (
            <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              {quantidade(d.totais.itensSemCusto)} unidade(s) vendida(s) sem
              custo congelado (vendas antigas): entram no faturamento e ficam
              fora da margem.
            </p>
          )}
        </Area>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {textoDoPeriodo(comuns.periodo)}
        </p>
        <BotoesDeExportar
          desligado={!d || d.produtos.length === 0}
          onCsv={async () =>
            d && baixarCsvDosProdutos(d.produtos, veCusto, comuns.periodo)
          }
          onPdf={async () =>
            d &&
            pdfDosProdutos(
              d.produtos,
              veCusto,
              comuns.periodo,
              comFiltro ? null : d.conta,
            )
          }
        />
      </div>

      {consulta.isLoading ? (
        <Aviso tipo="carregando">Somando os produtos…</Aviso>
      ) : consulta.isError ? (
        <Aviso tipo="erro">{mensagemDoErro(consulta.error)}</Aviso>
      ) : !d || d.produtos.length === 0 ? (
        <Aviso tipo="vazio">
          Nenhum produto vendido{' '}
          {comFiltro ? 'com esses filtros' : 'neste período'}.
        </Aviso>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2.5">Produto</th>
                  <th className="px-3 py-2.5 text-right">Quantidade</th>
                  <th className="px-3 py-2.5 text-right">Vendas</th>
                  <th className="px-3 py-2.5 text-right">Faturamento</th>
                  {veCusto && <th className="px-3 py-2.5 text-right">Custo</th>}
                  {veCusto && (
                    <th className="px-3 py-2.5 text-right">Margem</th>
                  )}
                  <th className="px-3 py-2.5">Participação</th>
                </tr>
              </thead>
              <tbody>
                {d.produtos.map((p) => (
                  <tr
                    key={p.chave}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="px-3 py-2.5">
                      <span className="font-bold">{p.nome}</span>
                      {p.codigo != null && (
                        <span className="ml-2 text-xs text-slate-500">
                          #{p.codigo}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono">
                      {quantidade(p.quantidade, p.unidade)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {p.vendas}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono font-bold">
                      {moeda(p.faturamento)}
                    </td>
                    {veCusto && (
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono">
                        {moeda(p.custo)}
                      </td>
                    )}
                    {veCusto && (
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono">
                        {p.margem == null
                          ? '—'
                          : `${moeda(p.margem)} · ${percentual(p.margemPercentual)}`}
                      </td>
                    )}
                    <td className="px-3 py-2.5">
                      <Barra valor={p.participacao} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2 md:hidden">
            {d.produtos.map((p) => (
              <li
                key={p.chave}
                className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 break-words font-bold">
                    {p.nome}
                    {p.codigo != null && (
                      <span className="ml-1 text-xs font-medium text-slate-500">
                        #{p.codigo}
                      </span>
                    )}
                  </p>
                  <p className="whitespace-nowrap font-mono font-black">
                    {moeda(p.faturamento)}
                  </p>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {quantidade(p.quantidade, p.unidade)} em {p.vendas}{' '}
                  {p.vendas === 1 ? 'venda' : 'vendas'}
                  {veCusto &&
                    ` · custo ${moeda(p.custo)} · margem ${p.margem == null ? '—' : percentual(p.margemPercentual)}`}
                </p>
                <div className="mt-2">
                  <Barra valor={p.participacao} />
                </div>
              </li>
            ))}
          </ul>
        </>
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

/** Participação no faturamento: barra + número (o número é que conta; a barra só ajuda a bater o olho). */
function Barra({ valor }: { valor: number }) {
  return (
    <div className="flex min-w-[8rem] items-center gap-2">
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-blue-600 dark:bg-blue-400"
          style={{ width: `${Math.min(100, Math.max(0, valor))}%` }}
        />
      </div>
      <span className="w-14 text-right font-mono text-xs font-bold">
        {percentual(valor)}
      </span>
    </div>
  )
}
