import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"


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
    const wrapperRef = React.useRef<HTMLDivElement>(null)

    // Deduplicate logic
    const uniqueClients = React.useMemo(() => {
        const seen = new Set()
        return clients.filter(client => {
            const duplicate = seen.has(client.id)
            seen.add(client.id)
            return !duplicate
        })
    }, [clients])

    const selectedClient = React.useMemo(() =>
        uniqueClients.find((client) => client.id === value),
        [uniqueClients, value])

    const filteredClients = React.useMemo(() => {
        if (!search) return uniqueClients.slice(0, 50)
        return uniqueClients.filter((client) =>
            client.name.toLowerCase().includes(search.toLowerCase())
        ).sort((a, b) => {
            if (a.contract && !b.contract) return -1
            if (!a.contract && b.contract) return 1
            return a.name.localeCompare(b.name)
        })
    }, [uniqueClients, search])

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
        <div className="relative w-full" ref={wrapperRef}>
            <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={cn(
                    "w-full justify-between h-10 px-3 font-normal text-left",
                    !value && "text-muted-foreground",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
                disabled={disabled}
                onClick={() => setOpen(!open)}
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

            {open && (
                <div className="absolute top-full mt-1 w-full z-[99999] min-w-[200px] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95">
                    <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                        <input
                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Buscar cliente..."
                            autoFocus
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
                        {filteredClients.length === 0 ? (
                            <div className="py-6 text-center text-sm">Nenhum cliente encontrado.</div>
                        ) : (
                            filteredClients.map((client) => (
                                <div
                                    key={client.id}
                                    onClick={() => {
                                        onValueChange(client.id)
                                        setOpen(false)
                                        setSearch("")
                                    }}
                                    className={cn(
                                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                        value === client.id && "bg-accent text-accent-foreground"
                                    )}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === client.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-1 items-center justify-between overflow-hidden">
                                        <span className="truncate">{client.name}</span>
                                        {client.contract && (
                                            <span className="shrink-0 ml-2 text-[10px] bg-vida-loca-100 text-vida-loca-700 dark:bg-vida-loca-900/30 dark:text-vida-loca-300 px-1.5 py-0.5 rounded">
                                                Contrato
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
    )
}
