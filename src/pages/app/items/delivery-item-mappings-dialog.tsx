import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  ChevronsUpDown,
  Link2,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  createDeliveryItemMapping,
  createDeliveryItemMappingsBulk,
  deleteDeliveryItemMapping,
  getDeliveryItemMappings,
  getFood99MenuMappings,
  getPendingDeliveryItemMappings,
} from '@/api/delivery-item-mapping'
import { getProducts } from '@/api/get-products'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface DeliveryItemMappingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ProductPicker({
  onPick,
  disabled,
  label = 'Escolher produto...',
}: {
  onPick: (product: { id: string; name: string }) => void
  disabled?: boolean
  label?: string
}) {
  // Lista simples (sem Popover em portal): dentro do Dialog o portal engolia o clique no produto.
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data, isFetching } = useQuery({
    queryKey: ['products-picker', search],
    queryFn: () => getProducts({ query: search || undefined, perPage: 20 }),
    enabled: open,
  })
  const products = data?.data.products ?? []

  return (
    <div className="relative w-full sm:w-auto">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-11 w-full justify-between rounded-lg text-sm font-semibold sm:w-[200px]"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:w-[360px]">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="h-12 w-full border-b border-slate-200 bg-transparent px-3 text-base outline-none dark:border-slate-700"
          />
          <div className="max-h-64 overflow-y-auto p-1">
            {products.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-slate-500">
                {isFetching ? 'Buscando...' : 'Nenhum produto encontrado.'}
              </p>
            )}
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                className="flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-left text-base hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => {
                  onPick({ id: p.id, name: p.name })
                  setOpen(false)
                  setSearch('')
                }}
              >
                <span className="break-words">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function useVinculo() {
  const queryClient = useQueryClient()
  const link = useMutation({
    mutationFn: createDeliveryItemMapping,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-item-mappings'] })
      toast.success(
        res.fixedOrders > 0
          ? `Vinculado! ${res.fixedOrders} pedido(s) antigo(s) já foram corrigidos.`
          : 'Vinculado! Os próximos pedidos com esse item já vêm ligados sozinhos.',
      )
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Não foi possível vincular.')
    },
  })
  const unlink = useMutation({
    mutationFn: deleteDeliveryItemMapping,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-item-mappings'] })
      toast.success('Vínculo removido.')
    },
    onError: () => toast.error('Não foi possível remover o vínculo.'),
  })
  return { link, unlink }
}

const linha =
  'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800'
const vazio = 'py-6 text-center text-sm font-semibold text-slate-500'

