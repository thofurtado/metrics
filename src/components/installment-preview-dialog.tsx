
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { format, addMonths, addWeeks, addYears } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, RefreshCw, Calendar as CalendarIconLucide } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    ResponsiveDialogDescription,
    ResponsiveDialogFooter,
    ResponsiveDialogClose
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
    onConfirm: (installments: InstallmentItem[]) => void
}

export function InstallmentPreviewDialog({
    open,
    onOpenChange,
    totalAmount,
    installmentsCount,
    frequency,
    startDate,
    onConfirm
}: InstallmentPreviewDialogProps) {
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const [installments, setInstallments] = useState<InstallmentItem[]>([])

    // Initialize installments on open or when dependencies change
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
            if (i === 1) amount += remainder // Add remainder to first installment

            newInstallments.push({
                installmentNumber: i,
                date: new Date(currentDate),
                amount: Number(amount.toFixed(2))
            })

            // Increment date
            if (frequency === 'MONTHLY') {
                currentDate = addMonths(currentDate, 1)
            } else if (frequency === 'WEEKLY') {
                currentDate = addWeeks(currentDate, 1)
            } else if (frequency === 'YEARLY') {
                currentDate = addYears(currentDate, 1)
            }
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
        for (let i = 0; i <= index; i++) {
            sumPrev += updatedInstallments[i].amount
        }

        const remainingTotal = totalAmount - sumPrev
        const remainingCount = installmentsCount - (index + 1)

        if (remainingCount > 0) {
            const perInstallment = remainingTotal / remainingCount
            let currentDistributed = 0
            const baseDist = Math.floor(perInstallment * 100) / 100

            for (let j = index + 1; j < installmentsCount; j++) {
                if (j === installmentsCount - 1) {
                    const currentSum = sumPrev + currentDistributed
                    updatedInstallments[j].amount = Number((totalAmount - currentSum).toFixed(2))
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

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent className="max-w-3xl flex flex-col max-h-[90vh]">
                <ResponsiveDialogHeader className="flex-none">
                    <ResponsiveDialogTitle>Prévia de Parcelamento</ResponsiveDialogTitle>
                    <ResponsiveDialogDescription>
                        Revise e ajuste as parcelas. O sistema recalcula automaticamente.
                    </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>

                <div className="flex-none py-4 border-b">
                    <div className="flex justify-between text-sm bg-muted/30 p-3 rounded-md">
                        <div>
                            <span className="text-muted-foreground mr-1">Total Esperado:</span>
                            <strong>{totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                        </div>
                        <div className={cn(
                            "font-bold",
                            Math.abs(diff) > 0.02 ? "text-red-500" : "text-green-600"
                        )}>
                            Soma: {currentTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            {Math.abs(diff) > 0.02 && (
                                <span className="ml-1 text-xs px-1 rounded bg-red-100 dark:bg-red-900/30">
                                    {diff > 0 ? '+' : ''}{diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-4">
                    {/* DESKTOP TABLE VIEW */}
                    {isDesktop && (
                        <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-4 font-medium text-xs text-muted-foreground uppercase px-2">
                                <div className="col-span-1 text-center">#</div>
                                <div className="col-span-6">Data de Vencimento</div>
                                <div className="col-span-5 text-right px-4">Valor</div>
                            </div>

                            {installments.map((inst, idx) => (
                                <div key={inst.installmentNumber} className="grid grid-cols-12 gap-4 items-center hover:bg-muted/50 p-2 rounded-md transition-colors">
                                    <div className="col-span-1 text-center flex items-center justify-center bg-muted rounded h-8 text-sm font-semibold text-muted-foreground">
                                        {inst.installmentNumber}
                                    </div>

                                    <div className="col-span-6">
                                        <Popover modal={true}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    type="button"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal h-9",
                                                        !inst.date && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIconLucide className="mr-2 h-4 w-4" />
                                                    {inst.date ? format(inst.date, "PPP", { locale: ptBR }) : <span>Selecione</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={inst.date}
                                                    onSelect={(date) => handleDateChange(idx, date)}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div className="col-span-5 relative">
                                        <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">R$</span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            className="pl-8 text-right font-mono h-9"
                                            value={inst.amount}
                                            onChange={(e) => handleAmountChange(idx, e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* MOBILE CARD VIEW */}
                    {!isDesktop && (
                        <div className="flex flex-col gap-3">
                            {installments.map((inst, idx) => (
                                <div key={inst.installmentNumber} className="bg-card border rounded-lg shadow-sm p-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-bold text-sm bg-muted px-2 py-1 rounded text-muted-foreground">
                                            Parcela {inst.installmentNumber}
                                        </span>
                                        <span className="text-xs text-muted-foreground font-medium">
                                            {idx + 1} de {installmentsCount}
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <span className="text-xs text-muted-foreground">Vencimento</span>
                                            <Popover modal={true}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant={"outline"}
                                                        type="button"
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal h-10",
                                                            !inst.date && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIconLucide className="mr-2 h-4 w-4" />
                                                        {inst.date ? format(inst.date, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={inst.date}
                                                        onSelect={(date) => handleDateChange(idx, date)}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-xs text-muted-foreground">Valor</span>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">R$</span>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    inputMode="decimal"
                                                    className="pl-8 text-right font-mono text-lg h-10"
                                                    value={inst.amount}
                                                    onChange={(e) => handleAmountChange(idx, e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-none pt-4 border-t bg-background">
                    {/* Sticky Footer Area */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-end">
                        <ResponsiveDialogClose asChild>
                            <Button variant="outline" type="button" className="w-full sm:w-auto h-11">Cancelar</Button>
                        </ResponsiveDialogClose>
                        <Button
                            type="button"
                            onClick={() => onConfirm(installments)}
                            disabled={Math.abs(diff) > 0.02}
                            className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto h-11 font-bold text-base"
                        >
                            Confirmar Parcelamento
                        </Button>
                    </div>
                </div>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    )
}
