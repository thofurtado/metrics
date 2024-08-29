import {} from '@radix-ui/react-dialog'
import dayjs from 'dayjs'
import { NotebookPen, Search, Shapes } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { TableCell, TableRow } from '@/components/ui/table'
import { TreatmentStatus } from '@/components/ui/treatment-status'

import { TreatmentDetails } from './treatment-details'
import { TreatmentInteraction } from './treatment-interaction'
import { TreatmentItems } from './treatment-items'

export interface TreatmentTableRowProps {
  treatments: {
    id: string
    opening_date: Date
    ending_date: Date | null
    contact: string | null
    user_id: string | null
    client_id: string | null
    equipment_id: string | null
    request: string
    status:
      | 'pending'
      | 'in_progress'
      | 'on_hold'
      | 'resolved'
      | 'canceled'
      | 'follow_up'
      | 'in_workbench'
    amount: number
    observations: string | null
    clients: {
      name: string
    }
    items: [
      item_id: string,
      name: string,
      salesValue: number,
      quantity: number,
      items: {
        name: string
      },
    ]
    interactions: [id: string, date: Date, description: string]
  }
}

export function TreatmentTableRow({ treatments }: TreatmentTableRowProps) {
  const dias = dayjs(new Date()).diff(dayjs(treatments.opening_date), 'day')
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isInteractionsOpen, setIsInteractionsOpen] = useState(false)
  const [isItemsOpen, setIsItemsOpen] = useState(false)

  return (
    <TableRow className="font-gaba">
      <TableCell>
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Search className="h-3 w-3" />
              <span className="sr-only">Detalhes do Atendimento</span>
            </Button>
          </DialogTrigger>
          <TreatmentDetails open={isDetailsOpen} treatmentId={treatments.id} />
        </Dialog>
      </TableCell>
      <TableCell className="hidden text-sm xl:table-cell">
        {treatments.id}
      </TableCell>
      <TableCell className="text-base text-muted-foreground">
        {dias > 1 ? `${dias} dias` : `${dias} dia`}
      </TableCell>
      <TableCell className="text-base">
        <TreatmentStatus status={treatments.status} />
      </TableCell>
      <TableCell className="text-center text-base font-medium">
        {treatments.contact}
      </TableCell>
      <TableCell className="text-center text-base font-medium">
        {treatments.clients.name}
      </TableCell>
      <TableCell className="text-base">{treatments.request}</TableCell>
      <TableCell className="text-base font-medium">
        {treatments.amount.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}
      </TableCell>
      <TableCell>
        <Dialog open={isItemsOpen} onOpenChange={setIsItemsOpen}>
          <DialogTrigger asChild>
            <Button
              disabled={['canceled', 'resolved'].includes(treatments.status)}
              className="border-minsk-400 text-base font-thin hover:bg-minsk-400 hover:text-white"
              variant="outline"
              size="sm"
            >
              <Shapes className="mr-2 h-4 w-4" />
              Itens
            </Button>
          </DialogTrigger>
          <TreatmentItems open={isItemsOpen} treatmentId={treatments.id} />
        </Dialog>
      </TableCell>
      <TableCell>
        <Dialog open={isInteractionsOpen} onOpenChange={setIsInteractionsOpen}>
          <DialogTrigger asChild>
            <Button
              disabled={['canceled', 'resolved'].includes(treatments.status)}
              className="bg-minsk-400 text-base font-thin text-white hover:bg-minsk-500"
              size="sm"
            >
              <NotebookPen className="mr-2 h-4 w-4" />
              <span>Atender</span>
            </Button>
          </DialogTrigger>
          <TreatmentInteraction
            open={isInteractionsOpen}
            treatmentId={treatments.id}
            status={treatments.status}
          />
        </Dialog>
      </TableCell>
    </TableRow>
  )
}
