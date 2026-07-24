import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  History,
  Plus,
  Trash2,
  Utensils,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  cancelPayrollEntry,
  createPayrollEntry,
  listPendingDebts,
} from '@/api/hr/payroll'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'

// Schema
const formSchema = z.object({
  type: z.enum(['VALE', 'ERRO', 'CONSUMACAO']),
  amount: z.coerce.number().min(0.01, 'Valor deve ser maior que zero'),
  description: z.string().min(3, 'Descrição obrigatória'),
  referenceDate: z.string(), // Default to today
})

interface DebtDialogProps {
  employeeId: string
  employeeName: string
}

export function DebtManagementDialog({
  employeeId,
  employeeName,
}: DebtDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  // 1. Fetch Pending Debts
  const { data: debts, isLoading } = useQuery({
    queryKey: ['pending-debts', employeeId],
    queryFn: () => listPendingDebts(employeeId),
    enabled: open, // Only fetch when open
  })

  // 2. Form Setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'VALE',
      amount: 0,
      description: '',
      referenceDate: new Date().toISOString().split('T')[0],
    },
  })

  // 3. Create Mutation
  const { mutate: createDebt, isPending } = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // All amounts are stored as POSITIVE values.
      // The type (ERRO/CONSUMACAO vs VALE) determines if it's a deduction or advance.
      // This avoids double-inversion bugs when the backend subtracts debts.
      const finalAmount = Math.abs(data.amount)

      return createPayrollEntry({
        employee_id: employeeId,
        type: data.type,
        amount: finalAmount,
        description: data.description,
        referenceDate: data.referenceDate,
      })
    },
    onSuccess: () => {
      toast.success('Lançamento registrado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['pending-debts', employeeId] })
      form.reset({
        type: 'VALE',
        amount: 0,
        description: '',
        referenceDate: new Date().toISOString().split('T')[0],
      })
    },
    onError: () => toast.error('Erro ao registrar lançamento.'),
  })

  // 4. Cancel Mutation
  const { mutate: cancelEntry } = useMutation({
    mutationFn: (id: string) => cancelPayrollEntry(id),
    onSuccess: () => {
      toast.success('Lançamento cancelado!')
      queryClient.invalidateQueries({ queryKey: ['pending-debts', employeeId] })
    },
    onError: () => toast.error('Erro ao cancelar lançamento.'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
        >
          <Wallet className="h-4 w-4" />
          Débitos / Vales
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[700px]">
        <DialogHeader className="bg-muted/30 p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-orange-600" />
            Gestão Financeira: {employeeName}
          </DialogTitle>
          <DialogDescription>
            Gerencie vales, adiantamentos e débitos (quebras/consumo) para
            desconto em folha.
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[500px] flex-col md:flex-row">
          {/* Left: Form */}
          <div className="flex w-full flex-col gap-4 border-r bg-muted/10 p-6 md:w-1/2">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              <Plus className="h-4 w-4" /> Novo Lançamento
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => createDebt(data))}
                className="flex flex-1 flex-col gap-4"
              >
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Lançamento</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent withPortal={false}>
                          <SelectItem value="VALE">
                            <div className="flex items-center gap-2">
                              <Wallet className="h-4 w-4 text-emerald-600" />{' '}
                              Vale (Adiantamento)
                            </div>
                          </SelectItem>
                          <SelectItem value="ERRO">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-red-600" />{' '}
                              Erro / Quebra
                            </div>
                          </SelectItem>
                          <SelectItem value="CONSUMACAO">
                            <div className="flex items-center gap-2">
                              <Utensils className="h-4 w-4 text-orange-600" />{' '}
                              Consumo Interno
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor (R$)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="bg-background"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="referenceDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="bg-background"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição / Motivo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Quebra de copo, adiantamento..."
                          className="bg-background"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="mt-auto pt-4">
                  <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? 'Processando...' : 'Confirmar Lançamento'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Right: List */}
          <div className="flex w-full flex-col bg-background md:w-1/2">
            <div className="flex items-center justify-between border-b bg-muted/5 p-4">
              <h4 className="text-sm font-semibold">Histórico Pendente</h4>
              <span className="rounded-full border bg-muted px-2 py-1 text-xs text-muted-foreground">
                {debts?.length || 0} itens
              </span>
            </div>

            <ScrollArea className="flex-1 p-4">
              {isLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Carregando...
                </p>
              ) : debts?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-50">
                  <History className="mb-2 h-8 w-8" />
                  <p className="text-sm">Nenhum lançamento pendente.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {debts?.map((debt) => {
                    const isDeduction =
                      debt.type === 'ERRO' || debt.type === 'CONSUMACAO'
                    return (
                      <div
                        key={debt.id}
                        className="group flex items-start justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
                      >
                        <div className="flex gap-3">
                          <div
                            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${isDeduction ? 'bg-red-500' : 'bg-emerald-500'}`}
                          />
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {debt.description}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {new Date(
                                  debt.referenceDate ||
                                    debt.created_at ||
                                    new Date(),
                                ).toLocaleDateString()}
                              </span>
                              <span>•</span>
                              <span className="uppercase">
                                {debt.type === 'ERRO'
                                  ? 'Erro/Quebra'
                                  : debt.type === 'CONSUMACAO'
                                    ? 'Consumo'
                                    : 'Vale'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p
                            className={`font-mono text-sm font-semibold ${isDeduction ? 'text-red-600' : 'text-emerald-600'}`}
                          >
                            {isDeduction ? '-' : ''}
                            {formatCurrency(Math.abs(Number(debt.amount)))}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                            onClick={() => {
                              if (confirm('Cancelar este lançamento?')) {
                                cancelEntry(debt.id)
                              }
                            }}
                            title="Cancelar lançamento"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
