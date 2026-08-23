import {} from '@radix-ui/react-dialog'
import dayjs from 'dayjs'
import { Eye, NotebookPen, Shapes } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { TableCell, TableRow } from '@/components/ui/table'
import { TreatmentStatus } from '@/components/ui/treatment-status'
import { useModules } from '@/context/module-context'

import { TreatmentDetails } from './treatment-details'
import { TreatmentInteraction } from './treatment-interaction'
import { TreatmentItems } from './treatment-items'
import { TreatmentPaymentModal } from './treatment-payment-modal'

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
    items: {
      item_id: string
      salesValue: number
      quantity: number
      items: {
        name: string
        isItem: boolean
      }
    }[]
    interactions: [id: string, date: Date, description: string]
  }
}

export function TreatmentTableRow({ treatments }: TreatmentTableRowProps) {
  const { isModuleActive } = useModules()
  const dias = dayjs(new Date()).diff(dayjs(treatments.opening_date), 'day')
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isInteractionsOpen, setIsInteractionsOpen] = useState(false)
  const [isItemsOpen, setIsItemsOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [pendingInteraction, setPendingInteraction] = useState<{
    interactionData: any
    processFn: () => void
  } | null>(null)

  return (
    <TableRow className="group border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/50">
      <TableCell className="py-5 pl-8">
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 rounded-xl border-slate-200 p-0 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">Detalhes do Atendimento</span>
            </Button>
          </DialogTrigger>
          <TreatmentDetails open={isDetailsOpen} treatmentId={treatments.id} />
        </Dialog>
      </TableCell>
      <TableCell className="py-5 text-[11px] font-bold uppercase leading-none tracking-widest text-slate-400">
        {dias > 1 ? `${dias} dias` : `${dias} dia`}
      </TableCell>
      <TableCell className="py-5">
        <TreatmentStatus status={treatments.status} />
      </TableCell>
      {/* Contato - Oculto apenas no mobile */}
      <TableCell className="hidden py-5 text-[11px] font-bold uppercase tracking-widest text-slate-400 sm:table-cell">
        {treatments.contact}
      </TableCell>
      <TableCell className="py-5">
        <div className="max-w-[150px] truncate text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {treatments.clients.name}
        </div>
      </TableCell>
      <TableCell className="px-6 py-5">
        <div
          className="line-clamp-1 max-w-[120px] text-sm font-bold tracking-tight text-slate-700 dark:text-slate-200 sm:max-w-none"
          title={treatments.request}
        >
          {treatments.request}
        </div>
      </TableCell>
      {/* Valor - Oculto apenas no mobile */}
      <TableCell className="hidden py-5 pr-8 text-right text-base font-black tabular-nums text-slate-900 dark:text-slate-50 sm:table-cell">
        <span className="mr-0.5 text-[10px] font-bold text-slate-400">R$</span>
        {treatments.amount.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </TableCell>
      <TableCell className="py-5">
        {isModuleActive('merchandise') && isModuleActive('financial') ? (
          <Dialog open={isItemsOpen} onOpenChange={setIsItemsOpen}>
            <DialogTrigger asChild>
              <Button
                disabled={['canceled', 'resolved'].includes(treatments.status)}
                variant="outline"
                size="sm"
                className="h-9 rounded-xl border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
              >
                <Shapes className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Itens</span>
                <span className="sr-only">Itens</span>
              </Button>
            </DialogTrigger>
            <TreatmentItems open={isItemsOpen} onOpenChange={setIsItemsOpen} treatmentId={treatments.id} />
          </Dialog>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            disabled
            title="Módulo de Mercadorias ou Financeiro desativado"
            className="h-9 rounded-xl opacity-50"
          >
            <Shapes className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Itens</span>
          </Button>
        )}
      </TableCell>
      <TableCell className="py-5 pr-8">
        <Dialog open={isInteractionsOpen} onOpenChange={setIsInteractionsOpen}>
          <DialogTrigger asChild>
            <Button
              disabled={['canceled', 'resolved'].includes(treatments.status)}
              className="h-9 w-full rounded-xl bg-slate-900 px-4 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-slate-800 sm:w-auto"
              size="sm"
            >
              <NotebookPen className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Atender</span>
              <span className="sr-only">Atender</span>
            </Button>
          </DialogTrigger>
          <TreatmentInteraction
            open={isInteractionsOpen}
            onOpenChange={setIsInteractionsOpen}
            treatmentId={treatments.id}
            status={treatments.status}
            amount={treatments.amount}
            onOpenPaymentModal={(data) => {
              setPendingInteraction(data)
              setIsPaymentModalOpen(true)
            }}
          />
        </Dialog>

        {/* Render Payment Modal outside the interaction dialog to fix Radix nested dialog focus issues */}
        <TreatmentPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => {
            setIsPaymentModalOpen(false)
            if (pendingInteraction) {
              pendingInteraction.processFn()
            }
          }}
          totalAmount={treatments.amount}
          treatmentId={treatments.id}
        />
      </TableCell>
    </TableRow>
  )
}
