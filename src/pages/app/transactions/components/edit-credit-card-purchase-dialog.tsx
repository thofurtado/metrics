import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { updateCreditCardPurchase } from '@/api/credit-card-purchases'
import { getCreditCards } from '@/api/credit-cards'
import { getSectors } from '@/api/get-sectors'
import { getSuppliers } from '@/api/get-suppliers'
import { listHolidays } from '@/api/hr/holidays'
import { SupplierCombobox } from '@/components/supplier-combobox'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
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
import { calculateCreditCardDueDate } from '@/lib/credit-card-due-date'

export interface CreditCardPurchase {
  id: string
  description?: string | null
  amount: number
  totalValue?: number | null
  confirmed: boolean
  credit_card_id: string
  sector_id?: string | null
  supplier_id?: string | null
  data_emissao: string | Date
  data_vencimento: string | Date
}

interface EditCreditCardPurchaseDialogProps {
  purchase: CreditCardPurchase | null
  onOpenChange: (open: boolean) => void
  /** Chamado depois de salvar, para quem abriu fechar a fatura (os dados dela ficam velhos). */
  onSaved: () => void
}

export function EditCreditCardPurchaseDialog({
  purchase,
  onOpenChange,
  onSaved,
}: EditCreditCardPurchaseDialogProps) {
  const queryClient = useQueryClient()
  const open = purchase !== null

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [emissao, setEmissao] = useState('')
  const [cardId, setCardId] = useState('')
  const [sectorId, setSectorId] = useState('')
  const [supplierId, setSupplierId] = useState<string | undefined>()

  const { data: cardsData } = useQuery({
    queryKey: ['credit-cards'],
    queryFn: getCreditCards,
    enabled: open,
  })
  const { data: sectorsData } = useQuery({
    queryKey: ['sectors'],
    queryFn: () => getSectors(),
    enabled: open,
  })
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', 'select'],
    queryFn: () => getSuppliers({ page: 1, perPage: 100 }),
    enabled: open,
  })
  const { data: holidaysData } = useQuery({
    queryKey: ['holidays', new Date().getFullYear()],
    queryFn: () => listHolidays(new Date().getFullYear()),
    staleTime: 10 * 60 * 1000,
    enabled: open,
  })

  useEffect(() => {
    if (!purchase) return
    setDescription(purchase.description ?? '')
    setAmount(Number(purchase.totalValue ?? purchase.amount))
    setEmissao(dayjs(purchase.data_emissao).format('YYYY-MM-DD'))
    setCardId(purchase.credit_card_id)
    setSectorId(purchase.sector_id ?? '')
    setSupplierId(purchase.supplier_id ?? undefined)
  }, [purchase])

  const { mutateAsync: save, isPending } = useMutation({
    mutationFn: (body: Parameters<typeof updateCreditCardPurchase>[1]) =>
      updateCreditCardPurchase(purchase!.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      queryClient.invalidateQueries({ queryKey: ['payables'] })
      toast.success('Compra atualizada.')
      onSaved()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Não foi possível salvar a compra.')
    },
  })

  if (!purchase) return null

  const paid = purchase.confirmed
  const parsedAmount = amount
  const card = cardsData?.creditCards?.find((c) => c.id === cardId)

  // Mostra na hora em qual fatura a compra vai cair (o servidor confirma o cálculo ao salvar).
  const invoicePreview = (() => {
    if (paid || !card || !emissao) return null
    const holidays = (holidaysData?.holidays ?? [])
      .map((h: any) => (typeof h.date === 'string' ? h.date.substring(0, 10) : ''))
      .filter(Boolean)
    const { due_date } = calculateCreditCardDueDate(
      dayjs(emissao).hour(12).toDate(),
      card,
      holidays,
    )
    return dayjs(due_date).format('MMMM [de] YYYY')
  })()

  async function handleSave() {
    if (parsedAmount <= 0) {
      toast.error('Informe o valor da compra.')
      return
    }

    const body: Parameters<typeof updateCreditCardPurchase>[1] = {
      amount: parsedAmount,
      description: description.trim() || null,
      sector_id: sectorId || null,
      supplier_id: supplierId || null,
    }
    if (!paid) {
      if (emissao !== dayjs(purchase!.data_emissao).format('YYYY-MM-DD')) {
        body.data_emissao = dayjs(emissao).hour(12).toDate()
      }
      if (cardId !== purchase!.credit_card_id) body.credit_card_id = cardId
    }
    await save(body)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:max-w-[520px]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-black tracking-tight">
            Editar compra
          </DialogTitle>
          <DialogDescription className="text-xs font-medium">
            {paid
              ? 'Compra já paga na fatura. Se mudar o valor, a diferença acerta o saldo da conta que pagou.'
              : 'Mudar a data da compra ou o cartão pode levar a compra para outra fatura.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs font-bold">Descrição</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Valor (R$)</Label>
              <CurrencyInput
                value={amount}
                onValueChange={(numeric) => setAmount(numeric)}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Data da compra</Label>
              <Input
                type="date"
                value={emissao}
                disabled={paid}
                onChange={(e) => setEmissao(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Cartão</Label>
            <Select value={cardId} onValueChange={setCardId} disabled={paid}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Selecione o cartão" />
              </SelectTrigger>
              <SelectContent>
                {cardsData?.creditCards?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.last_four_digits ? ` •••• ${c.last_four_digits}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {invoicePreview && (
              <p className="text-xs font-semibold capitalize text-slate-500">
                Cai na fatura de {invoicePreview}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Setor</Label>
              <Select
                value={sectorId || 'none'}
                onValueChange={(v) => setSectorId(v === 'none' ? '' : v)}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Sem setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem setor</SelectItem>
                  {sectorsData?.data?.sectors?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Fornecedor</Label>
              <SupplierCombobox
                value={supplierId}
                onSelect={setSupplierId}
                suppliers={suppliersData?.suppliers}
                isLoading={!suppliersData}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button
            variant="outline"
            className="h-11 rounded-xl font-bold"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            className="h-11 rounded-xl bg-rose-600 px-6 font-black hover:bg-rose-700"
            onClick={handleSave}
            disabled={isPending || parsedAmount <= 0}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar compra'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
