import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import html2canvas from 'html2canvas'
import {
  Activity,
  Calendar,
  Clock,
  Download,
  FileText,
  Layers,
  Package,
  Share2,
  User,
} from 'lucide-react'
import { useRef, useState } from 'react'

import { getTreatmentDetails } from '@/api/get-treatment-details'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TreatmentStatus } from '@/components/ui/treatment-status'

dayjs.extend(duration)

// ====================================================================
// TIPAGEM
interface Interaction {
  id: string
  date: string | Date
  description: string
}

interface Item {
  item_id: string
  quantity: number
  salesValue: number
  discount?: number
  observations?: string | null
  items: {
    name: string
  }
}

interface TreatmentDetailsData {
  id: string
  status:
    | 'pending'
    | 'in_progress'
    | 'on_hold'
    | 'resolved'
    | 'canceled'
    | 'follow_up'
    | 'in_workbench'
  clients: {
    name: string
  }
  request: string
  opening_date: string | Date
  ending_date: string | Date | null
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

  const { data: treatment } = useQuery<TreatmentDetailsData>({
    queryKey: ['treatment', treatmentId],
    queryFn: async () => {
      const data = await getTreatmentDetails({ treatmentId })
      return data as unknown as TreatmentDetailsData
    },
    enabled: open,
  })

  // ====================================================================
  // CÁLCULO DO TEMPO DE ATENDIMENTO
  // ====================================================================
  const calculateDuration = (
    opening: string | Date,
    ending: string | Date | null,
  ) => {
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
      output += `${days}d `
    }
    if (hours > 0) {
      output += `${hours}h `
    }
    output += `${minutes}min`

