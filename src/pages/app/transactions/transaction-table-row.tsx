import {} from '@radix-ui/react-dialog'
import dayjs from 'dayjs'
import { CircleCheck, CircleMinus, Pen, Pencil, Trash } from 'lucide-react'

import { TableCell, TableRow } from '@/components/ui/table'

import { GetTransactionsDTO } from './get-transactions-dto'

export function TransactionTableRow({ transactions }: GetTransactionsDTO) {
  return (
    <TableRow className="bg-white dark:bg-stone-900">
      <TableCell className="flex justify-center">
        {(transactions.confirmed && (
          <CircleCheck className="h-6 w-6 text-vida-loca-500" />
        )) || <CircleMinus className="h-6 w-6 text-stiletto-500" />}
      </TableCell>
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
        <TableCell className="text-left font-semibold text-vida-loca-500">
          {`R$ ${transactions.amount}`}
        </TableCell>
      )) || (
        <TableCell className="text-left  font-semibold text-stiletto-500">
          {`R$ ${transactions.amount}`}
        </TableCell>
      )}
      <TableCell className="flex justify-center">
        <Pencil className="h-5 w-5 text-stone-500" />
      </TableCell>
      <TableCell>
        <Trash className="h-5 w-5 text-stone-500" />
      </TableCell>
    </TableRow>
  )
}
