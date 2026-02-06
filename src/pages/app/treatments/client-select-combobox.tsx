import * as React from "react"
import { Check, ChevronsUpDown, Search, User, X } from "lucide-react"

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

interface ClientSelectProps {
    value: string
    onValueChange: (value: string) => void
    clients: {
        id: string
        name: string
        contract: boolean
    }[]
    placeholder?: string
    disabled?: boolean
}

export function ClientSelectCombobox({
    value,
    onValueChange,
    clients = [],
    placeholder = "Selecione o cliente...",
    disabled = false
}: ClientSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")

    const selectedClient = React.useMemo(() =>
        clients.find((client) => client.id === value),
        [clients, value])

    const filteredClients = React.useMemo(() => {
        if (!search) return clients.slice(0, 50) // Limit initial render for performance if list is huge

        // Custom filter logic
        return clients.filter((client) =>
            client.name.toLowerCase().includes(search.toLowerCase())
        ).sort((a, b) => {
            // Priority to contracts
            if (a.contract && !b.contract) return -1
            if (!a.contract && b.contract) return 1
            return a.name.localeCompare(b.name)
        })
    }, [clients, search])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between h-10 px-3 font-normal text-left",
                        !value && "text-muted-foreground",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={disabled}
                >
                    {selectedClient ? (
                        <span className="flex items-center gap-2 truncate">
                            <span className="truncate">{selectedClient.name}</span>
                            {selectedClient.contract && (
                                <span className="shrink-0 text-[10px] bg-vida-loca-100 text-vida-loca-700 dark:bg-vida-loca-900/30 dark:text-vida-loca-300 px-1.5 py-0.5 rounded">
                                    Contrato
                                </span>
                            )}
                        </span>
                    ) : (
                        placeholder
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Buscar cliente..."
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                        <CommandGroup>
                            {filteredClients.map((client) => (
                                <CommandItem
                                    key={client.id}
                                    value={client.id} // Important for selection
                                    onSelect={() => {
                                        onValueChange(client.id)
                                        setOpen(false)
                                        setSearch("") // Reset search on select
                                    }}
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === client.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-1 items-center justify-between overflow-hidden">
                                        <span className="truncate text-sm">{client.name}</span>
                                        {client.contract && (
                                            <span className="shrink-0 ml-2 text-[10px] bg-vida-loca-100 text-vida-loca-700 dark:bg-vida-loca-900/30 dark:text-vida-loca-300 px-1.5 py-0.5 rounded">
                                                Contrato
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
    )
}
