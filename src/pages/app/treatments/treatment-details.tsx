import * as Dialog from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'

import { getTreatmentDetails } from '@/api/get-treatment-details'
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TreatmentStatus } from '@/components/ui/treatment-status'

export interface TreatmentDetailsProps {
  treatmentId: string
  open: boolean
}

export function TreatmentDetails({ treatmentId, open }: TreatmentDetailsProps) {
  const { data: treatment } = useQuery({
    queryKey: ['treatment', treatmentId],
    queryFn: () => getTreatmentDetails({ treatmentId }),
    enabled: open,
  })
  let subtotal = 0
  if (!treatment) {
    return null
  } else {
    subtotal = treatment.items.reduce((accumulator, item) => {
      const currentSubtotal = item.quantity * item.salesValue
      return accumulator + currentSubtotal
    }, 0)
  }
  let dias = 0
  if (treatment)
    dias = dayjs(new Date()).diff(dayjs(treatment.opening_date), 'day')

  console.log(treatment.ending_date)
  return (
    <Dialog.Overlay>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atendimento:{treatmentId}</DialogTitle>
        </DialogHeader>
        <DialogDescription>Detalhes do Atendimento</DialogDescription>
        {treatment && (
          <div className="space-y-6">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="text-muted-foreground">
                    Status
                  </TableCell>
                  <TableCell className="flex justify-end">
                    <TreatmentStatus status={treatment.status} />
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="text-muted-foreground">
                    Cliente
                  </TableCell>
                  <TableCell className="flex justify-end">
                    {treatment.clients.name}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">
                    Requisição
                  </TableCell>
                  <TableCell className="flex justify-end">
                    {treatment.request}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">
                    Aberto em
                  </TableCell>
                  <TableCell className="flex justify-end">
                    {dayjs(`${treatment.opening_date}`).format(
                      'DD/MM/YYYY HH:mm',
                    )}
                  </TableCell>
                </TableRow>
                {treatment.ending_date ? (
                  <TableRow>
                    <TableCell className="text-muted-foreground">
                      Resolvido em
                    </TableCell>
                    <TableCell className="flex justify-end">
                      {dayjs(`${treatment.ending_date}`).format(
                        'DD/MM/YYYY HH:mm',
                      )}
                    </TableCell>
                  </TableRow>
                ) : null}
                <TableRow>
                  <TableCell className="text-muted-foreground">
                    Cliente
                  </TableCell>
                  <TableCell className="flex justify-end">
                    {treatment.clients.name}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">
                    Observações
                  </TableCell>
                  <TableCell className="flex justify-end">
                    {treatment.observations}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            {treatment.interactions.length > 0 && (
              <Table>
                <TableHeader>
                  <TableHead className="text-minsk-600 text-base	font-bold">
                    Interações
                  </TableHead>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {treatment.interactions.map((interaction) => {
                    return (
                      <TableRow key={interaction.id}>
                        <TableCell className="text-center">
                          {dayjs(`${interaction.date}`).format(
                            'DD/MM/YYYY HH:mm',
                          )}
                        </TableCell>
                        <TableCell>{interaction.description}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
            {treatment.items.length > 0 && (
              <Table>
                <TableHeader>
                  <TableHead className="text-minsk-600 text-base	font-bold">
                    Mercadorias
                  </TableHead>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Qtd.</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {treatment.items.map((item) => {
                    return (
                      <TableRow key={item.item_id}>
                        <TableCell>{item.items.name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>R$ {item.salesValue}</TableCell>
                        <TableCell>
                          R$ {item.salesValue * item.quantity}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3}>Total do atendimento</TableCell>
                    <TableCell className="text-right font-medium">
                      {subtotal}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog.Overlay>
  )
}
