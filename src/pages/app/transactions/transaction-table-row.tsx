import { AlertDialogTrigger } from '@radix-ui/react-alert-dialog'
import {} from '@radix-ui/react-dialog'
import { useMutation, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { CircleCheck, CircleMinus, Trash } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

import { GetTransactionsDTO } from './get-transactions-dto'

export function TransactionTableRow({ transactions }: GetTransactionsDTO) {
  const navigate = useNavigate()
  const [openSwitchAlert, setOpenSwitchAlert] = useState(false)
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false)
  const { refetch: itemRefetch } = useQuery({
    queryKey: ['transaction'],
  })
  const { mutateAsync: switchTransactionStatus } = useMutation({
    mutationFn: updateStatusTransaction,
  })
  const { mutateAsync: DeleteTransaction } = useMutation({
    mutationFn: deleteTransaction,
  })

  async function handleSwitch(id: string) {
    await switchTransactionStatus({ id })
    toast.info('Alterado com sucesso')
    itemRefetch()
    setTimeout(() => {
      setOpenSwitchAlert(false)
      navigate('/transactions?page=1', { replace: true })
    }, 1500)
  }
  async function handleDelete(id: string) {
    await DeleteTransaction({ id })
    toast.warning('Deletado com sucesso')
    itemRefetch()
    setTimeout(() => {
      setOpenDeleteAlert(false)
      navigate('/transactions?page=1', { replace: true })
    }, 1500)
  }

  return (
    <TableRow className="bg-white dark:bg-stone-900">
      <AlertDialog open={openSwitchAlert}>
        <AlertDialogTrigger asChild>
          <Button
            className="w-full"
            variant="ghost"
            onClick={() => {
              setOpenSwitchAlert(true)
            }}
          >
            <TableCell className="flex justify-center hover:cursor-pointer">
              {(transactions.confirmed && (
                <CircleCheck className="h-6 w-6 text-vida-loca-500" />
              )) || <CircleMinus className="h-6 w-6 text-stiletto-500" />}
            </TableCell>
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
            <AlertDialogCancel
              onClick={() => {
                setOpenSwitchAlert(false)
              }}
            >
              Não
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleSwitch(transactions.id)
              }}
            >
              Sim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
      {(transactions.operation === 'income' && (
        <TableCell className="text-right font-semibold text-vida-loca-500">
          {`R$ ${transactions.amount}`}
        </TableCell>
      )) || (
        <TableCell className="text-right  font-semibold text-stiletto-500">
          {`R$ ${transactions.amount}`}
        </TableCell>
      )}
      <AlertDialog open={openDeleteAlert}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            onClick={() => {
              setOpenDeleteAlert(true)
            }}
          >
            <TableCell>
              <Trash className="h-5 w-5 text-stone-500" />
            </TableCell>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="w-1/5">
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Transação?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setOpenDeleteAlert(false)
              }}
            >
              Não
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleDelete(transactions.id)
              }}
            >
              Sim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TableRow>
  )
}
