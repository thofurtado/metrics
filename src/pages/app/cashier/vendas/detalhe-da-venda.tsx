import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { type DetalheDaVenda as Detalhe, getDetalheDaVenda } from '@/api/vendas'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { useModules } from '@/context/module-context'
import { cn } from '@/lib/utils'
import {
  dataCompleta,
  diaEHora,
  moeda,
  numeroDaVenda,
  percentual,
  quantidade,
} from '@/utils/vendas/formatos'

import { Aviso, mensagemDoErro } from './filtros'
import { SeloCancelada, SeloDaNota } from './pecas'

/**
 * Detalhe da venda (D3 do Thomás, 16/10/2026): cabeçalho, itens, pagamentos, nota fiscal, estoque e cancelamentos. O que a
 * venda antiga não tem aparece como "—". Item cancelado aparece riscado; venda cancelada mostra motivo, quem e quando (D12).
 */
export function DetalheDaVenda({
  id,
  onFechar,
}: {
  id: string
  onFechar: () => void
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['vendas', 'detalhe', id],
    queryFn: () => getDetalheDaVenda(id),
  })

  return (
    <Sheet open onOpenChange={(aberto) => !aberto && onFechar()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-2xl [&>button.absolute]:hidden"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div className="min-w-0">
            <SheetTitle className="text-xl font-black">
              {data ? `Venda ${numeroDaVenda(data)}` : 'Venda'}
            </SheetTitle>
            <SheetDescription className="text-sm">
              {data
                ? `${dataCompleta(data.criadaEm)} · ${data.origem.rotulo}`
                : 'Carregando…'}
            </SheetDescription>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" /> Fechar
          </button>
        </div>
        <div className="space-y-4 p-4">
          {isLoading ? (
            <Aviso tipo="carregando">Carregando a venda…</Aviso>
          ) : isError || !data ? (
            <Aviso tipo="erro">{mensagemDoErro(error)}</Aviso>
          ) : (
            <Conteudo venda={data} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

const traco = (v: ReactNode) => (v == null || v === '' ? '—' : v)

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {titulo}
      </h3>
      {children}
    </section>
  )
}

function Par({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold text-slate-500 dark:text-slate-400">
        {rotulo}
      </dt>
      <dd className="break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
        {traco(valor)}
      </dd>
    </div>
  )
}

function Conteudo({ venda }: { venda: Detalhe }) {
  const { hasAccess, isModuleActive } = useModules()
  const podeAbrirEstoque = isModuleActive('stock_control') && hasAccess('stock')
  const itensAtivos = venda.itens.filter((i) => !i.cancelado)

  return (
    <>
      {venda.cancelada && (
        <div
          role="status"
          className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
        >
          <div className="mb-1">
            <SeloCancelada />
          </div>
          <p className="font-semibold">
            {venda.cancelamento
              ? `${venda.cancelamento.motivo} · ${venda.cancelamento.quem ?? 'quem cancelou não veio do PDV'} · ${diaEHora(venda.cancelamento.quando)}`
              : 'Venda cancelada no PDV.'}
          </p>
          <p className="mt-1 text-xs">
            Fica fora dos totais de vendido e recebido.
          </p>
        </div>
      )}

      <Bloco titulo="Venda">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Par
            rotulo="Número"
            valor={venda.numero != null ? `#${venda.numero}` : null}
          />
          <Par rotulo="Senha" valor={venda.senha} />
          <Par rotulo="Código" valor={venda.codigo} />
          <Par rotulo="Dia e hora" valor={dataCompleta(venda.criadaEm)} />
          <Par rotulo="Origem" valor={venda.origem.rotulo} />
          <Par rotulo="Cliente" valor={venda.cliente} />
          <Par rotulo="Caixa" valor={venda.caixa?.nome} />
          <Par
            rotulo="Computador"
            valor={
              venda.caixa ? venda.caixa.computador ?? 'Caixa da web' : null
            }
          />
          <Par rotulo="Operador do caixa" valor={venda.operador} />
        </dl>
      </Bloco>

      <Bloco titulo={`Itens (${itensAtivos.length})`}>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {venda.itens.map((i) => (
            <li
              key={i.id}
              className={cn('py-2', i.cancelado && 'text-slate-400')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className={cn(
                      'break-words font-bold',
                      i.cancelado && 'line-through',
                    )}
                  >
                    {quantidade(i.quantidade, i.unidade)} × {i.nome}
                    {i.cancelado && (
                      <span className="ml-2 align-middle no-underline">
                        <SeloCancelada />
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {i.codigo != null ? `Código ${i.codigo} · ` : ''}
                    {moeda(i.precoUnitario)}{' '}
                    {i.unidade === 'kg' ? 'o quilo' : 'cada'}
                    {i.desconto > 0 ? ` · desconto ${moeda(i.desconto)}` : ''}
                    {i.nomeNoCadastro &&
                    i.nomeVendido &&
                    i.nomeNoCadastro !== i.nomeVendido
                      ? ` · no cadastro hoje: ${i.nomeNoCadastro}`
                      : ''}
                  </p>
                  {i.complementos && (
                    <ul className="mt-1 space-y-0.5 text-sm text-slate-700 dark:text-slate-300">
                      {i.complementos.map((c, n) => (
                        <li key={n}>
                          {c.observacaoRapida
                            ? `Obs: ${c.nome}`
                            : `+ ${c.quantidade > 1 ? `${c.quantidade}× ` : ''}${c.nome}${c.preco > 0 ? ` (${moeda(c.preco)})` : ''}`}
                        </li>
                      ))}
                    </ul>
                  )}
                  {i.observacao && (
                    <p className="mt-1 text-sm italic text-slate-700 dark:text-slate-300">
                      “{i.observacao}”
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Vendedor:{' '}
                    {i.vendedor?.nome
                      ? `${i.vendedor.nome}${i.vendedor.numero ? ` (${i.vendedor.numero})` : ''}`
                      : '—'}
                    {venda.veCusto && !i.cancelado && (
                      <>
                        {' '}
                        · Custo {moeda(i.custo)} · Margem{' '}
                        {i.margem == null
                          ? '—'
                          : `${moeda(i.margem)} (${percentual(i.margemPercentual)})`}
                      </>
                    )}
                  </p>
                </div>
                <p
                  className={cn(
                    'whitespace-nowrap font-mono font-bold',
                    i.cancelado && 'line-through',
                  )}
                >
                  {moeda(i.total)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-sm dark:border-slate-800">
          <Linha rotulo="Itens" valor={moeda(venda.valores.itens)} />
          {venda.valores.desconto > 0 && (
            <Linha
              rotulo="Desconto na venda"
              valor={`−${moeda(venda.valores.desconto)}`}
            />
          )}
          {venda.valores.entrega > 0 && (
            <Linha rotulo="Entrega" valor={moeda(venda.valores.entrega)} />
          )}
          {venda.valores.servico > 0 && (
            <Linha rotulo="Serviço" valor={moeda(venda.valores.servico)} />
          )}
          {venda.valores.couvert > 0 && (
            <Linha rotulo="Couvert" valor={moeda(venda.valores.couvert)} />
          )}
          <Linha
            rotulo="Total"
            valor={moeda(venda.valores.total)}
            forte
            riscado={venda.cancelada}
          />
          {venda.veCusto && venda.valores.custo != null && (
            <Linha
              rotulo="Custo dos itens · margem"
              valor={`${moeda(venda.valores.custo)} · ${moeda(venda.valores.margem)}`}
            />
          )}
        </dl>
      </Bloco>

      <Bloco titulo="Pagamentos">
        {venda.pagamentos.length === 0 ? (
          <p className="text-sm text-slate-500">
            {venda.cancelada
              ? 'Os pagamentos saem quando a venda é cancelada.'
              : '—'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {venda.pagamentos.map((p, n) => (
              <li
                key={p.id ?? n}
                className="flex items-start justify-between gap-3 py-2"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-bold">
                    {p.forma}
                    {p.tipo === 'PRAZO' && ' · a prazo'}
                    {p.tipo === 'PLATAFORMA' && ' · a receber do aplicativo'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {p.maquininha
                      ? `Maquininha: ${p.maquininha}`
                      : p.tipo === 'DINHEIRO'
                        ? 'Gaveta'
                        : ''}
                    {p.pessoa ? ` · ${p.pessoa}` : ''}
                    {p.caixinha > 0 ? ` · caixinha ${moeda(p.caixinha)}` : ''}
                  </p>
                </div>
                <p className="whitespace-nowrap font-mono font-bold">
                  {moeda(p.valor)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <dl className="mt-2 grid grid-cols-2 gap-3 border-t border-slate-100 pt-2 dark:border-slate-800">
          <Par
            rotulo="Troco"
            valor={venda.troco != null ? moeda(venda.troco) : null}
          />
          <Par
            rotulo="Caixinha"
            valor={venda.caixinha > 0 ? moeda(venda.caixinha) : null}
          />
        </dl>
      </Bloco>

      <Bloco titulo="Nota fiscal">
        {venda.nota ? (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Par rotulo="Situação" valor={<SeloDaNota nota={venda.nota} />} />
            <Par rotulo="Número" valor={venda.nota.numero} />
            <Par rotulo="Série" valor={venda.nota.serie} />
            <Par rotulo="Ambiente" valor={venda.nota.ambiente} />
            <Par
              rotulo="Contingência"
              valor={
                venda.nota.contingencia == null
                  ? null
                  : venda.nota.contingencia
                    ? 'Sim'
                    : 'Não'
              }
            />
            {venda.nota.motivo && (
              <Par rotulo="Motivo" valor={venda.nota.motivo} />
            )}
            <div className="col-span-2 min-w-0 sm:col-span-3">
              <dt className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Chave
              </dt>
              <dd className="break-all font-mono text-sm">
                {traco(venda.nota.chave)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-slate-500">
            — (venda de antes do PDV mandar a nota para a nuvem)
          </p>
        )}
      </Bloco>

      <Bloco titulo="Estoque">
        {venda.estoque.length === 0 ? (
          <p className="text-sm text-slate-500">
            — (nenhuma baixa ligada a esta venda)
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {venda.estoque.map((b) => {
              const produtoId = b.produtoId ?? b.insumoId
              return (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="break-words font-bold">
                      {b.entrada ? 'Voltou ao estoque' : 'Baixa'}: {b.nome}
                      {b.ehInsumo && (
                        <span className="font-normal text-slate-500">
                          {' '}
                          (insumo)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {b.entrada ? '+' : '−'}
                      {quantidade(b.quantidade)} · {diaEHora(b.quando)}
                      {b.custoUnitario != null
                        ? ` · custo ${moeda(b.custoUnitario)}`
                        : ''}
                    </p>
                  </div>
                  {podeAbrirEstoque && produtoId && (
                    <Link
                      to={`/stock?tab=history&item=${produtoId}`}
                      className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-2 text-sm font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                    >
                      Extrato <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Bloco>

      <Bloco titulo="Cancelamentos">
        {venda.cancelamentos.length === 0 ? (
          <p className="text-sm text-slate-500">—</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {venda.cancelamentos.map((c) => (
              <li key={c.id} className="py-2 text-sm">
                <p className="font-bold">
                  {c.daVendaInteira
                    ? 'Venda inteira'
                    : `${quantidade(c.quantidade)} × ${c.produto}`}{' '}
                  · {moeda(c.valor)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {c.motivo} · {c.quem ?? '—'} · {diaEHora(c.quando)} ·{' '}
                  {c.voltouAoEstoque
                    ? 'voltou ao estoque'
                    : 'não voltou ao estoque'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Bloco>
    </>
  )
}

function Linha({
  rotulo,
  valor,
  forte,
  riscado,
}: {
  rotulo: string
  valor: string
  forte?: boolean
  riscado?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3',
        forte && 'text-base font-black',
      )}
    >
      <dt className={cn(!forte && 'text-slate-600 dark:text-slate-300')}>
        {rotulo}
      </dt>
      <dd className={cn('font-mono', riscado && 'line-through')}>{valor}</dd>
    </div>
  )
}
