import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Calculator,
  CheckCircle2,
  Cpu,
  CreditCard,
  Edit2,
  Percent,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { getAccounts } from '@/api/get-accounts'
import {
  createPOSMachine,
  deletePOSMachine,
  getPOSMachines,
  POSMachineRate,
  updatePOSMachine,
} from '@/api/pos-machines'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Skeleton } from '@/components/ui/skeleton'

export function POSMachinesSettings() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [accountId, setAccountId] = useState<string>('none')

  // Rate Matrix State
  const [rates, setRates] = useState<POSMachineRate[]>([])

  // Simulator State
  const [simulatedAmount, setSimulatedAmount] = useState('100.00')

  const { data: machines, isLoading } = useQuery({
    queryKey: ['pos-machines'],
    queryFn: getPOSMachines,
  })

  const { data: accountsResult } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
  })

  const { mutateAsync: saveMachine, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      if (editingId) {
        return updatePOSMachine({
          id: editingId,
          name,
          account_id: accountId === 'none' ? null : accountId,
          rates,
        })
      } else {
        return createPOSMachine({
          name,
          account_id: accountId === 'none' ? null : accountId,
          rates,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-machines'] })
      toast.success(
        editingId
          ? 'Maquininha atualizada com sucesso!'
          : 'Maquininha criada com sucesso!',
      )
      handleCloseModal()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao salvar maquininha.')
    },
  })

  const { mutateAsync: removeMachine } = useMutation({
    mutationFn: deletePOSMachine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-machines'] })
      toast.success('Maquininha removida com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao remover maquininha.')
    },
  })

  const handleOpenCreate = () => {
    setEditingId(null)
    setName('')
    setAccountId('none')
    setRates([])
    setIsModalOpen(true)
  }

  const handleOpenEdit = (machine: any) => {
    setEditingId(machine.id)
    setName(machine.name)
    setAccountId(machine.account_id || 'none')
    setRates(
      machine.rates && machine.rates.length > 0
        ? machine.rates.map((r: any) => ({
            payment_category: r.payment_category,
            installments: r.installments,
            tax_percentage: r.tax_percentage,
            settlement_days: r.settlement_days || 1,
          }))
        : [],
    )
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setName('')
    setAccountId('none')
  }

  const handleUpdateRatePercentage = (index: number, val: number) => {
    const newRates = [...rates]
    newRates[index].tax_percentage = val
    setRates(newRates)
  }

  const handleAddRateRow = () => {
    setRates([
      ...rates,
      {
        payment_category: 'DÉBITO',
        installments: 1,
        tax_percentage: 0,
        settlement_days: 1,
      },
    ])
  }

  const handleRemoveRateRow = (index: number) => {
    setRates(rates.filter((_, i) => i !== index))
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-10">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
            <Cpu className="h-8 w-8 text-primary" />
            Maquininhas & Taxas de Cartão
          </h1>
          <p className="text-sm text-muted-foreground">
            Cadastre operadoras de cartão (Stone, Safra, PagBank), vincule à
            conta bancária e configure as taxas de cada modalidade.
          </p>
        </div>

        <Button
          size="lg"
          onClick={handleOpenCreate}
          className="bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/25 transition-all hover:to-primary active:scale-95"
        >
          <Plus className="mr-2 h-5 w-5" /> Nova Maquininha
        </Button>
      </div>

      {/* Grid de Maquininhas */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-4 rounded-2xl border bg-card p-6">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))
        ) : (machines || []).length === 0 ? (
          <div className="col-span-2 rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            Nenhuma maquininha cadastrada ainda. Clique em "Nova Maquininha"
            para começar.
          </div>
        ) : (
          machines?.map((machine) => {
            const account = accountsResult?.accounts?.find(
              (a) => a.id === machine.account_id,
            )
            const ratesCount = machine.rates?.length || 0

            return (
              <div
                key={machine.id}
                className="group relative flex flex-col justify-between rounded-2xl border bg-card p-6 shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="flex items-center gap-2 text-xl font-bold tracking-tight">
                        <CreditCard className="h-5 w-5 text-primary" />
                        {machine.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-2">
                        {account ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          >
                            <Wallet className="mr-1 h-3 w-3" />
                            {account.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Sem conta bancária vinculada
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEdit(machine)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeMachine(machine.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Resumo de Taxas */}
                  <div className="space-y-2 rounded-xl bg-muted/40 p-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      Taxas Configuradas ({ratesCount})
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {(machine.rates || []).slice(0, 4).map((r, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg border bg-background p-2"
                        >
                          <span className="flex items-center gap-1 font-semibold text-muted-foreground">
                            {r.payment_category}{' '}
                            {r.installments > 1
                              ? `${r.installments}x`
                              : 'À vista'}
                            <span className="ml-1 rounded bg-slate-100 px-1 text-[9px] font-bold text-slate-500 dark:bg-slate-800">
                              D+{r.settlement_days || 1}
                            </span>
                          </span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {r.tax_percentage.toFixed(2)}%
                          </span>
                        </div>
                      ))}
                    </div>
                    {ratesCount > 4 && (
                      <p className="pt-1 text-center text-[10px] font-semibold text-muted-foreground">
                        + {ratesCount - 4} outras faixas de taxas
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal de Criação / Edição de Maquininha */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              {editingId ? 'Editar Maquininha' : 'Nova Maquininha'}
            </DialogTitle>
            <DialogDescription>
              Configure o nome da maquininha, a conta bancária de recebimento e
              a matriz de taxas por modalidade.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Maquininha</Label>
                <Input
                  id="name"
                  placeholder="Ex: Stone Balcão, Safra Garçom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountId">Conta Bancária Vinculada</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione a conta..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      Nenhuma (Conta Genérica)
                    </SelectItem>
                    {accountsResult?.accounts?.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Matriz Interativa de Taxas */}
            <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="flex items-center gap-1.5 text-sm font-bold">
                    <Percent className="h-4 w-4 text-primary" />
                    Tabela de Taxas % por Categoria e Parcela
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Define a taxa cobrada pela maquininha em cada tipo de
                    pagamento no PDV.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={handleAddRateRow}>
                  + Adicionar Faixa
                </Button>
              </div>

              <div className="space-y-2">
                {rates.map((rate, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 items-center gap-2 rounded-xl border bg-background p-2"
                  >
                    <div className="col-span-3">
                      <Select
                        value={rate.payment_category}
                        onValueChange={(val) => {
                          const newRates = [...rates]
                          newRates[index].payment_category = val
                          setRates(newRates)
                        }}
                      >
                        <SelectTrigger className="h-9 px-2 text-[10px] font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DÉBITO">Débito</SelectItem>
                          <SelectItem value="CRÉDITO">Crédito</SelectItem>
                          <SelectItem value="VOUCHER">
                            Voucher (VR/VA)
                          </SelectItem>
                          <SelectItem value="PIX">Pix Maquininha</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <Input
                        type="number"
                        min={1}
                        max={18}
                        value={rate.installments}
                        onChange={(e) => {
                          const newRates = [...rates]
                          newRates[index].installments =
                            parseInt(e.target.value, 10) || 1
                          setRates(newRates)
                        }}
                        className="h-9 text-xs"
                        placeholder="Parc."
                      />
                    </div>

                    <div className="relative col-span-4">
                      <Input
                        type="number"
                        step="0.01"
                        value={rate.tax_percentage}
                        onChange={(e) =>
                          handleUpdateRatePercentage(
                            index,
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="h-9 pr-6 font-mono text-xs font-bold"
                        placeholder="Taxa"
                      />
                      <span className="absolute right-2 top-2 text-xs font-bold text-muted-foreground">
                        %
                      </span>
                    </div>

                    <div className="col-span-3">
                      <div className="flex items-center rounded-md border px-2 focus-within:ring-1 focus-within:ring-primary/50">
                        <span className="mr-1 text-[10px] font-bold text-muted-foreground">
                          D+
                        </span>
                        <Input
                          type="number"
                          min={0}
                          max={365}
                          value={rate.settlement_days ?? 0}
                          onChange={(e) => {
                            const newRates = [...rates]
                            newRates[index].settlement_days =
                              e.target.value === ''
                                ? 0
                                : parseInt(e.target.value, 10)
                            setRates(newRates)
                          }}
                          className="h-9 w-full border-0 px-1 py-0 font-mono text-xs font-bold shadow-none focus-visible:ring-0"
                          placeholder="Dias"
                        />
                      </div>
                    </div>

                    <div className="col-span-1 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveRateRow(index)}
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulador de Taxas ao Vivo */}
            <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <Calculator className="h-4 w-4" /> Simulador de Recebimento
                  Líquido
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Valor Venda R$:
                  </span>
                  <Input
                    type="number"
                    value={simulatedAmount}
                    onChange={(e) => setSimulatedAmount(e.target.value)}
                    className="h-8 w-24 bg-background font-mono text-xs font-bold"
                  />
                </div>
              </div>

              {rates.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  {rates.slice(0, 2).map((r, i) => {
                    const amt = parseFloat(simulatedAmount) || 0
                    const fee = (amt * r.tax_percentage) / 100
                    const net = amt - fee
                    return (
                      <div
                        key={i}
                        className="rounded-lg border bg-background p-2 font-mono"
                      >
                        <span className="text-muted-foreground">
                          {r.payment_category} {r.installments}x:{' '}
                        </span>
                        <span className="font-bold text-emerald-600">
                          R$ {net.toFixed(2)}
                        </span>
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          (Taxa R$ {fee.toFixed(2)})
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <Button
              onClick={() => saveMachine()}
              disabled={isSaving || !name.trim()}
              size="lg"
              className="w-full"
            >
              {isSaving
                ? 'Salvando...'
                : editingId
                  ? 'Salvar Alterações'
                  : 'Criar Maquininha'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
