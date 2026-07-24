import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Check,
  DollarSign,
  Edit2,
  Loader2,
  Paperclip,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { getAccounts } from '@/api/get-accounts'
import { getSectors } from '@/api/get-sectors'
import { updateTransaction } from '@/api/update-transaction'
import { deleteFileTransaction, uploadFileTransaction } from '@/api/upload-file'
import { FileUpload } from '@/components/file-upload'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

const updateSchema = z.object({
  description: z.string().min(1, 'A descrição é obrigatória.'),
  amount: z
    .string()
    .min(1, 'O valor é obrigatório.')
    .refine((val) => {
      const num = parseFloat(val.replace(',', '.'))
      return !isNaN(num) && num > 0
    }, 'Valor deve ser maior que zero'),
  data_vencimento: z.date({
    required_error: 'A data é obrigatória.',
  }),
  accountId: z.string().min(1, 'Conta/Caixa é obrigatório'),
  sectorId: z.string().optional(),
  updateAllInGroup: z.boolean().default(false),
})

type UpdateFormData = z.infer<typeof updateSchema>

interface Transaction {
  id: string
  data_vencimento: Date
  data_emissao: Date
  description: string
  confirmed: boolean
  checked?: boolean
  operation: 'income' | 'expense'
  amount: number
  totalValue?: number
  interest?: number
  discount?: number
  payment_method?: string
  attachment_url?: string | null
  sectors: { name: string; id?: string } | null
  accounts: { name: string; id: string }
  transaction_group_id?: string | null
}

interface TransactionDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction | null
  initialMode?: 'view' | 'edit'
}

