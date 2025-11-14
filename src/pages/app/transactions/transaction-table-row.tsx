import { AlertDialogTrigger } from '@radix-ui/react-alert-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { CircleCheck, CircleMinus, Trash, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { deleteTransaction } from '@/api/delete-transaction'
// ASSUMIDO: Você irá atualizar a interface desta API para aceitar amount, date e confirmed
import { updateStatusTransaction } from '@/api/update-transaction-status'
import { createTransaction } from '@/api/create-transaction'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { PaymentModal } from './payment-modal'

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
  const [localLoading, setLocalLoading] = useState(false)

  // --- MAPEAMENTO DE DADOS PARA O MODAL (SOLUÇÃO PARA O ERRO DE TIPAGEM) ---
  const paymentTransaction: PaymentTransaction = {
    ...transactions,
    // Mapeia o ID do setor (que pode ser nulo)
    sectorId: transactions.sectors?.id || null,
    // Mapeia o ID da conta
    accountId: transactions.accounts.id,
  }
  // --------------------------------------------------------------------------

  // Mutação para alterar o status - MANTIDA ORIGINAL
  // ATENÇÃO: Se o erro persistir, a interface UpdateStatusTransactionParams (na API) precisa ser corrigida!
  const { mutateAsync: switchTransactionStatus } = useMutation({
    mutationFn: updateStatusTransaction,
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
      toast.info('Status de pagamento alterado com sucesso!')
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

  // Mutação para criar transação de resto
  const { mutateAsync: createRemainingTransaction } = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      toast.info('Transação de resto criada com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao criar transação de resto')
    },
  })

  // Mutação para deletar - MANTIDA ORIGINAL
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

  // ✅ MANIPULADOR: Lógica do Modal com o payload de UPDATE e CREATE
  async function handlePayment(payload: any) {
    setLocalLoading(true)
    try {
      const { updateOriginal, newRemainingTransaction } = payload;

      // 1. Atualiza a transação original com os novos dados (valor pago, data e status)
      await switchTransactionStatus({
        id: transactions.id,
        amount: updateOriginal.amount,
        date: updateOriginal.date,
        confirmed: updateOriginal.confirmed,
      })

      // 2. Se for pagamento parcial, cria transação de resto
      if (newRemainingTransaction) {
        await createRemainingTransaction({
          operation: newRemainingTransaction.operation,
          amount: newRemainingTransaction.amount,
          description: newRemainingTransaction.description,
          date: newRemainingTransaction.date,
          account: newRemainingTransaction.accountId, // Usa accountId
          sector: newRemainingTransaction.sectorId, // Usa sectorId
          confirmed: false
        })
      }

      toast.success('Pagamento processado com sucesso!')
      setOpenPaymentModal(false)
    } catch (error) {
      toast.error('Erro ao processar pagamento')
    } finally {
      setLocalLoading(false)
      queryClient.invalidateQueries({ queryKey: ['transaction'] })
    }
  }

  // Manipulador para deletar - MANTIDO ORIGINAL
  async function handleDelete(id: string) {
    try {
      await DeleteTransaction({ id })
    } catch (error) {
      // Error já é tratado no onError
    }
  }

  return (
    <TableRow className="h-16 bg-white dark:bg-stone-900">
      <TableCell className="w-16 text-center">
        {/* Botão que abre o modal */}
        <Button
          aria-label="Registrar pagamento"
          variant="ghost"
          className="p-0 h-6 w-6 flex items-center justify-center mx-auto"
          onClick={() => setOpenPaymentModal(true)}
          disabled={localLoading || transactions.confirmed}
        >
          {localLoading ? (
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          ) : transactions.confirmed ? (
            <CircleCheck className="h-6 w-6 text-vida-loca-500" />
          ) : (
            <CircleMinus className="h-6 w-6 text-stiletto-500" />
          )}
        </Button>

        {/* MODAL DE PAGAMENTO: Recebe a transação mapeada */}
        <PaymentModal
          open={openPaymentModal}
          onOpenChange={setOpenPaymentModal}
          transaction={paymentTransaction} // <-- Usa a transação mapeada!
          onConfirm={handlePayment}
        />
      </TableCell>

      {/* -------------------- DADOS DA TABELA -------------------- */}
      <TableCell className="text-center">
        {dayjs(`${transactions.date}`).format('DD/MM/YYYY')}
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