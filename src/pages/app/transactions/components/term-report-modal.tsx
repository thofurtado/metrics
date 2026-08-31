import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  Calendar,
  CheckCircle2,
  FileDown,
  FileText,
  Filter,
  User,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TermReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentMonthDate: Date
  pendingItems: any[]
  clients: any[]
  employees: any[]
}

export function TermReportModal({
  open,
  onOpenChange,
  currentMonthDate,
  pendingItems,
  clients = [],
  employees = [],
}: TermReportModalProps) {
  // Target Selection Mode: 'single' | 'batch'
  const [targetMode, setTargetMode] = useState<'single' | 'batch'>('batch')

  // Single Selection
  const [selectedPersonId, setSelectedPersonId] = useState<string>('')

  // Batch Selection
  const [includeEmployees, setIncludeEmployees] = useState<boolean>(true)
  const [includeClients, setIncludeClients] = useState<boolean>(true)

  // Period Mode: 'month' | 'custom'
  const [periodMode, setPeriodMode] = useState<'month' | 'custom'>('month')
  const [selectedMonth, setSelectedMonth] = useState<number>(
    currentMonthDate.getMonth() + 1,
  )
  const [selectedYear, setSelectedYear] = useState<number>(
    currentMonthDate.getFullYear(),
  )
  const [startDate, setStartDate] = useState<string>(
    new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1)
      .toISOString()
      .split('T')[0],
  )
  const [endDate, setEndDate] = useState<string>(
    new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0],
  )

  // Report Format: 'detailed' | 'summary'
  const [reportFormat, setReportFormat] = useState<'detailed' | 'summary'>(
    'detailed',
  )
  const [isGenerating, setIsGenerating] = useState(false)

  // Unified list of all people
  const unifiedPeople = useMemo(() => {
    const list: {
      id: string
      name: string
      type: 'EMPLOYEE' | 'CLIENT'
      label: string
    }[] = []

    employees.forEach((emp) => {
      list.push({
        id: `emp-${emp.id || emp.name}`,
        name: emp.name,
        type: 'EMPLOYEE',
        label: `[Funcionário] ${emp.name}`,
      })
    })

    clients.forEach((cli) => {
      list.push({
        id: `cli-${cli.id || cli.name}`,
        name: cli.name,
        type: 'CLIENT',
        label: `[Cliente] ${cli.name}`,
      })
    })

    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [employees, clients])

  const handleGeneratePDF = async () => {
    try {
      setIsGenerating(true)

      // 1. Determine Date Range
      let start: Date
      let end: Date
      let periodLabel = ''

      if (periodMode === 'month') {
        start = new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0)
        end = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999)
        const monthNames = [
          'Janeiro',
          'Fevereiro',
          'Março',
          'Abril',
          'Maio',
          'Junho',
          'Julho',
          'Agosto',
          'Setembro',
          'Outubro',
          'Novembro',
          'Dezembro',
        ]
        periodLabel = `${monthNames[selectedMonth - 1]} de ${selectedYear}`
      } else {
        start = new Date(`${startDate}T00:00:00`)
        end = new Date(`${endDate}T23:59:59`)
        periodLabel = `De ${format(start, 'dd/MM/yyyy')} até ${format(end, 'dd/MM/yyyy')}`
      }

      // 2. Filter Items by Date
      let filtered = pendingItems.filter((item) => {
        const itemDate = new Date(item.data_vencimento || item.data_emissao)
        return itemDate >= start && itemDate <= end
      })

      // 3. Filter Items by Person / Group
      let targetLabel = ''
      if (targetMode === 'single') {
        if (!selectedPersonId) {
          toast.error('Por favor, selecione uma pessoa para gerar o relatório.')
          setIsGenerating(false)
          return
        }
        const person = unifiedPeople.find((p) => p.id === selectedPersonId)
        targetLabel = person ? person.label : 'Pessoa Selecionada'

        filtered = filtered.filter((item) => {
          const desc = (item.description || '').toLowerCase()
          const empName = (item.employeeName || '').toLowerCase()
          const pName = (person?.name || '').toLowerCase()
          return desc.includes(pName) || empName.includes(pName)
        })
      } else {
        if (!includeEmployees && !includeClients) {
          toast.error('Selecione ao menos Funcionários ou Clientes.')
          setIsGenerating(false)
          return
        }

        if (includeEmployees && includeClients) {
          targetLabel = 'Geral (Funcionários e Clientes)'
        } else if (includeEmployees) {
          targetLabel = 'Apenas Funcionários (Vales e Consumos)'
          filtered = filtered.filter((item) => item.isEmployeeVale || (item.payment_method || '').toUpperCase().includes('FUNCIONARIO'))
        } else {
          targetLabel = 'Apenas Clientes (A Prazo e Permutas)'
          filtered = filtered.filter((item) => !item.isEmployeeVale && !(item.payment_method || '').toUpperCase().includes('FUNCIONARIO'))
        }
      }

      if (filtered.length === 0) {
        toast.warning('Nenhum débito a prazo encontrado para os filtros selecionados.')
        setIsGenerating(false)
        return
      }

      // 4. Build PDF Document
      const doc = new jsPDF('p', 'mm', 'a4')

      // Header Dark-Tech
      doc.setFillColor(15, 23, 42) // Slate-900
      doc.rect(0, 0, 210, 28, 'F')

      doc.setFontSize(14)
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.text('METRICS - RELATÓRIO DE CONTAS A PRAZO & COBRANÇA', 14, 12)

      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184) // Slate-400
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
        14,
        18,
      )
      doc.text(`Público: ${targetLabel} | Período: ${periodLabel}`, 14, 23)

      // Totais Gerais
      const totalAmount = filtered.reduce((acc, i) => acc + Number(i.amount || 0), 0)

      if (reportFormat === 'detailed') {
        // Formato Detalhado: Agrupamento por Pessoa
        const groupedByPerson = new Map<string, any[]>()

        filtered.forEach((item) => {
          let personName = item.employeeName || ''
          if (!personName) {
            // Extract from description (e.g. "Caixa... - A PRAZO: Cliente" or "A Prazo Caixa - Cliente")
            const match = item.description?.match(/:s*([^[]+)/) || item.description?.match(/-s*([^-]+)$/)
            personName = match ? match[1].trim() : 'Outros / Não Identificado'
          }
          const group = groupedByPerson.get(personName) || []
          group.push(item)
          groupedByPerson.set(personName, group)
        })

        const tableBody: any[] = []

        groupedByPerson.forEach((items, personName) => {
          const subtotal = items.reduce((acc, i) => acc + Number(i.amount || 0), 0)
          const isEmployee = items.some((i) => i.isEmployeeVale || (i.payment_method || '').toUpperCase().includes('FUNCIONARIO'))
          const category = isEmployee ? 'FUNCIONÁRIO' : 'CLIENTE'

          // Header Row for Person
          tableBody.push([
            {
              content: `${personName} (${category}) - Subtotal: ${subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
              colSpan: 4,
              styles: {
                fillColor: [241, 245, 249],
                fontStyle: 'bold',
                textColor: [15, 23, 42],
              },
            },
          ])

          // Item Rows
          items.forEach((item) => {
            const dataStr = format(new Date(item.data_vencimento || item.data_emissao), 'dd/MM/yyyy', { locale: ptBR })
            const desc = item.description || 'Consumo / A Prazo'
            const tipo = item.isEmployeeVale ? 'Vale / Consumo' : item.payment_method || 'A Prazo'
            const valor = Number(item.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

            tableBody.push([dataStr, desc, tipo, valor])
          })
        })

        autoTable(doc, {
          startY: 34,
          head: [['Data', 'Descrição / Turno', 'Tipo', 'Valor (R$)']],
          body: tableBody,
          theme: 'grid',
          headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold',
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [51, 65, 85],
          },
          columnStyles: {
            0: { cellWidth: 25, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 35, halign: 'center' },
            3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
          },
          margin: { left: 14, right: 14 },
        })
      } else {
        // Formato Resumido: Consolidado por Pessoa
        const summaryMap = new Map<string, { name: string; category: string; count: number; total: number }>()

        filtered.forEach((item) => {
          let personName = item.employeeName || ''
          if (!personName) {
            const match = item.description?.match(/:s*([^[]+)/) || item.description?.match(/-s*([^-]+)$/)
            personName = match ? match[1].trim() : 'Outros / Não Identificado'
          }
          const isEmployee = item.isEmployeeVale || (item.payment_method || '').toUpperCase().includes('FUNCIONARIO')
          const category = isEmployee ? 'Funcionário' : 'Cliente'

          const existing = summaryMap.get(personName) || {
            name: personName,
            category,
            count: 0,
            total: 0,
          }
          existing.count += 1
          existing.total += Number(item.amount || 0)
          summaryMap.set(personName, existing)
        })

        const summaryRows = Array.from(summaryMap.values())
          .sort((a, b) => b.total - a.total)
          .map((row) => [
            row.name,
            row.category,
            row.count.toString(),
            row.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          ])

        autoTable(doc, {
          startY: 34,
          head: [['Pessoa / Devedor', 'Categoria', 'Qtd Lançamentos', 'Valor Total a Receber (R$)']],
          body: summaryRows,
          theme: 'striped',
          headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold',
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [51, 65, 85],
          },
          columnStyles: {
            0: { cellWidth: 'auto', fontStyle: 'bold' },
            1: { cellWidth: 35, halign: 'center' },
            2: { cellWidth: 35, halign: 'center' },
            3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
          },
          margin: { left: 14, right: 14 },
        })
      }

      // Final Total Box
      const finalY = (doc as any).lastAutoTable.finalY + 8
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(14, finalY, 182, 16, 2, 2, 'F')
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(14, finalY, 182, 16, 2, 2, 'S')

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text('TOTAL GERAL A RECEBER NO PERÍODO:', 20, finalY + 10)

      doc.setFontSize(11)
      doc.setTextColor(16, 185, 129) // Emerald-500
      doc.text(
        totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        190,
        finalY + 10,
        { align: 'right' },
      )

      // Save PDF
      const filename = `Relatorio_A_Prazo_${periodMode === 'month' ? `${selectedMonth}_${selectedYear}` : 'Personalizado'}.pdf`
      doc.save(filename)
      toast.success('Relatório PDF gerado com sucesso!')
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err)
      toast.error('Erro ao gerar relatório em PDF.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
              <FileText size={18} />
            </div>
            <span>Emitir Relatório de Cobrança / A Prazo (PDF)</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Configure os filtros para gerar o extrato individual ou em lote de clientes e funcionários.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* SELEÇÃO DO PÚBLICO / DESTINATÁRIO */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <Label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
              1. Destinatário do Relatório
            </Label>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setTargetMode('batch')}
                className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-bold transition-all ${
                  targetMode === 'batch'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                <Users size={14} />
                <span>Em Lote (Grupos)</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetMode('single')}
                className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-bold transition-all ${
                  targetMode === 'single'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                <User size={14} />
                <span>Pessoa Única</span>
              </button>
            </div>

            {targetMode === 'batch' ? (
              <div className="flex items-center gap-6 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Checkbox
                    checked={includeEmployees}
                    onCheckedChange={(c) => setIncludeEmployees(Boolean(c))}
                  />
                  <span>Funcionários (Vales/Consumos)</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Checkbox
                    checked={includeClients}
                    onCheckedChange={(c) => setIncludeClients(Boolean(c))}
                  />
                  <span>Clientes (A Prazo/Permutas)</span>
                </label>
              </div>
            ) : (
              <div>
                <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
                  <SelectTrigger className="w-full bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Selecione um cliente ou funcionário..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[260px]">
                    {unifiedPeople.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* SELEÇÃO DO PERÍODO */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <Label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
              2. Período
            </Label>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setPeriodMode('month')}
                className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-bold transition-all ${
                  periodMode === 'month'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                <Calendar size={14} />
                <span>Mês Fechado</span>
              </button>

              <button
                type="button"
                onClick={() => setPeriodMode('custom')}
                className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-bold transition-all ${
                  periodMode === 'custom'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                <Filter size={14} />
                <span>Intervalo Personalizado</span>
              </button>
            </div>

            {periodMode === 'month' ? (
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(v) => setSelectedMonth(parseInt(v, 10))}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Janeiro</SelectItem>
                    <SelectItem value="2">Fevereiro</SelectItem>
                    <SelectItem value="3">Março</SelectItem>
                    <SelectItem value="4">Abril</SelectItem>
                    <SelectItem value="5">Maio</SelectItem>
                    <SelectItem value="6">Junho</SelectItem>
                    <SelectItem value="7">Julho</SelectItem>
                    <SelectItem value="8">Agosto</SelectItem>
                    <SelectItem value="9">Setembro</SelectItem>
                    <SelectItem value="10">Outubro</SelectItem>
                    <SelectItem value="11">Novembro</SelectItem>
                    <SelectItem value="12">Dezembro</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={selectedYear.toString()}
                  onValueChange={(v) => setSelectedYear(parseInt(v, 10))}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2027">2027</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">De</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Até</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  />
                </div>
              </div>
            )}
          </div>

          {/* FORMATO DO RELATÓRIO */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <Label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
              3. Nível de Detalhamento
            </Label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReportFormat('detailed')}
                className={`flex flex-col items-start rounded-xl p-3 text-left transition-all ${
                  reportFormat === 'detailed'
                    ? 'border-2 border-blue-600 bg-blue-50/80 dark:bg-blue-950/40'
                    : 'border border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800'
                }`}
              >
                <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                  📑 Detalhado (Extrato Dia a Dia)
                </span>
                <span className="mt-0.5 text-[11px] text-slate-500">
                  Lista cada dia e item consumido por pessoa.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setReportFormat('summary')}
                className={`flex flex-col items-start rounded-xl p-3 text-left transition-all ${
                  reportFormat === 'summary'
                    ? 'border-2 border-blue-600 bg-blue-50/80 dark:bg-blue-950/40'
                    : 'border border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800'
                }`}
              >
                <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                  📊 Resumido (Consolidado)
                </span>
                <span className="mt-0.5 text-[11px] text-slate-500">
                  Total consolidado por pessoa em tabela única.
                </span>
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2 flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
            className="rounded-xl"
          >
            Cancelar
          </Button>

          <Button
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            className="gap-2 rounded-xl bg-blue-600 font-black uppercase text-white shadow-md shadow-blue-600/25 hover:bg-blue-700"
          >
            <FileDown size={16} />
            <span>{isGenerating ? 'Gerando Relatório...' : 'Gerar e Baixar PDF'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
