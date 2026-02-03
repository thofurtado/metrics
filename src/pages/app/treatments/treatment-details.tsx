import * as Dialog from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import { useState, useRef } from 'react'
import html2canvas from 'html2canvas'
import { Share2, Download, User, Calendar, Clock, FileText, Activity, Layers, Package } from 'lucide-react'

import { getTreatmentDetails } from '@/api/get-treatment-details'
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TreatmentStatus } from '@/components/ui/treatment-status'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

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

  const { data: treatment } = useQuery<TreatmentDetailsData>({
    queryKey: ['treatment', treatmentId],
    queryFn: () => getTreatmentDetails({ treatmentId }),
    enabled: open,
  })

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
      output += `${days}d `
    }
    if (hours > 0) {
      output += `${hours}h `
    }
    output += `${minutes}min`

    return output.trim()
  }

  let subtotal = 0
  if (treatment) {
    subtotal = treatment.items.reduce((accumulator, item) => {
      const currentSubtotal = item.quantity * item.salesValue
      return accumulator + currentSubtotal
    }, 0)
  }

  // Calculate Duration
  const totalDuration = treatment ? calculateDuration(
    treatment.opening_date,
    treatment.ending_date,
  ) : ''

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

    if (!dialogContentRef.current || !treatment || !buttonsContainerRef.current) {
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
        ignoreElements: (element) => element.classList.contains('no-print') // Helper class to hide elements
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
    <Dialog.Overlay>
      <DialogContent
        ref={dialogContentRef}
        className={`bg-gray-50/95 transition-all duration-300 overflow-y-auto ${isExpanded
          ? 'max-h-[95vh] w-[95vw] max-w-[1200px]'
          : 'max-h-[85vh] w-[90vw] max-w-3xl'
          } p-0 gap-0 border-0 shadow-2xl rounded-xl`}
        onEscapeKeyDown={() => setIsExpanded(false)}
      >
        {/* HEADER FIXO DO DIALOG */}
        <div className="sticky top-0 z-20 bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-gray-800">Detalhes do Atendimento</h2>
            <span className="text-xs text-gray-500 font-mono">{treatmentId}</span>
          </div>

          <div ref={buttonsContainerRef} className="flex gap-2">
            <button
              onClick={(e) => handleShareOrDownload(e, true)}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
              title="Compartilhar"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => handleShareOrDownload(e, false)}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
              title="Baixar Imagem"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {treatment ? (
          <div className="p-6 space-y-6">

            {/* 1. HEADER CARD PRINCIPAL */}
            <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 w-full" />
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <Badge variant="outline" className="mb-2 bg-blue-50 text-blue-700 border-blue-200">
                      {treatment.status === 'finished' ? 'Finalizado' : 'Em Andamento'}
                    </Badge>
                    <CardTitle className="text-2xl font-bold text-gray-900 leading-tight">
                      {treatment.request}
                    </CardTitle>
                  </div>
                  <TreatmentStatus status={treatment.status} />
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Cliente</p>
                    <p className="font-semibold text-gray-900 line-clamp-1" title={treatment.clients.name}>
                      {treatment.clients.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Aberto em</p>
                    <p className="font-semibold text-gray-900">
                      {dayjs(treatment.opening_date).format('DD/MM/YYYY')}
                      <span className="text-xs text-gray-400 ml-1 font-normal">
                        {dayjs(treatment.opening_date).format('HH:mm')}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Duração</p>
                    <p className="font-semibold text-gray-900">{totalDuration}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. OBSERVATIONS & TIMELINE GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Left Column: Observations & Items */}
              <div className="md:col-span-2 space-y-6">
                {/* Observações */}
                {treatment.observations && (
                  <Card className="border-l-4 border-l-yellow-400 shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2 text-yellow-700">
                        <FileText className="h-5 w-5" />
                        <h3 className="font-semibold">Observações</h3>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {treatment.observations}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Mercadorias / Items */}
                {treatment.items.length > 0 && (
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3 border-b bg-gray-50/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Package className="h-5 w-5" />
                          <h3 className="font-semibold">Itens e Serviços</h3>
                        </div>
                        <Badge variant="secondary">{treatment.items.length} itens</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {treatment.items.map((item) => (
                          <div key={item.item_id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 transition-colors">
                            <div className="col-span-6 font-medium text-gray-900">
                              {item.items.name}
                            </div>
                            <div className="col-span-2 text-center text-sm bg-gray-100 rounded-md py-1 text-gray-600">
                              {item.quantity}x
                            </div>
                            <div className="col-span-4 text-right font-medium text-gray-900">
                              R$ {(item.quantity * item.salesValue).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-gray-50 p-4 border-t flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Total Geral</span>
                        <span className="text-xl font-bold text-green-600">R$ {subtotal.toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column: Vertical Timeline */}
              <div className="md:col-span-1">
                <Card className="h-full shadow-sm border-0 bg-transparent shadow-none ring-0">
                  <div className="flex items-center gap-2 mb-4 text-gray-700 px-1">
                    <Activity className="h-5 w-5 text-indigo-500" />
                    <h3 className="font-bold text-lg">Linha do Tempo</h3>
                  </div>

                  <div className="relative pl-4 border-l-2 border-indigo-100 space-y-8 ml-2">
                    {/* Evento Inicial */}
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white bg-indigo-400 ring-2 ring-indigo-100"></div>
                      <div className="bg-white p-3 rounded-lg border shadow-sm text-sm">
                        <p className="font-semibold text-gray-800">Atendimento Iniciado</p>
                        <span className="text-xs text-gray-400 block mt-1">
                          {dayjs(treatment.opening_date).format('DD/MM/YYYY HH:mm')}
                        </span>
                      </div>
                    </div>

                    {/* Interações */}
                    {treatment.interactions.map((interaction, idx) => (
                      <div key={interaction.id} className="relative">
                        <div className="absolute -left-[21px] top-3 h-3 w-3 rounded-full border-2 border-white bg-blue-500 ring-2 ring-blue-100"></div>
                        <div className="bg-white p-4 rounded-lg border shadow-sm relative group hover:border-blue-200 transition-all">
                          <div className="absolute -left-2 top-4 w-2 h-2 bg-white border-l border-b transform rotate-45"></div>
                          <p className="text-gray-700 text-sm leading-relaxed mb-2">
                            {interaction.description}
                          </p>

                          <div className="flex justify-between items-center pt-2 border-t border-gray-50 mt-2">
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              Atualização
                            </span>
                            <span className="text-xs text-gray-400">
                              {dayjs(interaction.date).fromNow()}
                            </span>
                          </div>
                        </div>
                        {/* Data para referência de impressão */}
                        <span className="sr-only p-print-date">
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
            <Layers className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Carregando informações...</p>
          </div>
        )}
      </DialogContent>
    </Dialog.Overlay>
  )
}