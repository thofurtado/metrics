import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  CreditCard,
  DollarSign,
  Wallet,
  Plus,
  Minus,
  X,
  Check,
  Trash2,
  Plane
} from 'lucide-react'
import { toast } from 'sonner'

// Importações reais da API
import { createPaymentEntry } from '@/api/create-payment-entry'
import { getAccounts } from '@/api/get-accounts'
import { getPayments } from '@/api/get-payments'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PaymentModalProps {
  treatmentId: string
  totalAmount: number
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface PaymentMethod {
  id: string
  paymentId: string
  amount: number
  installments: number
}

export function TreatmentPaymentModal({
  treatmentId,
  totalAmount,
  isOpen,
  onClose,
  onSuccess
}: PaymentModalProps) {
  // Garantir que totalAmount seja sempre um número válido
  const safeTotalAmount = totalAmount || 0

  const [selectedPaymentType, setSelectedPaymentType] = useState<'single' | 'multiple'>('single')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [currentPayment, setCurrentPayment] = useState<PaymentMethod>({
    id: 'current',
    paymentId: '',
    amount: 0,
    installments: 1
  })
  const [discount, setDiscount] = useState(0)

  // Buscar métodos de pagamento reais
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['payments'],
    queryFn: getPayments,
  })

  const { mutateAsync: createPaymentEntryMutation, isPending } = useMutation({
    mutationFn: createPaymentEntry,
  })

  // Efeito para resetar quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setSelectedPaymentType('single')
      setPaymentMethods([])
      setDiscount(0)
      setCurrentPayment({
        id: 'current',
        paymentId: '',
        amount: safeTotalAmount,
        installments: 1
      })
    }
  }, [isOpen, safeTotalAmount])

  const paidAmount = paymentMethods.reduce((sum, method) => sum + method.amount, 0)
  const finalAmount = safeTotalAmount - discount
  const remainingAmount = finalAmount - paidAmount
  const isPaymentComplete = Math.abs(remainingAmount) < 0.01

  const getMaxInstallments = (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId)
    return payment?.installment_limit || 1
  }

  const addCurrentPayment = () => {
    if (!currentPayment.paymentId || currentPayment.amount <= 0) {
      toast.error('Selecione a forma de pagamento e informe o valor')
      return
    }

    if (currentPayment.amount > remainingAmount) {
      toast.error(`Valor excede o restante. Restante: R$ ${remainingAmount.toFixed(2)}`)
      return
    }

    const payment = payments.find(p => p.id === currentPayment.paymentId)
    if (!payment) {
      toast.error('Método de pagamento inválido')
      return
    }

    // Validar parcelas
    if (currentPayment.installments > payment.installment_limit) {
      toast.error(`Número de parcelas excede o limite de ${payment.installment_limit}`)
      return
    }

    setPaymentMethods(prev => [...prev, { ...currentPayment, id: Date.now().toString() }])

    // Reset current payment
    setCurrentPayment({
      id: 'current',
      paymentId: '',
      amount: selectedPaymentType === 'single' ? 0 : Math.max(0, remainingAmount - currentPayment.amount),
      installments: 1
    })
  }

  const removePaymentMethod = (id: string) => {
    setPaymentMethods(prev => prev.filter(method => method.id !== id))
  }

  const updateCurrentPayment = (updates: Partial<PaymentMethod>) => {
    setCurrentPayment(prev => ({ ...prev, ...updates }))
  }

  const handleSubmit = async () => {
    try {
      // Validar se o pagamento está completo
      if (!isPaymentComplete) {
        toast.error(`Valor total não confere. Restante: R$ ${remainingAmount.toFixed(2)}`)
        return
      }

      // Validar se há métodos de pagamento
      if (paymentMethods.length === 0) {
        toast.error('Adicione pelo menos uma forma de pagamento')
        return
      }

      // Criar entradas de pagamento
      for (const method of paymentMethods) {
        await createPaymentEntryMutation({
          payment_id: method.paymentId,
          treatment_id: treatmentId,
          occurrences: method.installments,
          amount: method.amount / method.installments,
        })
      }

      toast.success('Pagamento registrado com sucesso!')
      onSuccess()
      onClose()

      // Resetar estado
      setPaymentMethods([])
      setSelectedPaymentType('single')
      setDiscount(0)
      setCurrentPayment({
        id: 'current',
        paymentId: '',
        amount: 0,
        installments: 1
      })

    } catch (error) {
      toast.error('Erro ao registrar pagamento')
      console.error(error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <Card className="w-full max-h-[90vh] overflow-hidden border-0">
          <CardHeader className="border-b p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Finalizar Pagamento
              </CardTitle>

            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 overflow-y-auto space-y-4">
            {/* Resumo do Valor */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm sm:text-base">Valor Total do Atendimento</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">ID: {treatmentId}</p>

                  {/* Desconto - Mobile em linha, Desktop em coluna */}
                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="discount" className="text-xs sm:text-sm whitespace-nowrap">Desconto (R$):</Label>
                      <Input
                        id="discount"
                        type="number"
                        step="0.01"
                        min="0"
                        max={safeTotalAmount}
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value))}
                        className="h-8 text-sm w-24 sm:w-32"
                      />
                    </div>
                    {discount > 0 && (
                      <span className="text-xs text-red-600 font-medium">
                        - R$ {discount.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  <p className="text-xl sm:text-2xl font-bold text-green-600">
                    R$ {finalAmount.toFixed(2)}
                  </p>
                  <div className="flex flex-col gap-1 text-xs sm:text-sm">
                    <span className="text-blue-600">
                      Pago: R$ {paidAmount.toFixed(2)}
                    </span>
                    <span className={remainingAmount > 0 ? "text-orange-600" : "text-green-600"}>
                      Restante: R$ {remainingAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pagamentos Adicionados */}
            {paymentMethods.length > 0 && (
              <div className="space-y-2">
                <Label className="text-base font-medium">Pagamentos Adicionados</Label>

                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {paymentMethods.map((method) => {
                    const payment = payments.find(p => p.id === method.paymentId)
                    return (
                      <div key={method.id} className="border rounded-lg p-3 bg-muted/50">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate">{payment?.name}</span>
                              {method.installments > 1 && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded whitespace-nowrap">
                                  {method.installments}x
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-1">
                              <span>R$ {method.amount.toFixed(2)}</span>
                              {method.installments > 1 && (
                                <span>(R$ {(method.amount / method.installments).toFixed(2)}/parcela)</span>
                              )}
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePaymentMethod(method.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Tipo de Pagamento */}
            <div>
              <Label className="text-base font-medium mb-3 block">Tipo de Pagamento</Label>
              <RadioGroup
                value={selectedPaymentType}
                onValueChange={(value: 'single' | 'multiple') => {
                  setSelectedPaymentType(value)
                  setPaymentMethods([])
                  setCurrentPayment({
                    id: 'current',
                    paymentId: '',
                    amount: value === 'single' ? finalAmount : 0,
                    installments: 1
                  })
                }}
                className="flex flex-row gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="flex items-center gap-1 sm:gap-2 cursor-pointer text-sm">
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Pagamento Único</span>
                    <span className="sm:hidden">Único</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="multiple" id="multiple" />
                  <Label htmlFor="multiple" className="flex items-center gap-1 sm:gap-2 cursor-pointer text-sm">
                    <Wallet className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Pagamento Múltiplo</span>
                    <span className="sm:hidden">Múltiplo</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Forma de Pagamento Atual */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-lg">Adicionar Pagamento</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                {/* Método de Pagamento + Botão Adicionar - Lado a lado no mobile */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-3 md:col-span-1">
                  <div className="space-y-2 flex-1">
                    <Label className="text-sm">Forma de Pagamento</Label>
                    <Select
                      value={currentPayment.paymentId}
                      onValueChange={(value) => updateCurrentPayment({
                        paymentId: value,
                        installments: 1
                      })}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder={
                          isLoadingPayments ? "Carregando..." : "Selecione"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {(payments || []).map((payment) => (
                          <SelectItem key={payment.id} value={payment.id} className="text-sm">
                            <div className="flex items-center gap-2">
                              {payment.name}
                              {payment.in_sight && (
                                <span className="text-xs bg-green-100 text-green-800 px-1 rounded">
                                  À vista
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Botão Adicionar - Ao lado no mobile, embaixo no desktop */}
                  <div className="flex sm:hidden md:flex justify-end sm:justify-start md:justify-end">
                    <Button
                      onClick={addCurrentPayment}
                      disabled={!currentPayment.paymentId || currentPayment.amount <= 0 || remainingAmount <= 0}
                      className="bg-blue-500 hover:bg-blue-600 text-sm h-9 w-full sm:w-auto"
                      size="sm"
                    >
                      <Plane className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Adicionar Pagamento</span>
                    </Button>
                  </div>
                </div>

                {/* Valor e Parcelas - Lado a lado no mobile */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:col-span-2">
                  {/* Valor */}
                  <div className="space-y-2">
                    <Label className="text-sm">Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={selectedPaymentType === 'single' ? finalAmount : remainingAmount}
                      value={currentPayment.amount}
                      onChange={(e) => updateCurrentPayment({ amount: Number(e.target.value) })}
                      placeholder={`Máx: R$ ${selectedPaymentType === 'single' ? finalAmount.toFixed(2) : remainingAmount.toFixed(2)}`}
                      className="text-sm"
                    />
                  </div>

                  {/* Parcelas */}
                  <div className="space-y-2">
                    <Label className="text-sm">Parcelas</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateCurrentPayment({
                          installments: Math.max(1, currentPayment.installments - 1)
                        })}
                        disabled={currentPayment.installments <= 1 || getMaxInstallments(currentPayment.paymentId) <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>

                      <Input
                        type="number"
                        min="1"
                        max={getMaxInstallments(currentPayment.paymentId)}
                        value={currentPayment.installments}
                        onChange={(e) => updateCurrentPayment({
                          installments: Math.max(1, Math.min(getMaxInstallments(currentPayment.paymentId), Number(e.target.value)))
                        })}
                        className="text-center text-sm h-8"
                        disabled={getMaxInstallments(currentPayment.paymentId) <= 1}
                      />

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateCurrentPayment({
                          installments: Math.min(getMaxInstallments(currentPayment.paymentId), currentPayment.installments + 1)
                        })}
                        disabled={currentPayment.installments >= getMaxInstallments(currentPayment.paymentId) || getMaxInstallments(currentPayment.paymentId) <= 1}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    {currentPayment.paymentId && (
                      <p className="text-xs text-muted-foreground">
                        {getMaxInstallments(currentPayment.paymentId) <= 1
                          ? 'Pagamento à vista'
                          : `Limite: ${getMaxInstallments(currentPayment.paymentId)} parcelas`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Botão Adicionar - Visível apenas no desktop md */}
                <div className="hidden sm:flex md:hidden justify-end">
                  <Button
                    onClick={addCurrentPayment}
                    disabled={!currentPayment.paymentId || currentPayment.amount <= 0 || remainingAmount <= 0}
                    className="bg-blue-500 hover:bg-blue-600 text-sm h-9"
                    size="sm"
                  >
                    <Plane className="h-4 w-4 mr-2" />
                    Adicionar Pagamento
                  </Button>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-row gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} className="flex-1 text-sm h-9">
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isPaymentComplete || paymentMethods.length === 0 || isPending}
                className="flex-1 bg-green-500 hover:bg-green-600 text-sm h-9"
              >
                <Check className="h-4 w-4 mr-2" />
                {isPending ? 'Processando...' : 'Confirmar Pagamento'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}