export function TransactionDetailsModal({
  open,
  onOpenChange,
  transaction,
  initialMode = 'view',
}: TransactionDetailsModalProps) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode)
  const isReadOnly = mode === 'view'

  const [isVencimentoOpen, setIsVencimentoOpen] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Fetch Auxiliar Data
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
    enabled: open && !isReadOnly,
  })

  const { data: sectorsData } = useQuery({
    queryKey: ['sectors'],
    queryFn: getSectors,
    enabled: open && !isReadOnly,
  })

  const form = useForm<UpdateFormData>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      description: '',
      amount: '',
      data_vencimento: new Date(),
      accountId: '',
      sectorId: 'none',
      updateAllInGroup: false,
    },
  })

  useEffect(() => {
    if (open && transaction) {
      setMode(initialMode)
      setReceiptFile(null)
      form.reset({
        description: transaction.description || '',
        amount: (transaction.totalValue ?? transaction.amount).toFixed(2),
        data_vencimento: new Date(transaction.data_vencimento),
        accountId: transaction.accounts.id,
        sectorId: transaction.sectors?.id || 'none',
        updateAllInGroup: false,
      })
    }
  }, [open, transaction, initialMode, form])

  const { mutateAsync: updateFn, isPending } = useMutation({
    mutationFn: updateTransaction,
    onSuccess: () => {
      toast.success('Transação atualizada com sucesso.')
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      onOpenChange(false)
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message || err.message || 'Erro ao atualizar.'
      toast.error('Falha na atualização: ' + msg)
    },
  })

  async function handleRemoveAttachment() {
    if (!transaction) return
    if (!confirm('Tem certeza que deseja excluir o anexo desta transação?'))
      return

    try {
      await deleteFileTransaction(transaction.id)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      toast.success('Anexo removido com sucesso.')
    } catch (e) {
      console.error(e)
      toast.error('Erro ao remover o anexo.')
    }
  }

  async function onSubmit(data: UpdateFormData) {
    if (!transaction) return

    try {
      // Upload do comprovante ANTES da atualização para evitar race condition na invalidação de queries
      if (receiptFile) {
        setIsUploading(true)
        try {
          await uploadFileTransaction(transaction.id, receiptFile)
        } catch (uploadErr) {
          console.error('Erro no upload do comprovante:', uploadErr)
          toast.warning('Transação salva, mas falha ao enviar comprovante.')
        } finally {
          setIsUploading(false)
        }
      }

      await updateFn({
        id: transaction.id,
        description: data.description,
        amount: parseFloat(data.amount.replace(',', '.')),
        data_vencimento: data.data_vencimento,
        account_id: data.accountId,
        sector_id: data.sectorId === 'none' ? null : data.sectorId || null,
        updateAllInGroup: data.updateAllInGroup,
      })
    } catch (e) {
      // handled by mutator
    }
  }

  if (!transaction) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-auto max-h-[95vh] w-full flex-col overflow-hidden rounded-2xl border-none p-0 shadow-2xl sm:max-w-[600px]">
        <div
          className={cn(
            'flex items-center justify-between border-b px-6 py-5',
            transaction.operation === 'income'
              ? 'bg-emerald-50/50 dark:bg-emerald-900/10'
              : 'bg-red-50/50 dark:bg-red-900/10',
          )}
        >
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'rounded-full p-3 shadow-sm',
                transaction.operation === 'income'
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-500'
                  : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-500',
              )}
            >
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {isReadOnly ? 'Detalhes da Transação' : 'Editar Transação'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Modal para visualizar ou editar os detalhes da transação
                selecionada.
              </DialogDescription>
              <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                {isReadOnly
                  ? 'Visualize as informações detalhadas.'
                  : 'Altere os campos permitidos e confirme.'}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'border-0 px-3 py-1 text-sm font-bold uppercase tracking-widest',
              transaction.operation === 'income'
                ? 'bg-emerald-200/50 text-emerald-700 dark:bg-emerald-800/30'
                : 'bg-red-200/50 text-red-700 dark:bg-red-800/30',
            )}
          >
            {transaction.operation === 'income' ? 'Receita' : 'Despesa'}
          </Badge>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                (e.target instanceof HTMLInputElement ||
                  e.target instanceof HTMLSelectElement)
              ) {
                e.preventDefault()
                const formElements = Array.from(
                  e.currentTarget.elements,
                ) as HTMLElement[]
                const index = formElements.indexOf(e.target as HTMLElement)
                if (index > -1 && index < formElements.length - 1) {
                  const nextElement = formElements[index + 1]
                  if (nextElement) nextElement.focus()
                }
              }
            }}
            className="flex w-full flex-1 flex-col overflow-y-auto"
          >
            <div className="space-y-5 p-6">
              {/* GROUP WARNING */}
              {transaction.transaction_group_id && !isReadOnly && (
                <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/20">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold leading-tight text-amber-800 dark:text-amber-400">
                      Atenção: Esta transação faz parte de um parcelamento.
                    </p>
                    <FormField
                      control={form.control}
                      name="updateAllInGroup"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Switch
                              disabled={isReadOnly}
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="cursor-pointer text-xs font-bold text-amber-700 dark:text-amber-500">
                            Aplicar alterações para as demais parcelas pendentes
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* AMOUNT */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-1.5">
                    <FormLabel className="flex items-center text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                      <span>Montante (R$)</span>
                      {!isReadOnly && (
                        <span className="ml-1 font-bold text-red-500">*</span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isReadOnly}
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        className={cn(
                          'h-12 rounded-xl border-border/70 text-base font-medium',
                          isReadOnly
                            ? 'cursor-default bg-muted/30 font-bold opacity-80'
                            : 'bg-background',
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* DESCRIÇÃO / OBSERVAÇÃO */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="flex items-center text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                      <span>Descrição / Observação</span>
                      {!isReadOnly && (
                        <span className="ml-1 font-bold text-red-500">*</span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isReadOnly}
                        className={cn(
                          'h-12 rounded-xl border-border/70 text-base font-medium',
                          isReadOnly
                            ? 'cursor-default bg-muted/30 opacity-80'
                            : 'bg-background',
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* VENCIMENTO */}
              <FormField
                control={form.control}
                name="data_vencimento"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-1.5">
                    <FormLabel className="flex items-center text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                      <span>Vencimento</span>
                      {!isReadOnly && (
                        <span className="ml-1 font-bold text-red-500">*</span>
                      )}
                    </FormLabel>
                    {isReadOnly ? (
                      <div className="flex h-12 items-center rounded-xl border border-border/70 bg-muted/30 px-3 text-base font-medium opacity-80">
                        <CalendarIcon className="mr-2 h-5 w-5 text-slate-400" />
                        {format(field.value, 'dd/MM/yyyy')}
                      </div>
                    ) : (
                      <Popover
                        modal={true}
                        open={isVencimentoOpen}
                        onOpenChange={setIsVencimentoOpen}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              type="button"
                              className={cn(
                                'h-12 w-full justify-start rounded-xl border-border/70 bg-background text-left text-base font-medium transition-colors hover:border-border hover:bg-muted/30',
                                !field.value && 'text-muted-foreground',
                              )}
                            >
                              <CalendarIcon className="mr-2 h-5 w-5 flex-shrink-0 text-slate-400" />
                              {field.value ? (
                                format(field.value, 'dd/MM/yyyy')
                              ) : (
                                <span>Selecione</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          className="z-[9999] w-auto p-0"
                          align="start"
                        >
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(date)
                                setIsVencimentoOpen(false)
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* CONTA */}
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="flex items-center text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                        <span>Conta Fluxo</span>
                        {!isReadOnly && (
                          <span className="ml-1 font-bold text-red-500">*</span>
                        )}
                      </FormLabel>
                      {isReadOnly ? (
                        <div className="flex h-12 items-center rounded-xl border border-border/70 bg-muted/30 px-3 text-base font-medium opacity-80">
                          {transaction.accounts.name}
                        </div>
                      ) : (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl border-border/70 bg-background text-base font-medium">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accountsData?.accounts?.map((acc) => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* SETOR */}
                <FormField
                  control={form.control}
                  name="sectorId"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="flex items-center text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                        <span>Categoria</span>
                        {!isReadOnly && (
                          <span className="ml-1 font-bold text-red-500">*</span>
                        )}
                      </FormLabel>
                      {isReadOnly ? (
                        <div className="flex h-12 items-center rounded-xl border border-border/70 bg-muted/30 px-3 text-base font-medium opacity-80">
                          {transaction.sectors?.name || 'Não informada'}
                        </div>
                      ) : (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl border-border/70 bg-background text-base font-medium">
                              <SelectValue placeholder="Selecione (Opcional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">
                              (Limpar Categoria)
                            </SelectItem>
                            {sectorsData?.data?.sectors?.map((sec) => (
                              <SelectItem key={sec.id} value={sec.id}>
                                {sec.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* LIQUIDATION DETAILS & CONCILIATION */}
              {isReadOnly && (
                <div className="mt-2 space-y-4 border-t border-border/60 pt-5">
                  <h4 className="text-[11px] font-black uppercase leading-none tracking-widest text-slate-400 dark:text-slate-500">
                    Liquidação & Conciliação
                  </h4>

                  <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                    {/* Status de Confirmação */}
                    <div className="space-y-1.5">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Status
                      </span>
                      <Badge
                        className={cn(
                          'rounded-lg border-0 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider shadow-none',
                          transaction.confirmed
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400',
                        )}
                      >
                        {transaction.confirmed ? 'Liquidada' : 'Pendente'}
                      </Badge>
                    </div>

                    {/* Status de Conferência */}
                    <div className="space-y-1.5">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Conferência
                      </span>
                      <Badge
                        className={cn(
                          'rounded-lg border-0 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider shadow-none',
                          transaction.checked
                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-400'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-900/50 dark:text-slate-400',
                        )}
                      >
                        {transaction.checked ? 'Conferido' : 'Não Conferido'}
                      </Badge>
                    </div>

                    {/* Método de Pagamento */}
                    <div className="space-y-1.5">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Meio de Pagamento
                      </span>
                      <span className="text-slate-750 dark:text-slate-350 text-sm font-bold uppercase tracking-wider">
                        {transaction.payment_method || '-'}
                      </span>
                    </div>

                    {/* Juros */}
                    {transaction.confirmed && (
                      <div className="space-y-1.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Juros
                        </span>
                        <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                          {transaction.interest
                            ? `+ R$ ${transaction.interest.toFixed(2)}`
                            : 'R$ 0,00'}
                        </span>
                      </div>
                    )}

                    {/* Desconto */}
                    {transaction.confirmed && (
                      <div className="space-y-1.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Desconto
                        </span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {transaction.discount
                            ? `- R$ ${transaction.discount.toFixed(2)}`
                            : 'R$ 0,00'}
                        </span>
                      </div>
                    )}

                    {/* Valor Total Liquidado */}
                    {transaction.confirmed && (
                      <div className="space-y-1.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Total Liquidado
                        </span>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                          R${' '}
                          {(
                            transaction.totalValue ?? transaction.amount
                          ).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* COMPROVANTE */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                  <label className="text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                    Comprovante
                  </label>
                </div>
                <FileUpload
                  onFileSelect={isReadOnly ? () => {} : setReceiptFile}
                  currentFileUrl={transaction.attachment_url || null}
                  publicReceiptUrl={
                    transaction.attachment_url
                      ? `${window.location.origin}/comprovante/${transaction.id}`
                      : null
                  }
                  readOnly={isReadOnly}
                  onRemoveExistingFile={handleRemoveAttachment}
                />
                {isReadOnly && !transaction.attachment_url && (
                  <p className="text-xs italic text-muted-foreground">
                    Nenhum comprovante anexado.
                  </p>
                )}
              </div>
            </div>

            {/* FOOTER */}
            <div className="mt-auto flex flex-col justify-end gap-3 rounded-b-2xl border-t bg-slate-50/50 p-6 dark:bg-slate-900/20 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-xl px-6 font-bold"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {isReadOnly ? 'Fechar' : 'Cancelar'}
              </Button>

              {isReadOnly ? (
                <Button
                  type="button"
                  className="h-12 rounded-xl bg-slate-900 px-6 font-bold text-white hover:bg-slate-800"
                  onClick={(e) => {
                    e.preventDefault()
                    setMode('edit')
                  }}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Habilitar Edição
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isPending || isUploading}
                  className="h-12 rounded-xl bg-blue-600 px-8 font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
                >
                  {isPending || isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
