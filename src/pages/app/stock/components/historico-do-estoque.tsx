import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Package,
  Receipt,
  RotateCcw,
  Scale,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  getStockHistory,
  searchStockItems,
  type StockHistoryOrigin,
  type StockHistoryRow,
  type StockItemOption,
  type TipoDoHistorico,
  type ViaDoHistorico,
} from '@/api/stock'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import {
  baixarCsv,
  formatarDataHora,
  formatarDelta,
  formatarDinheiro,
  formatarQuantidade,
  numeroNoCsv,
  PERIODOS,
} from './formatos-do-estoque'
import { OrigemDoMovimentoDialog } from './origem-do-movimento-dialog'

/**
 * Histórico do estoque (decisão D6 do Thomás, 16/10/2026): o mesmo componente no Controle de Estoque › Histórico (com filtro
 * por produto) e na aba Histórico da ficha do produto (Mercadorias). Cada linha: data e hora, tipo, quantidade, saldo antes e
 * depois, quem fez e o toque que abre a venda ou a nota de compra. Exporta CSV.
 */

const TIPOS: { value: 'TODOS' | TipoDoHistorico; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'VENDA', label: 'Vendas' },
  { value: 'COMPRA', label: 'Compras' },
  { value: 'PERDA', label: 'Perdas' },
  { value: 'AJUSTE', label: 'Ajustes' },
  { value: 'ESTORNO', label: 'Estornos' },
]

const ESTILO_DO_TIPO: Record<
  TipoDoHistorico,
  { icone: typeof ShoppingCart; classe: string }
> = {
  VENDA: {
    icone: ShoppingCart,
    classe:
      'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
  },
  COMPRA: {
    icone: Receipt,
    classe:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  },
  PERDA: {
    icone: Trash2,
    classe:
      'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
  },
  AJUSTE: {
    icone: Scale,
    classe:
      'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200',
  },
  ESTORNO: {
    icone: RotateCcw,
    classe:
      'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  },
  OUTRO: {
    icone: Package,
    classe:
      'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200',
  },
}

function SeloDoTipo({ linha }: { linha: StockHistoryRow }) {
  const estilo = ESTILO_DO_TIPO[linha.kind] ?? ESTILO_DO_TIPO.OUTRO
  const Icone = estilo.icone
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-sm font-semibold',
        estilo.classe,
      )}
    >
      <Icone className="h-4 w-4" aria-hidden />
      {linha.label}
    </span>
  )
}

function Saldo({ linha }: { linha: StockHistoryRow }) {
  if (linha.balanceAfter === null)
    return <span className="text-muted-foreground">—</span>
  return (
    <span
      className={cn(
        'whitespace-nowrap',
        linha.balanceCalculated && 'text-muted-foreground',
      )}
      title={
        linha.balanceCalculated
          ? 'Movimento antigo: o saldo foi calculado a partir do saldo de hoje.'
          : 'Saldo gravado na hora do movimento.'
      }
    >
      {formatarQuantidade(linha.balanceBefore, linha.item.unit)} →{' '}
      <strong className="font-bold text-foreground">
        {formatarQuantidade(linha.balanceAfter, linha.item.unit)}
      </strong>
    </span>
  )
}

function Quantidade({ linha }: { linha: StockHistoryRow }) {
  const entrou = linha.delta > 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap font-bold',
        entrou
          ? 'text-emerald-700 dark:text-emerald-400'
          : 'text-rose-700 dark:text-rose-400',
      )}
    >
      {entrou ? (
        <ArrowUp className="h-4 w-4" aria-hidden />
      ) : (
        <ArrowDown className="h-4 w-4" aria-hidden />
      )}
      {formatarDelta(linha.delta, linha.item.unit)}
    </span>
  )
}

