import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  adjustStockBalance,
  type AdjustStockPayload,
  createStockSupply,
  getStockOverview,
  type StockOverviewItem,
} from '@/api/stock'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import {
  formatarDataHora,
  formatarQuantidade,
  mensagemDoErro,
} from '../components/formatos-do-estoque'

const SITUACAO: Record<
  StockOverviewItem['situation'],
  { rotulo: string; classe: string }
> = {
  CRITICAL: {
    rotulo: 'Zerado ou negativo',
    classe:
      'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
  },
  WARNING: {
    rotulo: 'Abaixo do mínimo',
    classe:
      'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  },
  NORMAL: {
    rotulo: 'Normal',
    classe:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  },
}

const MOTIVOS = [
  {
    value: 'AJUSTE_POSITIVO',
    label: 'Ajuste (contei e o saldo estava errado)',
  },
  { value: 'QUEBRA', label: 'Quebra / avaria (só diminui)' },
  { value: 'PERDA', label: 'Perda / descarte (só diminui)' },
  { value: 'CONSUMO_INTERNO', label: 'Consumo interno (só diminui)' },
] as const

interface TabStockPositionProps {
  onOpenHistory?: (itemId: string) => void
}

/**
 * Posição de Estoque (etapa 4, 16/10/2026): o saldo de cada produto (sem ficha técnica) e de cada insumo. Antes o estoque mínimo
 * era inventado pela unidade e as categorias eram uma lista fixa de exemplo; agora o mínimo é o do cadastro do produto e as
 * categorias são as que existem. Produto com ficha técnica não aparece: quem baixa nele são os insumos (D8).
 */
export function TabStockPosition({ onOpenHistory }: TabStockPositionProps) {
  const queryClient = useQueryClient()

  const [texto, setTexto] = useState('')
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('Todas')
  const [soAvisos, setSoAvisos] = useState(false)
  const [pagina, setPagina] = useState(1)
  const POR_PAGINA = 50

  useEffect(() => {
    const t = setTimeout(() => {
      setBusca(texto.trim())
      setPagina(1)
    }, 300)
    return () => clearTimeout(t)
  }, [texto])

  // Ajuste
  const [itemDoAjuste, setItemDoAjuste] = useState<StockOverviewItem | null>(
    null,
  )
  const [novoSaldo, setNovoSaldo] = useState('')
  const [motivo, setMotivo] = useState<string>('AJUSTE_POSITIVO')
  const [observacao, setObservacao] = useState('')

  // Novo insumo
  const [criando, setCriando] = useState(false)
  const [nome, setNome] = useState('')
  const [categoriaNova, setCategoriaNova] = useState('Geral')
  const [unidade, setUnidade] = useState('UN')
  const [custo, setCusto] = useState('')
  const [saldoInicial, setSaldoInicial] = useState('')

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['stock-overview', busca, categoria, soAvisos, pagina],
    queryFn: () =>
      getStockOverview({
        query: busca || undefined,
        category: categoria === 'Todas' ? undefined : categoria,
        onlyLowStock: soAvisos,
        page: pagina,
        perPage: POR_PAGINA,
      }),
    placeholderData: keepPreviousData,
    refetchInterval: 60000,
  })

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-overview'] })
    queryClient.invalidateQueries({ queryKey: ['stock-history'] })
    queryClient.invalidateQueries({ queryKey: ['stock-recipe-consumption'] })
  }

  const ajuste = useMutation({
    mutationFn: adjustStockBalance,
    onSuccess: (res) => {
      toast.success(res.message || 'Saldo ajustado.')
      invalidar()
      setItemDoAjuste(null)
    },
    onError: (err: unknown) => {
      toast.error(
        mensagemDoErro(err, 'Não foi possível ajustar o saldo. Tente de novo.'),
      )
    },
  })

  const criacao = useMutation({
    mutationFn: createStockSupply,
    onSuccess: () => {
      toast.success('Insumo cadastrado.')
      invalidar()
      setCriando(false)
      setNome('')
      setCusto('')
      setSaldoInicial('')
    },
    onError: (err: unknown) => {
      toast.error(
        mensagemDoErro(
          err,
          'Não foi possível cadastrar o insumo. Tente de novo.',
        ),
      )
    },
  })

  const lerNumero = (v: string) => Number(v.replace(',', '.'))

  const abrirAjuste = (item: StockOverviewItem) => {
    setItemDoAjuste(item)
    setNovoSaldo(String(item.currentStock).replace('.', ','))
    setMotivo('AJUSTE_POSITIVO')
    setObservacao('')
  }

  const confirmarAjuste = () => {
    if (!itemDoAjuste) return
    const n = lerNumero(novoSaldo)
    if (!Number.isFinite(n) || n < 0) {
      toast.error('Digite o saldo contado (zero ou mais).')
      return
    }
    ajuste.mutate({
      targetId: itemDoAjuste.id,
      targetType: itemDoAjuste.type,
      newStock: n,
      reason: motivo as AdjustStockPayload['reason'],
      notes: observacao.trim() || undefined,
    })
  }

  const confirmarCriacao = () => {
    if (nome.trim().length < 2) {
      toast.error('Digite o nome do insumo.')
      return
    }
    criacao.mutate({
      name: nome.trim(),
      category: categoriaNova,
      unit: unidade,
      cost: lerNumero(custo) || 0,
      initialStock: lerNumero(saldoInicial) || 0,
    })
  }

  const itens = data?.items ?? []
  const resumo = data?.summary
  const categorias = data?.categories ?? []

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight">Estoque atual</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {resumo
              ? `${resumo.totalCount.toLocaleString('pt-BR')} itens com saldo próprio · ${resumo.lowStockCount.toLocaleString('pt-BR')} zerados ou abaixo do mínimo`
              : 'Saldo de cada produto e insumo.'}
          </p>
        </div>
        <Button
          className="h-11 gap-2 self-start bg-emerald-600 font-bold text-white hover:bg-emerald-700 sm:self-auto"
          onClick={() => setCriando(true)}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Novo insumo
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_auto] md:items-end">
        <div className="min-w-0">
          <label
            htmlFor="posicao-busca"
            className="mb-1 block text-sm font-semibold"
          >
            Procurar
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="posicao-busca"
              placeholder="Nome, código ou código de barras"
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
        </div>
        <div>
          <label
            htmlFor="posicao-categoria"
            className="mb-1 block text-sm font-semibold"
          >
            Categoria
          </label>
          <Select
            value={categoria}
            onValueChange={(v) => {
              setCategoria(v)
              setPagina(1)
            }}
          >
            <SelectTrigger id="posicao-categoria" className="h-11 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <button
          type="button"
          aria-pressed={soAvisos}
          onClick={() => {
            setSoAvisos(!soAvisos)
            setPagina(1)
          }}
          className={cn(
            'flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors',
            soAvisos
              ? 'border-rose-600 bg-rose-600 text-white'
              : 'bg-background hover:bg-muted',
          )}
        >
          <AlertTriangle className="h-4 w-4" aria-hidden />
          Só zerados ou abaixo do mínimo
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border p-8 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Carregando o
          saldo...
        </div>
      ) : isError ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          <span className="font-semibold">
            Não foi possível carregar o estoque.
          </span>
          <Button variant="outline" className="h-11" onClick={() => refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : itens.length === 0 ? (
        <div className="rounded-xl border p-8 text-center">
          <p className="text-base font-semibold">
            {busca || categoria !== 'Todas' || soAvisos
              ? 'Nenhum item com este filtro.'
              : 'Nenhum produto ou insumo com saldo próprio.'}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            'overflow-hidden rounded-xl border',
            isFetching && 'opacity-70',
          )}
        >
          <ul className="divide-y">
            {itens.map((item) => {
              const s = SITUACAO[item.situation]
              return (
                <li
                  key={`${item.type}-${item.id}`}
                  className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_9rem_8rem_11rem_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="break-words font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.type === 'SUPPLY'
                        ? 'Insumo'
                        : `Produto${item.code !== null ? ` · código ${item.code}` : ''}`}{' '}
                      · {item.category}
                      {item.lastMovement
                        ? ` · último movimento ${formatarDataHora(item.lastMovement).data}`
                        : ''}
                    </p>
                  </div>
                  <div className="md:text-right">
                    <span className="text-sm text-muted-foreground md:hidden">
                      Saldo:{' '}
                    </span>
                    <span
                      className={cn(
                        'text-lg font-black',
                        item.situation === 'CRITICAL' &&
                          'text-rose-700 dark:text-rose-400',
                      )}
                    >
                      {formatarQuantidade(item.currentStock, item.unit)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground md:text-right">
                    Mínimo{' '}
                    {item.minStock !== null
                      ? formatarQuantidade(item.minStock, item.unit)
                      : '—'}
                  </div>
                  <div>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-semibold',
                        s.classe,
                      )}
                    >
                      {s.rotulo}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {onOpenHistory && (
                      <Button
                        variant="outline"
                        className="h-11 gap-1.5"
                        onClick={() => onOpenHistory(item.id)}
                      >
                        <History className="h-4 w-4" aria-hidden />
                        Histórico
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="h-11 gap-1.5"
                      onClick={() => abrirAjuste(item)}
                    >
                      <SlidersHorizontal className="h-4 w-4" aria-hidden />
                      Ajustar
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
          {resumo && (
            <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row">
              <span className="text-sm text-muted-foreground">
                {resumo.filteredCount.toLocaleString('pt-BR')} itens · página{' '}
                {resumo.page} de {resumo.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-11"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Anterior
                </Button>
                <Button
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
        </div>
      )}

      {/* Ajuste de saldo */}
      <Dialog
        open={!!itemDoAjuste}
        onOpenChange={(aberto) => !aberto && setItemDoAjuste(null)}
      >
        <DialogContent className="md:max-w-md">
          <DialogHeader className="px-5 pt-5 md:px-6">
            <DialogTitle>Ajustar saldo</DialogTitle>
            <DialogDescription>
              O ajuste entra no histórico com o seu nome e o motivo.
            </DialogDescription>
          </DialogHeader>
          {itemDoAjuste && (
            <div className="space-y-4 px-5 py-4 md:px-6">
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="break-words font-semibold">{itemDoAjuste.name}</p>
                <p className="text-sm text-muted-foreground">
                  Saldo no sistema:{' '}
                  <strong className="text-foreground">
                    {formatarQuantidade(
                      itemDoAjuste.currentStock,
                      itemDoAjuste.unit,
                    )}
                  </strong>
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ajuste-saldo" className="text-sm font-semibold">
                  Saldo contado ({itemDoAjuste.unit})
                </Label>
                <Input
                  id="ajuste-saldo"
                  inputMode="decimal"
                  value={novoSaldo}
                  onChange={(e) => setNovoSaldo(e.target.value)}
                  className="h-11 text-lg font-bold"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="ajuste-motivo"
                  className="text-sm font-semibold"
                >
                  Motivo
                </Label>
                <Select value={motivo} onValueChange={setMotivo}>
                  <SelectTrigger id="ajuste-motivo" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIVOS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ajuste-obs" className="text-sm font-semibold">
                  Observação (opcional)
                </Label>
                <Input
                  id="ajuste-obs"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="h-11"
                  maxLength={250}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 px-5 pb-5 md:px-6">
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setItemDoAjuste(null)}
            >
              Cancelar
            </Button>
            <Button
              className="h-11 bg-emerald-600 font-bold text-white hover:bg-emerald-700"
              onClick={confirmarAjuste}
              disabled={ajuste.isPending}
            >
              {ajuste.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              Salvar ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Novo insumo */}
      <Dialog open={criando} onOpenChange={setCriando}>
        <DialogContent className="md:max-w-md">
          <DialogHeader className="px-5 pt-5 md:px-6">
            <DialogTitle>Novo insumo</DialogTitle>
            <DialogDescription>
              Matéria-prima que entra nas fichas técnicas e nos complementos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-5 py-4 md:px-6">
            <div className="space-y-1.5">
              <Label htmlFor="insumo-nome" className="text-sm font-semibold">
                Nome
              </Label>
              <Input
                id="insumo-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="h-11"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="insumo-categoria"
                  className="text-sm font-semibold"
                >
                  Categoria
                </Label>
                <Input
                  id="insumo-categoria"
                  value={categoriaNova}
                  onChange={(e) => setCategoriaNova(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="insumo-unidade"
                  className="text-sm font-semibold"
                >
                  Unidade
                </Label>
                <Select value={unidade} onValueChange={setUnidade}>
                  <SelectTrigger id="insumo-unidade" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KG">Quilo (KG)</SelectItem>
                    <SelectItem value="UN">Unidade (UN)</SelectItem>
                    <SelectItem value="L">Litro (L)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="insumo-custo" className="text-sm font-semibold">
                  Custo por unidade (R$)
                </Label>
                <Input
                  id="insumo-custo"
                  inputMode="decimal"
                  value={custo}
                  onChange={(e) => setCusto(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="insumo-saldo" className="text-sm font-semibold">
                  Saldo inicial
                </Label>
                <Input
                  id="insumo-saldo"
                  inputMode="decimal"
                  value={saldoInicial}
                  onChange={(e) => setSaldoInicial(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 px-5 pb-5 md:px-6">
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setCriando(false)}
            >
              Cancelar
            </Button>
            <Button
              className="h-11 bg-emerald-600 font-bold text-white hover:bg-emerald-700"
              onClick={confirmarCriacao}
              disabled={criacao.isPending}
            >
              {criacao.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              Cadastrar insumo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
