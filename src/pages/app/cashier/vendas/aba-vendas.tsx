import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  type FiltrosDisponiveis,
  getContaDasVendas,
  getListaDeVendas,
  getTodasAsVendas,
  type VendaDaLista,
} from '@/api/vendas'
import { cn } from '@/lib/utils'
import { baixarCsvDasVendas, pdfDasVendas } from '@/utils/vendas/exportar-pdf'
import {
  diaEHora,
  moeda,
  numeroDaVenda,
  textoDoPeriodo,
} from '@/utils/vendas/formatos'

import { LinhaDaConta } from '../components/LinhaDaConta'
import {
  Area,
  Aviso,
  CampoDeEscolha,
  CampoDeTexto,
  FiltroDoPeriodo,
  mensagemDoErro,
} from './filtros'
import {
  BotoesDeExportar,
  Paginacao,
  SeloCancelada,
  SeloDaNota,
  useTextoAssentado,
} from './pecas'
import type { FiltrosComuns } from './vendas-page'

const POR_PAGINA = 50

/**
 * Aba 1 — Vendas (D2): venda a venda no período, com dia e hora, número/senha, origem, caixa, total, formas e a nota.
 * Filtros: período, caixa, origem, forma, vendedor, produto, situação e a busca. A cancelada continua na lista, riscada, com
 * o selo "Cancelada" e fora dos totais (D12). Tocar numa venda abre o detalhe.
 */
