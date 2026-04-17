import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Check, DollarSign, Loader2, Edit2, AlertCircle, Paperclip } from 'lucide-react'
import { toast } from 'sonner'

import { updateTransaction } from '@/api/update-transaction'
import { uploadFileTransaction, deleteFileTransaction } from '@/api/upload-file'
import { getAccounts } from '@/api/get-accounts'
import { getSectors } from '@/api/get-sectors'
import { FileUpload } from '@/components/file-upload'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

const updateSchema = z.object({
  description: z.string().min(1, 'A descrição é obrigatória.'),
  amount: z.string().min(1, 'O valor é obrigatório.').refine(
    (val) => {
      const num = parseFloat(val.replace(',', '.'))
      return !isNaN(num) && num > 0
    },
    'Valor deve ser maior que zero'
  ),
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
  operation: 'income' | 'expense'
  amount: number
  totalValue?: number
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
      const msg = err?.response?.data?.message || err.message || 'Erro ao atualizar.'
      toast.error('Falha na atualização: ' + msg)
    },
  })

  async function handleRemoveAttachment() {
    if (!transaction) return
    if (!confirm('Tem certeza que deseja excluir o anexo desta transação?')) return

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
        sector_id: data.sectorId === 'none' ? null : (data.sectorId || null),
        updateAllInGroup: data.updateAllInGroup,
      })
    } catch (e) {
      // handled by mutator
    }
  }

  if (!transaction) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] w-full p-0 overflow-hidden flex flex-col h-auto max-h-[95vh] rounded-2xl border-none shadow-2xl">
        <div className={cn(
          "px-6 py-5 border-b flex items-center justify-between",
          transaction.operation === 'income' ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 'bg-red-50/50 dark:bg-red-900/10'
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-full shadow-sm",
              transaction.operation === 'income' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-500' : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-500'
            )}>
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {isReadOnly ? 'Detalhes da Transação' : 'Editar Transação'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Modal para visualizar ou editar os detalhes da transação selecionada.
              </DialogDescription>
              <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                {isReadOnly ? 'Visualize as informações detalhadas.' : 'Altere os campos permitidos e confirme.'}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "px-3 py-1 text-sm font-bold uppercase tracking-widest border-0",
              transaction.operation === 'income' ? 'bg-emerald-200/50 text-emerald-700 dark:bg-emerald-800/30' : 'bg-red-200/50 text-red-700 dark:bg-red-800/30'
            )}
          >
            {transaction.operation === 'income' ? 'Receita' : 'Despesa'}
          </Badge>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-y-auto w-full">
            <div className="p-6 space-y-5">
            
              {/* GROUP WARNING */}
              {transaction.transaction_group_id && !isReadOnly && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-amber-800 dark:text-amber-400 font-semibold leading-tight">
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
                           <FormLabel className="text-xs text-amber-700 dark:text-amber-500 cursor-pointer font-bold">
                             Aplicar alterações para as demais parcelas pendentes
                           </FormLabel>
                         </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* VENCIMENTO */}
                <FormField
                  control={form.control}
                  name="data_vencimento"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-1.5">
                      <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                        Vencimento
                      </FormLabel>
                      {isReadOnly ? (
                        <div className="flex h-12 items-center rounded-xl border border-border/70 bg-muted/30 px-3 text-base font-medium opacity-80">
                           <CalendarIcon className="mr-2 h-5 w-5 text-slate-400" />
                           {format(field.value, 'dd/MM/yyyy')}
                        </div>
                      ) : (
                        <Popover modal={true} open={isVencimentoOpen} onOpenChange={setIsVencimentoOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                type="button"
                                className={cn(
                                  "w-full justify-start text-left font-medium h-12 rounded-xl border-border/70 bg-background hover:bg-muted/30 hover:border-border transition-colors text-base",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-5 w-5 text-slate-400 flex-shrink-0" />
                                {field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione</span>}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => { if (date) { field.onChange(date); setIsVencimentoOpen(false) } }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* AMOUNT */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-1.5">
                      <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                        Montante (R$)
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={isReadOnly}
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          className={cn(
                            "h-12 rounded-xl border-border/70 text-base font-medium",
                            isReadOnly ? "bg-muted/30 opacity-80 cursor-default font-bold" : "bg-background"
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* DESCRIÇÃO */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                      Descrição
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isReadOnly}
                        className={cn(
                          "h-12 rounded-xl border-border/70 text-base font-medium",
                          isReadOnly ? "bg-muted/30 opacity-80 cursor-default" : "bg-background"
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* CONTA */}
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                        Conta Fluxo
                      </FormLabel>
                      {isReadOnly ? (
                        <div className="flex h-12 items-center rounded-xl border border-border/70 bg-muted/30 px-3 text-base font-medium opacity-80">
                          {transaction.accounts.name}
                        </div>
                      ) : (
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl border-border/70 bg-background font-medium text-base">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accountsData?.accounts?.map((acc) => (
                              <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
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
                      <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                        Categoria
                      </FormLabel>
                      {isReadOnly ? (
                        <div className="flex h-12 items-center rounded-xl border border-border/70 bg-muted/30 px-3 text-base font-medium opacity-80">
                          {transaction.sectors?.name || 'Não informada'}
                        </div>
                      ) : (
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl border-border/70 bg-background font-medium text-base">
                              <SelectValue placeholder="Selecione (Opcional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">(Limpar Categoria)</SelectItem>
                            {sectorsData?.data?.sectors?.map((sec) => (
                              <SelectItem key={sec.id} value={sec.id}>{sec.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* COMPROVANTE */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                  <label className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
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
                  <p className="text-xs text-muted-foreground italic">Nenhum comprovante anexado.</p>
                )}
              </div>

            </div>

            {/* FOOTER */}
            <div className="p-6 border-t mt-auto bg-slate-50/50 dark:bg-slate-900/20 flex flex-col sm:flex-row justify-end gap-3 rounded-b-2xl">
              <Button
                type="button"
                variant="outline"
                className="h-12 px-6 rounded-xl font-bold"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {isReadOnly ? 'Fechar' : 'Cancelar'}
              </Button>

              {isReadOnly ? (
                <Button
                  type="button"
                  className="h-12 px-6 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white"
                  onClick={(e) => {
                    e.preventDefault()
                    setMode('edit')
                  }}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Habilitar Edição
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isPending || isUploading}
                  className="h-12 px-8 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                >
                  {(isPending || isUploading) ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
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
