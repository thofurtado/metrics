import { AlertDialogTrigger } from '@radix-ui/react-alert-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { CircleMinus, Loader2, Undo2 } from 'lucide-react'
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
import { MoreHorizontal, Scissors, Trash } from "lucide-react"
import { TransactionGroupDetailsDialog } from "./components/transaction-group-details-dialog"

// Interface de Transação Original do seu backend/query
interface Transaction {
  id: string
  date: Date
  description: string
  confirmed: boolean
  operation: 'income' | 'expense'
  amount: number
  sectors: { name: string; id?: string } | null
  accounts: { name: string; id: string }
  transaction_group_id?: string | null
}

// Interface que o PaymentModal realmente espera (com IDs em nível raiz)
interface PaymentTransaction {
  id: string
  date: Date
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
      queryClient.setQueryData(['transaction'], (old: any) => {
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
    onError: (error, variables) => {
      toast.error('Ocorreu um erro ao alterar o status do pagamento.')
      queryClient.invalidateQueries({ queryKey: ['transaction'] })
    },
    onSettled: () => {
      setLocalLoading(false)
      queryClient.invalidateQueries({ queryKey: ['transaction'] })
    },
  })

  // Mutação para deletar (mantida)
  const { mutateAsync: DeleteTransaction } = useMutation({
    mutationFn: deleteTransaction,
    onMutate: async ({ id }) => {
      setLocalLoading(true)
      queryClient.setQueryData(['transaction'], (old: any) => {
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
    },
    onError: (error, variables) => {
      toast.error('Ocorreu um erro ao deletar a transação.')
      queryClient.invalidateQueries({ queryKey: ['transaction'] })
    },
    onSettled: () => {
      setLocalLoading(false)
      setOpenDeleteAlert(false)
      queryClient.invalidateQueries({ queryKey: ['transaction'] })
    },
  })

  async function handlePayment(payload: {
    id: string;
    amount: number;
    date: Date;
    remainingDate?: Date;
    accountId?: string;
  }) {
    setLocalLoading(true)
    try {
      const { amount, date, remainingDate, accountId } = payload
      const isPartialPayment = amount < transactions.amount

      // 1. CHAMA A API APENAS UMA VEZ
      await switchTransactionStatus({
        id: transactions.id,
        amount: amount,
        date: date,
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
      queryClient.invalidateQueries({ queryKey: ['transaction'] })
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
      queryClient.invalidateQueries({ queryKey: ['transaction'] })
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
    <TableRow className="h-16 bg-white dark:bg-stone-900">
      {customPrefix}
      <TableCell className="w-16 text-center">
        {/* Botão que abre o modal ou alerta */}
        <Button
          aria-label={transactions.confirmed ? "Reverter Pagamento" : "Registrar pagamento"}
          variant="ghost"
          className="p-0 h-6 w-6 flex items-center justify-center mx-auto"
          onClick={() => {
            if (transactions.confirmed) {
              setOpenRevertAlert(true)
            } else {
              setOpenPaymentModal(true)
            }
          }}
          disabled={localLoading} // Removed confirmed check
        >
          {localLoading ? (
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          ) : transactions.confirmed ? (
            <Undo2 className="h-6 w-6 text-yellow-500 hover:text-yellow-600" />
          ) : (
            <CircleMinus className="h-6 w-6 text-stiletto-500" />
          )}
        </Button>

        {/* MODAL DE PAGAMENTO */}
        <PaymentModal
          open={openPaymentModal}
          onOpenChange={setOpenPaymentModal}
          transaction={paymentTransaction}
          onConfirm={handlePayment}
        />

        {/* ALERT DE REVERSÃO */}
        <AlertDialog open={openRevertAlert} onOpenChange={setOpenRevertAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reverter Pagamento?</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja marcar esta transação como não paga? Isso afetará o saldo atual.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={localLoading}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleRevert} disabled={localLoading}>
                Sim, Reverter
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </TableCell>

      {/* (Rest of table) */}


      {/* -------------------- DADOS DA TABELA -------------------- */}
      <TableCell className="text-center">
        <span className={!transactions.confirmed && new Date(transactions.date) < new Date(new Date().setHours(0, 0, 0, 0)) ? "text-red-500 font-bold" : ""}>
          {dayjs(`${transactions.date}`).format('DD/MM/YYYY')}
        </span>
      </TableCell>

      <TableCell>{transactions.description}</TableCell>

      <TableCell className="text-center hidden md:table-cell">
        {(transactions.sectors && transactions.sectors.name) || ''}
      </TableCell>

      <TableCell className="text-center hidden md:table-cell">
        {transactions.accounts.name}
      </TableCell>

      {/* Célula de Valor */}
      {transactions.operation === 'income' ? (
        <TableCell className="text-right font-semibold text-vida-loca-500">
          {`R$ ${transactions.amount.toFixed(2)}`}
        </TableCell>
      ) : (
        <TableCell className="text-right font-semibold text-stiletto-400">
          {`R$ ${transactions.amount.toFixed(2)}`}
        </TableCell>
      )}

      <TableCell className="w-16 text-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
      </TableCell>
    </TableRow>
  )
}