/** Procura de produto ou insumo para o filtro (só no Controle de Estoque). */
function EscolherItem({
  escolhido,
  onEscolher,
}: {
  escolhido: StockItemOption | null
  onEscolher: (item: StockItemOption | null) => void
}) {
  const [texto, setTexto] = useState('')
  const [busca, setBusca] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setBusca(texto.trim()), 300)
    return () => clearTimeout(t)
  }, [texto])
  const { data: opcoes = [], isFetching } = useQuery({
    queryKey: ['stock-items-search', busca],
    queryFn: () => searchStockItems(busca),
    enabled: busca.length >= 2 || /^\d+$/.test(busca),
  })

  if (escolhido) {
    return (
      <div className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5">
        <span className="min-w-0 flex-1 break-words text-sm font-semibold">
          {escolhido.code ? `${escolhido.code} · ` : ''}
          {escolhido.name}
        </span>
        <Button
          type="button"
          variant="ghost"
          className="h-11 shrink-0"
          onClick={() => onEscolher(null)}
          aria-label="Tirar o filtro do produto"
        >
          <X className="h-4 w-4" aria-hidden />
          Todos os itens
        </Button>
      </div>
    )
  }

  return (
    <div className="relative min-w-0">
      <label
        htmlFor="historico-produto"
        className="mb-1 block text-sm font-semibold"
      >
        Produto ou insumo
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="historico-produto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Nome ou código"
          className="h-11 pl-9 text-base"
          autoComplete="off"
        />
      </div>
      {busca && (opcoes.length > 0 || isFetching) && (
        <ul
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border bg-background shadow-lg"
          role="listbox"
        >
          {isFetching && opcoes.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">Procurando...</li>
          )}
          {opcoes.map((o) => (
            <li key={`${o.type}-${o.id}`}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                onClick={() => {
                  onEscolher(o)
                  setTexto('')
                }}
              >
                <span className="min-w-0 break-words">
                  <span className="font-semibold">
                    {o.code ? `${o.code} · ` : ''}
                    {o.name}
                  </span>
                  <span className="text-muted-foreground">
                    {' '}
                    · {o.type === 'SUPPLY' ? 'insumo' : 'produto'}
                    {o.active ? '' : ' inativo'}
                  </span>
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {formatarQuantidade(o.currentStock, o.unit)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {busca &&
        !isFetching &&
        opcoes.length === 0 &&
        (busca.length >= 2 || /^\d+$/.test(busca)) && (
          <p className="mt-1 text-sm text-muted-foreground">
            Nenhum produto ou insumo com esse nome.
          </p>
        )}
    </div>
  )
}

interface HistoricoDoEstoqueProps {
  /** Produto ou insumo fixo (aba Histórico da ficha do produto). */
  itemId?: string
  /** Item escolhido de fora (o botão "Histórico" da Posição de Estoque). */
  itemInicial?: string | null
  via?: ViaDoHistorico
  /** Período inicial: "Hoje" no Controle de Estoque; "Tudo" na ficha do produto. */
  periodoInicial?: string
  onItemChange?: (itemId: string | null) => void
}

export function HistoricoDoEstoque({
  itemId,
  itemInicial,
  via = 'stock',
  periodoInicial,
  onItemChange,
}: HistoricoDoEstoqueProps) {
  const fixo = !!itemId
  const [periodo, setPeriodo] = useState(
    periodoInicial ?? (fixo || itemInicial ? 'all' : 'today'),
  )
  const [tipo, setTipo] = useState<'TODOS' | TipoDoHistorico>('TODOS')
  const [pagina, setPagina] = useState(1)
  const [itemEscolhido, setItemEscolhido] = useState<StockItemOption | null>(
    null,
  )
  const [idDoFiltro, setIdDoFiltro] = useState<string | null>(
    itemInicial ?? null,
  )
  const [origem, setOrigem] = useState<StockHistoryOrigin | null>(null)
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    setIdDoFiltro(itemInicial ?? null)
    if (itemInicial) setPeriodo('all')
  }, [itemInicial])

  const alvo = itemId ?? idDoFiltro ?? undefined
  const filtros = {
    period: periodo,
    eventType: tipo === 'TODOS' ? undefined : tipo,
    itemId: alvo,
  }
  const POR_PAGINA = 50

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['stock-history', via, filtros, pagina],
    queryFn: () =>
      getStockHistory({ ...filtros, page: pagina, perPage: POR_PAGINA }, via),
    placeholderData: keepPreviousData,
  })

  const linhas = data?.movements ?? []
  const resumo = data?.summary
  const item = data?.item ?? null

  const mudarFiltro = (f: () => void) => {
    f()
    setPagina(1)
  }

  const escolherItem = (o: StockItemOption | null) =>
    mudarFiltro(() => {
      setItemEscolhido(o)
      setIdDoFiltro(o?.id ?? null)
      if (o) setPeriodo('all')
      onItemChange?.(o?.id ?? null)
    })

  const exportar = async () => {
    setExportando(true)
    try {
      const tudo = await getStockHistory(
        { ...filtros, page: 1, perPage: 5000 },
        via,
      )
      if (tudo.movements.length === 0) {
        toast.info('Nada para exportar neste filtro.')
        return
      }
      baixarCsv(
        `historico-estoque-${new Date().toISOString().slice(0, 10)}.csv`,
        [
          'Data',
          'Hora',
          'Produto ou insumo',
          'Código',
          'Tipo',
          'Quantidade',
          'Unidade',
          'Saldo antes',
          'Saldo depois',
          'Saldo calculado',
          'Quem fez',
          'Detalhe',
          'Custo unitário',
          'Valor',
        ],
        tudo.movements.map((m) => {
          const { data: dia, hora } = formatarDataHora(m.date)
          return [
            dia,
            hora,
            m.item.name,
            m.item.code ?? '',
            m.label,
            numeroNoCsv(m.delta),
            m.item.unit,
            numeroNoCsv(m.balanceBefore),
            numeroNoCsv(m.balanceAfter),
            m.balanceCalculated ? 'sim' : 'não',
            m.who ?? '',
            m.detail,
            numeroNoCsv(m.unitCost),
            numeroNoCsv(m.totalValue),
          ]
        }),
      )
      if (tudo.summary.totalCount > tudo.movements.length) {
        toast.info(
          `Exportados os ${tudo.movements.length.toLocaleString('pt-BR')} movimentos mais recentes de ${tudo.summary.totalCount.toLocaleString('pt-BR')}. Escolha um período menor para o resto.`,
        )
      }
    } catch {
      toast.error('Não foi possível exportar. Tente de novo.')
    } finally {
      setExportando(false)
    }
  }

  const nomeDoPeriodo = PERIODOS.find((p) => p.value === periodo)?.label ?? ''

  return (
    <div className="space-y-4">
      {/* Item do histórico (ficha do produto ou filtro escolhido) */}
      {item && (
        <div className="flex flex-col gap-1 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="break-words text-base font-bold">
              {item.code ? `${item.code} · ` : ''}
              {item.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {item.type === 'SUPPLY' ? 'Insumo' : 'Produto'} · saldo de hoje{' '}
              <strong className="text-foreground">
                {formatarQuantidade(item.currentStock, item.unit)}
              </strong>
            </p>
          </div>
          {item.hasRecipe && (
            <p className="text-sm text-muted-foreground sm:max-w-sm">
              Tem ficha técnica: as vendas baixam os insumos da ficha, não ele.
            </p>
          )}
        </div>
      )}

      {/* Filtros */}
      <div
        className={cn(
          'grid gap-3',
          fixo
            ? 'sm:grid-cols-[minmax(0,14rem)_1fr]'
            : 'md:grid-cols-[minmax(0,1fr)_14rem]',
        )}
      >
        {!fixo && (
          <EscolherItem
            escolhido={
              itemEscolhido ??
              (idDoFiltro && item
                ? {
                    id: item.id,
                    type: item.type,
                    name: item.name,
                    code: item.code,
                    unit: item.unit,
                    currentStock: item.currentStock,
                    active: true,
                  }
                : null)
            }
            onEscolher={escolherItem}
          />
        )}
        <div>
          <label
            htmlFor="historico-periodo"
            className="mb-1 block text-sm font-semibold"
          >
            Período
          </label>
          <Select
            value={periodo}
            onValueChange={(v) => mudarFiltro(() => setPeriodo(v))}
          >
            <SelectTrigger id="historico-periodo" className="h-11 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODOS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Tipo de movimento"
      >
        {TIPOS.map((t) => (
          <button
            key={t.value}
            type="button"
            aria-pressed={tipo === t.value}
            onClick={() => mudarFiltro(() => setTipo(t.value))}
            className={cn(
              'min-h-11 rounded-lg border px-4 text-sm font-semibold transition-colors',
              tipo === t.value
                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                : 'bg-background hover:bg-muted',
            )}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={exportar}
            disabled={exportando || !resumo || resumo.totalCount === 0}
          >
            {exportando ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="h-4 w-4" aria-hidden />
            )}
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Resumo do filtro */}
      {resumo && (
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">
            {resumo.totalCount.toLocaleString('pt-BR')}
          </strong>{' '}
          {resumo.totalCount === 1 ? 'movimento' : 'movimentos'} ·{' '}
          {nomeDoPeriodo.toLowerCase()}
          {resumo.totalEntriesValue !== null &&
            resumo.totalExitsValue !== null &&
            resumo.totalCount > 0 && (
              <>
                {' '}
                · entradas{' '}
                <strong className="text-emerald-700 dark:text-emerald-400">
                  {formatarDinheiro(resumo.totalEntriesValue)}
                </strong>{' '}
                · saídas{' '}
                <strong className="text-rose-700 dark:text-rose-400">
                  {formatarDinheiro(resumo.totalExitsValue)}
                </strong>{' '}
                (a custo)
              </>
            )}
        </p>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border p-8 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Carregando o
          histórico...
        </div>
      ) : isError ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          <span className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4" aria-hidden /> Não foi possível
            carregar o histórico.
          </span>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => refetch()}
          >
            Tentar de novo
          </Button>
        </div>
      ) : linhas.length === 0 ? (
        <div className="rounded-xl border p-8 text-center">
          <p className="text-base font-semibold">
            {alvo && periodo === 'all' && tipo === 'TODOS'
              ? 'Este item ainda não teve movimento de estoque.'
              : 'Nenhum movimento neste filtro.'}
          </p>
          {!(alvo && periodo === 'all') && (
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha outro período ou outro tipo.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Tela larga (1280 px ou mais): tabela; abaixo disso, ou dentro da ficha do produto (janela estreita), cartões */}
          <div
            className={cn(
              'hidden overflow-x-auto rounded-xl border',
              !fixo && 'xl:block',
              isFetching && 'opacity-70',
            )}
          >
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/50 text-sm font-semibold text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Data e hora
                  </th>
                  {!fixo && (
                    <th scope="col" className="px-4 py-3">
                      Produto ou insumo
                    </th>
                  )}
                  <th scope="col" className="px-4 py-3">
                    Tipo
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Quantidade
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Saldo antes → depois
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Quem fez
                  </th>
                  <th scope="col" className="px-4 py-3">
                    De onde veio
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {linhas.map((l) => {
                  const { data: dia, hora } = formatarDataHora(l.date)
                  return (
                    <tr key={l.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="font-semibold">{dia}</span>
                        <span className="block text-muted-foreground">
                          {hora}
                        </span>
                      </td>
                      {!fixo && (
                        <td className="max-w-xs px-4 py-3">
                          <span className="break-words font-semibold">
                            {l.item.name}
                          </span>
                          {l.item.code !== null && (
                            <span className="block text-muted-foreground">
                              Código {l.item.code}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <SeloDoTipo linha={l} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Quantidade linha={l} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Saldo linha={l} />
                      </td>
                      <td className="px-4 py-3">
                        {l.who ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="max-w-sm px-4 py-3">
                        <span className="block break-words">{l.detail}</span>
                        {l.origin && (
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto min-h-11 px-0 text-sm font-semibold"
                            onClick={() => setOrigem(l.origin)}
                          >
                            {l.origin.rotulo}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Celular, tablet e notebook: cartões */}
          <ul
            className={cn(
              'space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0',
              !fixo && 'xl:hidden',
              isFetching && 'opacity-70',
            )}
          >
            {linhas.map((l) => {
              const { data: dia, hora } = formatarDataHora(l.date)
              return (
                <li key={l.id} className="space-y-2 rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <SeloDoTipo linha={l} />
                    <span className="text-sm text-muted-foreground">
                      {dia} · {hora}
                    </span>
                  </div>
                  {!fixo && (
                    <p className="break-words text-base font-semibold">
                      {l.item.name}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <Quantidade linha={l} />
                    <Saldo linha={l} />
                  </div>
                  <p className="break-words text-sm">{l.detail}</p>
                  {l.who && (
                    <p className="text-sm text-muted-foreground">
                      Quem fez: {l.who}
                    </p>
                  )}
                  {l.origin && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full"
                      onClick={() => setOrigem(l.origin)}
                    >
                      {l.origin.rotulo}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>

          {resumo && resumo.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                Página {resumo.page} de {resumo.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={pagina >= resumo.totalPages}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Próxima <ChevronRight className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          )}
          {linhas.some((l) => l.balanceCalculated) && (
            <p className="text-sm text-muted-foreground">
              Saldo em cinza: movimento de antes de 16/10/2026, calculado a
              partir do saldo de hoje.
            </p>
          )}
        </>
      )}

      <OrigemDoMovimentoDialog
        origem={origem}
        via={via}
        onClose={() => setOrigem(null)}
      />
    </div>
  )
}
