import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Plus,
  Trash2,
  Banknote,
  CreditCard,
  AlertCircle,
  ArrowRight,
  Wallet
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

import { createPaymentEntry } from '@/api/create-payment-entry'
import { getPayments } from '@/api/get-payments'
import { finishTreatment } from '@/api/finish-treatment'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  onSuccess
}: PaymentModalProps) {
  const safeTotalAmount = totalAmount || 0
  const valueInputRef = useRef<HTMLInputElement>(null)

  const [paymentMethodsData, setPaymentMethodsData] = useState<PaymentMethodItem[]>([])
  const [currentPayment, setCurrentPayment] = useState<{
    paymentId: string
    amount: string
    installments: number
  }>({
    paymentId: '',
    amount: '',
    installments: 1
  })
  const [discount, setDiscount] = useState<string>('')
  const [changeAlert, setChangeAlert] = useState<number | null>(null) // Stores the change amount to show
  const [isFinishing, setIsFinishing] = useState(false)

  // Fetch Payment Methods
  const { data: availablePayments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: getPayments,
  })

  const { mutateAsync: createPaymentEntryMutation } = useMutation({
    mutationFn: createPaymentEntry,
  })

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setPaymentMethodsData([])
      setDiscount('')
      setChangeAlert(null)
      setCurrentPayment({
        paymentId: '',
        amount: safeTotalAmount.toFixed(2),
        installments: 1
      })
    }
  }, [isOpen, safeTotalAmount])

  // Derived Calculations
  const discountValue = parseFloat(discount) || 0
  const totalWithDiscount = Math.max(0, safeTotalAmount - discountValue)
  const totalPaid = paymentMethodsData.reduce((acc, item) => acc + item.amount, 0)
  const remainingAmount = Math.max(0, totalWithDiscount - totalPaid)
  const progressPercentage = totalWithDiscount > 0 ? (totalPaid / totalWithDiscount) * 100 : 0
  const isFullyPaid = remainingAmount < 0.01

  // Helpers
  const selectedPaymentMethodObj = availablePayments.find(p => p.id === currentPayment.paymentId)
  const isCreditCard = selectedPaymentMethodObj?.name?.toLowerCase().includes('crédito') || false
  const maxInstallments = selectedPaymentMethodObj?.installment_limit || 1

  // Effects
  useEffect(() => {
    if (remainingAmount > 0 && !currentPayment.paymentId && !changeAlert) {
      setCurrentPayment(prev => ({
        ...prev,
        amount: remainingAmount.toFixed(2)
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
      installments: isCreditCard ? currentPayment.installments : 1
    }

    setPaymentMethodsData([...paymentMethodsData, newItem])

    // Reset for next entry
    const newRemaining = Math.max(0, remainingAmount - amountToRegister)
    setCurrentPayment({
      paymentId: '',
      amount: newRemaining > 0 ? newRemaining.toFixed(2) : '',
      installments: 1
    })
  }

  const handleRemovePayment = (id: string) => {
    setPaymentMethodsData(prev => prev.filter(item => item.id !== id))
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

      // Sequential execution to avoid race conditions or backend overload
      for (const method of paymentMethodsData) {
        await createPaymentEntryMutation({
          payment_id: method.paymentId,
          treatment_id: treatmentId,
          occurrences: method.installments || 1,
          amount: method.amount,
        })
      }

      // Finalize treatment status
      await finishTreatment({ treatmentId })

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
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-none shadow-2xl h-[90vh] md:h-auto flex flex-col">

        {/* HERO HEADER - PROGRESS & TOTAL */}
        <div className="bg-primary/5 p-6 md:p-8 flex-shrink-0 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-border/20">
            <motion.div
              className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-medium text-muted-foreground flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                Finalizar Venda
                <span className="text-xs bg-muted/20 px-2 py-0.5 rounded-full border border-primary/10 select-all">
                  #{treatmentId.slice(0, 8)}
                </span>
              </DialogTitle>
              <div>
                <p className="text-4xl md:text-5xl font-bold tracking-tight text-foreground/90 tabular-nums">
                  {formatCurrency(remainingAmount)}
                </p>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">
                  {remainingAmount > 0 ? "Falta Pagar" : "Total Pago ✓"}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 bg-background/50 p-3 rounded-lg border border-border/10 backdrop-blur-sm shadow-sm w-full md:w-auto">
              <div className="flex justify-between w-full md:w-48 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(safeTotalAmount)}</span>
              </div>
              <div className="flex justify-between w-full md:w-48 text-sm items-center">
                <span className="text-muted-foreground">Desconto</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-red-500 font-bold">-</span>
                  <input
                    type="number"
                    className="w-16 text-right bg-transparent border-b border-dashed border-red-200 focus:border-red-500 outline-none text-red-600 font-medium text-sm p-0 h-5"
                    placeholder="0.00"
                    value={discount}
                    onChange={e => setDiscount(e.target.value)}
                  />
                </div>
              </div>
              <div className="w-full h-px bg-border/50 my-1" />
              <div className="flex justify-between w-full md:w-48 text-base font-bold text-primary">
                <span>Total Final</span>
                <span>{formatCurrency(totalWithDiscount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN BODY - SPLIT VIEW */}
        <div className="flex-1 overflow-y-auto md:overflow-hidden bg-background">
          <div className="grid grid-cols-1 md:grid-cols-12 h-full">

            {/* LEFT: INPUT AREA */}
            <div className="md:col-span-7 flex flex-col p-6 md:p-8 space-y-6 md:border-r border-border/40">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Registrar Pagamento</h3>
                {changeAlert !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-2"
                  >
                    <AlertCircle className="w-3 h-3" />
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
                        setCurrentPayment(prev => ({ ...prev, paymentId: val }))
                      }}
                      disabled={isFullyPaid}
                    >
                      <SelectTrigger className="h-14 text-lg bg-card shadow-sm border-input hover:border-primary/50 transition-colors">
                        <SelectValue placeholder="Selecione o método..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePayments.map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-base py-3">
                            <div className="flex items-center gap-3">
                              {p.name.toLowerCase().includes('crédito') ? <CreditCard className="w-5 h-5 text-blue-500 opacity-80" /> :
                                p.name.toLowerCase().includes('débito') ? <CreditCard className="w-5 h-5 text-orange-500 opacity-80" /> :
                                  p.name.toLowerCase().includes('pix') ? <div className="w-5 h-5 bg-teal-500/20 text-teal-600 rounded flex items-center justify-center text-[10px] font-bold">PIX</div> :
                                    <Banknote className="w-5 h-5 text-green-600 opacity-80" />}
                              <span className="font-medium">{p.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className={cn("col-span-2 transition-all", isCreditCard ? "md:col-span-1" : "md:col-span-2")}>
                    <div className="relative">
                      <Label className="sr-only">Valor</Label>
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-lg">R$</span>
                      <Input
                        ref={valueInputRef}
                        type="number"
                        inputMode="decimal" // Better mobile keyboard
                        value={currentPayment.amount}
                        onChange={e => setCurrentPayment(prev => ({ ...prev, amount: e.target.value }))}
                        className="h-14 pl-12 text-xl font-bold bg-card shadow-sm transition-all focus:ring-2 ring-primary/20"
                        placeholder="0.00"
                        disabled={isFullyPaid}
                      />
                      {remainingAmount > 0 && !isFullyPaid && (
                        <button
                          onClick={() => setCurrentPayment(prev => ({ ...prev, amount: remainingAmount.toFixed(2) }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors"
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
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="col-span-1"
                      >
                        <Select
                          value={String(currentPayment.installments)}
                          onValueChange={val => setCurrentPayment(prev => ({ ...prev, installments: Number(val) }))}
                          disabled={isFullyPaid}
                        >
                          <SelectTrigger className="h-14 bg-card shadow-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-sm uppercase font-bold">Parcelas:</span>
                              <SelectValue placeholder="1x" />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: maxInstallments }, (_, i) => i + 1).map(i => (
                              <SelectItem key={i} value={String(i)}>{i}x</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Button
                  onClick={handleAddPayment}
                  disabled={isFullyPaid || !currentPayment.paymentId || !currentPayment.amount}
                  className="w-full h-14 text-lg uppercase tracking-wide font-bold shadow-lg shadow-primary/20 active:scale-[0.99] transition-all"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Lançar Pagamento
                </Button>
              </div>
            </div>

            {/* RIGHT: LIST / RECEIPT */}
            <div className="md:col-span-5 bg-muted/30 p-6 md:p-8 flex flex-col h-full overflow-hidden border-t md:border-t-0 md:border-l border-border/40 min-h-[300px]">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center justify-between">
                <span>Extrato de Lançamentos</span>
                <span className="bg-muted px-2 py-1 rounded text-[10px] font-mono">{paymentMethodsData.length} items</span>
              </h3>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 -mr-2">
                <AnimatePresence mode='popLayout'>
                  {paymentMethodsData.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center text-muted-foreground/30 border-2 border-dashed border-border/50 rounded-xl"
                    >
                      <Wallet className="w-12 h-12 mb-3" />
                      <p className="text-sm font-medium">Aguardando lançamentos...</p>
                    </motion.div>
                  ) : (
                    paymentMethodsData.map((item) => {
                      const methodInfo = availablePayments.find(p => p.id === item.paymentId)
                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="group bg-card p-4 rounded-lg shadow-sm border border-border/50 relative overflow-hidden flex justify-between items-center hover:border-primary/30 transition-colors"
                        >
                          <div className="flex flex-col gap-1 relative z-10">
                            <span className="font-mono font-bold text-lg text-foreground tracking-tight">
                              {formatCurrency(item.amount)}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase font-semibold">
                              {methodInfo?.name}
                              {item.installments > 1 && (
                                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">
                                  {item.installments}x
                                </span>
                              )}
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                            onClick={() => handleRemovePayment(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>

                          {/* Decorative receipt jagged edge effect could go here */}
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
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
        <div className="p-4 md:p-6 bg-background border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4 flex-shrink-0 z-20">
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto h-12 text-muted-foreground hover:text-foreground">
            Cancelar Operação
          </Button>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            {/* Removed redundant remaining Amount display here */}

            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={remainingAmount > 0.01 || isFinishing}
              className={cn(
                "w-full sm:w-48 h-12 text-lg font-bold transition-all shadow-lg",
                remainingAmount < 0.01 ? "bg-green-600 hover:bg-green-700 shadow-green-200 hover:scale-105" : "bg-muted text-muted-foreground"
              )}
            >
              {isFinishing ? (
                <span className="flex items-center gap-2 animate-pulse">Processando...</span>
              ) : (
                <>
                  Finalizar
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}