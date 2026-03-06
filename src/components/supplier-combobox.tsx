import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
    const [search, setSearch] = React.useState("")
    const wrapperRef = React.useRef<HTMLDivElement>(null)

    const selectedSupplier = React.useMemo(() =>
        suppliers.find((supplier) => supplier.id === value),
        [suppliers, value])

    const filteredSuppliers = React.useMemo(() => {
        if (!search) return suppliers.slice(0, 50) // limit initial render array to avoid performance hits
        return suppliers.filter((supplier) => {
            const searchLower = search.toLowerCase()
            const nameMatch = supplier.name.toLowerCase().includes(searchLower)
            const docMatch = supplier.document?.toLowerCase().includes(searchLower)
            return nameMatch || docMatch
        }).sort((a, b) => a.name.localeCompare(b.name))
    }, [suppliers, search])

    // Close on click outside
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    return (
        <div className="flex items-center gap-2 w-full" ref={wrapperRef}>
            <div className="relative w-full">
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between font-normal text-left h-10 px-4 py-2",
                        !value && "text-muted-foreground",
                        isLoading && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={isLoading}
                    onClick={() => setOpen(!open)}
                >
                    {selectedSupplier ? (
                        <span className="flex items-center gap-2 truncate">
                            <span className="truncate">{selectedSupplier.name}</span>
                            {selectedSupplier.document && (
                                <span className="text-muted-foreground ml-1 text-xs">
                                    ({selectedSupplier.document})
                                </span>
                            )}
                        </span>
                    ) : (
                        "Selecione um fornecedor..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>

                {open && (
                    <div className="absolute top-full left-0 mt-1 w-[300px] z-[999999] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95">
                        <div className="flex items-center border-b px-3">
                            <input
                                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Buscar por Nome ou Documento..."
                                autoFocus
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
                            {filteredSuppliers.length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">Nenhum fornecedor encontrado.</div>
                            ) : (
                                filteredSuppliers.map((supplier) => (
                                    <div
                                        key={supplier.id}
                                        onClick={() => {
                                            onSelect(supplier.id)
                                            setOpen(false)
                                            setSearch("")
                                        }}
                                        className={cn(
                                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                            value === supplier.id && "bg-accent text-accent-foreground"
                                        )}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4 shrink-0",
                                                value === supplier.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col flex-1 overflow-hidden ml-1">
                                            <span className="truncate leading-tight mb-0.5">{supplier.name}</span>
                                            {supplier.document && (
                                                <span className="truncate text-[10px] text-muted-foreground">
                                                    {supplier.document}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {onQuickAdd && (
                <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    className="shrink-0 h-10 w-10 mt-0"
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