/** Aba iFood: os itens que chegaram em pedidos sem produto (Pendentes) e os vínculos feitos. */
function VinculosIfood({ open }: { open: boolean }) {
  const { link, unlink } = useVinculo()

  const { data: pendingData, isLoading: isLoadingPending } = useQuery({
    queryKey: ['delivery-item-mappings', 'pending', 'IFOOD'],
    queryFn: () => getPendingDeliveryItemMappings('IFOOD'),
    enabled: open,
  })
  const { data: linkedData, isLoading: isLoadingLinked } = useQuery({
    queryKey: ['delivery-item-mappings', 'linked'],
    queryFn: () => getDeliveryItemMappings(),
    enabled: open,
  })

  const pending = pendingData?.pending ?? []
  const linked = (linkedData?.mappings ?? []).filter(
    (m) => m.platform === 'IFOOD',
  )

  return (
    <Tabs defaultValue="pending" className="w-full">
      <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <TabsTrigger value="pending" className="rounded-lg text-sm font-bold">
          Pendentes ({pending.length})
        </TabsTrigger>
        <TabsTrigger value="linked" className="rounded-lg text-sm font-bold">
          Já vinculados ({linked.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="mt-3 space-y-2">
        {isLoadingPending && <p className={vazio}>Carregando...</p>}
        {!isLoadingPending && pending.length === 0 && (
          <p className={vazio}>
            Nenhum item pendente. Todo item que já chegou num pedido do iFood
            está identificado.
          </p>
        )}
        {pending.map((item) => (
          <div key={item.external_code} className={linha}>
            <div className="min-w-0 flex-1 basis-64">
              <span className="break-words text-base font-bold text-slate-800 dark:text-slate-100">
                {item.external_name || 'Item sem nome'}
              </span>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Código {item.external_code} · apareceu em {item.occurrences}{' '}
                {item.occurrences === 1 ? 'pedido' : 'pedidos'}
              </p>
            </div>
            <ProductPicker
              disabled={link.isPending}
              onPick={(product) =>
                link.mutateAsync({
                  platform: 'IFOOD',
                  external_code: item.external_code,
                  product_id: product.id,
                })
              }
            />
          </div>
        ))}
      </TabsContent>

      <TabsContent value="linked" className="mt-3 space-y-2">
        {isLoadingLinked && <p className={vazio}>Carregando...</p>}
        {!isLoadingLinked && linked.length === 0 && (
          <p className={vazio}>Nenhum vínculo do iFood ainda.</p>
        )}
        {linked.map((mapping) => (
          <div key={mapping.id} className={linha}>
            <div className="min-w-0 flex-1 basis-64">
              <span className="break-words text-base font-bold text-slate-800 dark:text-slate-100">
                {mapping.external_name || mapping.external_code}
              </span>
              <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-400">
                → {mapping.product.name}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-lg text-slate-500 hover:text-rose-600"
              title="Remover vínculo"
              aria-label="Remover vínculo"
              onClick={() => unlink.mutateAsync(mapping.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </TabsContent>
    </Tabs>
  )
}

type Filtro99 = 'todos' | 'falta' | 'sugestao' | 'vinculados'

const semAcento = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * Aba 99Food (12/10/2026): o cardápio que a loja tem de fato na 99 (só leitura), item por item, com o produto já vinculado
 * ou a sugestão pelo nome. A loja confirma a sugestão, troca o produto ou confirma todas de uma vez.
 */
function Vinculos99({ open }: { open: boolean }) {
  const queryClient = useQueryClient()
  const { link, unlink } = useVinculo()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro99>('todos')

  const { data, isLoading, error } = useQuery({
    queryKey: ['delivery-item-mappings', 'food99-menu'],
    queryFn: getFood99MenuMappings,
    enabled: open,
    retry: false,
    staleTime: 60_000,
  })

  const bulk = useMutation({
    mutationFn: createDeliveryItemMappingsBulk,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-item-mappings'] })
      toast.success(
        `${res.linked} ${res.linked === 1 ? 'item vinculado' : 'itens vinculados'}` +
          (res.fixedOrders > 0
            ? ` e ${res.fixedOrders} pedido(s) antigo(s) corrigidos.`
            : '.'),
      )
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Não foi possível vincular.'),
  })

  const items = useMemo(() => data?.items ?? [], [data])
  const contagem = useMemo(
    () => ({
      todos: items.length,
      vinculados: items.filter((i) => i.mapping).length,
      sugestao: items.filter((i) => !i.mapping && i.suggestion).length,
      falta: items.filter((i) => !i.mapping).length,
    }),
    [items],
  )
  const visiveis = useMemo(() => {
    const q = semAcento(busca.trim())
    return items.filter((i) => {
      if (filtro === 'vinculados' && !i.mapping) return false
      if (filtro === 'falta' && i.mapping) return false
      if (filtro === 'sugestao' && (i.mapping || !i.suggestion)) return false
      return !q || semAcento(i.item_name).includes(q)
    })
  }, [items, busca, filtro])

  const sugestoes = items.filter((i) => !i.mapping && i.suggestion)
  const vincular = (item: (typeof items)[number], productId: string) =>
    link.mutateAsync({
      platform: '99FOOD',
      external_code: item.external_code,
      product_id: productId,
      external_name: item.item_name,
    })

  if (isLoading)
    return <p className={vazio}>Lendo o cardápio da loja na 99Food...</p>
  if (error) {
    return (
      <p
        className={cn(
          vazio,
          'rounded-xl border border-amber-300 bg-amber-50 px-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
        )}
      >
        {(error as any)?.response?.data?.message ||
          'Não foi possível ler o cardápio da 99Food agora.'}
      </p>
    )
  }

  const filtros: { valor: Filtro99; rotulo: string }[] = [
    { valor: 'todos', rotulo: `Todos (${contagem.todos})` },
    { valor: 'falta', rotulo: `Falta vincular (${contagem.falta})` },
    { valor: 'sugestao', rotulo: `Com sugestão (${contagem.sugestao})` },
    { valor: 'vinculados', rotulo: `Vinculados (${contagem.vinculados})` },
  ]

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Estes são os itens do cardápio da loja na 99Food. O Metrics só lê: nada
        é mudado lá.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar item da 99..."
            className="h-11 w-full rounded-lg border border-slate-200 bg-transparent pl-9 pr-3 text-base outline-none focus:border-rose-400 dark:border-slate-700"
          />
        </div>
        <Button
          type="button"
          className="h-11 rounded-lg font-bold"
          disabled={sugestoes.length === 0 || bulk.isPending}
          onClick={() =>
            bulk.mutateAsync({
              platform: '99FOOD',
              items: sugestoes.map((i) => ({
                external_code: i.external_code,
                product_id: i.suggestion!.id,
                external_name: i.item_name,
              })),
            })
          }
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Confirmar {sugestoes.length}{' '}
          {sugestoes.length === 1 ? 'sugestão' : 'sugestões'}
        </Button>
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filtrar itens"
      >
        {filtros.map((f) => (
          <button
            key={f.valor}
            type="button"
            aria-pressed={filtro === f.valor}
            onClick={() => setFiltro(f.valor)}
            className={cn(
              'min-h-10 rounded-full border px-4 text-sm font-semibold',
              filtro === f.valor
                ? 'border-slate-800 bg-slate-800 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
          >
            {f.rotulo}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {visiveis.length === 0 && (
          <p className={vazio}>Nenhum item neste filtro.</p>
        )}
        {visiveis.map((item) => (
          <div key={item.external_code} className={linha}>
            <div className="min-w-0 flex-1 basis-64">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="break-words text-base font-bold text-slate-800 dark:text-slate-100">
                  {item.item_name}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {brl(item.price)}
                </span>
              </div>
              {item.mapping ? (
                <p className="mt-1 flex items-center gap-1 break-words text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  <Check className="h-4 w-4 shrink-0" />{' '}
                  {item.mapping.product.name}
                </p>
              ) : item.suggestion ? (
                <p className="mt-1 break-words text-sm text-amber-800 dark:text-amber-300">
                  Sugestão:{' '}
                  <span className="font-semibold">{item.suggestion.name}</span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Sem vínculo: escolha o produto.
                </p>
              )}
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              {!item.mapping && item.suggestion && (
                <Button
                  type="button"
                  className="h-11 flex-1 rounded-lg font-bold sm:flex-none"
                  disabled={link.isPending}
                  onClick={() => vincular(item, item.suggestion!.id)}
                >
                  <Check className="mr-1 h-4 w-4" /> Confirmar
                </Button>
              )}
              <ProductPicker
                disabled={link.isPending}
                label={
                  item.mapping || item.suggestion
                    ? 'Trocar produto...'
                    : 'Escolher produto...'
                }
                onPick={(product) => vincular(item, product.id)}
              />
              {item.mapping && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-lg text-slate-500 hover:text-rose-600"
                  title="Remover vínculo"
                  aria-label="Remover vínculo"
                  onClick={() => unlink.mutateAsync(item.mapping!.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DeliveryItemMappingsDialog({
  open,
  onOpenChange,
}: DeliveryItemMappingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] overflow-y-auto rounded-3xl p-4 sm:max-w-[960px] sm:p-8">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-2xl font-black tracking-tight">
            <Link2 className="h-5 w-5 text-rose-600" />
            Vínculos com Delivery
          </DialogTitle>
          <DialogDescription className="text-sm font-medium leading-relaxed">
            Diga qual produto do Metrics é cada item do iFood e da 99Food.
            Vincule uma vez: os próximos pedidos com esse item já chegam ligados
            sozinhos.
          </DialogDescription>
        </DialogHeader>

        {/* Uma aba por plataforma (12/10/2026): cada uma com o seu jeito de vincular, sem uma esbarrar na outra. */}
        <Tabs defaultValue="ifood" className="w-full">
          <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <TabsTrigger
              value="ifood"
              className="rounded-lg text-base font-black"
            >
              iFood
            </TabsTrigger>
            <TabsTrigger
              value="99food"
              className="rounded-lg text-base font-black"
            >
              99Food
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ifood" className="mt-4">
            <VinculosIfood open={open} />
          </TabsContent>
          <TabsContent value="99food" className="mt-4">
            <Vinculos99 open={open} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
