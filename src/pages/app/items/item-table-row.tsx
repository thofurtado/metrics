import { Package2, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { ProductItemDialog } from './product-item-dialog'
import { DeleteItemDialog } from './delete-item-dialog'
import { StockAdjustmentDialog } from './stock-adjustment-dialog'

export interface Item {
  id: string
  display_id: number
  name: string
  description: string | null
  cost: number
  price: number
  stock: number | null
  min_stock: number | null
  barcode: string | null
  category: string | null
  active: boolean
  isItem: boolean
}

interface ItemTableRowProps {
  item: Item
}

export function ItemTableRow({ item }: ItemTableRowProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false)

  return (
    <TableRow>
      <TableCell className="font-mono text-xs font-bold text-minsk-950">
        #{item.display_id}
      </TableCell>
      <TableCell>
        {item.isItem ? (
          <span className="rounded bg-minsk-100 px-2 py-1 text-xs font-semibold text-minsk-700">
            Produto
          </span>
        ) : (
          <span className="rounded bg-vida-loca-100 px-2 py-1 text-xs font-semibold text-vida-loca-700">
            Serviço
          </span>
        )}
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex flex-col">
          <span>{item.name}</span>
          {!item.isItem && item.category && (
            <span className="text-[10px] text-muted-foreground uppercase">{item.category}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        {item.isItem ? (
          <span className={Number(item.stock) <= (item.min_stock ?? 0) ? "text-red-500 font-bold" : ""}>
            {item.stock ?? 0}
          </span>
        ) : '-'}
      </TableCell>
      <TableCell>
        {item.price.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}
      </TableCell>
      <TableCell className="text-right space-x-2">
        {item.isItem && (
          <Dialog open={isAdjustStockOpen} onOpenChange={setIsAdjustStockOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-minsk-500 hover:text-minsk-600 hover:bg-minsk-50" title="Ajuste de Estoque">
                <Package2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <StockAdjustmentDialog
              itemId={item.id}
              itemName={item.name}
              onSuccess={() => setIsAdjustStockOpen(false)}
            />
          </Dialog>
        )}

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Editar">
              <Pencil className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <ProductItemDialog
            initialData={item}
            onSuccess={() => setIsEditDialogOpen(false)}
          />
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" title="Excluir">
              <Trash2 className="h-3 w-3" />
            </Button>
          </AlertDialogTrigger>
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