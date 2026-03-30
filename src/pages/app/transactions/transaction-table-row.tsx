export function TransactionMobileCard({ transactions }: TransactionTableRowProps) {
  const [openPaymentModal, setOpenPaymentModal] = useState(false)
  const [openDetailsModal, setOpenDetailsModal] = useState(false)
  const [detailsMode, setDetailsMode] = useState<'view' | 'edit'>('view')

  const paymentTransaction: PaymentTransaction = {
    ...transactions,
    sectorId: transactions.sectors?.id || null,
    accountId: transactions.accounts.id,
  }

  return (
    <div 
      className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-3 active:scale-[0.98] transition-all"
      onClick={() => {
        setDetailsMode('view')
        setOpenDetailsModal(true)
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-2 w-2 rounded-full",
            transactions.confirmed ? "bg-emerald-500" : (transactions.operation === 'income' ? "bg-emerald-500/30" : "bg-rose-500")
          )} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {dayjs(transactions.data_vencimento).format('DD MMM')}
          </span>
        </div>
        <div className={cn(
          "text-base font-black tabular-nums",
          transactions.operation === 'income' ? "text-emerald-600" : "text-rose-600"
        )}>
          <span className="text-[11px] font-bold opacity-60 mr-0.5">R$</span>
          {(transactions.totalValue ?? transactions.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="font-bold text-slate-800 dark:text-slate-100 truncate tracking-tight">
          {transactions.description}
        </span>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {transactions.accounts.name}
          </span>
          {transactions.sectors && (
            <>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {transactions.sectors.name}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-1">
        {!transactions.confirmed && (
          <Button 
            size="sm"
            className={cn(
              "h-8 flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
              transactions.operation === 'income' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
            )}
            onClick={(e) => {
              e.stopPropagation()
              setOpenPaymentModal(true)
            }}
          >
            {transactions.operation === 'income' ? 'Receber' : 'Pagar'}
          </Button>
        )}
        <Button 
          variant="outline"
          size="sm"
          className="h-8 flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest border-slate-200"
          onClick={(e) => {
            e.stopPropagation()
            setDetailsMode('edit')
            setOpenDetailsModal(true)
          }}
        >
          Editar
        </Button>
      </div>

       <PaymentModal
        open={openPaymentModal}
        onOpenChange={setOpenPaymentModal}
        transaction={paymentTransaction}
        // No card mobile, simplificamos o callback de confirmação para apenas fechar e toast
        onConfirm={async () => {
          setOpenPaymentModal(false)
        }}
      />

      <TransactionDetailsModal
        open={openDetailsModal}
        onOpenChange={setOpenDetailsModal}
        transaction={transactions}
        initialMode={detailsMode}
      />
    </div>
  )
}
import { useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Loader2, Undo2, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'

import { deleteTransaction } from '@/api/delete-transaction'
import { updateStatusTransaction } from '@/api/update-transaction-status'
import { revertTransactionStatus } from '@/api/revert-transaction-status'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { PaymentModal } from './payment-modal'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils'
import { MoreHorizontal, Scissors, Trash, Eye, Pencil } from "lucide-react"
import { TransactionGroupDetailsDialog } from "./components/transaction-group-details-dialog"
import { TransactionDetailsModal } from "./components/transaction-details-modal"

// Interface de Transação Original do seu backend/query
interface Transaction {
  id: string
  data_vencimento: Date
  data_emissao: Date
  description: string
  confirmed: boolean
  operation: 'income' | 'expense'
  amount: number
  totalValue?: number
  sectors: { name: string; id?: string } | null
  accounts: { name: string; id: string }
  transaction_group_id?: string | null
}

// Interface que o PaymentModal realmente espera (com IDs em nível raiz)
interface PaymentTransaction {
  id: string
  data_vencimento: Date
  data_emissao: Date
  description: string
  confirmed: boolean
  operation: 'income' | 'expense'
  amount: number
  sectorId: string | null // Campo MAPEADO
  accountId: string // Campo MAPEADO
  sectors: { name: string; id?: string } | null
  accounts: { name: string; id: string }
}

interface TransactionTableRowProps {
  transactions: Transaction
  customPrefix?: React.ReactNode
}

export function TransactionTableRow({ transactions, customPrefix }: TransactionTableRowProps) {
  const queryClient = useQueryClient()
  const [openPaymentModal, setOpenPaymentModal] = useState(false)
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false)
  const [openRevertAlert, setOpenRevertAlert] = useState(false)
  const [openGroupDialog, setOpenGroupDialog] = useState(false)
  const [openDetailsModal, setOpenDetailsModal] = useState(false)
  const [detailsMode, setDetailsMode] = useState<'view' | 'edit'>('view')
  const [localLoading, setLocalLoading] = useState(false)

  // --- MAPEAMENTO DE DADOS PARA O MODAL ---
  const paymentTransaction: PaymentTransaction = {
    ...transactions,
    sectorId: transactions.sectors?.id || null,
    accountId: transactions.accounts.id,
  }

  // Mutação para alterar o status (e criar o remanescente no Back-end)
  const { mutateAsync: switchTransactionStatus } = useMutation({
    mutationFn: updateStatusTransaction,
    // Otimisticamente atualiza o status de confirmação
    onMutate: async ({ id }) => {
      setLocalLoading(true)
      queryClient.setQueryData(['transactions'], (old: any) => {
        if (!old) return old
        const transactionsArray = old.transactions || old || []
        return {
          ...old,
          transactions: transactionsArray.map((transaction: Transaction) =>
            transaction.id === id
              ? { ...transaction, confirmed: !transaction.confirmed }
              : transaction,
          ),
        }
      })
    },
    onSuccess: () => {
      // A toast de sucesso é movida para o handlePayment para ser mais específica
    },
    onError: (_error, _variables) => {
      toast.error('Ocorreu um erro ao alterar o status do pagamento.')
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onSettled: () => {
      setLocalLoading(false)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  // Mutação para deletar (mantida)
  const { mutateAsync: DeleteTransaction } = useMutation({
    mutationFn: deleteTransaction,
    onMutate: async ({ id }) => {
      setLocalLoading(true)
      queryClient.setQueryData(['transactions'], (old: any) => {
        if (!old) return old
        const transactionsArray = old.transactions || old || []
        return {
          ...old,
          transactions: transactionsArray.filter(
            (transaction: Transaction) => transaction.id !== id,
          ),
        }
      })
    },
    onSuccess: () => {
      toast.warning('Transação deletada com sucesso.')
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
    },
    onError: (_error, _variables) => {
      toast.error('Ocorreu um erro ao deletar a transação.')
    },
    onSettled: () => {
      setLocalLoading(false)
      setOpenDeleteAlert(false)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
    },
  })

  async function handlePayment(payload: {
    id: string;
    amount: number;
    interest?: number;
    discount?: number;
    data_vencimento: Date;
    data_emissao?: Date;
    remainingDate?: Date;
    accountId?: string;
  }) {
    setLocalLoading(true)
    try {
      const { amount, data_vencimento, remainingDate, accountId } = payload
      const isPartialPayment = amount < transactions.amount

      // 1. CHAMA A API APENAS UMA VEZ
      await switchTransactionStatus({
        id: transactions.id,
        amount: amount,
        interest: payload.interest,
        discount: payload.discount,
        data_vencimento: data_vencimento,
        remainingDate: remainingDate,
        accountId: accountId
      })

      toast.success(
        isPartialPayment
          ? 'Pagamento parcial processado com sucesso! Transação remanescente criada.'
          : 'Pagamento processado com sucesso!'
      )
      setOpenPaymentModal(false)

    } catch (error) {
      console.error('Erro ao processar pagamento:', error)
      throw error
    } finally {
      setLocalLoading(false)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      queryClient.invalidateQueries({ queryKey: ['treatments'] })
    }
  }

  async function handleDelete(id: string) {
    try {
      await DeleteTransaction({ id })
    } catch (error) {
      // Error já é tratado no onError
    }
  }

  // Revert Mutation
  const { mutateAsync: revertTransaction } = useMutation({
    mutationFn: revertTransactionStatus,
    onMutate: () => setLocalLoading(true),
    onSuccess: () => {
      toast.success('Pagamento revertido com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      setOpenRevertAlert(false)
    },
    onError: () => {
      toast.error('Erro ao reverter pagamento.')
    },
    onSettled: () => setLocalLoading(false)
  })

  async function handleRevert() {
    await revertTransaction({ id: transactions.id })
  }

  return (
    <TableRow className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors border-slate-100 dark:border-slate-800">
      {customPrefix}
      <TableCell className="w-[140px] text-center px-4 py-5">
        {/* Botão de Ação: Consolidar (Pagar/Receber) ou Desfazer */}
        <button
          aria-label={transactions.confirmed ? "Reverter Pagamento" : "Registrar pagamento"}
          className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 w-[110px] text-[10px] font-black uppercase tracking-widest rounded-xl border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed mx-auto ${
            transactions.confirmed
              ? 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-700 focus:ring-slate-500/50' // Reverter
              : transactions.operation === 'income'
                ? 'bg-emerald-600 text-white border-transparent hover:bg-emerald-700 focus:ring-emerald-600' // Receber
                : 'bg-rose-600 text-white border-transparent hover:bg-rose-700 focus:ring-rose-600' // Pagar
          }`}
          onClick={() => {
            if (transactions.confirmed) {
              setOpenRevertAlert(true)
            } else {
              setOpenPaymentModal(true)
            }
          }}
          disabled={localLoading}
        >
          {localLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              ...
            </>
          ) : transactions.confirmed ? (
            <>
              <Undo2 className="h-3 w-3" />
              Reverter
            </>
          ) : transactions.operation === 'income' ? (
            <>
              <CheckCircle2 className="h-3 w-3" />
              Receber
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3 w-3" />
              Pagar
            </>
          )}
        </button>

        {/* MODAL DE PAGAMENTO */}
        <PaymentModal
          open={openPaymentModal}
          onOpenChange={setOpenPaymentModal}
          transaction={paymentTransaction}
          onConfirm={handlePayment}
        />

        {/* ALERT DE REVERSÃO */}
        <AlertDialog open={openRevertAlert} onOpenChange={setOpenRevertAlert}>
          <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-extrabold tracking-tight">Reverter Pagamento?</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja marcar esta transação como não paga? Isso afetará o saldo atual.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={localLoading} className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleRevert} disabled={localLoading} className="rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800">
                Sim, Reverter
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </TableCell>

      {/* (Rest of table) */}


      {/* -------------------- DADOS DA TABELA -------------------- */}
      <TableCell className="text-center min-w-[120px] px-4 py-5">
        <div className="flex flex-col items-center gap-1">
          <span className={cn(
            "text-sm tracking-tight",
            !transactions.confirmed && dayjs(transactions.data_vencimento).isBefore(dayjs().startOf('day')) 
              ? "text-rose-600 font-black" 
              : "font-bold text-slate-700 dark:text-slate-200"
          )}>
            {dayjs(`${transactions.data_vencimento}`).format('DD/MM/YYYY')}
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
            {dayjs(`${transactions.data_emissao}`).format('DD/MM/YYYY')}
          </span>
        </div>
      </TableCell>

      <TableCell className="px-6 py-5 font-bold text-slate-800 dark:text-slate-100 max-w-[200px] truncate tracking-tight">
        {transactions.description}
      </TableCell>

      <TableCell className="text-center hidden md:table-cell px-4 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {(transactions.sectors && transactions.sectors.name) || '-'}
      </TableCell>

      <TableCell className="text-center hidden md:table-cell px-4 py-5">
        <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 border border-slate-200/50 dark:border-slate-700/50">
          {transactions.accounts.name}
        </span>
      </TableCell>

      {/* Célula de Valor */}
      <TableCell className={cn(
        "text-right font-black tabular-nums px-8 py-5 text-base",
        transactions.operation === 'income' ? "text-emerald-600" : "text-rose-600"
      )}>
        <span className="text-[11px] font-bold opacity-60 mr-0.5">R$</span>
        {(transactions.totalValue ?? transactions.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>

      <TableCell className="w-[80px] text-right px-8 py-5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 w-9 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <span className="sr-only">Opções</span>
              <MoreHorizontal className="h-4 w-4 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                setDetailsMode('view')
                setOpenDetailsModal(true)
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              Visualizar
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                setDetailsMode('edit')
                setOpenDetailsModal(true)
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            {transactions.transaction_group_id && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  setOpenGroupDialog(true)
                }}
              >
                <Scissors className="mr-2 h-4 w-4" />
                Gerenciar Parcelamento
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => setOpenDeleteAlert(true)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash className="mr-2 h-4 w-4" />
              Deletar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* DIALOGS */}
        <AlertDialog open={openDeleteAlert} onOpenChange={setOpenDeleteAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar Transação?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar esta transação permanentemente?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={localLoading}>Não</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDelete(transactions.id)}
                disabled={localLoading}
                className="bg-red-600 focus:ring-red-600"
              >
                {localLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Sim, Deletar'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <TransactionGroupDetailsDialog
          open={openGroupDialog}
          onOpenChange={setOpenGroupDialog}
          groupId={transactions.transaction_group_id || null}
        />

        <TransactionDetailsModal
          open={openDetailsModal}
          onOpenChange={setOpenDetailsModal}
          transaction={transactions}
          initialMode={detailsMode}
        />
      </TableCell>
    </TableRow>
  )
}