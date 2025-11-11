import { AlertDialogTrigger } from '@radix-ui/react-alert-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { CircleCheck, CircleMinus, Trash, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { deleteTransaction } from '@/api/delete-transaction'
import { updateStatusTransaction } from '@/api/update-transaction-status'
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

interface Transaction {
  id: string
  date: Date
  description: string
  confirmed: boolean
  operation: 'income' | 'expense'
  amount: number
  sectors: { name: string } | null
  accounts: { name: string }
}

interface TransactionTableRowProps {
  transactions: Transaction
}

export function TransactionTableRow({ transactions }: TransactionTableRowProps) {
  const queryClient = useQueryClient()
  const [openSwitchAlert, setOpenSwitchAlert] = useState(false)
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false)

  // Estado local para feedback visual imediato
  const [localLoading, setLocalLoading] = useState(false)

  // Mutação para alterar o status - VERSÃO SIMPLIFICADA
  const { mutateAsync: switchTransactionStatus } = useMutation({
    mutationFn: updateStatusTransaction,
    onMutate: async ({ id }) => {
      setLocalLoading(true) // 1. Inicia o Loading

      // Atualização otimista - corrigida
      queryClient.setQueryData(['transaction'], (old: any) => {
        if (!old) return old

        // Verifica a estrutura real dos seus dados
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

      // Força o refetch para corrigir qualquer inconsistência
      queryClient.invalidateQueries({ queryKey: ['transaction'] })
    },
    onSettled: () => {
      setLocalLoading(false) // 3. Para o Loading
      setOpenSwitchAlert(false)
      // Garante que os dados estão atualizados
      queryClient.invalidateQueries({ queryKey: ['transaction'] })
    },
  })

  // Mutação para deletar - VERSÃO SIMPLIFICADA
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

  // Manipulador para o switch de status
  async function handleSwitch(id: string) {
    try {
      await switchTransactionStatus({ id })
    } catch (error) {
      // Error já é tratado no onError
    }
  }

  // Manipulador para deletar
  async function handleDelete(id: string) {
    try {
      await DeleteTransaction({ id })
    } catch (error) {
      // Error já é tratado no onError
    }
  }

  return (
    <TableRow className="h-16 bg-white dark:bg-stone-900">
      <TableCell className="w-16 text-center"> {/* Adicionei text-center aqui */}
        <AlertDialog open={openSwitchAlert} onOpenChange={setOpenSwitchAlert}>
          <AlertDialogTrigger asChild>
            <Button
              aria-label="Alterar estado do pagamento"
              variant="ghost"
              className="p-0 h-6 w-6 flex items-center justify-center mx-auto" 
              disabled={localLoading}
            >
              {/** 2. Renderização Condicional do Loading **/}
              {localLoading ? (
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              ) : transactions.confirmed ? (
                <CircleCheck className="h-6 w-6 text-vida-loca-500" />
              ) : (
                <CircleMinus className="h-6 w-6 text-stiletto-500" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="w-1/5">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {!transactions.confirmed
                  ? 'Confirmar pagamento?'
                  : 'Extornar pagamento?'}
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={localLoading}>Não</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleSwitch(transactions.id)}
                disabled={localLoading}
              >
                {localLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Alterando...
                  </div>
                ) : (
                  'Sim'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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