import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Tag, ShieldCheck, Box, Clock, Trash2, Edit2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import {
  getPaymentIdentifiers,
  createPaymentIdentifier,
  updatePaymentIdentifier,
  deletePaymentIdentifier,
  PaymentIdentifier,
} from '@/api/payment-identifiers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

export function PaymentIdentifiersSettings() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [isCorrentistaDebt, setIsCorrentistaDebt] = useState(false)
  const [isStockEvasion, setIsStockEvasion] = useState(false)

  const { data: identifiers, isLoading } = useQuery({
    queryKey: ['payment-identifiers'],
    queryFn: getPaymentIdentifiers,
  })

  const { mutateAsync: saveIdentifier, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      if (editingId) {
        return updatePaymentIdentifier({
          id: editingId,
          name,
          is_correntista_debt: isCorrentistaDebt,
          is_stock_evasion: isStockEvasion,
        })
      } else {
        return createPaymentIdentifier({
          name,
          is_correntista_debt: isCorrentistaDebt,
          is_stock_evasion: isStockEvasion,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-identifiers'] })
      toast.success(editingId ? 'Identificador atualizado!' : 'Identificador criado com sucesso!')
      handleCloseModal()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao salvar identificador.')
    },
  })

  const { mutateAsync: removeIdentifier } = useMutation({
    mutationFn: deletePaymentIdentifier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-identifiers'] })
      toast.success('Identificador removido!')
    },
    onError: () => {
      toast.error('Erro ao remover identificador.')
    },
  })

  const handleOpenCreate = () => {
    setEditingId(null)
    setName('')
    setIsCorrentistaDebt(false)
    setIsStockEvasion(false)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: PaymentIdentifier) => {
    setEditingId(item.id)
    setName(item.name)
    setIsCorrentistaDebt(item.is_correntista_debt)
    setIsStockEvasion(item.is_stock_evasion)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setName('')
    setIsCorrentistaDebt(false)
    setIsStockEvasion(false)
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-10">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Tag className="h-8 w-8 text-primary" />
            Identificadores de Caixa & Estoque
          </h1>
          <p className="text-sm text-muted-foreground">
            Cadastre justificativas para lançamentos **A Prazo** (Fiado/Funcionários) e **Operacionais** (Pró-labore, Cortesia, Quebra, Perda).
          </p>
        </div>

        <Button
          size="lg"
          onClick={handleOpenCreate}
          className="bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/25 transition-all hover:to-primary active:scale-95"
        >
          <Plus className="mr-2 h-5 w-5" /> Novo Identificador
        </Button>
      </div>

      {/* Grid de Identificadores */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-6 space-y-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))
        ) : (identifiers || []).length === 0 ? (
          <div className="col-span-3 rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            Nenhum identificador cadastrado ainda. Clique em "Novo Identificador" para criar.
          </div>
        ) : (
          identifiers?.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col justify-between rounded-2xl border bg-card p-6 shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold tracking-tight text-foreground">
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenEdit(item)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeIdentifier(item.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Badges explicativos de comportamento */}
                <div className="space-y-2 pt-2 border-t text-xs">
                  {item.is_correntista_debt && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
                      <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                      <span className="font-semibold">Venda A Prazo (Gera conta a receber)</span>
                    </div>
                  )}

                  {item.is_stock_evasion && (
                    <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-2 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">
                      <Box className="h-4 w-4 shrink-0 text-rose-600" />
                      <span className="font-semibold">Evasão Operacional (Baixa estoque, R$ 0 no caixa, sem NFC-e)</span>
                    </div>
                  )}

                  {!item.is_correntista_debt && !item.is_stock_evasion && (
                    <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      <span>Identificador Simples de Lançamento</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Criação / Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              {editingId ? 'Editar Identificador' : 'Novo Identificador'}
            </DialogTitle>
            <DialogDescription>
              Defina o nome da justificativa e configure se ela afeta contas a receber ou apenas baixa de estoque operacional.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Identificador</Label>
              <Input
                id="name"
                placeholder="Ex: Funcionário, Pró-labore, Permuta, Quebra, Cortesia"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
              />
            </div>

            {/* Checkbox A Prazo */}
            <div className="flex items-start space-x-3 space-y-0 rounded-xl border p-4 bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900">
              <Checkbox
                id="is_correntista_debt"
                checked={isCorrentistaDebt}
                onCheckedChange={(checked) => {
                  setIsCorrentistaDebt(!!checked)
                  if (checked) setIsStockEvasion(false)
                }}
                className="mt-1"
              />
              <div className="space-y-1">
                <Label htmlFor="is_correntista_debt" className="font-bold cursor-pointer text-amber-900 dark:text-amber-300">
                  Venda A Prazo (Crédito Loja / Correntista)
                </Label>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Ao selecionar este identificador, a venda **não** altera o dinheiro em caixa e gera um débito pendente na conta corrente do cliente/funcionário para cobrança em lote.
                </p>
              </div>
            </div>

            {/* Checkbox Evasão Operacional */}
            <div className="flex items-start space-x-3 space-y-0 rounded-xl border p-4 bg-rose-50/50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900">
              <Checkbox
                id="is_stock_evasion"
                checked={isStockEvasion}
                onCheckedChange={(checked) => {
                  setIsStockEvasion(!!checked)
                  if (checked) setIsCorrentistaDebt(false)
                }}
                className="mt-1"
              />
              <div className="space-y-1">
                <Label htmlFor="is_stock_evasion" className="font-bold cursor-pointer text-rose-900 dark:text-rose-300">
                  Evasão Operacional (Pró-labore / Cortesia / Quebra)
                </Label>
                <p className="text-xs text-rose-700 dark:text-rose-400">
                  Ao selecionar este identificador, o sistema realiza a **baixa direta no estoque**, gravando o motivo (`CONSUMO_INTERNO`, `QUEBRA`, `CORTESIA`), mas com **R$ 0,00 no caixa** e **sem emissão fiscal NFC-e**.
                </p>
              </div>
            </div>

            <Button
              onClick={() => saveIdentifier()}
              disabled={isSaving || !name.trim()}
              size="lg"
              className="w-full"
            >
              {isSaving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Identificador'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
