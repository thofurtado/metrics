// AlertDialogTrigger removed - not used directly in this component
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
import { MoreHorizontal, Scissors, Trash } from "lucide-react"
import { TransactionGroupDetailsDialog } from "./components/transaction-group-details-dialog"

// Interface de Transação Original do seu backend/query
interface Transaction {
  id: string
  data_vencimento: Date
  data_emissao: Date
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
    <TableRow className="h-[72px] bg-background group transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted/60">
      {customPrefix}
      <TableCell className="w-[140px] text-center px-4 py-3">
        {/* Botão de Ação: Consolidar (Pagar/Receber) ou Desfazer */}
        <button
          aria-label={transactions.confirmed ? "Reverter Pagamento" : "Registrar pagamento"}
          className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 w-[110px] text-xs font-bold rounded-lg border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed mx-auto ${
            transactions.confirmed
              ? 'bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground focus:ring-muted-foreground/50' // Reverter
              : transactions.operation === 'income'
                ? 'bg-vida-loca-600 text-white border-transparent hover:bg-vida-loca-700 focus:ring-vida-loca-600' // Receber
                : 'bg-stiletto-600 text-white border-transparent hover:bg-stiletto-700 focus:ring-stiletto-600' // Pagar
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
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading
            </>
          ) : transactions.confirmed ? (
            <>
              <Undo2 className="h-4 w-4" />
              Reverter
            </>
          ) : transactions.operation === 'income' ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Receber
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
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
      <TableCell className="text-center min-w-[110px] px-4 py-3">
        <div className="flex flex-col items-center">
          <span className={!transactions.confirmed && dayjs(transactions.data_vencimento).isBefore(dayjs().startOf('day')) ? "text-red-600 dark:text-red-400 font-bold" : "font-semibold text-foreground"}>
            {dayjs(`${transactions.data_vencimento}`).format('DD/MM/YYYY')}
          </span>
          <span className="text-[11px] text-muted-foreground mt-0.5 leading-none" title="Data de Emissão">
            Emissão: {dayjs(`${transactions.data_emissao}`).format('DD/MM/YYYY')}
          </span>
        </div>
      </TableCell>

      <TableCell className="px-4 py-3 font-medium text-foreground/90 max-w-[200px] truncate">{transactions.description}</TableCell>

      <TableCell className="text-center hidden md:table-cell px-4 py-3 text-sm text-foreground/80">
        {(transactions.sectors && transactions.sectors.name) || '-'}
      </TableCell>

      <TableCell className="text-center hidden md:table-cell px-4 py-3 text-sm text-foreground/80">
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-muted/50">
          {transactions.accounts.name}
        </span>
      </TableCell>

      {/* Célula de Valor */}
      {transactions.operation === 'income' ? (
        <TableCell className="text-right font-bold text-vida-loca-600 dark:text-vida-loca-400 px-4 py-3">
          {`R$ ${transactions.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </TableCell>
      ) : (
        <TableCell className="text-right font-bold text-stiletto-600 dark:text-stiletto-400 px-4 py-3">
          {`R$ ${transactions.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </TableCell>
      )}

      <TableCell className="w-[80px] text-right px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted/50 transition-colors">
              <span className="sr-only">Opções</span>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
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