import { AlertDialogTrigger } from '@radix-ui/react-alert-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { CircleCheck, CircleMinus, Trash, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { deleteTransaction } from '@/api/delete-transaction'
import { updateStatusTransaction } from '@/api/update-transaction-status'
// Removendo: import { createTransaction } from '@/api/create-transaction'
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
  const [localLoading, setLocalLoading] = useState(false)

  // --- MAPEAMENTO DE DADOS PARA O MODAL ---
  const paymentTransaction: PaymentTransaction = {
    ...transactions,
    sectorId: transactions.sectors?.id || null,
    accountId: transactions.accounts.id,
  }
  // ----------------------------------------

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

  /**
   * ✅ LÓGICA CORRIGIDA: Manipula o pagamento, enviando TUDO para o Back-end.
   * O Back-end decide se atualiza, se cria o restante, e qual data manter.
   */
  async function handlePayment(payload: {
    id: string;
    amount: number;
    date: Date;
    remainingDate?: Date
  }) {
    setLocalLoading(true)
    try {
      const { amount, date, remainingDate } = payload
      const isPartialPayment = amount < transactions.amount

      // 1. CHAMA A API APENAS UMA VEZ
      // A API de updateStatusTransaction agora deve ser responsável por:
      // a) Atualizar o status da transação original (id) com a data (date) e valor (amount).
      // b) Se remainingDate for enviado, criar a nova transação remanescente.
      await switchTransactionStatus({
        id: transactions.id,
        amount: amount,
        date: date,
        // ENVIAMOS A DATA REMANESCENTE APENAS SE ELA EXISTIR
        remainingDate: remainingDate,
      })

      // Remove a toast de sucesso da mutação e a coloca aqui para ser mais específica
      toast.success(
        isPartialPayment
          ? 'Pagamento parcial processado com sucesso! Transação remanescente criada.'
          : 'Pagamento processado com sucesso!'
      )
      setOpenPaymentModal(false)

    } catch (error) {
      console.error('Erro ao processar pagamento:', error)
      // O modal já está configurado para exibir o erro da API
      throw error // Relança o erro para que o modal o capture e o exiba
    } finally {
      // O invalidateQueries já está no onSettled da mutação, mas podemos forçar aqui
      // se a mutação não tiver sido bem-sucedida, caso o throw error passe direto.
      setLocalLoading(false)
      queryClient.invalidateQueries({ queryKey: ['transaction'] })
    }
  }

  // Manipulador para deletar (mantido)
  async function handleDelete(id: string) {
    try {
      await DeleteTransaction({ id })
    } catch (error) {
      // Error já é tratado no onError
    }
  }

  // Omitido o JSX da tabela, pois não houve alterações visuais significativas.
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
          onConfirm={handlePayment} // <-- Agora compatível e sem criar transação remanescente no Front!
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