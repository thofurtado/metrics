import { addMonths, addWeeks, addYears, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'
import { Switch } from '@/components/ui/switch'
import { calculateCreditCardDueDate } from '@/lib/credit-card-due-date'
import { cn } from '@/lib/utils'

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
  originalEmissao?: Date
  creditCard?: any
  holidays?: string[]
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
  originalEmissao,
  creditCard,
  holidays,
  variant = 'expense',
  onConfirm,
}: InstallmentPreviewDialogProps) {
  const [installments, setInstallments] = useState<InstallmentItem[]>([])
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)
  const [skipWeekends, setSkipWeekends] = useState(false)

  // Theme Colors based on variant
  const theme =
    variant === 'expense'
      ? {
          text: 'text-red-600 dark:text-red-500',
          bg: 'bg-red-50 dark:bg-red-950/20',
          border: 'border-red-100 dark:border-red-900/30',
          subText: 'text-red-600/70',
          icon: TrendingDown,
          accent: 'bg-red-600 hover:bg-red-700',
          softAccent: 'bg-red-100 text-red-700',
        }
      : {
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
  }, [open, totalAmount, installmentsCount, frequency, startDate, skipWeekends])

  useEffect(() => {
    if (!open) {
      setSkipWeekends(false)
    }
  }, [open])

  function generateInitialInstallments() {
    const baseValue = Math.floor((totalAmount / installmentsCount) * 100) / 100
    const totalBase = baseValue * installmentsCount
    const remainder = Number((totalAmount - totalBase).toFixed(2))

    const newInstallments: InstallmentItem[] = []

    for (let i = 1; i <= installmentsCount; i++) {
      let amount = baseValue
      if (i === 1) amount += remainder

      let finalDate: Date

      if (creditCard && originalEmissao) {
        // Simula emissão avançando meses para descobrir fatura correta
        let simulatedPurchaseDate = new Date(originalEmissao)
        if (frequency === 'MONTHLY')
          simulatedPurchaseDate = addMonths(simulatedPurchaseDate, i - 1)
        else if (frequency === 'WEEKLY')
          simulatedPurchaseDate = addWeeks(simulatedPurchaseDate, i - 1)
        else if (frequency === 'YEARLY')
          simulatedPurchaseDate = addYears(simulatedPurchaseDate, i - 1)

        const result = calculateCreditCardDueDate(
          simulatedPurchaseDate,
          creditCard,
          holidays || [],
        )
        finalDate = result.due_date
      } else {
        // Cálculo Normal previne drift do "Efeito Fevereiro"
        finalDate = new Date(startDate)
        if (frequency === 'MONTHLY') finalDate = addMonths(finalDate, i - 1)
        else if (frequency === 'WEEKLY') finalDate = addWeeks(finalDate, i - 1)
        else if (frequency === 'YEARLY') finalDate = addYears(finalDate, i - 1)

        if (skipWeekends) {
          const day = finalDate.getDay()
          if (day === 6) {
            // Sábado
            finalDate.setDate(finalDate.getDate() + 2)
          } else if (day === 0) {
            // Domingo
            finalDate.setDate(finalDate.getDate() + 1)
          }
        }
      }

      newInstallments.push({
        installmentNumber: i,
        date: finalDate,
        amount: Number(amount.toFixed(2)),
      })
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
          updatedInstallments[j].amount = Number(
            (totalAmount - (sumPrev + currentDistributed)).toFixed(2),
          )
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
    setOpenPopoverId(null)
  }

  const currentTotal = installments.reduce((acc, curr) => acc + curr.amount, 0)
  const diff = currentTotal - totalAmount
  const isValid = Math.abs(diff) <= 0.02
  const Icon = theme.icon

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent 
        onInteractOutside={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (
            e.key === 'Enter' &&
            (e.target instanceof HTMLInputElement ||
              (e.target as HTMLElement).getAttribute('role') === 'switch' ||
              (e.target as HTMLElement).getAttribute('aria-haspopup') === 'dialog')
          ) {
            e.preventDefault()
            const inputs = Array.from(
              e.currentTarget.querySelectorAll(
                'input:not([type="hidden"]):not([disabled]):not([tabindex="-1"]), button[aria-haspopup="dialog"]:not([disabled]):not([tabindex="-1"]), button[role="switch"]:not([disabled]):not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"])'
              )
            ) as HTMLElement[]
            const index = inputs.indexOf(e.target as HTMLElement)
            if (index > -1 && index < inputs.length - 1) {
              const nextElement = inputs[index + 1]
              if (nextElement) nextElement.focus()
            }
          }
        }}
        className="flex h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden bg-background p-0 shadow-2xl md:h-auto md:max-h-[85vh]"
      >
        {/* HERO HEADER */}
        <ResponsiveDialogHeader
          className={cn(
            'relative flex-none border-b bg-background p-6 pb-8 text-center',
            theme.bg,
          )}
        >
          <ResponsiveDialogDescription className="sr-only">
            Resumo do parcelamento para conferência e ajustes finais.
          </ResponsiveDialogDescription>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-background/50 shadow-sm backdrop-blur-sm">
            <Icon className={cn('h-6 w-6', theme.text)} />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-widest opacity-60">
              Valor Total do Contrato
            </span>
            <ResponsiveDialogTitle
              className={cn(
                'text-4xl font-bold tracking-tight sm:text-5xl',
                theme.text,
              )}
            >
              {totalAmount.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </ResponsiveDialogTitle>
          </div>

          <div className="mt-4 flex flex-col items-center justify-center gap-4">
            <span
              className={cn(
                'rounded-full border bg-background/60 px-3 py-1 text-xs font-semibold shadow-sm',
                theme.subText,
              )}
            >
              {installmentsCount} parcelas{' '}
              {frequency === 'MONTHLY'
                ? 'mensais'
                : frequency === 'WEEKLY'
                  ? 'semanais'
                  : 'anuais'}
            </span>

            {!creditCard && (
              <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 px-4 py-2 shadow-sm backdrop-blur-md">
                <Switch
                  id="skip-weekends"
                  checked={skipWeekends}
                  onCheckedChange={setSkipWeekends}
                  className={cn(
                    variant === 'expense'
                      ? 'data-[state=checked]:bg-red-600'
                      : 'data-[state=checked]:bg-emerald-600',
                  )}
                />
                <label
                  htmlFor="skip-weekends"
                  className={cn(
                    'cursor-pointer select-none text-sm font-semibold transition-colors',
                    theme.text,
                  )}
                >
                  Evitar vencimentos em finais de semana
                </label>
              </div>
            )}
            {creditCard && (
              <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-center text-xs font-bold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                Vencimentos automáticos no dia da fatura ({creditCard.due_day}).
                Finais de semana ignorados.
              </div>
            )}
          </div>
        </ResponsiveDialogHeader>

        {/* SCROLLABLE LIST */}
        <div className="flex-1 space-y-3 overflow-y-auto bg-background p-4 pb-20 sm:p-6 md:pb-6">
          <div className="mx-auto max-w-xl space-y-3">
            {installments.map((inst, idx) => (
              <div
                key={inst.installmentNumber}
                className="group flex flex-col gap-3 rounded-xl border border-transparent p-3 transition-all duration-200 hover:border-border hover:bg-muted/30 sm:flex-row sm:items-center"
              >
                {/* Left: Info */}
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted font-mono text-xs font-bold text-muted-foreground">
                    {inst.installmentNumber.toString().padStart(2, '0')}
                  </div>
                  <div className="flex flex-col">
                    <Popover
                      modal={true}
                      open={openPopoverId === inst.installmentNumber.toString()}
                      onOpenChange={(open) =>
                        setOpenPopoverId(
                          open ? inst.installmentNumber.toString() : null,
                        )
                      }
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto justify-start p-0 font-medium text-foreground hover:bg-transparent hover:text-primary"
                        >
                          {inst.date
                            ? format(inst.date, "dd 'de' MMMM", {
                                locale: ptBR,
                              })
                            : 'Definir data'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="z-[10000] w-auto p-0"
                        align="start"
                      >
                        <Calendar
                          mode="single"
                          selected={inst.date}
                          onSelect={(date) => handleDateChange(idx, date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {inst.date ? format(inst.date, 'yyyy') : '-'}
                    </span>
                  </div>
                </div>

                {/* Right: Amount Input */}
                <div className="relative w-full sm:w-40">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground/50">
                    R$
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    value={inst.amount}
                    onChange={(e) => handleAmountChange(idx, e.target.value)}
                    className="h-12 rounded-lg border-none bg-muted/20 pl-8 text-right text-lg font-bold tabular-nums shadow-none transition-all focus:bg-muted/50 focus-visible:ring-0"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* STICKY VALIDATION FOOTER */}
        <div className="flex-none border-t bg-background/80 p-4 shadow-[0_-5px_20px_-10px_rgba(0,0,0,0.1)] backdrop-blur-lg sm:p-6">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-4 sm:flex-row">
            {/* Validation Status */}
            <div className="flex w-full flex-1 items-center justify-between gap-4 rounded-lg bg-muted/30 p-3 sm:justify-start">
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Soma das Parcelas
                </span>
                <span
                  className={cn(
                    'font-mono text-sm font-medium',
                    isValid
                      ? 'text-foreground'
                      : 'text-red-600 dark:text-red-400',
                  )}
                >
                  {currentTotal.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </span>
              </div>

              {isValid ? (
                <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-bold">Total Confere</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-full bg-red-100 px-3 py-1.5 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs font-bold">
                    {diff > 0 ? '+' : ''}
                    {Math.abs(diff).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex w-full gap-2 sm:w-auto">
              <ResponsiveDialogClose asChild>
                <Button
                  variant="ghost"
                  className="h-12 flex-1 rounded-xl font-medium sm:flex-none"
                >
                  Cancelar
                </Button>
              </ResponsiveDialogClose>
              <Button
                onClick={() => onConfirm(installments)}
                disabled={!isValid}
                className={cn(
                  'h-12 flex-1 rounded-xl px-8 font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 sm:flex-none',
                  theme.accent,
                )}
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
