import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronsUpDown, Link2, Trash2 } from 'lucide-react'
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data, isFetching } = useQuery({
    queryKey: ['products-picker', search],
    queryFn: () => getProducts({ query: search || undefined, perPage: 20 }),
    enabled: open,
  })
  const products = data?.data.products ?? []

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-[220px] justify-between rounded-lg text-xs font-semibold"
          disabled={disabled}
        >
          Escolher produto...
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar produto..."
            value={search}
            onValueChange={setSearch}
            autoFocus
          />
          <CommandList>
            <CommandEmpty>
              {isFetching ? 'Buscando...' : 'Nenhum produto encontrado.'}
            </CommandEmpty>
            <CommandGroup>
              {products.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.id}
                  onSelect={() => {
                    onPick({ id: p.id, name: p.name })
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  <Check className="mr-2 h-3.5 w-3.5 opacity-0" />
                  <span className="truncate">{p.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl p-6 sm:max-w-[640px]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
            <Link2 className="h-5 w-5 text-rose-600" />
            Vínculos com Delivery
          </DialogTitle>
          <DialogDescription className="text-xs font-medium">
            Sem o cardápio integrado por API, o iFood não sabe qual produto do Metrics cada item
            do pedido é. Vincule uma vez aqui — os próximos pedidos com esse mesmo item já casam
            sozinhos.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <TabsTrigger value="pending" className="rounded-lg text-xs font-bold">
              Pendentes ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="linked" className="rounded-lg text-xs font-bold">
              Já vinculados ({linked.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-3 space-y-2">
            {isLoadingPending && (
              <p className="py-6 text-center text-xs text-slate-400">Carregando...</p>
            )}
            {!isLoadingPending && pending.length === 0 && (
              <p className="py-6 text-center text-xs font-semibold text-slate-400">
                Nenhum item pendente. Todo item que já chegou num pedido está identificado.
              </p>
            )}
            {pending.map((item) => (
              <div
                key={`${item.platform}-${item.external_code}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-slate-200 text-[10px] font-bold uppercase dark:border-slate-700"
                    >
                      {PLATFORM_LABEL[item.platform]}
                    </Badge>
                    <span className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                      {item.external_name || 'Item sem nome'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
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
              <p className="py-6 text-center text-xs text-slate-400">Carregando...</p>
            )}
            {!isLoadingLinked && linked.length === 0 && (
              <p className="py-6 text-center text-xs font-semibold text-slate-400">
                Nenhum vínculo manual ainda.
              </p>
            )}
            {linked.map((mapping) => (
              <div
                key={mapping.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-slate-200 text-[10px] font-bold uppercase dark:border-slate-700"
                    >
                      {PLATFORM_LABEL[mapping.platform]}
                    </Badge>
                    <span className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                      {mapping.external_name || mapping.external_code}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    → {mapping.product.name}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600')}
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
