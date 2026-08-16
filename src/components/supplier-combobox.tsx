import { Check, ChevronsUpDown, Pencil, Plus, Trash2 } from 'lucide-react'
import * as React from 'react'

import { Supplier } from '@/api/get-suppliers'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface SupplierComboboxProps {
  value?: string
  onSelect: (value: string) => void
  suppliers?: Supplier[]
  isLoading?: boolean
  onQuickAdd?: () => void
  onEditInfo?: (supplierId: string) => void
  onDeleteInfo?: (supplierId: string) => void
}

export function SupplierCombobox({
  value,
  onSelect,
  suppliers = [],
  isLoading,
  onQuickAdd,
  onEditInfo,
  onDeleteInfo,
}: SupplierComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const selectedSupplier = React.useMemo(
    () => suppliers.find((supplier) => supplier.id === value),
    [suppliers, value],
  )

  const filteredSuppliers = React.useMemo(() => {
    if (!search) return suppliers.slice(0, 50) // limit initial render array to avoid performance hits
    return suppliers
      .filter((supplier) => {
        const searchLower = search.toLowerCase()
        const nameMatch = supplier.name.toLowerCase().includes(searchLower)
        const docMatch = supplier.document?.toLowerCase().includes(searchLower)
        return nameMatch || docMatch
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [suppliers, search])

  const hasActions =
    (onEditInfo && selectedSupplier) ||
    (onDeleteInfo && selectedSupplier) ||
    !!onQuickAdd

  return (
    <div className="flex w-full flex-col gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'h-12 w-full justify-between rounded-xl border-border/70 bg-background px-4 py-2 text-left text-base font-normal',
              !value && 'text-muted-foreground',
              isLoading && 'cursor-not-allowed opacity-50',
            )}
            disabled={isLoading}
          >
            {selectedSupplier ? (
              <span className="flex items-center gap-2 truncate">
                <span className="truncate">{selectedSupplier.name}</span>
                {selectedSupplier.document && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({selectedSupplier.document})
                  </span>
                )}
              </span>
            ) : (
              'Selecione um fornecedor...'
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start" portal={false}>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar por Nome ou Documento..."
              value={search}
              onValueChange={setSearch}
              autoFocus
            />
            <CommandList>
              <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
              <CommandGroup>
                {filteredSuppliers.map((supplier) => (
                  <CommandItem
                    key={supplier.id}
                    value={supplier.id}
                    onSelect={() => {
                      onSelect(supplier.id)
                      setOpen(false)
                      setSearch('')
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        value === supplier.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <div className="flex flex-col overflow-hidden">
                      <span className="mb-0.5 truncate leading-tight">
                        {supplier.name}
                      </span>
                      {supplier.document && (
                        <span className="truncate text-[10px] text-muted-foreground">
                          {supplier.document}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* ── Botões de ação ficam numa linha separada abaixo do trigger ── */}
      {hasActions && (
        <div className="flex items-center gap-1.5">
          {onEditInfo && selectedSupplier && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="h-7 gap-1.5 rounded-lg border-border/60 px-2.5 text-xs font-medium text-slate-600 hover:text-foreground dark:text-slate-400"
              onClick={() => onEditInfo(selectedSupplier.id)}
              title="Editar Fornecedor"
              disabled={isLoading}
            >
              <Pencil className="h-3 w-3" />
              Editar
            </Button>
          )}

          {onDeleteInfo && selectedSupplier && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="h-7 gap-1.5 rounded-lg border-border/60 px-2.5 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
              onClick={() => onDeleteInfo(selectedSupplier.id)}
              title="Deletar Fornecedor"
              disabled={isLoading}
            >
              <Trash2 className="h-3 w-3" />
              Excluir
            </Button>
          )}

          {/* Spacer empurra o botão de adicionar para a direita */}
          {((onEditInfo && selectedSupplier) ||
            (onDeleteInfo && selectedSupplier) ||
            selectedSupplier) &&
            onQuickAdd && <div className="flex-1" />}

          {selectedSupplier && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="h-7 gap-1.5 rounded-lg border-border/60 px-2.5 text-xs font-medium text-slate-600 hover:text-foreground dark:text-slate-400"
              onClick={() => onSelect('')}
              title="Limpar seleção"
              disabled={isLoading}
            >
              Limpar
            </Button>
          )}

          {onQuickAdd && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="ml-auto h-7 gap-1.5 rounded-lg border-border/60 px-2.5 text-xs font-medium text-slate-600 hover:text-foreground dark:text-slate-400"
              onClick={onQuickAdd}
              title="Novo Fornecedor"
              disabled={isLoading}
            >
              <Plus className="h-3 w-3" />
              Novo
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
