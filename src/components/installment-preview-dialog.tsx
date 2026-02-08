import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { format, addMonths, addWeeks, addYears } from "date-fns"
import { ptBR } from "date-fns/locale"
import { TrendingDown, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    ResponsiveDialogClose,
    ResponsiveDialogDescription
} from "@/components/ui/responsive-dialog"
import { useMediaQuery } from "@/hooks/use-media-query"

export interface InstallmentItem {
    installmentNumber: number
    date: Date
    amount: number
}

interface InstallmentPreviewDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    totalAmount: number
    installmentsCount: number
    frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY'
    startDate: Date
    variant?: 'expense' | 'income'
    onConfirm: (installments: InstallmentItem[]) => void
}

export function InstallmentPreviewDialog({
    open,
    onOpenChange,
    totalAmount,
    installmentsCount,
    frequency,
    startDate,
    variant = 'expense',
    onConfirm
}: InstallmentPreviewDialogProps) {
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const [installments, setInstallments] = useState<InstallmentItem[]>([])

    // Theme Colors based on variant
    const theme = variant === 'expense' ? {
        text: 'text-red-600 dark:text-red-500',
        bg: 'bg-red-50 dark:bg-red-950/20',
        border: 'border-red-100 dark:border-red-900/30',
        subText: 'text-red-600/70',
        icon: TrendingDown,
        accent: 'bg-red-600 hover:bg-red-700',
        softAccent: 'bg-red-100 text-red-700',
    } : {
        text: 'text-emerald-600 dark:text-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-950/20',
        border: 'border-emerald-100 dark:border-emerald-900/30',
        subText: 'text-emerald-600/70',
        icon: TrendingUp,
        accent: 'bg-emerald-600 hover:bg-emerald-700',
        softAccent: 'bg-emerald-100 text-emerald-700',
    }

    // Initialize installments
    useEffect(() => {
        if (open && totalAmount > 0 && installmentsCount > 0) {
            generateInitialInstallments()
        }
    }, [open, totalAmount, installmentsCount, frequency, startDate])

    function generateInitialInstallments() {
        const baseValue = Math.floor((totalAmount / installmentsCount) * 100) / 100
        const totalBase = baseValue * installmentsCount
        const remainder = Number((totalAmount - totalBase).toFixed(2))

        const newInstallments: InstallmentItem[] = []
        let currentDate = new Date(startDate)

        for (let i = 1; i <= installmentsCount; i++) {
            let amount = baseValue
            if (i === 1) amount += remainder

            newInstallments.push({
                installmentNumber: i,
                date: new Date(currentDate),
                amount: Number(amount.toFixed(2))
            })

            if (frequency === 'MONTHLY') currentDate = addMonths(currentDate, 1)
            else if (frequency === 'WEEKLY') currentDate = addWeeks(currentDate, 1)
            else if (frequency === 'YEARLY') currentDate = addYears(currentDate, 1)
        }
        setInstallments(newInstallments)
    }

    function handleAmountChange(index: number, newAmountStr: string) {
        const newAmount = parseFloat(newAmountStr)
        if (isNaN(newAmount)) return

        const updatedInstallments = [...installments]
        updatedInstallments[index].amount = newAmount

        // Smart Rebalancing
        let sumPrev = 0
        for (let i = 0; i <= index; i++) sumPrev += updatedInstallments[i].amount

        const remainingTotal = totalAmount - sumPrev
        const remainingCount = installmentsCount - (index + 1)

        if (remainingCount > 0) {
            const perInstallment = remainingTotal / remainingCount
            const baseDist = Math.floor(perInstallment * 100) / 100
            let currentDistributed = 0

            for (let j = index + 1; j < installmentsCount; j++) {
                if (j === installmentsCount - 1) {
                    updatedInstallments[j].amount = Number((totalAmount - (sumPrev + currentDistributed)).toFixed(2))
                } else {
                    updatedInstallments[j].amount = baseDist
                    currentDistributed += baseDist
                }
            }
        }
        setInstallments(updatedInstallments)
    }

    function handleDateChange(index: number, newDate: Date | undefined) {
        if (!newDate) return
        const updated = [...installments]
        updated[index].date = newDate
        setInstallments(updated)
    }

    const currentTotal = installments.reduce((acc, curr) => acc + curr.amount, 0)
    const diff = currentTotal - totalAmount
    const isValid = Math.abs(diff) <= 0.02
    const Icon = theme.icon

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent className="max-w-2xl flex flex-col h-[90vh] md:h-auto md:max-h-[85vh] p-0 gap-0 overflow-hidden bg-background shadow-2xl">

                {/* HERO HEADER */}
                <ResponsiveDialogHeader className={cn("flex-none p-6 pb-8 text-center border-b relative bg-background", theme.bg)}>
                    <ResponsiveDialogDescription className="sr-only">
                        Resumo do parcelamento para conferência e ajustes finais.
                    </ResponsiveDialogDescription>
                    <div className="mx-auto h-12 w-12 rounded-2xl bg-background/50 flex items-center justify-center mb-4 shadow-sm backdrop-blur-sm">
                        <Icon className={cn("h-6 w-6", theme.text)} />
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold uppercase tracking-widest opacity-60">Valor Total do Contrato</span>
                        <ResponsiveDialogTitle className={cn("text-4xl sm:text-5xl font-bold tracking-tight", theme.text)}>
                            {totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </ResponsiveDialogTitle>
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-2">
                        <span className={cn("px-3 py-1 rounded-full text-xs font-semibold bg-background/60 border shadow-sm", theme.subText)}>
                            {installmentsCount} parcelas {frequency === 'MONTHLY' ? 'mensais' : frequency === 'WEEKLY' ? 'semanais' : 'anuais'}
                        </span>
                    </div>
                </ResponsiveDialogHeader>

                {/* SCROLLABLE LIST */}
                <div className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 space-y-3 pb-20 md:pb-6">
                    <div className="max-w-xl mx-auto space-y-3">
                        {installments.map((inst, idx) => (
                            <div
                                key={inst.installmentNumber}
                                className="group flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-transparent hover:border-border hover:bg-muted/30 transition-all duration-200"
                            >
                                {/* Left: Info */}
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="h-8 w-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold font-mono">
                                        {inst.installmentNumber.toString().padStart(2, '0')}
                                    </div>
                                    <div className="flex flex-col">
                                        <Popover modal={true}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-auto p-0 hover:bg-transparent font-medium text-foreground hover:text-primary justify-start"
                                                >
                                                    {inst.date ? format(inst.date, "dd 'de' MMMM", { locale: ptBR }) : "Definir data"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 z-[10000]" align="start" onInteractOutside={(e) => e.preventDefault()}>
                                                <Calendar
                                                    mode="single"
                                                    selected={inst.date}
                                                    onSelect={(date) => handleDateChange(idx, date)}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">
                                            {inst.date ? format(inst.date, "yyyy") : "-"}
                                        </span>
                                    </div>
                                </div>

                                {/* Right: Amount Input */}
                                <div className="relative w-full sm:w-40">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground/50">R$</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={inst.amount}
                                        onChange={(e) => handleAmountChange(idx, e.target.value)}
                                        className="text-right font-bold text-lg h-12 border-none bg-muted/20 focus-visible:ring-0 focus:bg-muted/50 rounded-lg pl-8 tabular-nums shadow-none transition-all"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* STICKY VALIDATION FOOTER */}
                <div className="flex-none p-4 sm:p-6 border-t bg-background/80 backdrop-blur-lg shadow-[0_-5px_20px_-10px_rgba(0,0,0,0.1)]">
                    <div className="max-w-xl mx-auto flex flex-col sm:flex-row items-center gap-4">

                        {/* Validation Status */}
                        <div className="flex-1 w-full flex items-center justify-between sm:justify-start gap-4 p-3 rounded-lg bg-muted/30">
                            <div className="flex flex-col text-left">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Soma das Parcelas</span>
                                <span className={cn("font-mono font-medium text-sm", isValid ? "text-foreground" : "text-red-600 dark:text-red-400")}>
                                    {currentTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>

                            {isValid ? (
                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 bg-emerald-100 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-xs font-bold">Total Confere</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 px-3 py-1.5 rounded-full">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-xs font-bold">
                                        {diff > 0 ? '+' : ''}{Math.abs(diff).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 w-full sm:w-auto">
                            <ResponsiveDialogClose asChild>
                                <Button variant="ghost" className="flex-1 sm:flex-none h-12 rounded-xl font-medium">Cancelar</Button>
                            </ResponsiveDialogClose>
                            <Button
                                onClick={() => onConfirm(installments)}
                                disabled={!isValid}
                                className={cn("flex-1 sm:flex-none h-12 rounded-xl px-8 font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100", theme.accent)}
                            >
                                Confirmar Parcelas
                            </Button>
                        </div>
                    </div>
                </div>

            </ResponsiveDialogContent>
        </ResponsiveDialog>
    )
}
