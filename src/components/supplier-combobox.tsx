import * as React from "react"
import { Check, ChevronsUpDown, Plus, Pencil, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Supplier } from "@/api/get-suppliers"

interface SupplierComboboxProps {
    value?: string
    onSelect: (value: string) => void
    suppliers?: Supplier[]
    isLoading?: boolean
    onQuickAdd?: () => void
    onEditInfo?: (supplierId: string) => void
    onDeleteInfo?: (supplierId: string) => void
}

export function SupplierCombobox({ value, onSelect, suppliers = [], isLoading, onQuickAdd, onEditInfo, onDeleteInfo }: SupplierComboboxProps) {
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

    const hasActions = (onEditInfo && selectedSupplier) || (onDeleteInfo && selectedSupplier) || !!onQuickAdd

    return (
        <div className="flex flex-col gap-1.5 w-full" ref={wrapperRef}>
            {/* ── Combobox trigger ocupa sempre 100% da largura ── */}
            <div className="relative w-full">
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between font-normal text-left h-12 px-4 py-2 rounded-xl border-border/70 bg-background text-base",
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

            {/* ── Botões de ação ficam numa linha separada abaixo do trigger ── */}
            {hasActions && (
                <div className="flex items-center gap-1.5">
                    {onEditInfo && selectedSupplier && (
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            className="h-7 px-2.5 gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-foreground rounded-lg border-border/60"
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
                            className="h-7 px-2.5 gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg border-border/60"
                            onClick={() => onDeleteInfo(selectedSupplier.id)}
                            title="Deletar Fornecedor"
                            disabled={isLoading}
                        >
                            <Trash2 className="h-3 w-3" />
                            Excluir
                        </Button>
                    )}

                    {/* Spacer empurra o botão de adicionar para a direita */}
                    {((onEditInfo && selectedSupplier) || (onDeleteInfo && selectedSupplier) || selectedSupplier) && onQuickAdd && (
                        <div className="flex-1" />
                    )}

                    {selectedSupplier && (
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            className="h-7 px-2.5 gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-foreground rounded-lg border-border/60"
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
                            className="h-7 px-2.5 gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-foreground rounded-lg border-border/60 ml-auto"
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