export function AbaVendas({
  comuns,
  onComuns,
  disponiveis,
  onAbrirVenda,
}: {
  comuns: FiltrosComuns
  onComuns: (f: FiltrosComuns) => void
  disponiveis?: FiltrosDisponiveis
  onAbrirVenda: (id: string) => void
}) {
  const [forma, setForma] = useState('')
  const [produto, setProduto] = useState('')
  const [busca, setBusca] = useState('')
  const [situacao, setSituacao] = useState<'' | 'concluidas' | 'canceladas'>('')
  const [pagina, setPagina] = useState(1)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const buscaAssentada = useTextoAssentado(busca)
  const produtoAssentado = useTextoAssentado(produto)

  const filtros = {
    de: comuns.periodo.de,
    ate: comuns.periodo.ate,
    caixa: comuns.caixa,
    origem: comuns.origem,
    vendedor: comuns.vendedor,
    forma,
    produto: produtoAssentado,
    busca: buscaAssentada,
    situacao: situacao || undefined,
  }
  const chave = JSON.stringify(filtros)
  // Filtro novo volta para a primeira página
  useEffect(() => setPagina(1), [chave])

  const conta = useQuery({
    queryKey: [
      'vendas',
      'conta',
      comuns.periodo.de,
      comuns.periodo.ate,
      comuns.caixa,
    ],
    queryFn: () =>
      getContaDasVendas({
        de: comuns.periodo.de,
        ate: comuns.periodo.ate,
        caixa: comuns.caixa,
      }),
  })
  const lista = useQuery({
    queryKey: ['vendas', 'lista', chave, pagina],
    queryFn: () =>
      getListaDeVendas({ ...filtros, pagina, porPagina: POR_PAGINA }),
    placeholderData: keepPreviousData,
  })

  const outrosFiltros = [
    comuns.origem,
    comuns.vendedor,
    forma,
    produtoAssentado,
    situacao,
  ].filter(Boolean).length
  const temOutrosFiltros = outrosFiltros > 0 || !!buscaAssentada

  const exportar = async (tipo: 'csv' | 'pdf') => {
    const todas = await getTodasAsVendas(filtros)
    if (tipo === 'csv') baixarCsvDasVendas(todas, comuns.periodo)
    else
      pdfDasVendas(
        todas,
        comuns.periodo,
        temOutrosFiltros ? null : conta.data?.conta,
      )
  }

  return (
    <div className="space-y-3">
      <Area className="space-y-3">
        <FiltroDoPeriodo
          periodo={comuns.periodo}
          onMudar={(periodo) => onComuns({ ...comuns, periodo })}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <CampoDeTexto
            rotulo="Buscar"
            valor={busca}
            onMudar={setBusca}
            dica="Número, senha, mesa, produto ou cliente"
            busca
          />
          <button
            type="button"
            onClick={() => setMostrarFiltros((m) => !m)}
            aria-expanded={mostrarFiltros}
            className={cn(
              'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold',
              outrosFiltros > 0
                ? 'border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros{outrosFiltros > 0 ? ` (${outrosFiltros})` : ''}
          </button>
        </div>
        <div
          className={cn(
            'grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3',
            !mostrarFiltros && 'hidden',
          )}
        >
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
          <CampoDeEscolha
            rotulo="Forma de pagamento"
            valor={forma}
            onMudar={setForma}
            opcoes={(disponiveis?.formas ?? []).map((f) => ({
              valor: f,
              nome: f,
            }))}
            todos="Todas"
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
            valor={produto}
            onMudar={setProduto}
            dica="Nome ou código"
          />
          <CampoDeEscolha
            rotulo="Situação"
            valor={situacao}
            onMudar={(v) => setSituacao(v as '' | 'concluidas' | 'canceladas')}
            opcoes={[
              { valor: 'concluidas', nome: 'Concluídas' },
              { valor: 'canceladas', nome: 'Canceladas' },
            ]}
            todos="Todas"
          />
        </div>
      </Area>

      <LinhaDaConta
        conta={conta.data?.conta}
        carregando={conta.isLoading}
        erro={conta.isError}
        titulo={`Vendido e recebido · ${textoDoPeriodo(comuns.periodo)}`}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className="text-sm font-semibold text-slate-700 dark:text-slate-200"
          aria-live="polite"
        >
          {lista.data
            ? `${lista.data.totais.vendas === 1 ? '1 venda' : `${lista.data.totais.vendas} vendas`} · ${moeda(lista.data.totais.valor)}${lista.data.totais.canceladas > 0 ? ` · ${lista.data.totais.canceladas === 1 ? '1 cancelada' : `${lista.data.totais.canceladas} canceladas`} (fora do total)` : ''}${temOutrosFiltros ? ' · com filtros' : ''}`
            : ' '}
        </p>
        <BotoesDeExportar
          onCsv={() => exportar('csv')}
          onPdf={() => exportar('pdf')}
          desligado={!lista.data || lista.data.total === 0}
        />
      </div>

      {lista.isLoading ? (
        <Aviso tipo="carregando">Carregando as vendas…</Aviso>
      ) : lista.isError ? (
        <Aviso tipo="erro">{mensagemDoErro(lista.error)}</Aviso>
      ) : !lista.data || lista.data.vendas.length === 0 ? (
        <Aviso tipo="vazio">
          Nenhuma venda{' '}
          {temOutrosFiltros ? 'com esses filtros' : 'neste período'}.
        </Aviso>
      ) : (
        <>
          <TabelaDeVendas vendas={lista.data.vendas} onAbrir={onAbrirVenda} />
          <Paginacao
            pagina={pagina}
            total={lista.data.total}
            porPagina={POR_PAGINA}
            onPagina={setPagina}
          />
        </>
      )}
    </div>
  )
}

function Formas({ venda }: { venda: VendaDaLista }) {
  if (venda.cancelada) {
    return (
      <span className="text-sm text-slate-500 dark:text-slate-400">
        {venda.cancelamento?.motivo
          ? `Motivo: ${venda.cancelamento.motivo}`
          : 'Cancelada'}
      </span>
    )
  }
  if (venda.formas.length === 0)
    return <span className="text-slate-400">—</span>
  return (
    <span className="flex flex-wrap gap-1">
      {venda.formas.map((f) => (
        <span
          key={f.forma}
          className="whitespace-nowrap rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {f.forma} {moeda(f.valor)}
        </span>
      ))}
    </span>
  )
}

/** Tabela no computador; no celular, um cartão por venda. A linha inteira abre o detalhe (toque, clique ou Enter). */
function TabelaDeVendas({
  vendas,
  onAbrir,
}: {
  vendas: VendaDaLista[]
  onAbrir: (id: string) => void
}) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2.5">Dia e hora</th>
              <th className="px-3 py-2.5">Venda</th>
              <th className="px-3 py-2.5">Origem</th>
              <th className="px-3 py-2.5">Caixa</th>
              <th className="px-3 py-2.5">Pagamento</th>
              <th className="px-3 py-2.5">Nota</th>
              <th className="px-3 py-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {vendas.map((v) => (
              <tr
                key={v.id}
                tabIndex={0}
                role="button"
                aria-label={`Abrir a venda ${numeroDaVenda(v)}${v.cancelada ? ', cancelada' : ''}`}
                onClick={() => onAbrir(v.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onAbrir(v.id)
                  }
                }}
                className={cn(
                  'cursor-pointer border-b border-slate-100 align-top transition-colors last:border-0 hover:bg-blue-50/60 focus-visible:bg-blue-50 focus-visible:outline-none dark:border-slate-800 dark:hover:bg-blue-950/30',
                  v.cancelada &&
                    'bg-slate-50/80 text-slate-500 dark:bg-slate-950/40',
                )}
              >
                <td className="whitespace-nowrap px-3 py-2.5 font-medium">
                  {diaEHora(v.criadaEm)}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn('font-bold', v.cancelada && 'line-through')}
                  >
                    {numeroDaVenda(v)}
                  </span>
                  {v.cancelada && (
                    <div className="mt-1">
                      <SeloCancelada />
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5">{v.origem.rotulo}</td>
                <td className="px-3 py-2.5">
                  {v.caixa ? (
                    <>
                      {v.caixa.nome}
                      {v.caixa.computador && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {v.caixa.computador}
                        </div>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <Formas venda={v} />
                </td>
                <td className="px-3 py-2.5">
                  <SeloDaNota nota={v.nota} />
                </td>
                <td
                  className={cn(
                    'whitespace-nowrap px-3 py-2.5 text-right font-mono font-bold',
                    v.cancelada && 'line-through',
                  )}
                >
                  {moeda(v.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 md:hidden">
        {vendas.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => onAbrir(v.id)}
              className={cn(
                'w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm active:bg-blue-50 dark:border-slate-800 dark:bg-slate-900',
                v.cancelada &&
                  'bg-slate-50 text-slate-500 dark:bg-slate-950/40',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={cn('font-bold', v.cancelada && 'line-through')}>
                    {numeroDaVenda(v)}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {diaEHora(v.criadaEm)} · {v.origem.rotulo}
                  </p>
                </div>
                <p
                  className={cn(
                    'whitespace-nowrap font-mono text-lg font-black',
                    v.cancelada && 'line-through',
                  )}
                >
                  {moeda(v.total)}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {v.cancelada && <SeloCancelada />}
                <Formas venda={v} />
                <SeloDaNota nota={v.nota} />
              </div>
              {v.caixa && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {v.caixa.nome}
                  {v.caixa.computador ? ` · ${v.caixa.computador}` : ''}
                </p>
              )}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
