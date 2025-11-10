// components/items/item-table-row.tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Edit, MoreHorizontal, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { updateItemStatus } from '@/api/update-item-status'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { TableCell, TableRow } from '@/components/ui/table'

export interface Item {
  id: string
  name: string
  description: string | null
  cost: number
  price: number
  stock: number | null
  active: boolean
  isItem: boolean
}

interface ItemTableRowProps {
  item: Item
}

export function ItemTableRow({ item }: ItemTableRowProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const queryClient = useQueryClient()

  const { mutateAsync: updateItemStatusFn } = useMutation({
    mutationFn: updateItemStatus,
    onSuccess: () => {
      toast.success(`Item ${item.active ? 'desativado' : 'ativado'} com sucesso!`)
      queryClient.invalidateQueries({ queryKey: ['items-paginated'] })
    },
  })

  async function handleToggleStatus() {
    await updateItemStatusFn({ id: item.id })
  }

  return (
    <TableRow>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsDetailsOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleStatus} className={item.active ? 'text-red-600' : 'text-green-600'}>
              <Trash2 className="h-4 w-4 mr-2" />
              {item.active ? 'Desativar' : 'Ativar'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
      
      <TableCell className="font-medium">
        <div>
          <span className="font-semibold">{item.name}</span>
          {item.description && (
            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
              {item.description}
            </p>
          )}
        </div>
      </TableCell>
      
      <TableCell className="hidden sm:table-cell">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          item.isItem 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {item.isItem ? 'Produto' : 'Serviço'}
        </span>
      </TableCell>
      
      <TableCell className="text-center font-semibold text-green-600">
        R$ {item.price.toFixed(2)}
      </TableCell>
      
      <TableCell className="hidden sm:table-cell text-muted-foreground">
        R$ {item.cost.toFixed(2)}
      </TableCell>
      
      <TableCell className="hidden sm:table-cell">
        {item.isItem ? (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            (item.stock || 0) > 10 
              ? 'bg-green-100 text-green-800'
              : (item.stock || 0) > 0
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {item.stock || 0} un
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
      
      <TableCell className="hidden sm:table-cell">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          item.active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {item.active ? 'Ativo' : 'Inativo'}
        </span>
      </TableCell>
      
      <TableCell>
        {/* Espaço para ações adicionais se necessário */}
      </TableCell>
    </TableRow>
  )
}