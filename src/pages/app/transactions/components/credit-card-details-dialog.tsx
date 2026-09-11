import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CreditCard,
  History,
  Loader2,
  Receipt,
  Wallet,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { payCreditCardInvoice } from '@/api/credit-cards'
import { getAccounts } from '@/api/get-accounts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface CreditCardDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  virtualTransaction: {
    id: string
    credit_card_id: string
    description: string
    totalValue: number
    amount: number
    paidAmount?: number
    remainingAmount?: number
    data_vencimento: string | Date
    confirmed: boolean
    isPartial?: boolean
    account_id?: string
    swipes: any[]
    payments?: any[]
  } | null
}

export function CreditCardDetailsDialog({
  open,
  onOpenChange,
  virtualTransaction,
}: CreditCardDetailsDialogProps) {
  const queryClient = useQueryClient()

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
    enabled: open,
  })

  // State for settlement form
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [paymentDate, setPaymentDate] = useState<string>(
    dayjs().format('YYYY-MM-DD'),
  )
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX')
  const [amountToPay, setAmountToPay] = useState<string>('')
  const [activeTab, setActiveTab] = useState<string>('swipes')

  const totalValue = virtualTransaction?.totalValue ?? 0
  const paidAmount = virtualTransaction?.paidAmount ?? 0
  const remainingAmount =
    virtualTransaction?.remainingAmount ??
    Math.max(0, totalValue - paidAmount)
  const isFullyPaid = virtualTransaction?.confirmed || remainingAmount <= 0.01

  // Set default form values when opening
  useEffect(() => {
    if (virtualTransaction && open) {
      const defaultAccount =
        virtualTransaction.account_id ||
        (accountsData?.accounts && accountsData.accounts.length > 0
          ? accountsData.accounts[0].id
          : '')
      setSelectedAccountId(defaultAccount)
      setPaymentDate(dayjs().format('YYYY-MM-DD'))
      setPaymentMethod('PIX')
      setAmountToPay(remainingAmount.toFixed(2))
      setActiveTab('swipes')
    }
  }, [virtualTransaction, open, accountsData, remainingAmount])

  const { mutateAsync: payInvoiceMutation, isPending } = useMutation({
    mutationFn: (payload: {
      id: string
      month: string
      data: {
        amountPaid: number
        accountId: string
        paymentDate: string
        paymentMethod: string
      }
    }) => payCreditCardInvoice(payload.id, payload.month, payload.data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      if (res.isFullyPaid) {
        toast.success('Fatura do cartão quitada com sucesso!')
      } else {
        toast.success(
          `Baixa parcial de R$ ${Number(amountToPay).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} realizada com sucesso!`,
        )
      }
      onOpenChange(false)
    },
    onError: (err: any) => {
      console.error(err)
      const msg = err?.response?.data?.message || 'Erro ao pagar fatura do cartão.'
      toast.error(msg)
    },
  })

  if (!virtualTransaction) return null

  const monthStr = dayjs(virtualTransaction.data_vencimento).format('YYYY-MM')
  const monthName = dayjs(virtualTransaction.data_vencimento).format('MMMM [de] YYYY')

  const parsedAmountToPay = parseFloat(amountToPay.replace(',', '.')) || 0
  const isPartialPayment =
    parsedAmountToPay > 0 && parsedAmountToPay < remainingAmount - 0.01
  const balanceAfterPayment = Math.max(0, remainingAmount - parsedAmountToPay)

  async function handleConfirmPayment() {
    if (!virtualTransaction?.credit_card_id) return
    if (!selectedAccountId) {
      toast.error('Selecione a conta bancária para o pagamento.')
      return
    }
    if (parsedAmountToPay <= 0) {
      toast.error('O valor a pagar deve ser maior que zero.')
      return
    }
    if (parsedAmountToPay > remainingAmount + 0.01) {
      toast.error('O valor a pagar não pode ser maior que o saldo devedor.')
      return
    }

    await payInvoiceMutation({
      id: virtualTransaction.credit_card_id,
      month: monthStr,
      data: {
        amountPaid: parsedAmountToPay,
        accountId: selectedAccountId,
        paymentDate,
        paymentMethod,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:max-w-[700px]">
        <DialogHeader className="space-y-2 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-50">
                  {virtualTransaction.description}
                </DialogTitle>
                <DialogDescription className="text-xs font-semibold capitalize text-slate-500">
                  Fatura referente a {monthName}
                </DialogDescription>
              </div>
            </div>

            <div>
              {isFullyPaid ? (
                <Badge className="border-transparent bg-emerald-100 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                  Fatura Paga
                </Badge>
              ) : virtualTransaction.isPartial || paidAmount > 0 ? (
                <Badge className="border-transparent bg-amber-100 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                  Parcialmente Paga
                </Badge>
              ) : (
                <Badge className="border-transparent bg-rose-100 text-[10px] font-black uppercase tracking-wider text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                  Pendente
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* ─── SUMMARY CARDS ───────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Fatura
            </span>
            <p className="mt-1 text-base font-black tracking-tight text-slate-800 dark:text-slate-200">
              R${' '}
              {totalValue.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Já Pago
            </span>
            <p className="mt-1 text-base font-black tracking-tight text-emerald-600 dark:text-emerald-400">
              R${' '}
              {paidAmount.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
              Saldo Restante
            </span>
            <p
              className={`mt-1 text-base font-black tracking-tight ${
                remainingAmount > 0.01 ? 'text-rose-600' : 'text-slate-400'
              }`}
            >
              R${' '}
              {remainingAmount.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        {/* ─── TABS: COMPRAS / HISTÓRICO ──────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <TabsTrigger
              value="swipes"
              className="rounded-lg text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900"
            >
              <Receipt className="mr-1.5 h-3.5 w-3.5" />
              Compras ({virtualTransaction.swipes?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="rounded-lg text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900"
            >
              <History className="mr-1.5 h-3.5 w-3.5" />
              Pagamentos ({virtualTransaction.payments?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="swipes" className="mt-3">
            <div className="max-h-[220px] overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800">
              <Table>
                <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80">
                  <TableRow className="border-slate-100 dark:border-slate-800">
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Vencimento
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Descrição
                    </TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Valor
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {virtualTransaction.swipes?.map((swipe) => (
                    <TableRow
                      key={swipe.id}
                      className="border-slate-100 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/50"
                    >
                      <TableCell className="py-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {dayjs(swipe.data_vencimento).format('DD/MM/YYYY')}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate py-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {swipe.description || 'Compra em cartão'}
                      </TableCell>
                      <TableCell className="py-2 text-right text-xs font-black tabular-nums text-slate-800 dark:text-slate-100">
                        R${' '}
                        {(swipe.totalValue ?? swipe.amount).toLocaleString(
                          'pt-BR',
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {virtualTransaction.swipes?.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-6 text-center text-xs font-bold text-slate-400"
                      >
                        Nenhuma compra registrada nesta fatura.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="mt-3">
            <div className="max-h-[220px] overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800">
              <Table>
                <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80">
                  <TableRow className="border-slate-100 dark:border-slate-800">
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Data
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Conta
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Forma
                    </TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Valor
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {virtualTransaction.payments?.map((payment) => (
                    <TableRow
                      key={payment.id}
                      className="border-slate-100 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/50"
                    >
                      <TableCell className="py-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {dayjs(payment.data_vencimento).format('DD/MM/YYYY')}
                      </TableCell>
                      <TableCell className="py-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {payment.accounts?.name || 'Conta Padrão'}
                      </TableCell>
                      <TableCell className="py-2 text-xs font-medium uppercase text-slate-500">
                        {payment.payment_method}
                      </TableCell>
                      <TableCell className="py-2 text-right text-xs font-black tabular-nums text-emerald-600">
                        R${' '}
                        {(payment.totalValue ?? payment.amount).toLocaleString(
                          'pt-BR',
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!virtualTransaction.payments ||
                    virtualTransaction.payments.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-6 text-center text-xs font-bold text-slate-400"
                      >
                        Nenhum pagamento efetuado até o momento.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* ─── ÁREA DE BAIXA / LIQUIDAÇÃO ─────────────────────────────── */}
        {!isFullyPaid ? (
          <div className="space-y-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-rose-600" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Registrar Pagamento da Fatura
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Conta Bancária */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Conta de Saída *
                </Label>
                <Select
                  value={selectedAccountId}
                  onValueChange={setSelectedAccountId}
                >
                  <SelectTrigger className="h-9 rounded-xl border-slate-200 bg-white text-xs font-bold dark:border-slate-800 dark:bg-slate-950">
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountsData?.accounts?.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id} className="text-xs">
                        {acc.name} (Saldo: R${' '}
                        {acc.balance.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                        )
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data de Pagamento */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Data do Pagamento *
                </Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="h-9 rounded-xl border-slate-200 bg-white text-xs font-bold dark:border-slate-800 dark:bg-slate-950"
                  />
                  <Calendar className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Forma de Pagamento
                </Label>
                <Select
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                >
                  <SelectTrigger className="h-9 rounded-xl border-slate-200 bg-white text-xs font-bold dark:border-slate-800 dark:bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX" className="text-xs">
                      PIX
                    </SelectItem>
                    <SelectItem value="DEBIT_CARD" className="text-xs">
                      Débito em Conta
                    </SelectItem>
                    <SelectItem value="BOLETO" className="text-xs">
                      Boleto Bancário
                    </SelectItem>
                    <SelectItem value="TRANSFER" className="text-xs">
                      Transferência / TED
                    </SelectItem>
                    <SelectItem value="CASH" className="text-xs">
                      Dinheiro
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Valor a Pagar com Botão de Quitar Total */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Valor a Pagar (R$) *
                  </Label>
                  <button
                    type="button"
                    onClick={() => setAmountToPay(remainingAmount.toFixed(2))}
                    className="text-[10px] font-black text-rose-600 hover:underline dark:text-rose-400"
                  >
                    Pagar Total
                  </button>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remainingAmount}
                  value={amountToPay}
                  onChange={(e) => setAmountToPay(e.target.value)}
                  placeholder="0.00"
                  className="h-9 rounded-xl border-slate-200 bg-white text-xs font-black dark:border-slate-800 dark:bg-slate-950"
                />
              </div>
            </div>

            {/* Alerta de Baixa Parcial / Total */}
            {isPartialPayment && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Baixa Parcial:</strong> Restará um saldo devedor de{' '}
                  <strong>
                    R${' '}
                    {balanceAfterPayment.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </strong>{' '}
                  nesta fatura.
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-black text-emerald-900 dark:text-emerald-200">
                Fatura 100% Quitada
              </p>
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Todas as despesas deste ciclo foram quitadas e debitadas do extrato bancário.
              </p>
            </div>
          </div>
        )}

        {/* ─── FOOTER ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button
            variant="outline"
            className="rounded-xl border-slate-200/80 font-bold dark:border-slate-800"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>

          {!isFullyPaid && (
            <Button
              className="flex h-10 items-center gap-1.5 rounded-xl bg-rose-600 px-5 text-xs font-black uppercase tracking-wider text-white hover:bg-rose-700"
              onClick={handleConfirmPayment}
              disabled={isPending || parsedAmountToPay <= 0}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {isPartialPayment
                    ? `Confirmar Baixa Parcial (R$ ${parsedAmountToPay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`
                    : 'Confirmar Baixa na Fatura'}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
