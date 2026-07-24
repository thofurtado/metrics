import { useMutation, useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CreditCard,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { createPaymentEntry } from '@/api/create-payment-entry'
import { finishTreatment } from '@/api/finish-treatment'
import { getPayments } from '@/api/get-payments'
import { getTreatmentDetails } from '@/api/get-treatment-details'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface PaymentModalProps {
  treatmentId: string
  totalAmount: number
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface PaymentMethodItem {
  id: string
  paymentId: string
  amount: number
  installments: number
  date?: string
  isPaid: boolean
  description: string
}

// Utility for currency formatting
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function TreatmentPaymentModal({
  treatmentId,
  totalAmount,
  isOpen,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const safeTotalAmount = totalAmount || 0
  const valueInputRef = useRef<HTMLInputElement>(null)

  const { data: treatment } = useQuery({
    queryKey: ['treatment', treatmentId],
    queryFn: async () => {
      const data = await getTreatmentDetails({ treatmentId })
      return data as any
    },
    enabled: isOpen,
  })

  const defaultDescription = treatment
    ? `O.S. #${treatmentId.slice(0, 8)} - ${treatment?.clients?.name || 'Cliente'}`
    : `O.S. #${treatmentId.slice(0, 8)}`

  const [paymentMethodsData, setPaymentMethodsData] = useState<
    PaymentMethodItem[]
  >([])
  const [currentPayment, setCurrentPayment] = useState<{
    paymentId: string
    amount: string
    installments: number
    date: string
    isPaid: boolean
    description: string
  }>({
    paymentId: '',
    amount: '',
    installments: 1,
    date: new Date().toISOString().split('T')[0],
    isPaid: true,
    description: defaultDescription,
  })

  // Update description when treatment loads
  useEffect(() => {
    if (treatment && currentPayment.description.includes('O.S.')) {
      setCurrentPayment((prev) => ({
        ...prev,
        description: `O.S. #${treatmentId.slice(0, 8)} - ${treatment?.clients?.name || 'Cliente'}`,
      }))
    }
  }, [treatment, treatmentId])

  const [changeAlert, setChangeAlert] = useState<number | null>(null) // Stores the change amount to show
  const [isFinishing, setIsFinishing] = useState(false)

  // Fetch Payment Methods
  const { data: availablePayments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: getPayments,
  })

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setPaymentMethodsData([])
      setChangeAlert(null)
      setCurrentPayment({
        paymentId: '',
        amount: safeTotalAmount.toFixed(2),
        installments: 1,
        date: new Date().toISOString().split('T')[0],
        isPaid: true,
        description: defaultDescription,
      })
    }
  }, [isOpen, safeTotalAmount])

  // Derived Calculations
  const totalPaid = paymentMethodsData.reduce(
    (acc, item) => acc + item.amount,
    0,
  )
  const remainingAmount = Math.max(0, safeTotalAmount - totalPaid)
  const progressPercentage =
    safeTotalAmount > 0
      ? Math.min(100, Math.round((totalPaid / safeTotalAmount) * 100))
      : 100
  const isFullyPaid = remainingAmount < 0.01

  // Helpers
  const selectedPaymentMethodObj = availablePayments.find(
    (p) => p.id === currentPayment.paymentId,
  )
  const isCreditCard =
    selectedPaymentMethodObj?.name?.toLowerCase().includes('crédito') || false
  const maxInstallments = selectedPaymentMethodObj?.installment_limit || 1

  // Effects
  useEffect(() => {
    if (remainingAmount > 0 && !currentPayment.paymentId && !changeAlert) {
      setCurrentPayment((prev) => ({
        ...prev,
        amount: remainingAmount.toFixed(2),
      }))
    }
  }, [remainingAmount, currentPayment.paymentId, changeAlert])

  // Auto-Focus Logic
  useEffect(() => {
    if (currentPayment.paymentId && valueInputRef.current) {
      // Tiny delay to ensure select closes and input is ready/rendered
      setTimeout(() => {
        valueInputRef.current?.focus()
      }, 100)
    }
  }, [currentPayment.paymentId])

  const handleAddPayment = () => {
    const inputAmount = parseFloat(currentPayment.amount)
    setChangeAlert(null)

    if (!currentPayment.paymentId) {
      toast.error('Selecione uma forma de pagamento.')
      return
    }
    if (isNaN(inputAmount) || inputAmount <= 0) {
      toast.error('Informe um valor válido.')
      return
    }

    let amountToRegister = inputAmount
    let changeToReturn = 0

    // CHANGE LOGIC
    if (inputAmount > remainingAmount + 0.01) {
      changeToReturn = inputAmount - remainingAmount
      amountToRegister = remainingAmount
      setChangeAlert(changeToReturn)
    }

    if (currentPayment.installments > maxInstallments) {
      toast.error(`Máximo de parcelas: ${maxInstallments}`)
      return
    }

    const newItem: PaymentMethodItem = {
      id: crypto.randomUUID(),
      paymentId: currentPayment.paymentId,
      amount: amountToRegister,
      installments: isCreditCard ? currentPayment.installments : 1,
      date: currentPayment.date,
      isPaid: currentPayment.isPaid,
      description: currentPayment.description,
    }

    setPaymentMethodsData([...paymentMethodsData, newItem])

    // Reset for next entry
    const newRemaining = Math.max(0, remainingAmount - amountToRegister)
    setCurrentPayment((prev) => ({
      ...prev,
      paymentId: '',
      amount: newRemaining > 0 ? newRemaining.toFixed(2) : '',
      installments: 1,
    }))
  }

  const handleRemovePayment = (id: string) => {
    setPaymentMethodsData((prev) => prev.filter((item) => item.id !== id))
    setChangeAlert(null)
  }

  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (remainingAmount > 0.01) {
      toast.error('Venda não finalizada. Verifique o valor restante.')
      return
    }

    setIsFinishing(true)
    try {
      console.log('Enviando pagamentos:', paymentMethodsData)

      const payloadPayments = paymentMethodsData.map((method) => ({
        payment_id: method.paymentId,
        amount: method.amount,
        occurrences: method.installments || 1,
        date: method.date ? `${method.date}T12:00:00.000Z` : undefined,
        is_paid: method.isPaid,
        description: method.description,
      }))

      // Finalize treatment status and send payments to generate transactions
      await finishTreatment({
        treatmentId,
        payments: payloadPayments,
      })

      toast.success('Venda finalizada com sucesso!')
      onSuccess()
      onClose()

      // Navigate to the main list to prevent stale state
      navigate('/treatments')
    } catch (error) {
      console.error('Erro ao processar venda:', error)
      toast.error('Erro ao finalizar venda. Verifique o console.')
    } finally {
      setIsFinishing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden border-none bg-background/95 p-0 shadow-2xl backdrop-blur-xl md:h-auto md:max-h-[90vh]">
        {/* HERO HEADER - PROGRESS & TOTAL */}
        <div className="relative flex-shrink-0 overflow-hidden bg-primary/5 p-6 md:p-8">
          <div className="absolute left-0 top-0 h-1 w-full bg-border/20">
            <motion.div
              className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-xl font-medium text-muted-foreground">
                <Banknote className="h-5 w-5" />
                Finalizar Venda
                <span className="select-all rounded-full border border-primary/10 bg-muted/20 px-2 py-0.5 text-xs">
                  #{treatmentId.slice(0, 8)}
                </span>
              </DialogTitle>
              <div>
                <p className="text-4xl font-bold tabular-nums tracking-tight text-foreground/90 md:text-5xl">
                  {formatCurrency(remainingAmount)}
                </p>
                <p className="mt-1 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  {remainingAmount > 0 ? 'Falta Pagar' : 'Total Pago ✓'}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col items-end gap-2 rounded-lg border border-border/10 bg-background/50 p-3 shadow-sm backdrop-blur-sm md:w-auto">
              <div className="flex w-full justify-between text-sm md:w-48">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">
                  {formatCurrency(safeTotalAmount)}
                </span>
              </div>
              <div className="flex w-full items-center justify-between text-sm md:w-48">
                <span className="text-muted-foreground">
                  Desconto nos Itens
                </span>
                <span className="font-medium text-red-500">
                  {treatment?.items
                    ? formatCurrency(
                        treatment.items.reduce(
                          (acc: number, item: any) =>
                            acc + (item.discount || 0),
                          0,
                        ),
                      )
                    : 'R$ 0,00'}
                </span>
              </div>
              <div className="my-1 h-px w-full bg-border/50" />
              <div className="flex w-full justify-between text-base font-bold text-primary md:w-48">
                <span>Total a Pagar</span>
                <span>{formatCurrency(safeTotalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN BODY - SPLIT VIEW */}
        <div className="flex-1 overflow-y-auto bg-background">
          <div className="grid h-full grid-cols-1 md:grid-cols-12">
            {/* LEFT: INPUT AREA */}
            <div className="flex flex-col space-y-6 border-border/40 p-6 md:col-span-7 md:border-r md:p-8">
              {/* ITENS DO ATENDIMENTO */}
              {treatment?.items && treatment.items.length > 0 && (
                <div className="space-y-3 border-b border-border/40 pb-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Itens do Atendimento
                  </h3>
                  <div className="max-h-[120px] space-y-2 overflow-y-auto pr-2">
                    {treatment.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg bg-muted/20 p-2 text-sm"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {item.quantity}x {item.items?.name}
                          </span>
                          {item.discount > 0 && (
                            <span className="text-[10px] font-medium text-red-500">
                              Desc: {formatCurrency(item.discount)}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-slate-700">
                          {formatCurrency(
                            item.quantity * item.salesValue -
                              (item.discount || 0),
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Registrar Pagamento
                </h3>
                {changeAlert !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800 shadow-sm"
                  >
                    <AlertCircle className="h-3 w-3" />
                    TROCO: {formatCurrency(changeAlert)}
                  </motion.div>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label className="sr-only">Forma de Pagamento</Label>
                    <Select
                      value={currentPayment.paymentId}
                      onValueChange={(val) => {
                        setCurrentPayment((prev) => ({
                          ...prev,
                          paymentId: val,
                        }))
                      }}
                      disabled={isFullyPaid}
                    >
                      <SelectTrigger className="h-14 border-input bg-card text-lg shadow-sm transition-colors hover:border-primary/50">
                        <SelectValue placeholder="Selecione o método..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePayments.map((p) => (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            className="py-3 text-base"
                          >
                            <div className="flex items-center gap-3">
                              {p.name.toLowerCase().includes('crédito') ? (
                                <CreditCard className="h-5 w-5 text-blue-500 opacity-80" />
                              ) : p.name.toLowerCase().includes('débito') ? (
                                <CreditCard className="h-5 w-5 text-orange-500 opacity-80" />
                              ) : p.name.toLowerCase().includes('pix') ? (
                                <div className="flex h-5 w-5 items-center justify-center rounded bg-teal-500/20 text-[10px] font-bold text-teal-600">
                                  PIX
                                </div>
                              ) : (
                                <Banknote className="h-5 w-5 text-green-600 opacity-80" />
                              )}
                              <span className="font-medium">{p.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div
                    className={cn(
                      'col-span-2 transition-all',
                      isCreditCard ? 'md:col-span-1' : 'md:col-span-2',
                    )}
                  >
                    <div className="relative">
                      <Label className="sr-only">Valor</Label>
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
                        R$
                      </span>
                      <Input
                        ref={valueInputRef}
                        type="number"
                        inputMode="decimal" // Better mobile keyboard
                        value={currentPayment.amount}
                        onChange={(e) =>
                          setCurrentPayment((prev) => ({
                            ...prev,
                            amount: e.target.value,
                          }))
                        }
                        className="h-14 bg-card pl-12 text-xl font-bold shadow-sm ring-primary/20 transition-all focus:ring-2"
                        placeholder="0.00"
                        disabled={isFullyPaid}
                      />
                      {remainingAmount > 0 && !isFullyPaid && (
                        <button
                          onClick={() =>
                            setCurrentPayment((prev) => ({
                              ...prev,
                              amount: remainingAmount.toFixed(2),
                            }))
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase text-primary transition-colors hover:bg-primary/20"
                        >
                          Restante
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Conditional Installments Input */}
                  <AnimatePresence>
                    {isCreditCard && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="col-span-1"
                      >
                        <Select
                          value={String(currentPayment.installments)}
                          onValueChange={(val) =>
                            setCurrentPayment((prev) => ({
                              ...prev,
                              installments: Number(val),
                            }))
                          }
                          disabled={isFullyPaid}
                        >
                          <SelectTrigger className="h-14 bg-card shadow-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold uppercase text-muted-foreground">
                                Parcelas:
                              </span>
                              <SelectValue placeholder="1x" />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from(
                              { length: maxInstallments },
                              (_, i) => i + 1,
                            ).map((i) => (
                              <SelectItem key={i} value={String(i)}>
                                {i}x
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-1">
                    <Label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
                      Data Base
                    </Label>
                    <Input
                      type="date"
                      value={currentPayment.date}
                      onChange={(e) =>
                        setCurrentPayment((prev) => ({
                          ...prev,
                          date: e.target.value,
                        }))
                      }
                      className="h-12 bg-card shadow-sm"
                      disabled={isFullyPaid}
                    />
                  </div>
                  <div className="col-span-1 mt-5 flex h-12 items-center">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={currentPayment.isPaid}
                        onChange={(e) =>
                          setCurrentPayment((prev) => ({
                            ...prev,
                            isPaid: e.target.checked,
                          }))
                        }
                        className="h-5 w-5 rounded border-primary/50 text-primary focus:ring-primary"
                        disabled={isFullyPaid}
                      />
                      <span className="text-sm font-semibold text-foreground">
                        Já está pago?
                      </span>
                    </label>
                  </div>
                  <div className="col-span-2">
                    <Label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
                      Descrição do Lançamento
                    </Label>
                    <Input
                      type="text"
                      value={currentPayment.description}
                      onChange={(e) =>
                        setCurrentPayment((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="h-12 bg-card shadow-sm"
                      placeholder="Ex: O.S. #1234 - Cliente"
                      disabled={isFullyPaid}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleAddPayment}
                  disabled={
                    isFullyPaid ||
                    !currentPayment.paymentId ||
                    !currentPayment.amount
                  }
                  className="h-14 w-full text-lg font-bold uppercase tracking-wide shadow-lg shadow-primary/20 transition-all active:scale-[0.99]"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Lançar Pagamento
                </Button>
              </div>
            </div>

            {/* RIGHT: LIST / RECEIPT */}
            <div className="flex h-full min-h-[300px] flex-col overflow-hidden border-t border-border/40 bg-muted/30 p-6 md:col-span-5 md:border-l md:border-t-0 md:p-8">
              <h3 className="mb-4 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <span>Extrato de Lançamentos</span>
                <span className="rounded bg-muted px-2 py-1 font-mono text-[10px]">
                  {paymentMethodsData.length} items
                </span>
              </h3>

              <div className="-mr-2 flex-1 space-y-3 overflow-y-auto pr-2">
                <AnimatePresence mode="popLayout">
                  {paymentMethodsData.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex h-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 text-muted-foreground/30"
                    >
                      <Wallet className="mb-3 h-12 w-12" />
                      <p className="text-sm font-medium">
                        Aguardando lançamentos...
                      </p>
                    </motion.div>
                  ) : (
                    paymentMethodsData.map((item) => {
                      const methodInfo = availablePayments.find(
                        (p) => p.id === item.paymentId,
                      )
                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="group relative flex items-center justify-between overflow-hidden rounded-lg border border-border/50 bg-card p-4 shadow-sm transition-colors hover:border-primary/30"
                        >
                          <div className="relative z-10 flex flex-col gap-1">
                            <span className="font-mono text-lg font-bold tracking-tight text-foreground">
                              {formatCurrency(item.amount)}
                            </span>
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                              {methodInfo?.name}
                              {item.installments > 1 && (
                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">
                                  {item.installments}x
                                </span>
                              )}
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground opacity-0 transition-colors hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                            onClick={() => handleRemovePayment(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>

                          {/* Decorative receipt jagged edge effect could go here */}
                          <div className="absolute bottom-0 left-0 top-0 w-1 bg-primary/20 opacity-0 transition-opacity group-hover:opacity-100" />
                        </motion.div>
                      )
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="z-20 flex flex-shrink-0 flex-col items-center justify-between gap-4 border-t border-border/50 bg-background p-4 sm:flex-row md:p-6">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-12 w-full text-muted-foreground hover:text-foreground sm:w-auto"
          >
            Cancelar Operação
          </Button>

          <div className="flex w-full items-center gap-4 sm:w-auto">
            {/* Removed redundant remaining Amount display here */}

            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={remainingAmount > 0.01 || isFinishing}
              className={cn(
                'h-12 w-full text-lg font-bold shadow-lg transition-all sm:w-48',
                remainingAmount < 0.01
                  ? 'bg-green-600 shadow-green-200 hover:scale-105 hover:bg-green-700'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {isFinishing ? (
                <span className="flex animate-pulse items-center gap-2">
                  Processando...
                </span>
              ) : (
                <>
                  Finalizar
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
