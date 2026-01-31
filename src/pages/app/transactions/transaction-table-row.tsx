import { AlertDialogTrigger } from '@radix-ui/react-alert-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { CircleCheck, CircleMinus, Trash, Loader2, Undo2 } from 'lucide-react' // Added Undo2
import { useState } from 'react'

import { deleteTransaction } from '@/api/delete-transaction'
import { updateStatusTransaction } from '@/api/update-transaction-status'
import { revertTransactionStatus } from '@/api/revert-transaction-status' // Added import
// Removendo: import { createTransaction } from '@/api/create-transaction'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription, // Added import
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { PaymentModal } from './payment-modal'
import { toast } from 'sonner'

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
}

export function TransactionTableRow({ transactions }: TransactionTableRowProps) {
  const queryClient = useQueryClient()
  const [openPaymentModal, setOpenPaymentModal] = useState(false)
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false)
  const [openRevertAlert, setOpenRevertAlert] = useState(false)
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

      <TableCell className="text-center">
        {(transactions.sectors && transactions.sectors.name) || ''}
      </TableCell>

      <TableCell className="text-center">
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
        <AlertDialog open={openDeleteAlert} onOpenChange={setOpenDeleteAlert}>
          <AlertDialogTrigger asChild>
            <Button
              aria-label={`Deletar Transação: ${transactions.description}`}
              variant="ghost"
              className="p-0 h-6 w-6 flex items-center justify-center mx-auto"
              disabled={localLoading}
            >
              {localLoading ? (
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              ) : (
                <Trash className="h-5 w-5 text-stone-500" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="w-1/5">
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar Transação?</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={localLoading}>Não</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDelete(transactions.id)}
                disabled={localLoading}
              >
                {localLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deletando...
                  </div>
                ) : (
                  'Sim'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}