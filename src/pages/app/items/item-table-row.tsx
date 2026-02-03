import { Package2, Pencil, Trash2, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { Dialog } from '@/components/ui/dialog'
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

  return (
    <TableRow>
      {(activeTabType === 'PRODUCT' || activeTabType === 'SERVICE') && (
        <TableCell className="font-mono text-xs font-bold text-muted-foreground hidden sm:table-cell w-[80px]">
          #{displayId ?? '-'}
        </TableCell>
      )}

      <TableCell className="font-medium">
        <div className="flex flex-col max-w-[150px] sm:max-w-[300px]">
          <span className="truncate" title={item.name}>{item.name}</span>
          {item.category && (
            <span className="text-[10px] text-muted-foreground uppercase truncate">
              {typeof item.category === 'string' ? item.category : item.category.name}
            </span>
          )}
          {/* Mobile Only ID */}
          {(activeTabType === 'PRODUCT' || activeTabType === 'SERVICE') && (
            <span className="text-[10px] text-zinc-400 sm:hidden">#{displayId}</span>
          )}
        </div>
      </TableCell>

      {/* Tab Specific Columns */}
      {activeTabType === 'PRODUCT' && (
        <>
          <TableCell className="text-center w-[100px]">
            <Badge variant={isLowStock ? "destructive" : "secondary"} className="whitespace-nowrap">
              {stock ?? 0}
            </Badge>
          </TableCell>
          <TableCell className="w-[120px]">
            {(item.product?.cost ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </TableCell>
          <TableCell className="w-[120px]">
            {(price ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </TableCell>
          <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
            {item.product?.barcode || '-'}
          </TableCell>
        </>
      )}

      {activeTabType === 'SERVICE' && (
        <>
          <TableCell className="hidden sm:table-cell">
            {item.service?.estimated_time || '-'}
          </TableCell>
          <TableCell>
            {(price ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </TableCell>
        </>
      )}

      {activeTabType === 'SUPPLY' && (
        <>
          <TableCell className="text-center w-[100px]">
            <span className="font-medium">{stock ?? 0}</span>
            <span className="text-xs text-muted-foreground ml-1 sm:hidden">{item.supply?.unit}</span>
          </TableCell>
          <TableCell>
            {(item.supply?.cost ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </TableCell>
          <TableCell className="hidden sm:table-cell">
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

            {isStockable && (
              <DropdownMenuItem onClick={() => setIsAdjustStockOpen(true)}>
                <Package2 className="mr-2 h-4 w-4" />
                Ajustar Estoque
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600 focus:text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dialogs - Conditional Rendering controlled by state */}
        {isStockable && (
          <Dialog open={isAdjustStockOpen} onOpenChange={setIsAdjustStockOpen}>
            <StockAdjustmentDialog
              itemId={item.id}
              itemName={item.name}
              onSuccess={() => setIsAdjustStockOpen(false)}
            />
          </Dialog>
        )}

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <ProductItemDialog
            initialData={item as any}
            onSuccess={() => setIsEditDialogOpen(false)}
          />
        </Dialog>

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
