
import { Checkbox } from "@/components/ui/checkbox"

interface TransactionTableBulkActionsProps {
    selectedCount: number
    onBulkPay: () => void
    isPending: boolean
    onClearSelection: () => void
}

export function TransactionTableBulkActions({
    selectedCount,
    onBulkPay,
    isPending,
    onClearSelection
}: TransactionTableBulkActionsProps) {
    if (selectedCount === 0) return null

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-popover border shadow-lg rounded-lg p-4 flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in z-50">
            <span className="text-sm font-medium">
                {selectedCount} selecionado(s)
            </span>

            <div className="h-4 w-px bg-border" />

            <button
                onClick={onBulkPay}
                disabled={isPending}
                className="text-sm font-semibold text-green-600 hover:text-green-700 disabled:opacity-50"
            >
                {isPending ? 'Processando...' : 'Dar Baixa em Selecionados'}
            </button>

            <button
                onClick={onClearSelection}
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
                Cancelar
            </button>
        </div>
    )
}
