import { useQuery } from '@tanstack/react-query'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  PieChart,
  Receipt,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'

import { getMonthlySummary } from '@/api/get-monthly-summary'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface MonthlySummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: Date
}

export function MonthlySummaryDialog({
  open,
  onOpenChange,
  month,
}: MonthlySummaryDialogProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['monthly-summary', month],
    queryFn: () => getMonthlySummary(month),
    enabled: open,
  })

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const monthName = month
    .toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
    .toUpperCase()

  const generatePDF = () => {
    if (!data) return
    const doc = new jsPDF()

    // Header Background
    doc.setFillColor(41, 128, 185)
    doc.rect(0, 0, 210, 40, 'F')

    // Title
    doc.setFontSize(24)
    doc.setTextColor(255, 255, 255)
    doc.text(`Consolidação Financeira`, 14, 20)
    doc.setFontSize(14)
    doc.text(`Período: ${monthName}`, 14, 30)

    doc.setFontSize(10)
    doc.setTextColor(200, 200, 200)
    doc.text(
      `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
      140,
      30,
    )

    // Resumo Geral
    doc.setFontSize(16)
    doc.setTextColor(40, 40, 40)
    doc.text('Resumo de Caixa', 14, 55)

    autoTable(doc, {
      startY: 60,
      head: [
        [
          'Métrica',
          'Valor Consolidado',
          'Lançamentos',
          'Liquidez (Pago/Rec.)',
          'Em Aberto',
        ],
      ],
      body: [
        [
          'Receitas',
          formatCurrency(data.revenue.total),
          data.revenue.count.toString(),
          formatCurrency(data.revenue.paid),
          formatCurrency(data.revenue.open),
        ],
        [
          'Despesas',
          formatCurrency(data.expenses.total),
          data.expenses.count.toString(),
          formatCurrency(data.expenses.paid),
          formatCurrency(data.expenses.open),
        ],
        ['Balanço Final', formatCurrency(data.balance), '-', '-', '-'],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [44, 62, 80],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 10, cellPadding: 4 },
    })

    // Despesas por Setor
    const finalY = (doc as any).lastAutoTable.finalY || 80

    doc.setFontSize(16)
    doc.setTextColor(40, 40, 40)
    doc.text('Impacto de Despesas por Setor (Análise Gráfica)', 14, finalY + 15)

    autoTable(doc, {
      startY: finalY + 20,
      head: [
        ['Setor / Categoria', 'Total Gasto', 'Impacto %', 'Proporção Gráfica'],
      ],
      body: data.expensesByCategory.map((e) => {
        const pct =
          data.expenses.total > 0
            ? ((e.amount / data.expenses.total) * 100).toFixed(1)
            : '0.0'
        return [e.category, formatCurrency(e.amount), `${pct}%`, '']
      }),
      theme: 'striped',
      headStyles: {
        fillColor: [220, 38, 38],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: { fontSize: 10, cellPadding: 5, valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 40, halign: 'right' },
        2: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
        3: { cellWidth: 65 }, // Espaço para o gráfico
      },
      didDrawCell: function (cellData) {
        if (cellData.section === 'body' && cellData.column.index === 3) {
          const rowRaw = cellData.row.raw as string[]
          const pct = parseFloat(rowRaw[2].replace('%', ''))

          if (pct > 0) {
            const startX = cellData.cell.x + 4
            const startY = cellData.cell.y + 4
            const maxWidth = cellData.cell.width - 8
            const barWidth = (pct / 100) * maxWidth
            const h = cellData.cell.height - 8

            // Vermelho intenso para % altos, vermelho suave para % baixos
            const red = 220
            const green = Math.max(38, 200 - pct * 2)
            const blue = Math.max(38, 200 - pct * 2)

            doc.setFillColor(241, 245, 249) // Fundo da barra
            doc.rect(startX, startY, maxWidth, h, 'F')

            doc.setFillColor(red, green, blue) // Preenchimento da barra
            doc.rect(startX, startY, barWidth, h, 'F')
          }
        }
      },
    })

    doc.save(`Relatorio_Consolidado_${monthName.replace(' ', '_')}.pdf`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden rounded-2xl border-0 bg-slate-50 p-0 shadow-2xl">
        <DialogHeader className="m-0 flex flex-row items-center justify-between border-b border-slate-100 bg-white p-6">
          <div>
            <DialogTitle className="text-2xl font-black tracking-tight text-slate-800">
              Consolidação Financeira
            </DialogTitle>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {monthName}
            </p>
          </div>
          <Button
            onClick={generatePDF}
            disabled={isLoading || !data}
            className="rounded-full bg-indigo-600 px-6 font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700"
          >
            <Download className="mr-2 h-4 w-4" /> Exportar Relatório PDF
          </Button>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          </div>
        ) : data ? (
          <div className="max-h-[calc(90vh-90px)] space-y-8 overflow-y-auto p-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-lg shadow-emerald-200">
                <div className="absolute right-0 top-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-white opacity-10 blur-xl"></div>
                <div className="mb-4 flex items-center gap-3 opacity-90">
                  <div className="rounded-lg bg-white/20 p-2">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide">
                    Total de Receitas
                  </h3>
                </div>
                <p className="mb-6 text-4xl font-black tracking-tight">
                  {formatCurrency(data.revenue.total)}
                </p>
                <div className="space-y-2 rounded-xl border border-white/10 bg-white/10 p-3 text-sm font-medium backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-50">Lançamentos</span>{' '}
                    <span className="rounded bg-white/20 px-2 py-0.5 font-bold text-white">
                      {data.revenue.count}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-50">Ticket Médio</span>{' '}
                    <span className="font-bold text-white">
                      {formatCurrency(data.revenue.averageTicket)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 p-6 text-white shadow-lg shadow-rose-200">
                <div className="absolute right-0 top-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-white opacity-10 blur-xl"></div>
                <div className="mb-4 flex items-center gap-3 opacity-90">
                  <div className="rounded-lg bg-white/20 p-2">
                    <TrendingDown className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide">
                    Total de Despesas
                  </h3>
                </div>
                <p className="mb-6 text-4xl font-black tracking-tight">
                  {formatCurrency(data.expenses.total)}
                </p>
                <div className="space-y-2 rounded-xl border border-white/10 bg-white/10 p-3 text-sm font-medium backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-rose-50">Lançamentos</span>{' '}
                    <span className="rounded bg-white/20 px-2 py-0.5 font-bold text-white">
                      {data.expenses.count}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-rose-50">Juros Pagos</span>{' '}
                    <span className="font-bold text-white">
                      {formatCurrency(data.expenses.interestPaid)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
                <div>
                  <div className="mb-4 flex items-center gap-3 text-slate-500">
                    <div className="rounded-lg bg-slate-100 p-2">
                      <Receipt className="h-5 w-5 text-slate-600" />
                    </div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide">
                      Balanço do Mês
                    </h3>
                  </div>
                  <p
                    className={`text-4xl font-black tracking-tight ${data.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    {formatCurrency(data.balance)}
                  </p>
                </div>
                <div className="mt-6 flex gap-3 text-xs font-semibold">
                  <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="mb-1 flex items-center gap-1 text-slate-400">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Pago
                      (Despesas)
                    </div>
                    <div className="text-sm text-slate-700">
                      {formatCurrency(data.expenses.paid)}
                    </div>
                  </div>
                  <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="mb-1 flex items-center gap-1 text-slate-400">
                      <AlertCircle className="h-3 w-3 text-amber-500" /> Aberto
                      (Despesas)
                    </div>
                    <div className="text-sm text-slate-700">
                      {formatCurrency(data.expenses.open)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Expenses By Category (Graphic View) */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-rose-100 p-2">
                    <PieChart className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">
                      Impacto de Despesas por Setor
                    </h3>
                    <p className="text-xs font-medium text-slate-500">
                      Consolidação de gastos agrupados por categoria
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-2">
                {data.expensesByCategory.length === 0 ? (
                  <div className="flex flex-col items-center p-12 text-center">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
                      <PieChart className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="font-medium text-slate-500">
                      Nenhuma despesa registrada neste mês.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 p-4">
                    {data.expensesByCategory.map((item, idx) => {
                      const percentage =
                        data.expenses.total > 0
                          ? ((item.amount / data.expenses.total) * 100).toFixed(
                              1,
                            )
                          : '0.0'
                      // Cor varia de vermelho intenso (100%) para um laranja suave (0%)
                      const hue = Math.max(0, 45 - Number(percentage) * 0.45)

                      return (
                        <div
                          key={item.category}
                          className="group rounded-xl border border-transparent p-4 transition-all hover:border-slate-100 hover:bg-slate-50"
                        >
                          <div className="mb-3 flex items-end justify-between">
                            <span className="text-sm font-bold uppercase tracking-wide text-slate-700">
                              {item.category}
                            </span>
                            <div className="flex items-baseline gap-2 text-right">
                              <span className="text-lg font-black text-slate-800">
                                {formatCurrency(item.amount)}
                              </span>
                              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                                {percentage}%
                              </span>
                            </div>
                          </div>

                          {/* Graphic Bar */}
                          <div className="relative flex h-3 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
                            <div
                              className="h-full rounded-full transition-all duration-1000 ease-out"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: `hsl(${hue}, 85%, 55%)`,
                                boxShadow: `0 0 10px hsl(${hue}, 85%, 55%, 0.5)`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-rose-500">
            Erro ao carregar dados.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
