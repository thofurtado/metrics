import * as Dialog from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'

import { getTreatmentDetails } from '@/api/get-treatment-details'
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCaption,
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
  const [isExpanded, setIsExpanded] = useState(false)

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

  // Função para detectar clique fora do dialog e expandir
  const handleInteractOutside = (event: Event) => {
    if (!isExpanded) {
      event.preventDefault()
      setIsExpanded(true)
    }
  }

  return (
    <Dialog.Overlay>
      <DialogContent 
        className={`overflow-y-auto transition-all duration-300 ${
          isExpanded 
            ? 'max-h-[95vh] w-[95vw] max-w-[1200px] scale-100' 
            : 'max-h-[80vh] w-[90vw] max-w-2xl'
        }`}
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={() => setIsExpanded(false)}
      >
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>
              Atendimento: <span className="text-sm"> {treatmentId} </span>
            </span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm bg-minsk-100 hover:bg-minsk-200 px-3 py-1 rounded-md transition-colors"
              aria-label={isExpanded ? "Recolher visualização" : "Expandir visualização"}
            >
              {isExpanded ? "Recolher" : "Expandir"}
            </button>
          </DialogTitle>
        </DialogHeader>

        <DialogDescription className="text-base font-bold text-minsk-600">
          Detalhes do Atendimento
        </DialogDescription>

        {treatment && (
          <div className={isExpanded ? "grid grid-cols-1 md:grid-cols-2 gap-6" : ""}>
            {/* Seção principal - sempre visível */}
            <div className={isExpanded ? "space-y-6" : ""}>
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
                    <TableCell className="flex justify-end text-end">
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
                      <TableCell className="text-muted-foreground w-40">
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
                      Observações
                    </TableCell>
                    <TableCell className="flex justify-end">
                      {treatment.observations}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Interações */}
              {treatment.interactions.length > 0 && (
                <div className={isExpanded ? "mt-6" : ""}>
                  <div className="my-2 flex w-full border-y-4 border-minsk-200 bg-minsk-50">
                    <Label className="w-full text-center text-lg font-bold text-minsk-600">
                      Interações
                    </Label>
                  </div>
                  <div className={isExpanded ? "max-h-64 overflow-y-auto" : ""}>
                    <Table>
                      <TableHeader>
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
                  </div>
                </div>
              )}
            </div>

            {/* Seção de mercadorias - em coluna separada quando expandido */}
            {treatment.items.length > 0 && (
              <div className={isExpanded ? "mt-0" : ""}>
                <div className="my-2 flex border-y-4 border-y-minsk-200 bg-minsk-50">
                  <Label className="w-full text-center text-lg font-bold text-minsk-600">
                    Mercadorias
                  </Label>
                </div>

                <div className={isExpanded ? "max-h-96 overflow-y-auto" : ""}>
                  <Table>
                    <TableHeader>
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
                              R$ {(item.salesValue * item.quantity).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={3}>Total do atendimento</TableCell>
                        <TableCell className="text-right text-xl font-bold">
                          R$ {subtotal.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog.Overlay>
  )
}