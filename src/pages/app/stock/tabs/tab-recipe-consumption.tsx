import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowUpRight,
  ChefHat,
  Download,
  Loader2,
  Search,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { getRecipeConsumption, type RecipeConsumptionItem } from '@/api/stock'
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
  formatarDinheiro,
  formatarQuantidade,
  numeroNoCsv,
  PERIODOS,
} from '../components/formatos-do-estoque'

/**
 * Ficha Técnica (etapa 4, 16/10/2026; D8): os insumos que estão numa ficha técnica ou ligados a um complemento e o que as vendas
 * baixaram deles no período, separado pelo produto vendido. Antes a tela mostrava "dados mockados de demonstração" (carne,
 * cheddar, gin) quando a loja não tinha ficha; agora mostra o vazio e o caminho para cadastrar.
 * As quantidades estão na unidade que o insumo tem no cadastro (kg, un, l): como medir os insumos ainda está para decidir.
 */
export function TabRecipeConsumption() {
  const [periodo, setPeriodo] = useState('today')
  const [texto, setTexto] = useState('')
  const [escolhido, setEscolhido] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['stock-recipe-consumption', periodo],
    queryFn: () => getRecipeConsumption({ period: periodo }),
  })

  const insumos = useMemo(() => data?.supplies ?? [], [data])
  const filtrados = useMemo(() => {
    const t = texto.trim().toLowerCase()
    return t ? insumos.filter((s) => s.name.toLowerCase().includes(t)) : insumos
  }, [insumos, texto])
  const ativo: RecipeConsumptionItem | null =
    filtrados.find((s) => s.id === escolhido) ?? filtrados[0] ?? null
  const nomeDoPeriodo =
    PERIODOS.find((p) => p.value === periodo)?.label.toLowerCase() ?? ''
  const semFicha =
    !!data && data.recipesCount === 0 && data.linkedOptionsCount === 0

  const exportar = () => {
    const linhas = insumos.flatMap((s) =>
      s.byProduct.map((p) => [
        s.name,
        s.unit,
        p.productName,
        numeroNoCsv(p.itemsSold),
        numeroNoCsv(p.quantity),
        numeroNoCsv(p.cost),
        numeroNoCsv(p.percentage),
      ]),
    )
    if (linhas.length === 0) {
      toast.info('Nenhuma baixa de insumo neste período.')
      return
    }
    baixarCsv(
      `ficha-tecnica-consumo-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        'Insumo',
        'Unidade',
        'Produto vendido',
        'Itens vendidos',
        'Baixado',
        'Custo (R$)',
        '% do insumo',
      ],
      linhas,
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight">Ficha técnica</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            O que as vendas baixaram de cada insumo e por qual produto.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label
              htmlFor="ficha-periodo"
              className="mb-1 block text-sm font-semibold"
            >
              Período
            </label>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger id="ficha-periodo" className="h-11 w-44 text-base">
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
          <Button
            variant="outline"
            className="h-11"
            onClick={exportar}
            disabled={!data || insumos.length === 0}
          >
            <Download className="h-4 w-4" aria-hidden />
            Exportar CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border p-8 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Carregando...
        </div>
      ) : isError ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          <span className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4" aria-hidden /> Não foi possível
            carregar a ficha técnica.
          </span>
          <Button variant="outline" className="h-11" onClick={() => refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : semFicha && insumos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border p-8 text-center">
          <ChefHat className="h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="text-lg font-bold">Nenhuma ficha técnica cadastrada</p>
          <p className="max-w-xl text-sm text-muted-foreground">
            Produto com ficha técnica: cada venda baixa os insumos da ficha. Sem
            ficha, a venda baixa o próprio produto. Para cadastrar: Mercadorias
            › abra o produto › aba Complementos & Ficha.
          </p>
          <Button
            asChild
            className="h-11 bg-emerald-600 font-bold text-white hover:bg-emerald-700"
          >
            <Link to="/items">
              Abrir Mercadorias
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Insumos */}
          <div className="space-y-3 lg:col-span-4">
            <div className="relative">
              <label htmlFor="ficha-busca" className="sr-only">
                Procurar insumo
              </label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="ficha-busca"
                placeholder="Procurar insumo"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                className="h-11 pl-9 pr-10 text-base"
              />
              {texto && (
                <button
                  type="button"
                  onClick={() => setTexto('')}
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                  aria-label="Limpar a procura"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
            <ul className="space-y-2" aria-label="Insumos">
              {filtrados.map((s) => {
                const selecionado = ativo?.id === s.id
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setEscolhido(s.id)}
                      aria-pressed={selecionado}
                      className={cn(
                        'w-full rounded-xl border p-4 text-left transition-colors',
                        selecionado
                          ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600 dark:bg-emerald-950/20'
                          : 'bg-background hover:bg-muted',
                      )}
                    >
                      <p className="break-words font-semibold">
                        {s.name}
                        {s.active ? '' : ' (inativo)'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Saldo {formatarQuantidade(s.currentStock, s.unit)} ·
                        baixado {formatarQuantidade(s.consumed, s.unit)}
                      </p>
                    </button>
                  </li>
                )
              })}
              {filtrados.length === 0 && (
                <li className="text-sm text-muted-foreground">
                  Nenhum insumo com esse nome.
                </li>
              )}
            </ul>
          </div>

          {/* Detalhe do insumo */}
          <div className="space-y-4 lg:col-span-8">
            {ativo && (
              <>
                <div className="rounded-xl border p-4">
                  <p className="break-words text-xl font-bold">{ativo.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {ativo.category} · custo {formatarDinheiro(ativo.unitCost)}{' '}
                    por {ativo.unit}
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-sm text-muted-foreground">
                        Saldo de hoje
                      </p>
                      <p
                        className={cn(
                          'text-xl font-black',
                          ativo.currentStock <= 0 &&
                            'text-rose-700 dark:text-rose-400',
                        )}
                      >
                        {formatarQuantidade(ativo.currentStock, ativo.unit)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-sm text-muted-foreground">
                        Baixado ({nomeDoPeriodo})
                      </p>
                      <p className="text-xl font-black">
                        {formatarQuantidade(ativo.consumed, ativo.unit)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-sm text-muted-foreground">
                        Custo do baixado
                      </p>
                      <p className="text-xl font-black">
                        {formatarDinheiro(ativo.consumedCost)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <h3 className="mb-2 text-base font-bold">
                    Onde este insumo entra
                  </h3>
                  {ativo.usedIn.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Em nenhuma ficha nem complemento hoje (as baixas são de
                      antes).
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {ativo.usedIn.map((u) => (
                        <li
                          key={`${u.kind}-${u.id}`}
                          className="flex flex-wrap justify-between gap-2 py-2 text-sm"
                        >
                          <span className="min-w-0 break-words">
                            <span className="font-semibold">{u.name}</span>
                            <span className="text-muted-foreground">
                              {' '}
                              ·{' '}
                              {u.kind === 'FICHA'
                                ? 'ficha técnica'
                                : `complemento${u.group ? ` (${u.group})` : ''}`}
                              {u.active ? '' : ' · inativo'}
                            </span>
                          </span>
                          <span className="font-semibold">
                            {formatarQuantidade(u.dose, ativo.unit)} por unidade
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border">
                  <h3 className="border-b p-4 text-base font-bold">
                    Quem baixou ({nomeDoPeriodo})
                  </h3>
                  {ativo.byProduct.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">
                      Nenhuma venda baixou este insumo no período.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {ativo.byProduct.map((p) => (
                        <li
                          key={p.productId ?? p.productName}
                          className="grid gap-1 p-4 text-sm sm:grid-cols-[minmax(0,1fr)_8rem_9rem_7rem] sm:items-center"
                        >
                          <span className="break-words font-semibold">
                            {p.productName}
                          </span>
                          <span className="text-muted-foreground sm:text-right">
                            {formatarQuantidade(p.itemsSold)} vendidos
                          </span>
                          <span className="font-semibold sm:text-right">
                            {formatarQuantidade(p.quantity, ativo.unit)} (
                            {p.percentage}%)
                          </span>
                          <span className="sm:text-right">
                            {formatarDinheiro(p.cost)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Quantidades na unidade do insumo ({ativo.unit}). Estorno de
                  venda cancelada volta e sai da conta.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
