import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronsUpDown, Link2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  createDeliveryItemMapping,
  deleteDeliveryItemMapping,
  DeliveryPlatform,
  getDeliveryItemMappings,
  getPendingDeliveryItemMappings,
} from '@/api/delivery-item-mapping'
import { getProducts } from '@/api/get-products'
import { Badge } from '@/components/ui/badge'
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

const PLATFORM_LABEL: Record<DeliveryPlatform, string> = {
  IFOOD: 'iFood',
  '99FOOD': '99Food',
}

function ProductPicker({
  onPick,
  disabled,
}: {
  onPick: (product: { id: string; name: string }) => void
  disabled?: boolean
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
        className="h-11 w-full justify-between rounded-lg text-sm font-semibold sm:w-[260px]"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        Escolher produto...
        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-full sm:w-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
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

export function DeliveryItemMappingsDialog({
  open,
  onOpenChange,
}: DeliveryItemMappingsDialogProps) {
  const queryClient = useQueryClient()

  const { data: pendingData, isLoading: isLoadingPending } = useQuery({
    queryKey: ['delivery-item-mappings', 'pending'],
    queryFn: () => getPendingDeliveryItemMappings(),
    enabled: open,
  })

  const { data: linkedData, isLoading: isLoadingLinked } = useQuery({
    queryKey: ['delivery-item-mappings', 'linked'],
    queryFn: () => getDeliveryItemMappings(),
    enabled: open,
  })

  const { mutateAsync: linkItem, isPending: isLinking } = useMutation({
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

  const { mutateAsync: unlink } = useMutation({
    mutationFn: deleteDeliveryItemMapping,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-item-mappings'] })
      toast.success('Vínculo removido.')
    },
    onError: () => toast.error('Não foi possível remover o vínculo.'),
  })

  const pending = pendingData?.pending ?? []
  const linked = linkedData?.mappings ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] overflow-y-auto rounded-3xl p-4 sm:max-w-[960px] sm:p-8">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-2xl font-black tracking-tight">
            <Link2 className="h-5 w-5 text-rose-600" />
            Vínculos com Delivery
          </DialogTitle>
          <DialogDescription className="text-sm font-medium leading-relaxed">
            Sem o cardápio integrado por API, o iFood não sabe qual produto do Metrics cada item
            do pedido é. Vincule uma vez aqui — os próximos pedidos com esse mesmo item já casam
            sozinhos.
          </DialogDescription>
        </DialogHeader>

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
            {isLoadingPending && (
              <p className="py-6 text-center text-sm text-slate-500">Carregando...</p>
            )}
            {!isLoadingPending && pending.length === 0 && (
              <p className="py-6 text-center text-sm font-semibold text-slate-500">
                Nenhum item pendente. Todo item que já chegou num pedido está identificado.
              </p>
            )}
            {pending.map((item) => (
              <div
                key={`${item.platform}-${item.external_code}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="min-w-0 flex-1 basis-64">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-slate-300 text-xs font-bold uppercase dark:border-slate-700"
                    >
                      {PLATFORM_LABEL[item.platform]}
                    </Badge>
                    <span className="break-words text-base font-bold text-slate-800 dark:text-slate-100">
                      {item.external_name || 'Item sem nome'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Código {item.external_code} · apareceu em {item.occurrences}{' '}
                    {item.occurrences === 1 ? 'pedido' : 'pedidos'}
                  </p>
                </div>
                <ProductPicker
                  disabled={isLinking}
                  onPick={(product) =>
                    linkItem({
                      platform: item.platform,
                      external_code: item.external_code,
                      product_id: product.id,
                    })
                  }
                />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="linked" className="mt-3 space-y-2">
            {isLoadingLinked && (
              <p className="py-6 text-center text-sm text-slate-500">Carregando...</p>
            )}
            {!isLoadingLinked && linked.length === 0 && (
              <p className="py-6 text-center text-sm font-semibold text-slate-500">
                Nenhum vínculo manual ainda.
              </p>
            )}
            {linked.map((mapping) => (
              <div
                key={mapping.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="min-w-0 flex-1 basis-64">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-slate-300 text-xs font-bold uppercase dark:border-slate-700"
                    >
                      {PLATFORM_LABEL[mapping.platform]}
                    </Badge>
                    <span className="break-words text-base font-bold text-slate-800 dark:text-slate-100">
                      {mapping.external_name || mapping.external_code}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-400">
                    → {mapping.product.name}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-11 w-11 rounded-lg text-slate-500 hover:text-rose-600')}
                  title="Remover vínculo"
                  onClick={() => unlink(mapping.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
