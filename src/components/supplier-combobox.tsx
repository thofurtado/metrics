import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Supplier } from "@/api/get-suppliers"

interface SupplierComboboxProps {
    value?: string
    onSelect: (value: string) => void
    suppliers?: Supplier[]
    isLoading?: boolean
    onQuickAdd?: () => void
}

export function SupplierCombobox({ value, onSelect, suppliers = [], isLoading, onQuickAdd }: SupplierComboboxProps) {
    const [open, setOpen] = React.useState(false)

    const selectedSupplier = suppliers.find((supplier) => supplier.id === value)

    return (
        <div className="flex items-center gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        type="button"
                        aria-expanded={open}
                        className="w-full justify-between"
                        disabled={isLoading}
                    >
                        {value
                            ? selectedSupplier ? (
                                <span className="truncate">
                                    {selectedSupplier.name}
                                    {selectedSupplier.document && <span className="text-muted-foreground ml-1">({selectedSupplier.document})</span>}
                                </span>
                            ) : "Fornecedor não encontrado"
                            : <span className="text-muted-foreground">Selecione um fornecedor...</span>}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent portal={false} className="w-[300px] p-0 z-[9999]" align="start">
                    <Command filter={(value, search) => {
                        // value is the 'value' prop of CommandItem (normalized)
                        const normalizedSearch = search.toLowerCase()
                        const normalizedValue = value.toLowerCase()
                        return normalizedValue.includes(normalizedSearch) ? 1 : 0
                    }}>
                        <CommandInput placeholder="Buscar por Nome ou Documento..." onPointerDown={(e) => e.stopPropagation()} />
                        <CommandList>
                            <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                            <CommandGroup>
                                {suppliers.map((supplier) => (
                                    <CommandItem
                                        key={supplier.id}
                                        value={`${supplier.name} ${supplier.document ?? ''}`} // Searchable content
                                        onSelect={() => {
                                            onSelect(supplier.id)
                                            setOpen(false)
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === supplier.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col">
                                            <span>{supplier.name}</span>
                                            {supplier.document && <span className="text-xs text-muted-foreground">{supplier.document}</span>}
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            {onQuickAdd && (
                <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    className="shrink-0 h-10 w-10"
                    onClick={onQuickAdd}
                    title="Novo Fornecedor"
                    disabled={isLoading}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            )}
        </div>
    )
}
