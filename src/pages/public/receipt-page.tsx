import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle,
  FileText,
  Tag,
  Wallet,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import {
  getPublicReceipt,
  PublicTransactionReceipt,
} from '@/api/get-public-receipt'
import { ImageZoomViewer } from '@/components/image-zoom-viewer'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api, API_BASE_URL } from '@/lib/axios'

// Utilizando API_BASE_URL para montar URL do arquivo
const BASE_URL = API_BASE_URL || ''

export function ReceiptPage() {
  const { transactionId } = useParams<{ transactionId: string }>()
  const [receipt, setReceipt] = useState<PublicTransactionReceipt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!transactionId) return

    getPublicReceipt(transactionId)
      .then((data) => {
        setReceipt(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setError('Comprovante não encontrado ou erro ao carregar.')
        setLoading(false)
      })
  }, [transactionId])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="mb-2 h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="mt-4 h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !receipt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md border-destructive/50">
          <CardContent className="flex flex-col items-center pt-6 text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
            <h2 className="mb-2 text-xl font-bold">Ops!</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isExpense = receipt.operation === 'expense'
  const isImage = receipt.attachment_url?.match(/\.(jpeg|jpg|gif|png|webp)$/i)
  const fullAttachmentUrl = receipt.attachment_url
    ? receipt.attachment_url.startsWith('http')
      ? receipt.attachment_url
      : `${BASE_URL.replace(/\/$/, '')}${receipt.attachment_url.startsWith('/') ? '' : '/'}${receipt.attachment_url}`
    : null

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#F8FAFC] px-4 py-10 font-sans sm:px-6 lg:px-8">
      <div className="w-full max-w-xl">
        {/* Header Logo Area */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary p-2 text-primary-foreground">
              <FileText size={24} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">
              Metrics
            </span>
          </div>
        </div>

        <Card className="overflow-hidden border-muted/50 bg-white shadow-lg">
          {/* Color Banner */}
          <div
            className={`h-2 w-full ${isExpense ? 'bg-rose-500' : 'bg-emerald-500'}`}
          />

          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-2xl font-bold">Comprovante</CardTitle>
            <CardDescription>Visualização segura de documento</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pb-6 pt-4">
            <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/40 p-4">
              <div>
                <p className="mb-1 text-sm font-medium text-muted-foreground">
                  Status
                </p>
                <div className="flex items-center">
                  {receipt.confirmed ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                    >
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Confirmado
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50"
                    >
                      Pendente
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="mb-1 text-sm font-medium text-muted-foreground">
                  Valor Total
                </p>
                <p
                  className={`text-2xl font-bold tracking-tight ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}
                >
                  {formatCurrency(receipt.totalValue || receipt.amount)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-start">
                  <Tag className="mr-2 mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Descrição</p>
                    <p className="text-sm font-medium">
                      {receipt.description || 'Sem descrição'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Building2 className="mr-2 mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Fornecedor / Emitente
                    </p>
                    <p className="text-sm font-medium">
                      {receipt.supplier?.name || '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start">
                  <Calendar className="mr-2 mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Data Vencimento
                    </p>
                    <p className="text-sm font-medium">
                      {receipt.data_vencimento
                        ? format(
                            new Date(receipt.data_vencimento),
                            'dd/MM/yyyy',
                            { locale: ptBR },
                          )
                        : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Wallet className="mr-2 mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Pagamento</p>
                    <p className="text-sm font-medium uppercase">
                      {receipt.payment_method}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <hr className="my-6 border-border" />

            <div>
              <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
                Documento Anexado
              </h3>

              {!fullAttachmentUrl ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 p-8">
                  <FileText className="mb-2 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Nenhum anexo disponível
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border shadow-sm">
                  {isImage ? (
                    <div className="h-[600px] w-full bg-muted">
                      <ImageZoomViewer
                        src={fullAttachmentUrl}
                        alt="Comprovante"
                        containerClassName="w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="aspect-auto h-[500px] w-full">
                      <iframe
                        src={fullAttachmentUrl}
                        className="h-full w-full border-0"
                        title="Comprovante PDF"
                      />
                    </div>
                  )}
                  <div className="border-t bg-muted/50 p-3 text-center">
                    <a
                      href={fullAttachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                    >
                      <FileText className="mr-1 h-4 w-4" />
                      Abrir arquivo em nova aba
                    </a>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Gerado pelo Sistema Metrics • Este é um documento digital de uso
          institucional
        </p>
      </div>
    </div>
  )
}
