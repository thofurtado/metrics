
import { Check, Plus } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

interface QuickAddSelectProps {
    // Select props
    value: string
    onValueChange: (value: string) => void
    options?: { label: string; value: string }[]
    placeholder?: string
    disabled?: boolean
    isLoading?: boolean
    emptyMessage?: string

    // Quick Add props
    quickAddLabel?: string
    quickAddPlaceholder?: string
    onQuickAdd?: (name: string) => Promise<any>
    onQuickAddClick?: () => void
}

export function QuickAddSelect({
    value,
    onValueChange,
    options = [],
    placeholder = "Selecione",
    disabled,
    isLoading,
    emptyMessage = "Nenhum item cadastrado",

    quickAddLabel = "Adicionar Novo",
    quickAddPlaceholder = "Nome do item",
    onQuickAdd,
    onQuickAddClick,
}: QuickAddSelectProps) {
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
    const [newItemName, setNewItemName] = useState("")
    const [isAdding, setIsAdding] = useState(false)

    async function handleQuickAdd() {
        if (!newItemName.trim() || !onQuickAdd) return

        setIsAdding(true)
        try {
            const result = await onQuickAdd(newItemName)

            // Attempt to auto-select the newly created item
            // The parent component is responsible for invalidating queries so options update
            // But we can try to select immediately if an ID is returned
            if (result) {
                if (typeof result === 'string') {
                    onValueChange(result)
                } else if (result.id) {
                    onValueChange(result.id)
                } else if (result.account?.id) {
                    onValueChange(result.account.id)
                } else if (result.sector?.id) {
                    onValueChange(result.sector.id)
                }
            }

            setNewItemName("")
            setIsQuickAddOpen(false)
            toast.success("Item adicionado com sucesso!")
        } catch (error) {
            console.error(error)
            toast.error("Erro ao adicionar item")
        } finally {
            setIsAdding(false)
        }
    }

    return (
        <div className="flex items-center gap-2">
            <Select
                value={value}
                onValueChange={onValueChange}
                disabled={disabled || isLoading}
            >
                <SelectTrigger className="flex-1 h-10">
                    <SelectValue placeholder={isLoading ? "Carregando..." : placeholder} />
                </SelectTrigger>
                <SelectContent withPortal={false}>
                    {options && options.length > 0 ? (
                        options.map((option) => (
                            <SelectItem value={option.value} key={option.value}>
                                {option.label}
                            </SelectItem>
                        ))
                    ) : (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                            {emptyMessage}
                        </div>
                    )}
                </SelectContent>
            </Select>

            {(onQuickAdd || onQuickAddClick) && (
                onQuickAddClick ? (
                    <Button
                        variant="outline"
                        size="icon"
                        disabled={disabled || isLoading}
                        title={quickAddLabel}
                        type="button"
                        className="shrink-0 h-10 w-10"
                        onClick={onQuickAddClick}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                ) : (
                    <Popover modal={true} open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                disabled={disabled || isLoading}
                                title={quickAddLabel}
                                type="button"
                                className="shrink-0 h-10 w-10"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-3 z-[9999]" align="end">
                            <div className="flex flex-col gap-2">
                                <h4 className="font-medium leading-none mb-1 text-sm text-muted-foreground">{quickAddLabel}</h4>
                                <div className="flex gap-2">
                                    <Input
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                        placeholder={quickAddPlaceholder}
                                        className="h-8 text-sm"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault()
                                                handleQuickAdd()
                                            }
                                        }}
                                    />
                                    <Button
                                        size="sm"
                                        type="button"
                                        onClick={handleQuickAdd}
                                        disabled={isAdding || !newItemName.trim()}
                                        className="h-8 w-8 p-0 shrink-0"
                                    >
                                        {isAdding ? <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" /> : <Check className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                )
            )}
        </div>
    )
}