    return output.trim()
  }

  let subtotal = 0
  let totalDiscounts = 0
  if (treatment) {
    subtotal = treatment.items.reduce((accumulator, item) => {
      const currentSubtotal = item.quantity * item.salesValue
      return accumulator + currentSubtotal
    }, 0)
    totalDiscounts = treatment.items.reduce((accumulator, item) => {
      return accumulator + (item.discount || 0)
    }, 0)
  }
  const grandTotal = subtotal - totalDiscounts

  // Calculate Duration
  const totalDuration = treatment
    ? calculateDuration(treatment.opening_date, treatment.ending_date)
    : ''

  // FUNÇÕES DE DOWNLOAD E COMPARTILHAMENTO
  const dataURLtoBlob = (dataurl: string, filename: string) => {
    const arr = dataurl.split(',')
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
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
      !buttonsContainerRef.current
    ) {
      console.error('Dados ou elementos não encontrados.')
      return
    }

    const input = dialogContentRef.current
    const buttonsElement = buttonsContainerRef.current

    // 1. SALVAR ESTILOS ORIGINAIS
    const originalBodyOverflow = document.body.style.overflow
    const originalDialogOverflow = input.style.overflowY
    const originalButtonsDisplay = buttonsElement.style.display

    // 2. APLICAR ESTILOS DE CAPTURA
    buttonsElement.style.display = 'none'
    input.style.overflowY = 'visible'
    document.body.style.overflow = 'hidden'

    await new Promise((resolve) => setTimeout(resolve, 100))

    try {
      const canvas = await html2canvas(input, {
        scale: 2, // Slightly lower scale for performance, usually enough
        allowTaint: true,
        useCORS: true,
        backgroundColor: '#ffffff', // Ensure white background
        height: input.scrollHeight,
        width: input.scrollWidth,
        ignoreElements: (element) => element.classList.contains('no-print'), // Helper class to hide elements
      })

      const filename = `atendimento_${treatment.id}_${dayjs().format(
        'YYYYMMDD_HHmmss',
      )}.png`
      const imageURL = canvas.toDataURL('image/png')

      const resumo = `
*Detalhes do Atendimento*
Protocolo: ${treatment.id}
Cliente: ${treatment.clients.name}
Status: ${treatment.status === 'resolved' ? 'Resolvido' : 'Em Andamento'}
${totalDiscounts > 0 ? `Subtotal: R$ ${subtotal.toFixed(2)}\nDescontos: -R$ ${totalDiscounts.toFixed(2)}\nTotal: R$ ${grandTotal.toFixed(2)}` : `Total: R$ ${subtotal.toFixed(2)}`}
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
            title: `Atendimento ${treatment.id}`,
            text: resumo,
          })
        } else {
          // Fallback for sharing
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
      console.error('Erro ao gerar imagem:', error)
    } finally {
      // 3. RESTAURAR ESTILOS
      buttonsElement.style.display = originalButtonsDisplay
      input.style.overflowY = originalDialogOverflow
      document.body.style.overflow = originalBodyOverflow
    }
  }

  return (
    <DialogContent
      ref={dialogContentRef}
      className={`overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-all duration-300 ${
        isExpanded
          ? 'max-h-[95vh] w-[95vw] max-w-[1200px]'
          : 'max-h-[85vh] w-[90vw] max-w-3xl'
      } gap-0 rounded-xl border-0 p-0 shadow-2xl`}
      onEscapeKeyDown={() => setIsExpanded(false)}
    >
      {/* HEADER FIXO DO DIALOG */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-6 py-4 shadow-sm">
        <DialogHeader className="flex flex-col text-left">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            Detalhes do Atendimento
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-slate-500 dark:text-slate-400">
            Protocolo: {treatmentId}
          </DialogDescription>
        </DialogHeader>

        <div ref={buttonsContainerRef} className="flex gap-2">
          <button
            onClick={(e) => handleShareOrDownload(e, true)}
            className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
            title="Compartilhar"
          >
            <Share2 className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => handleShareOrDownload(e, false)}
            className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
            title="Baixar Imagem"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>

      {treatment ? (
        <div className="space-y-6 p-6">
          {/* 1. HEADER CARD PRINCIPAL */}
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="h-2 w-full bg-gradient-to-r from-blue-600 to-indigo-600" />
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <Badge
                    variant="outline"
                    className="mb-2 border-blue-200 bg-blue-50 text-blue-700"
                  >
                    {treatment.status === 'resolved'
                      ? 'Finalizado'
                      : 'Em Andamento'}
                  </Badge>
                  <CardTitle className="text-2xl font-bold leading-tight text-slate-900 dark:text-white">
                    {treatment.request}
                  </CardTitle>
                </div>
                <TreatmentStatus status={treatment.status} />
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 pt-0 md:grid-cols-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Cliente</p>
                  <p
                    className="line-clamp-1 font-semibold text-slate-900 dark:text-white"
                    title={treatment.clients.name}
                  >
                    {treatment.clients.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Aberto em</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {dayjs(treatment.opening_date).format('DD/MM/YYYY')}
                    <span className="ml-1 text-xs font-normal text-gray-400">
                      {dayjs(treatment.opening_date).format('HH:mm')}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-50 p-2 text-orange-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Duração</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{totalDuration}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. OBSERVATIONS & TIMELINE GRID */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Left Column: Observations & Items */}
            <div className="space-y-6 md:col-span-2">
              {/* Observações */}
              {treatment.observations && (
                <Card className="border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 text-yellow-700">
                      <FileText className="h-5 w-5" />
                      <h3 className="font-semibold">Observações</h3>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-200">
                      {treatment.observations}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Mercadorias / Items */}
              {treatment.items.length > 0 && (
                <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                  <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <Package className="h-5 w-5" />
                        <h3 className="font-semibold">Itens e Serviços</h3>
                      </div>
                      <Badge variant="secondary">
                        {treatment.items.length} itens
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      {treatment.items.map((item, idx) => (
                        <div
                          key={`${item.item_id}-${idx}`}
                          className="grid grid-cols-12 items-start gap-4 p-4 transition-colors hover:bg-gray-50"
                        >
                          <div className="col-span-6 flex flex-col font-medium text-slate-900 dark:text-white">
                            <span>{item.items.name}</span>
                            {item.observations && (
                              <span
                                className="mt-1 line-clamp-3 text-xs font-normal text-gray-500"
                                title={item.observations}
                              >
                                Obs: {item.observations}
                              </span>
                            )}
                          </div>
                          <div className="col-span-2 rounded-md bg-gray-100 py-1 text-center text-sm text-gray-600">
                            {item.quantity}x
                          </div>
                          <div className="col-span-4 flex flex-col items-end justify-center text-right">
                            {item.discount && item.discount > 0 ? (
                              <>
                                <span className="text-xs text-gray-400 line-through">
                                  R${' '}
                                  {(item.quantity * item.salesValue).toFixed(2)}
                                </span>
                                <span className="font-bold text-green-600">
                                  R${' '}
                                  {(
                                    item.quantity * item.salesValue -
                                    item.discount
                                  ).toFixed(2)}
                                </span>
                                {item.discount >=
                                  item.quantity * item.salesValue && (
                                  <Badge
                                    variant="outline"
                                    className="mt-1 h-4 border-green-200 bg-green-50 px-1 py-0 text-[10px] uppercase tracking-widest text-green-600"
                                  >
                                    100% OFF (Contrato)
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className="font-medium text-slate-900 dark:text-white">
                                R${' '}
                                {(item.quantity * item.salesValue).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4">
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Subtotal</span>
                        <span>R$ {subtotal.toFixed(2)}</span>
                      </div>
                      {totalDiscounts > 0 && (
                        <div className="flex items-center justify-between text-sm font-medium text-red-500">
                          <span>Descontos</span>
                          <span>- R$ {totalDiscounts.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="mt-1 flex items-center justify-between border-t border-gray-200 pt-2">
                        <span className="font-medium text-gray-600">
                          Total Geral
                        </span>
                        <span className="text-xl font-bold text-green-600">
                          R$ {grandTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column: Vertical Timeline */}
            <div className="md:col-span-1">
              <Card className="h-full border-0 bg-transparent shadow-none shadow-sm ring-0">
                <div className="mb-4 flex items-center gap-2 px-1 text-slate-700 dark:text-slate-200">
                  <Activity className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-lg font-bold">Linha do Tempo</h3>
                </div>

                <div className="relative ml-2 space-y-8 border-l-2 border-indigo-100 pl-4">
                  {/* Evento Inicial */}
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white bg-indigo-400 ring-2 ring-indigo-100"></div>
                    <div className="rounded-lg border bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-sm shadow-sm">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        Atendimento Iniciado
                      </p>
                      <span className="mt-1 block text-xs text-gray-400">
                        {dayjs(treatment.opening_date).format(
                          'DD/MM/YYYY HH:mm',
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Interações */}
                  {treatment.interactions.map((interaction, idx) => (
                    <div key={`${interaction.id}-${idx}`} className="relative">
                      <div className="absolute -left-[21px] top-3 h-3 w-3 rounded-full border-2 border-white bg-blue-500 ring-2 ring-blue-100"></div>
                      <div className="group relative rounded-lg border bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm transition-all hover:border-blue-200">
                        <div className="absolute -left-2 top-4 h-2 w-2 rotate-45 transform border-b border-l bg-white"></div>
                        <p className="mb-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                          {interaction.description}
                        </p>

                        <div className="mt-2 flex items-center justify-between border-t border-gray-50 pt-2">
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
                            Atualização
                          </span>
                          <span className="text-xs text-gray-400">
                            {dayjs(interaction.date).fromNow()}
                          </span>
                        </div>
                      </div>
                      {/* Data para referência de impressão */}
                      <span className="p-print-date sr-only">
                        {dayjs(interaction.date).format('DD/MM/YYYY HH:mm')}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-gray-400">
          <Layers className="mx-auto mb-3 h-12 w-12 opacity-20" />
          <p>Carregando informações...</p>
        </div>
      )}
    </DialogContent>
  )
}
