import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Package2, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { updateItem } from '@/api/update-item'
import { Switch } from '@/components/ui/switch'

import { GetItemsResponse } from '@/api/get-items'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { TableCell, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

import { DeleteItemDialog } from './delete-item-dialog'
import { ProductItemDialog } from './product-item-dialog'
import { StockAdjustmentDialog } from './stock-adjustment-dialog'

// Use the type from the API response
type Item = GetItemsResponse['items'][0]
type ItemType = 'PRODUCT' | 'SERVICE' | 'SUPPLY'

interface ItemTableRowProps {
  item: Item
  activeTabType: ItemType
}

export function ItemTableRow({ item, activeTabType }: ItemTableRowProps) {
  const queryClient = useQueryClient()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false)

  const initialActive = item.active ?? (item.product as any)?.active ?? true
  const initialShowOnMenu = (item.product as any)?.show_on_menu ?? (item as any)?.show_on_menu ?? true

  const [active, setActive] = useState<boolean>(initialActive)
  const [showOnMenu, setShowOnMenu] = useState<boolean>(initialShowOnMenu)

  useEffect(() => {
    setActive(item.active ?? (item.product as any)?.active ?? true)
  }, [item.active, (item.product as any)?.active])

  useEffect(() => {
    setShowOnMenu((item.product as any)?.show_on_menu ?? (item as any)?.show_on_menu ?? true)
  }, [(item.product as any)?.show_on_menu, (item as any)?.show_on_menu])

  const { mutate: toggleStatus, isPending: isUpdatingStatus } = useMutation({
    mutationFn: async (newStatus: boolean) => {
      await updateItem({
        id: item.id,
        active: newStatus,
      })
    },
    onMutate: (newStatus) => {
      setActive(newStatus)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Status atualizado com sucesso!')
    },
    onError: () => {
      setActive(!active)
      toast.error('Erro ao atualizar status.')
    },
  })

  const { mutate: toggleShowOnMenu, isPending: isUpdatingMenu } = useMutation({
    mutationFn: async (newVal: boolean) => {
      await updateItem({
        id: item.id,
        show_on_menu: newVal,
      })
    },
    onMutate: (newVal) => {
      setShowOnMenu(newVal)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Exibição no cardápio atualizada!')
    },
    onError: () => {
      setShowOnMenu(!showOnMenu)
      toast.error('Erro ao atualizar cardápio.')
    },
  })

  const isStockable = activeTabType === 'PRODUCT' || activeTabType === 'SUPPLY'
  const displayId =
    activeTabType === 'PRODUCT'
      ? item.product?.display_id
      : activeTabType === 'SERVICE'
        ? item.service?.display_id
        : null
  const price =
    activeTabType === 'PRODUCT'
      ? item.product?.price
      : activeTabType === 'SERVICE'
        ? item.service?.price
        : 0
  const stock =
    activeTabType === 'PRODUCT'
      ? item.product?.stock
      : activeTabType === 'SUPPLY'
        ? item.supply?.stock
        : 0
  const minStock = activeTabType === 'PRODUCT' ? item.product?.min_stock : null
  const isLowStock = (stock ?? 0) <= (minStock ?? 0)

  return (
    <TableRow className="group border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/50">
      {(activeTabType === 'PRODUCT' || activeTabType === 'SERVICE') && (
        <TableCell className="hidden py-2.5 pl-8 font-mono text-[11px] font-medium text-slate-400 sm:table-cell">
          #{displayId ?? '-'}
        </TableCell>
      )}

      <TableCell className="py-2.5 pl-6">
        <div className="flex max-w-[150px] flex-col gap-1 sm:max-w-[300px]">
          <div className="flex items-center gap-2">
            <span
              className="truncate text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100"
              title={item.name}
            >
              {item.name}
            </span>
            {/* Visual Indicator for Composite Products */}
            {activeTabType === 'PRODUCT' && item.product?.is_composite && (
              <Badge
                variant="outline"
                className="h-4.5 rounded-lg border-indigo-100 bg-indigo-50 text-[9px] font-bold uppercase tracking-tighter text-indigo-600"
              >
                Composto
              </Badge>
            )}
          </div>
          {item.category && (
            <span className="truncate text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {typeof item.category === 'string'
                ? item.category
                : item.category.name}
            </span>
          )}
        </div>
      </TableCell>

      {/* Tab Specific Columns */}
      {activeTabType === 'PRODUCT' && (
        <>
          <TableCell className="py-2.5 text-center">
            {item.product?.is_composite ? (
              <Badge className="rounded-lg border-none bg-indigo-600 px-2.5 font-black tabular-nums text-white shadow-sm hover:bg-indigo-700">
                {(() => {
                  const comps = item.product?.compositions || []
                  if (comps.length === 0) return 0

                  const possibleAmounts = comps.map((comp) => {
                    const supplyStock = comp.supply?.stock || 0
                    const needed = comp.quantity || 0
                    if (needed <= 0) return 0
                    return Math.floor(supplyStock / needed)
                  })

                  return Math.min(...possibleAmounts)
                })()}
              </Badge>
            ) : (
              <Badge
                variant={isLowStock ? 'destructive' : 'secondary'}
                className={cn(
                  'rounded-lg px-2.5 font-black tabular-nums',
                  isLowStock
                    ? 'border-rose-100 bg-rose-50 text-rose-600'
                    : 'border-none bg-slate-100 text-slate-700 shadow-sm',
                )}
              >
                {stock ?? 0}
              </Badge>
            )}
          </TableCell>
          <TableCell className="py-2.5 font-medium tabular-nums text-slate-500">
            {(item.product?.cost ?? 0).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </TableCell>
          <TableCell className="py-2.5 text-base font-black tabular-nums text-slate-900 dark:text-slate-50">
            <span className="mr-0.5 text-[10px] font-bold text-slate-400">
              R$
            </span>
            {(price ?? 0).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </TableCell>
          <TableCell className="hidden py-2.5 font-mono text-[11px] text-slate-400 md:table-cell">
            {item.product?.barcode || '-'}
          </TableCell>
        </>
      )}

      {activeTabType === 'SERVICE' && (
        <>
          <TableCell className="hidden py-2.5 font-medium tracking-tight text-slate-500 sm:table-cell">
            {item.service?.estimated_time || '-'}
          </TableCell>
          <TableCell className="py-2.5 text-base font-black tabular-nums text-slate-900 dark:text-slate-50">
            <span className="mr-0.5 text-[10px] font-bold text-slate-400">
              R$
            </span>
            {(price ?? 0).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </TableCell>
        </>
      )}

      {activeTabType === 'SUPPLY' && (
        <>
          <TableCell className="py-2.5 text-center">
            <Badge className="rounded-lg border-none bg-slate-100 px-2.5 font-black tabular-nums text-slate-700 shadow-sm">
              {stock ?? 0}
            </Badge>
          </TableCell>
          <TableCell className="py-2.5 text-base font-black tabular-nums text-slate-900 dark:text-slate-50">
            <span className="mr-0.5 text-[10px] font-bold text-slate-400">
              R$
            </span>
            {(item.supply?.cost ?? 0).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </TableCell>
          <TableCell className="hidden py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:table-cell">
            {item.supply?.unit || '-'}
          </TableCell>
        </>
      )}

      {activeTabType === 'PRODUCT' && (
        <TableCell className="py-2.5 text-center">
          <div className="flex items-center justify-center">
            <Switch
              checked={showOnMenu}
              disabled={isUpdatingMenu}
              onCheckedChange={(checked) => toggleShowOnMenu(checked)}
              aria-label="Exibir no cardápio"
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>
        </TableCell>
      )}

      <TableCell className="py-2.5 text-center">
        <div className="flex items-center justify-center">
          <Switch
            checked={active}
            disabled={isUpdatingStatus}
            onCheckedChange={(checked) => toggleStatus(checked)}
            aria-label="Status do item"
            className="data-[state=checked]:bg-blue-600"
          />
        </div>
      </TableCell>

      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(item.id)}
            >
              Copiar ID Interno
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {isStockable && !item.product?.is_composite && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  setIsAdjustStockOpen(true)
                }}
              >
                <Package2 className="mr-2 h-4 w-4" />
                Ajustar Estoque
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                setIsEditDialogOpen(true)
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                setIsDeleteDialogOpen(true)
              }}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dialogs - Conditional Rendering controlled by state */}
        {isStockable && (
          <ResponsiveDialog
            open={isAdjustStockOpen}
            onOpenChange={setIsAdjustStockOpen}
          >
            <StockAdjustmentDialog
              itemId={item.id}
              itemName={item.name}
              currentCost={item.product?.cost ?? item.supply?.cost}
              onSuccess={() => setIsAdjustStockOpen(false)}
            />
          </ResponsiveDialog>
        )}

        <ResponsiveDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        >
          <ProductItemDialog
            initialData={item as any}
            onSuccess={() => setIsEditDialogOpen(false)}
          />
        </ResponsiveDialog>

        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <DeleteItemDialog
            id={item.id}
            name={item.name}
            onSuccess={() => setIsDeleteDialogOpen(false)}
          />
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}
