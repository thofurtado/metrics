import { useState } from 'react'
import { Printer, CheckCircle2, UserCheck, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { settleTermDebt } from '@/api/settle-term-debt'

interface EmployeeTermPdfModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: {
    id: string
    name: string
    department?: string
    role?: string
    items: any[]
    totalAmount: number
  } | null
  accounts: any[]
}

export function EmployeeTermPdfModal({
  open,
  onOpenChange,
  employee,
  accounts = [],
}: EmployeeTermPdfModalProps) {
  const queryClient = useQueryClient()
  const [showCounterPay, setShowCounterPay] = useState(false)
  const [actualMethod, setActualMethod] = useState('PIX')
  const [targetAccountId, setTargetAccountId] = useState('')

  const handleGeneratePdf = () => {
    if (!employee || !employee.items.length) {
      toast.error('Nenhum item encontrado para gerar o termo.')
      return
    }

    try {
      const doc = new jsPDF('p', 'mm', 'a4')

      // Header Corporativo
      doc.setFillColor(15, 23, 42) // Slate-900
      doc.rect(0, 0, 210, 26, 'F')

      doc.setFontSize(13)
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.text('METRICS - TERMO DE VALE E RECONHECIMENTO DE DÉBITO', 14, 12)

      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184) // Slate-400
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Documento de controle interno emitido em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
        14,
        18,
      )

      // Identificação do Colaborador
      doc.setFillColor(248, 250, 252) // Slate-50
      doc.setDrawColor(226, 232, 240) // Slate-200
      doc.roundedRect(14, 32, 182, 22, 2, 2, 'FD')

      doc.setFontSize(9)
      doc.setTextColor(71, 85, 105) // Slate-600
      doc.setFont('helvetica', 'bold')
      doc.text('COLABORADOR:', 18, 40)
      doc.text('DATA DE REFERÊNCIA:', 110, 40)

      doc.setFontSize(10)
      doc.setTextColor(15, 23, 42) // Slate-900
      doc.text(employee.name.toUpperCase(), 18, 47)
      doc.text(format(new Date(), "MMMM 'de' yyyy", { locale: ptBR }).toUpperCase(), 110, 47)

      // Tabela de Lançamentos de Vales / Consumos
      const tableData = employee.items.map((item) => [
        format(new Date(item.data_vencimento || item.data_emissao), 'dd/MM/yyyy'),
        item.description || 'Vale / Consumo de Colaborador',
        item.origem || 'Caixa Turno',
        Number(item.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      ])

      autoTable(doc, {
        startY: 60,
        head: [['Data', 'Descrição / Motivo do Lançamento', 'Origem', 'Valor (R$)']],
        body: tableData,
        theme: 'plain',
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [51, 65, 85],
          fontStyle: 'bold',
          fontSize: 8,
          cellPadding: 3,
        },
        bodyStyles: {
          textColor: [30, 41, 59],
          fontSize: 8,
          cellPadding: 3,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 26 },
          1: { cellWidth: 90 },
          2: { cellWidth: 35 },
          3: { cellWidth: 31, halign: 'right', fontStyle: 'bold' },
        },
        styles: {
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
        },
      })

      // Totalizador
      const finalY = (doc as any).lastAutoTable.finalY + 8

      doc.setFillColor(241, 245, 249)
      doc.rect(14, finalY, 182, 10, 'F')

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text('TOTAL CONSOLIDADO NO CICLO:', 18, finalY + 6.5)

      doc.setFontSize(11)
      doc.setTextColor(5, 150, 105) // Emerald-600
      doc.text(
        employee.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        192,
        finalY + 6.5,
        { align: 'right' },
      )

      // Texto Legal e Linhas de Assinatura
      const sigY = finalY + 20

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      const declaracao =
        'Declaro para os devidos fins ter solicitado e recebido os valores e/ou consumações acima discriminados, reconhecendo a exatidão dos lançamentos e autorizando o respectivo acerto ou desconto em folha de pagamento.'
      const splitText = doc.splitTextToSize(declaracao, 182)
      doc.text(splitText, 14, sigY)

      const lineY = sigY + 28

      // Linha Assinatura Colaborador
      doc.setDrawColor(148, 163, 184)
      doc.line(20, lineY, 90, lineY)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(51, 65, 85)
      doc.text(employee.name, 55, lineY + 5, { align: 'center' })
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text('Assinatura do Colaborador', 55, lineY + 9, { align: 'center' })

      // Linha Assinatura Empresa / RH
      doc.line(120, lineY, 190, lineY)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('Administração / Gerência', 155, lineY + 5, { align: 'center' })
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text('Assinatura e Carimbo', 155, lineY + 9, { align: 'center' })

      // Abre para impressão direta e visualização
      const pdfBlob = doc.output('blob')
      const blobUrl = URL.createObjectURL(pdfBlob)
      window.open(blobUrl, '_blank')
      toast.success('Termo gerado em PDF com sucesso!')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao gerar termo em PDF.')
    }
  }

  // Mutação para dar baixa (Abater em Folha ou Receber em Balcão)
  const { mutateAsync: settleEmployee, isPending } = useMutation({
    mutationFn: async (isDirectCash: boolean) => {
      if (!employee || !employee.items.length) return
      const ids = employee.items.map((i) => i.id)

      return settleTermDebt({
        transactionIds: ids,
        isPayrollDeducted: !isDirectCash,
        isWriteOff: !isDirectCash, // Não gera saldo bancário quando abatido em folha
        actualPaymentMethod: isDirectCash ? actualMethod : null,
        targetAccountId: isDirectCash ? targetAccountId : null,
      })
    },
    onSuccess: () => {
      toast.success('Lançamento atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['pending-settlements-terms'] })
      queryClient.invalidateQueries({ queryKey: ['pending-settlements-terms-all'] })
      queryClient.invalidateQueries({ queryKey: ['settlements-terms'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      onOpenChange(false)
      setShowCounterPay(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao processar baixa do colaborador.')
    },
  })

  if (!employee) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-slate-100">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <UserCheck size={18} />
            </div>
            <span>Controle de Vales: {employee.name}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Emita o termo para assinatura física ou registre a quitação do débito.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2 font-manrope">
          {/* Card Resumo */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Lançamentos Pendentes
                </span>
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                  {employee.items.length} {employee.items.length === 1 ? 'vale / consumo' : 'vales / consumos'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Total Acumulado
                </span>
                <p className="font-mono text-xl font-black text-blue-600 dark:text-blue-400">
                  {employee.totalAmount.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
              </div>
            </div>

            <div className="mt-3 max-h-32 divide-y divide-slate-200/60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 text-xs dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950">
              {employee.items.map((it: any) => (
                <div key={it.id} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {it.description || 'Vale / Consumo'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {format(new Date(it.data_vencimento || it.data_emissao), 'dd/MM/yyyy')}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {Number(it.amount || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Botão Principal: Gerar PDF de Assinatura */}
          <Button
            onClick={handleGeneratePdf}
            className="h-11 w-full gap-2 rounded-xl bg-slate-900 text-xs font-black uppercase text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <Printer size={15} />
            <span>Gerar Termo em PDF para Assinatura</span>
          </Button>

          {/* Alternância para Recebimento em Balcão vs Abater em Folha */}
          {!showCounterPay ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => settleEmployee(false)}
                disabled={isPending}
                className="h-10 rounded-xl border-blue-200 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-300"
              >
                <CheckCircle2 size={14} className="mr-1" />
                <span>Abater na Folha</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowCounterPay(true)}
                disabled={isPending}
                className="h-10 rounded-xl border-emerald-200 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-300"
              >
                <DollarSign size={14} className="mr-1" />
                <span>Receber em Balcão</span>
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <span className="mb-2 block text-xs font-black uppercase text-emerald-800 dark:text-emerald-300">
                Recebimento em Balcão (Entrada no Caixa)
              </span>

              <div className="space-y-2">
                <div>
                  <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Forma Recebida:
                  </Label>
                  <Select value={actualMethod} onValueChange={setActualMethod}>
                    <SelectTrigger className="h-9 rounded-xl bg-white text-xs font-bold dark:bg-slate-950">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PIX">? Pix</SelectItem>
                      <SelectItem value="DINHEIRO">?? Dinheiro Vivo</SelectItem>
                      <SelectItem value="CARTÃO DE DÉBITO">?? Cartão de Débito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Conta Destino:
                  </Label>
                  <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                    <SelectTrigger className="h-9 rounded-xl bg-white text-xs font-bold dark:bg-slate-950">
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        ?.filter((a) => !a.is_transit)
                        .map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => settleEmployee(true)}
                  disabled={!targetAccountId || isPending}
                  className="flex-1 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  {isPending ? 'Confirmando...' : 'Confirmar e Creditar Saldo'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCounterPay(false)}
                  className="rounded-xl text-xs"
                >
                  Voltar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
