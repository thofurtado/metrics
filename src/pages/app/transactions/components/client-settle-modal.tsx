import { useState, useEffect, useMemo } from 'react'
import { CheckCircle2} from 'lucide-react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { settleTermDebt } from '@/api/settle-term-debt'

interface ClientSettleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: {
    clientName: string
    transactions: any[]
  } | null
  accounts: any[]
}

export function ClientSettleModal({
  open,
  onOpenChange,
  target,
  accounts = []
}: ClientSettleModalProps) {
  const queryClient = useQueryClient()

  const [paymentMode, setPaymentMode] = useState<'total' | 'partial'>('total')
  const [partialAmount, setPartialAmount] = useState<string>('')
  const [actualMethod, setActualMethod] = useState<string>('PIX')
  const [targetAccountId, setTargetAccountId] = useState<string>('')

  // Calculate total amount from selected target transactions
  const totalAmount = useMemo(() => {
    if (!target?.transactions?.length) return 0
    return target.transactions.reduce((acc, tx) => acc + Number(tx.amount || 0), 0)
  }, [target])

  const isMultiple = (target?.transactions?.length || 0) > 1

  // Smart account selection default based on payment method
  useEffect(() => {
    if (!accounts.length) return

    const central = accounts.find(
      (a) =>
        !a.is_transit &&
        (a.name?.toLowerCase().includes('caixa central') ||
          a.name?.toLowerCase().includes('central') ||
          a.name?.toLowerCase().includes('cofre'))
    )

    const bankAcc = accounts.find(
      (a) =>
        !a.is_transit &&
        !a.name?.toLowerCase().includes('caixa central') &&
        !a.name?.toLowerCase().includes('cofre')
    )

    if (actualMethod === 'DINHEIRO') {
      if (central) setTargetAccountId(central.id)
      else if (accounts[0]) setTargetAccountId(accounts[0].id)
    } else {
      if (bankAcc) setTargetAccountId(bankAcc.id)
      else if (accounts[0]) setTargetAccountId(accounts[0].id)
    }
  }, [actualMethod, accounts])

  useEffect(() => {
    if (open) {
      setPaymentMode('total')
      setPartialAmount('')
      setActualMethod('PIX')
    }
  }, [open])

  const parsedPartial = parseFloat(partialAmount.replace(',', '.')) || 0
  const remainingAmount = Math.max(0, totalAmount - parsedPartial)

  const { mutateAsync: settle, isPending } = useMutation({
    mutationFn: async (isWriteOff: boolean) => {
      if (!target?.transactions?.length) return

      if (isMultiple) {
        // Quitação em lote de todas as comandas do cliente
        const ids = target.transactions.map((tx) => tx.id)
        return settleTermDebt({
          transactionIds: ids,
          targetAccountId: isWriteOff ? null : targetAccountId,
          actualPaymentMethod: isWriteOff ? null : actualMethod,
          isWriteOff,
        })
      } else {
        // Quitação de uma única comanda (permite parcial ou total)
        const txId = target.transactions[0].id
        const isPartial = paymentMode === 'partial' && parsedPartial > 0 && parsedPartial < totalAmount

        return settleTermDebt({
          transactionId: txId,
          targetAccountId: isWriteOff ? null : targetAccountId,
          actualPaymentMethod: isWriteOff ? null : actualMethod,
          isWriteOff,
          amountPaid: isPartial ? parsedPartial : null,
        })
      }
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || 'Baixa realizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['pending-settlements-terms'] })
      queryClient.invalidateQueries({ queryKey: ['pending-settlements-terms-all'] })
      queryClient.invalidateQueries({ queryKey: ['settlements-terms'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['finance-metrics'] })
      onOpenChange(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao realizar baixa do débito.')
    },
  })

  if (!target) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-black text-emerald-700 dark:text-emerald-400">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
            <span>Receber Pagamento de Cliente</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Acerto de contas a prazo com crédito imediato no saldo da empresa.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2 font-manrope">
          {/* Card Resumo do Cliente e Dívida */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Cliente Devedor
                </span>
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                  {target.clientName}
                </p>
                {isMultiple && (
                  <span className="mt-0.5 inline-block rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                    {target.transactions.length} comandas acumuladas
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Total em Débito
                </span>
                <p className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            </div>
          </div>

          {/* Opção Quitação Total vs Parcial (quando comanda única) */}
          {!isMultiple && (
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-500">
                Tipo de Quitação
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('total')}
                  className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-xs font-bold transition-all ${
                    paymentMode === 'total'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400'
                  }`}
                >
                  <span>Quitação Total</span>
                  <span className="font-mono text-[11px] font-normal">
                    {totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('partial')}
                  className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-xs font-bold transition-all ${
                    paymentMode === 'partial'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400'
                  }`}
                >
                  <span>Pagamento Parcial</span>
                  <span className="text-[11px] font-normal">Informar valor pago</span>
                </button>
              </div>

              {paymentMode === 'partial' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <Label className="mb-1 block text-[11px] font-bold text-amber-900 dark:text-amber-200">
                    Valor que o cliente está pagando agora (R$):
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={totalAmount}
                    placeholder="0,00"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    className="font-mono text-base font-bold bg-white dark:bg-slate-950"
                  />
                  {parsedPartial > 0 && (
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span>Saldo que continuará pendente:</span>
                      <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                        {remainingAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Seleção de Método e Conta Destino */}
          <div className="space-y-3">
            <div>
              <Label className="mb-1 block text-xs font-black uppercase text-slate-500">
                Forma de Pagamento Recebida
              </Label>
              <Select value={actualMethod} onValueChange={setActualMethod}>
                <SelectTrigger className="rounded-xl bg-white text-xs font-bold dark:bg-slate-950">
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">? Pix</SelectItem>
                  <SelectItem value="DINHEIRO">?? Dinheiro Vivo (Caixa Gaveta)</SelectItem>
                  <SelectItem value="CARTÃO DE CRÉDITO">?? Cartão de Crédito</SelectItem>
                  <SelectItem value="CARTÃO DE DÉBITO">?? Cartão de Débito</SelectItem>
                  <SelectItem value="TRANSFERÊNCIA">?? Transferência Bancária / TED</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1 block text-xs font-black uppercase text-slate-500">
                Conta de Destino (Onde o valor será creditado)
              </Label>
              <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                <SelectTrigger className="rounded-xl bg-white text-xs font-bold dark:bg-slate-950">
                  <SelectValue placeholder="Selecione a conta destino" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    ?.filter((a) => !a.is_transit)
                    .map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} (Saldo Atual: R$ {Number(account.balance || 0).toFixed(2)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="mt-2 flex flex-col gap-2">
            <Button
              onClick={() => settle(false)}
              disabled={
                !targetAccountId ||
                isPending ||
                (paymentMode === 'partial' && (!parsedPartial || parsedPartial <= 0 || parsedPartial > totalAmount))
              }
              className="h-11 w-full gap-2 rounded-xl bg-emerald-600 text-xs font-black uppercase text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700 active:scale-95"
            >
              {isPending ? (
                'Processando recebimento...'
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>
                    Confirmar Recebimento (
                    {(paymentMode === 'partial' && parsedPartial > 0 ? parsedPartial : totalAmount).toLocaleString(
                      'pt-BR',
                      { style: 'currency', currency: 'BRL' }
                    )}
                    )
                  </span>
                </>
              )}
            </Button>

            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase">
                <span className="bg-white px-2 text-slate-400 dark:bg-slate-900">Ou</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => settle(true)}
              disabled={isPending}
              className="w-full rounded-xl border-orange-200 text-xs font-black uppercase text-orange-700 hover:bg-orange-50 dark:border-orange-900/50 dark:text-orange-400"
            >
              Baixar Sem Gerar Saldo (Permuta / Cortesia)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
