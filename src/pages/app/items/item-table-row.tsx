import { Package2, Pencil, Trash2, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { AlertDialog } from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProductItemDialog } from './product-item-dialog'
import { DeleteItemDialog } from './delete-item-dialog'
import { StockAdjustmentDialog } from './stock-adjustment-dialog'
import { GetItemsResponse } from '@/api/get-items'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Use the type from the API response
type Item = GetItemsResponse['items'][0]
type ItemType = 'PRODUCT' | 'SERVICE' | 'SUPPLY'

interface ItemTableRowProps {
  item: Item
  activeTabType: ItemType
}

export function ItemTableRow({ item, activeTabType }: ItemTableRowProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false)

  const isStockable = activeTabType === 'PRODUCT' || activeTabType === 'SUPPLY'
  const displayId = activeTabType === 'PRODUCT' ? item.product?.display_id : activeTabType === 'SERVICE' ? item.service?.display_id : null
  const price = activeTabType === 'PRODUCT' ? item.product?.price : activeTabType === 'SERVICE' ? item.service?.price : 0
  const stock = activeTabType === 'PRODUCT' ? item.product?.stock : activeTabType === 'SUPPLY' ? item.supply?.stock : 0
  const minStock = activeTabType === 'PRODUCT' ? item.product?.min_stock : null
  const isLowStock = (stock ?? 0) <= (minStock ?? 0)

  // DEBUG: Inspect item structure
  if (activeTabType === 'PRODUCT') {
    console.log(`[ItemTableRow] Product: ${item.name}`, item)
  }

  return (
    <TableRow className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors border-slate-100 dark:border-slate-800">
      {(activeTabType === 'PRODUCT' || activeTabType === 'SERVICE') && (
        <TableCell className="font-medium text-[11px] text-slate-400 font-mono hidden sm:table-cell pl-8 py-5">
          #{displayId ?? '-'}
        </TableCell>
      )}

      <TableCell className="py-5 pl-6">
        <div className="flex flex-col max-w-[150px] sm:max-w-[300px] gap-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight truncate" title={item.name}>
              {item.name}
            </span>
            {/* Visual Indicator for Composite Products */}
            {activeTabType === 'PRODUCT' && item.product?.is_composite && (
              <Badge variant="outline" className="text-[9px] h-4.5 font-bold uppercase tracking-tighter bg-indigo-50 text-indigo-600 border-indigo-100 rounded-lg">
                Composto
              </Badge>
            )}
          </div>
          {item.category && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
              {typeof item.category === 'string' ? item.category : item.category.name}
            </span>
          )}
        </div>
      </TableCell>

      {/* Tab Specific Columns */}
      {activeTabType === 'PRODUCT' && (
        <>
          <TableCell className="text-center py-5">
            {item.product?.is_composite ? (
              <Badge className="font-black tabular-nums bg-indigo-600 hover:bg-indigo-700 text-white border-none rounded-lg shadow-sm px-2.5">
                {(() => {
                  const comps = item.product?.compositions || []
                  if (comps.length === 0) return 0

                  const possibleAmounts = comps.map(comp => {
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
                variant={isLowStock ? "destructive" : "secondary"} 
                className={cn(
                  "font-black tabular-nums rounded-lg px-2.5",
                  isLowStock ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-slate-100 text-slate-700 border-none shadow-sm"
                )}
              >
                {stock ?? 0}
              </Badge>
            )}
          </TableCell>
          <TableCell className="py-5 font-medium text-slate-500 tabular-nums">
            {(item.product?.cost ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </TableCell>
          <TableCell className="py-5 font-black text-slate-900 dark:text-slate-50 tabular-nums text-base">
            <span className="text-[10px] font-bold text-slate-400 mr-0.5">R$</span>
            {(price ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </TableCell>
          <TableCell className="hidden md:table-cell text-slate-400 text-[11px] font-mono py-5">
            {item.product?.barcode || '-'}
          </TableCell>
        </>
      )}

      {activeTabType === 'SERVICE' && (
        <>
          <TableCell className="hidden sm:table-cell py-5 text-slate-500 font-medium tracking-tight">
            {item.service?.estimated_time || '-'}
          </TableCell>
          <TableCell className="py-5 font-black text-slate-900 dark:text-slate-50 tabular-nums text-base">
            <span className="text-[10px] font-bold text-slate-400 mr-0.5">R$</span>
            {(price ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </TableCell>
        </>
      )}

      {activeTabType === 'SUPPLY' && (
        <>
          <TableCell className="text-center py-5">
             <Badge className="font-black tabular-nums bg-slate-100 text-slate-700 border-none rounded-lg px-2.5 shadow-sm">
                {stock ?? 0}
             </Badge>
          </TableCell>
          <TableCell className="py-5 font-black text-slate-900 dark:text-slate-50 tabular-nums text-base">
            <span className="text-[10px] font-bold text-slate-400 mr-0.5">R$</span>
            {(item.supply?.cost ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </TableCell>
          <TableCell className="hidden sm:table-cell py-5 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
            {item.supply?.unit || '-'}
          </TableCell>
        </>
      )}

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
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(item.id)}>
              Copiar ID Interno
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {isStockable && !item.product?.is_composite && (
              <DropdownMenuItem onSelect={(e) => {
                e.preventDefault()
                setIsAdjustStockOpen(true)
              }}>
                <Package2 className="mr-2 h-4 w-4" />
                Ajustar Estoque
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onSelect={(e) => {
              e.preventDefault()
              setIsEditDialogOpen(true)
            }}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={(e) => {
              e.preventDefault()
              setIsDeleteDialogOpen(true)
            }} className="text-red-600 focus:text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>



        {/* Dialogs - Conditional Rendering controlled by state */}
        {isStockable && (
          <ResponsiveDialog open={isAdjustStockOpen} onOpenChange={setIsAdjustStockOpen}>
            <StockAdjustmentDialog
              itemId={item.id}
              itemName={item.name}
              currentCost={item.product?.cost ?? item.supply?.cost}
              onSuccess={() => setIsAdjustStockOpen(false)}
            />
          </ResponsiveDialog>
        )}

        <ResponsiveDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <ProductItemDialog
            initialData={item as any}
            onSuccess={() => setIsEditDialogOpen(false)}
          />
        </ResponsiveDialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
