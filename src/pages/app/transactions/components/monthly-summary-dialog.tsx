import { useQuery } from '@tanstack/react-query'
import { getMonthlySummary } from '@/api/get-monthly-summary'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Loader2, TrendingUp, TrendingDown, Receipt, AlertCircle, CheckCircle2, PieChart } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface MonthlySummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: Date
}

export function MonthlySummaryDialog({ open, onOpenChange, month }: MonthlySummaryDialogProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['monthly-summary', month],
    queryFn: () => getMonthlySummary(month),
    enabled: open
  })

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const monthName = month.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()

  const generatePDF = () => {
    if (!data) return
    const doc = new jsPDF()

    // Title
    doc.setFontSize(22)
    doc.setTextColor(33, 37, 41)
    doc.text(`Relatório Consolidado - ${monthName}`, 14, 22)

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 30)

    // Resumo Geral
    doc.setFontSize(16)
    doc.setTextColor(33, 37, 41)
    doc.text('Resumo Geral', 14, 45)

    autoTable(doc, {
      startY: 50,
      head: [['Indicador', 'Valor', 'Qtd Lançamentos', 'Pago / Recebido', 'Em Aberto']],
      body: [
        ['Receitas', formatCurrency(data.revenue.total), data.revenue.count.toString(), formatCurrency(data.revenue.paid), formatCurrency(data.revenue.open)],
        ['Despesas', formatCurrency(data.expenses.total), data.expenses.count.toString(), formatCurrency(data.expenses.paid), formatCurrency(data.expenses.open)],
        ['Juros Pagos', formatCurrency(data.expenses.interestPaid), '-', '-', '-'],
        ['Lucro / Prejuízo', formatCurrency(data.balance), '-', '-', '-']
      ],
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    })

    // Despesas por Setor
    const finalY = (doc as any).lastAutoTable.finalY || 80
    
    doc.setFontSize(16)
    doc.text('Despesas por Setor', 14, finalY + 15)

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Setor / Categoria', 'Total Gasto']],
      body: data.expensesByCategory.map(e => [e.category, formatCurrency(e.amount)]),
      theme: 'striped',
      headStyles: { fillColor: [231, 76, 60] }
    })

    doc.save(`Relatorio_Consolidado_${monthName.replace(' ', '_')}.pdf`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-2xl font-bold">Resumo: {monthName}</DialogTitle>
          <Button onClick={generatePDF} disabled={isLoading || !data} className="mr-6 font-bold bg-indigo-600 hover:bg-indigo-700">
            <Download className="w-4 h-4 mr-2" /> Baixar PDF
          </Button>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : data ? (
          <div className="space-y-6 mt-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-3 text-emerald-700 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <h3 className="font-bold">Total Receitas</h3>
                </div>
                <p className="text-3xl font-black text-emerald-800">{formatCurrency(data.revenue.total)}</p>
                <div className="mt-4 space-y-1 text-sm text-emerald-700/80">
                  <div className="flex justify-between">
                    <span>Lançamentos:</span> <span className="font-semibold">{data.revenue.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ticket Médio:</span> <span className="font-semibold">{formatCurrency(data.revenue.averageTicket)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-100 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-3 text-rose-700 mb-2">
                  <TrendingDown className="w-5 h-5" />
                  <h3 className="font-bold">Total Despesas</h3>
                </div>
                <p className="text-3xl font-black text-rose-800">{formatCurrency(data.expenses.total)}</p>
                <div className="mt-4 space-y-1 text-sm text-rose-700/80">
                  <div className="flex justify-between">
                    <span>Lançamentos:</span> <span className="font-semibold">{data.expenses.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Juros Pagos:</span> <span className="font-semibold">{formatCurrency(data.expenses.interestPaid)}</span>
                  </div>
                </div>
              </div>

              <div className={`bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between`}>
                <div>
                  <div className="flex items-center gap-3 text-slate-700 mb-2">
                    <Receipt className="w-5 h-5" />
                    <h3 className="font-bold">Balanço do Mês</h3>
                  </div>
                  <p className={`text-3xl font-black ${data.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(data.balance)}
                  </p>
                </div>
                <div className="mt-4 flex gap-4 text-sm font-medium">
                  <div className="flex-1 bg-white p-2 rounded-lg border border-slate-100 text-center text-slate-500">
                    <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
                    Pago<br/>{formatCurrency(data.expenses.paid)}
                  </div>
                  <div className="flex-1 bg-white p-2 rounded-lg border border-slate-100 text-center text-slate-500">
                    <AlertCircle className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                    Aberto<br/>{formatCurrency(data.expenses.open)}
                  </div>
                </div>
              </div>

            </div>

            {/* Expenses By Category */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-slate-500" />
                <h3 className="font-bold text-slate-800">Despesas por Setor</h3>
              </div>
              <div className="p-0">
                {data.expensesByCategory.length === 0 ? (
                  <p className="p-6 text-center text-slate-500 font-medium">Nenhuma despesa registrada neste mês.</p>
                ) : (
                  <table className="w-full text-sm">
                    <tbody>
                      {data.expensesByCategory.map((item, idx) => (
                        <tr key={item.category} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="py-3 px-5 font-medium text-slate-700 border-b border-slate-100">{item.category}</td>
                          <td className="py-3 px-5 text-right font-black text-rose-600 border-b border-slate-100">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="text-center p-8 text-rose-500">Erro ao carregar dados.</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
