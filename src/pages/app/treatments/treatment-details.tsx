import * as Dialog from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import { useState, useRef } from 'react'
import html2canvas from 'html2canvas'
import { Share2, Download } from 'lucide-react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

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
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TreatmentStatus } from '@/components/ui/treatment-status'

dayjs.extend(duration)

// ====================================================================
// TIPAGEM
interface Interaction {
  id: string
  date: string
  description: string
}

interface Item {
  item_id: string
  quantity: number
  salesValue: number
  items: {
    name: string
  }
}

interface TreatmentDetailsData {
  treatmentId: string
  status: 'pending' | 'in_progress' | 'finished' | 'canceled'
  clients: {
    name: string
  }
  request: string
  opening_date: string
  ending_date: string | null
  observations: string | null
  interactions: Interaction[]
  items: Item[]
}
// ====================================================================

export interface TreatmentDetailsProps {
  treatmentId: string
  open: boolean
}

export function TreatmentDetails({ treatmentId, open }: TreatmentDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const dialogContentRef = useRef<HTMLDivElement>(null)

  const buttonsContainerRef = useRef<HTMLDivElement>(null)
  const contentContainerRef = useRef<HTMLDivElement>(null)

  const interactionsTitleRef = useRef<HTMLDivElement>(null)
  const merchandiseTitleRef = useRef<HTMLDivElement>(null)

  const interactionsLabelRef = useRef<HTMLLabelElement>(null)
  const merchandiseLabelRef = useRef<HTMLLabelElement>(null)

  const interactionListRef = useRef<HTMLUListElement>(null)

  const { data: treatment } = useQuery<TreatmentDetailsData>({
    queryKey: ['treatment', treatmentId],
    queryFn: () => getTreatmentDetails({ treatmentId }),
    enabled: open,
  })

  // ====================================================================
  // FUNÇÃO DE PREPARAÇÃO DE DADOS PARA O GRÁFICO - SIMPLIFICADA
  // O ponto final foi removido, mostrando apenas interações reais
  // ====================================================================
  const prepareInteractionData = (
    interactions: Interaction[] | undefined,
    treatmentStatus: TreatmentDetailsData['status'],
    openingDate: string
  ) => {
    let processedInteractions: any[] = []

    if (interactions && interactions.length > 0) {
      processedInteractions = interactions
        .map((interaction) => ({
          date: new Date(interaction.date).getTime(),
          y: 1,
          description: interaction.description,
          originalDate: dayjs(interaction.date).format('DD/MM/YYYY HH:mm'),
          formattedDateOnly: dayjs(interaction.date).format('DD/MM'),
          type: 'interaction',
        }))
        .sort((a, b) => a.date - b.date)
    }

    // Se não houver interações, o ponto inicial é a data de abertura.
    if (processedInteractions.length === 0) {
      const initialDate = new Date(openingDate).getTime()
      processedInteractions.push({
        date: initialDate,
        y: 1,
        description: 'Início do Atendimento',
        originalDate: dayjs(initialDate).format('DD/MM/YYYY HH:mm'),
        formattedDateOnly: dayjs(initialDate).format('DD/MM'),
        type: 'initial',
      })
    }

    return processedInteractions
  }
  // ====================================================================

  // ====================================================================
  // CÁLCULO DO TEMPO DE ATENDIMENTO
  // ====================================================================
  const calculateDuration = (opening: string, ending: string | null) => {
    const end = ending ? dayjs(ending) : dayjs()
    const start = dayjs(opening)

    if (end.isBefore(start)) return 'Data inválida'

    const diff = end.diff(start)
    const durationObject = dayjs.duration(diff)

    const days = durationObject.days()
    const hours = durationObject.hours()
    const minutes = durationObject.minutes()

    let output = ''
    if (days > 0) {
      output += `${days} dia${days > 1 ? 's' : ''}`
      if (hours > 0) output += `, `
    }
    if (hours > 0) {
      output += `${hours} hora${hours > 1 ? 's' : ''}`
    }
    if (output === '') {
      output = `${minutes} minuto${minutes !== 1 ? 's' : ''}`
    }

    return output.trim()
  }

  let subtotal = 0
  if (!treatment) {
    return null
  } else {
    subtotal = treatment.items.reduce((accumulator, item) => {
      const currentSubtotal = item.quantity * item.salesValue
      return accumulator + currentSubtotal
    }, 0)
  }

  // Prepara os dados, agora sem o ponto final de status
  const interactionData = prepareInteractionData(
    treatment.interactions,
    treatment.status,
    treatment.opening_date,
  )

  // Calcula o tempo de atendimento
  const totalDuration = calculateDuration(
    treatment.opening_date,
    treatment.ending_date,
  )

  // FUNÇÕES DE DOWNLOAD E COMPARTILHAMENTO
  const dataURLtoBlob = (dataurl: string, filename: string) => {
    const arr = dataurl.split(',')
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
    const bstr = atob(arr[1])
    let n = bstr.length
    let u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new File([u8arr], filename, { type: mime })
  }

  const handleShareOrDownload = async (
    e: React.MouseEvent<HTMLButtonElement>,
    attemptShare: boolean,
  ) => {
    e.stopPropagation()

    if (
      !dialogContentRef.current ||
      !treatment ||
      !buttonsContainerRef.current ||
      !contentContainerRef.current ||
      !interactionListRef.current
    ) {
      console.error('Dados ou elementos não encontrados.')
      return
    }

    const input = dialogContentRef.current
    const buttonsElement = buttonsContainerRef.current
    const contentElement = contentContainerRef.current
    const interactionsTitleElement = interactionsTitleRef.current
    const merchandiseTitleElement = merchandiseTitleRef.current
    const interactionsLabelElement = interactionsLabelRef.current
    const merchandiseLabelElement = merchandiseLabelRef.current
    const interactionListElement = interactionListRef.current

    // 1. SALVAR ESTILOS ORIGINAIS
    const originalBodyOverflow = document.body.style.overflow
    const originalDialogOverflow = input.style.overflowY
    const originalButtonsDisplay = buttonsElement.style.display
    const originalContentMargin = contentElement.style.marginTop

    let originalInteractionsClasses = ''
    let originalMerchandiseClasses = ''

    // --- LÓGICA DE REVELAR INTERAÇÕES PARA CAPTURA ---
    interactionListElement.classList.remove('sr-only')
    interactionListElement.classList.add(
      'p-4',
      'border',
      'border-gray-200',
      'rounded-md',
      'text-sm',
      'my-4',
      'bg-gray-50',
    )
    // ----------------------------------------------------

    // 2. APLICAR ESTILOS DE CAPTURA
    buttonsElement.style.display = 'none'
    contentElement.style.marginTop = '0'

    if (interactionsTitleElement) {
      originalInteractionsClasses = interactionsTitleElement.className
      interactionsTitleElement.classList.remove('my-2')
      interactionsTitleElement.classList.add('m-0')
    }
    if (merchandiseTitleElement) {
      originalMerchandiseClasses = merchandiseTitleElement.className
      merchandiseTitleElement.classList.remove('my-2')
      merchandiseTitleElement.classList.add('m-0')
    }

    if (interactionsLabelElement) {
      interactionsLabelElement.style.setProperty('padding', '0px', 'important')
      interactionsLabelElement.style.setProperty('height', 'auto', 'important')
    }
    if (merchandiseLabelElement) {
      merchandiseLabelElement.style.setProperty('padding', '0px', 'important')
      merchandiseLabelElement.style.setProperty('height', 'auto', 'important')
    }

    input.style.overflowY = 'visible'
    document.body.style.overflow = 'hidden'

    await new Promise((resolve) => setTimeout(resolve, 50))

    try {
      const canvas = await html2canvas(input, {
        scale: 3,
        allowTaint: true,
        useCORS: true,
        height: input.scrollHeight,
        width: input.scrollWidth,
      })

      const filename = `atendimento_${treatmentId}_${dayjs().format(
        'YYYYMMDD_HHmmss',
      )}.png`
      const imageURL = canvas.toDataURL('image/png')

      const resumo = `
*Detalhes do Atendimento*
Protocolo: ${treatmentId}
Cliente: ${treatment.clients.name}
Status: ${treatment.status === 'finished' ? 'Resolvido' : 'Em Andamento'}
Total: R$ ${subtotal.toFixed(2)}
      `.trim()

      if (attemptShare) {
        if (
          navigator.share &&
          navigator.canShare &&
          navigator.canShare({ files: [dataURLtoBlob(imageURL, filename)] })
        ) {
          const imageFile = dataURLtoBlob(imageURL, filename)

          await navigator.share({
            files: [imageFile],
            title: `Atendimento ${treatmentId}`,
            text: resumo,
          })
          return
        } else {
          const encodedText = encodeURIComponent(
            resumo + '\n\n(A imagem será salva separadamente para anexar)',
          )
          window.open(`https://wa.me/?text=${encodedText}`, '_blank')

          const link = document.createElement('a')
          link.href = imageURL
          link.download = filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      } else {
        const link = document.createElement('a')
        link.href = imageURL
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Erro ao gerar/compartilhar a imagem:', error)
        alert(
          'Ocorreu um erro ao gerar a imagem. Verifique se o navegador suporta o compartilhamento nativo.',
        )
      }
    } finally {
      // 3. RESTAURAR ESTILOS ORIGINAIS
      buttonsElement.style.display = originalButtonsDisplay
      contentElement.style.marginTop = originalContentMargin

      if (interactionsTitleElement) {
        interactionsTitleElement.className = originalInteractionsClasses
      }
      if (merchandiseTitleElement) {
        merchandiseTitleElement.className = originalMerchandiseClasses
      }

      if (interactionsLabelElement) {
        interactionsLabelElement.style.removeProperty('padding')
        interactionsLabelElement.style.removeProperty('height')
      }
      if (merchandiseLabelElement) {
        merchandiseLabelElement.style.removeProperty('padding')
        merchandiseLabelElement.style.removeProperty('height')
      }

      // --- LÓGICA DE ESCONDER INTERAÇÕES APÓS CAPTURA ---
      interactionListElement.classList.remove(
        'p-4',
        'border',
        'border-gray-200',
        'rounded-md',
        'text-sm',
        'my-4',
        'bg-gray-50',
      )
      interactionListElement.classList.add('sr-only')
      // ----------------------------------------------------

      input.style.overflowY = originalDialogOverflow
      document.body.style.overflow = originalBodyOverflow
    }
  }

  const shareOnlyWhatsApp = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()

    if (!treatment) return

    const resumo = `
*Detalhes do Atendimento*
Protocolo: ${treatmentId}
Cliente: ${treatment.clients.name}
Status: ${treatment.status === 'finished' ? 'Resolvido' : 'Em Andamento'}
Total: R$ ${subtotal.toFixed(2)}
      `.trim()

    const encodedText = encodeURIComponent(resumo)
    window.open(`https://wa.me/?text=${encodedText}`, '_blank')
  }

  return (
    <Dialog.Overlay>
      <DialogContent
        ref={dialogContentRef}
        className={`transition-all duration-300 overflow-y-auto ${isExpanded
          ? 'max-h-[95vh] w-[95vw] max-w-[1200px] scale-100'
          : 'max-h-[80vh] w-[90vw] max-w-2xl'
          }`}
        onEscapeKeyDown={() => setIsExpanded(false)}
      >
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center justify-between gap-2">
            <span className="whitespace-nowrap">
              Atendimento: <span className="text-sm font-normal"> {treatmentId} </span>
            </span>
            <div ref={buttonsContainerRef} className="flex space-x-2">
              <button
                onClick={(e) => handleShareOrDownload(e, true)}
                className="flex items-center gap-1 rounded-md bg-blue-500 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-600"
                aria-label="Compartilhar imagem via menu nativo"
              >
                <Share2 className="h-4 w-4" /> Compartilhar
              </button>

              <button
                onClick={(e) => handleShareOrDownload(e, false)}
                className="flex items-center gap-1 rounded-md bg-gray-500 px-3 py-1 text-sm text-white transition-colors hover:bg-gray-600"
                aria-label="Baixar imagem"
              >
                <Download className="h-4 w-4" /> Download
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="rounded-md bg-minsk-100 px-3 py-1 text-sm transition-colors hover:bg-minsk-200"
                aria-label={
                  isExpanded ? 'Recolher visualização' : 'Expandir visualização'
                }
              >
                {isExpanded ? 'Recolher' : 'Expandir'}
              </button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <DialogDescription className="text-base font-bold text-minsk-600">
          Detalhes do Atendimento
        </DialogDescription>

        {treatment && (
          <div
            ref={contentContainerRef}
            className={
              isExpanded ? 'grid grid-cols-1 gap-6 md:grid-cols-2' : ''
            }
          >
            <div className={isExpanded ? 'space-y-6' : ''}>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-muted-foreground">Status</TableCell>
                    <TableCell className="flex justify-end">
                      <TreatmentStatus status={treatment.status} />
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="text-muted-foreground">Cliente</TableCell>
                    <TableCell className="flex justify-end">
                      {treatment.clients.name}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground">Requisição</TableCell>
                    <TableCell className="flex justify-end text-end">
                      {treatment.request}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground">Aberto em</TableCell>
                    <TableCell className="flex justify-end">
                      {dayjs(`${treatment.opening_date}`).format(
                        'DD/MM/YYYY HH:mm',
                      )}
                    </TableCell>
                  </TableRow>
                  {treatment.ending_date ? (
                    <TableRow>
                      <TableCell className="w-40 text-muted-foreground">
                        Resolvido em
                      </TableCell>
                      <TableCell className="flex justify-end">
                        {dayjs(`${treatment.ending_date}`).format(
                          'DD/MM/YYYY HH:mm',
                        )}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {/* Linha para exibir o tempo total de atendimento */}
                  <TableRow>
                    <TableCell className="text-muted-foreground font-bold">
                      Tempo Total
                    </TableCell>
                    <TableCell className="flex justify-end font-bold text-minsk-800">
                      {totalDuration}
                      <span className="ml-1 font-normal text-xs text-gray-500">
                        ({treatment.status === 'finished' ? 'Total' : 'Até Agora'})
                      </span>
                    </TableCell>
                  </TableRow>
                  {/* FIM NOVO */}

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

              {/* Interações (Gráfico e Lista Oculta) */}
              {interactionData.length >= 1 && (
                <div className={isExpanded ? 'mt-6' : ''}>
                  <div
                    ref={interactionsTitleRef}
                    className="my-2 flex w-full justify-center border-y-4 border-minsk-200 bg-minsk-50"
                  >
                    <Label
                      ref={interactionsLabelRef}
                      className="w-full text-center text-lg font-bold text-minsk-600"
                    >
                      Interações (Linha do Tempo)
                    </Label>
                  </div>

                  {/* BLOCO: GRÁFICO DE INTERAÇÕES (Time Series Event Plot) */}
                  <div className="h-40" style={{ width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart
                        margin={{ top: 10, right: 10, bottom: 20, left: 10 }}
                      >
                        <XAxis
                          dataKey="date"
                          type="number"
                          domain={['dataMin', 'dataMax']}
                          padding={{ left: 15, right: 15 }}
                          tickFormatter={(timestamp) =>
                            dayjs(timestamp).format('DD/MM')
                          }
                          minTickGap={80}
                          allowDataOverflow={true}
                          stroke="#6B7280"
                        />
                        <YAxis
                          dataKey="y"
                          type="number"
                          domain={[0.5, 1.5]}
                          hide={true}
                        />
                        <Tooltip
                          cursor={{ strokeDasharray: '3 3' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload
                              return (
                                <div className="max-w-xs rounded-md border border-gray-300 bg-white p-2 text-sm shadow-lg">
                                  <p className="font-bold text-minsk-600">
                                    {data.originalDate}
                                  </p>
                                  <p className="whitespace-pre-wrap">
                                    {data.description}
                                  </p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Scatter
                          name="Interactions"
                          data={interactionData}
                          fill="#4F46E5"
                          shape="circle"
                          line={{ stroke: '#4F46E5', strokeWidth: 1 }}
                        >
                          {/* LabelList removida */}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>

                  {/* LISTA OCULTA DE INTERAÇÕES PARA CAPTURA (sr-only por padrão) */}
                  <ul ref={interactionListRef} className="sr-only">
                    <li className="mb-1 font-bold text-minsk-600">
                      Registro Detalhado das Interações:
                    </li>
                    {/* Mapeamento das interações originais */}
                    {treatment.interactions.map((interaction) => (
                      <li
                        key={interaction.id}
                        className="ml-4 list-disc text-gray-800"
                      >
                        <span className="mr-2 font-semibold">
                          {dayjs(`${interaction.date}`).format('DD/MM/YYYY HH:mm')}:
                        </span>
                        {interaction.description}
                      </li>
                    ))}
                    {/* Status final removido da lista oculta também */}
                  </ul>
                </div>
              )}

              {/* Seção de mercadorias (mantida) */}
              {treatment.items.length > 0 && (
                <div className={isExpanded ? 'mt-0' : ''}>
                  <div
                    ref={merchandiseTitleRef}
                    className="my-2 flex border-y-4 border-y-minsk-200 bg-minsk-50"
                  >
                    <Label
                      ref={merchandiseLabelRef}
                      className="w-full text-center text-lg font-bold text-minsk-600"
                    >
                      Mercadorias
                    </Label>
                  </div>

                  <div>
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
            {/* ... Conteúdo expandido para a segunda coluna (Merchandise) ... */}
            {treatment.items.length > 0 && isExpanded && (
              <div className="col-span-1">
                <div
                  ref={merchandiseTitleRef}
                  className="my-2 flex border-y-4 border-y-minsk-200 bg-minsk-50"
                >
                  <Label
                    ref={merchandiseLabelRef}
                    className="w-full text-center text-lg font-bold text-minsk-600"
                  >
                    Mercadorias
                  </Label>
                </div>

                <div>
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