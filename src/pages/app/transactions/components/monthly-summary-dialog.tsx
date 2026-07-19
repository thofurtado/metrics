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
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 140, 30)

    // Resumo Geral
    doc.setFontSize(16)
    doc.setTextColor(40, 40, 40)
    doc.text('Resumo de Caixa', 14, 55)

    autoTable(doc, {
      startY: 60,
      head: [['Métrica', 'Valor Consolidado', 'Lançamentos', 'Liquidez (Pago/Rec.)', 'Em Aberto']],
      body: [
        ['Receitas', formatCurrency(data.revenue.total), data.revenue.count.toString(), formatCurrency(data.revenue.paid), formatCurrency(data.revenue.open)],
        ['Despesas', formatCurrency(data.expenses.total), data.expenses.count.toString(), formatCurrency(data.expenses.paid), formatCurrency(data.expenses.open)],
        ['Balanço Final', formatCurrency(data.balance), '-', '-', '-']
      ],
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 10, cellPadding: 4 }
    })

    // Despesas por Setor
    const finalY = (doc as any).lastAutoTable.finalY || 80
    
    doc.setFontSize(16)
    doc.setTextColor(40, 40, 40)
    doc.text('Impacto de Despesas por Setor (Análise Gráfica)', 14, finalY + 15)

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Setor / Categoria', 'Total Gasto', 'Impacto %', 'Proporção Gráfica']],
      body: data.expensesByCategory.map(e => {
        const pct = data.expenses.total > 0 ? ((e.amount / data.expenses.total) * 100).toFixed(1) : '0.0'
        return [e.category, formatCurrency(e.amount), `${pct}%`, '']
      }),
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 5, valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 40, halign: 'right' },
        2: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
        3: { cellWidth: 65 } // Espaço para o gráfico
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
            const green = Math.max(38, 200 - (pct * 2))
            const blue = Math.max(38, 200 - (pct * 2))
            
            doc.setFillColor(241, 245, 249) // Fundo da barra
            doc.rect(startX, startY, maxWidth, h, 'F')
            
            doc.setFillColor(red, green, blue) // Preenchimento da barra
            doc.rect(startX, startY, barWidth, h, 'F')
          }
        }
      }
    })

    doc.save(`Relatorio_Consolidado_${monthName.replace(' ', '_')}.pdf`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden bg-slate-50 border-0 rounded-2xl shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between p-6 bg-white border-b border-slate-100 m-0">
          <div>
            <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">Consolidação Financeira</DialogTitle>
            <p className="text-sm text-slate-500 font-medium mt-1">{monthName}</p>
          </div>
          <Button onClick={generatePDF} disabled={isLoading || !data} className="font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all rounded-full px-6">
            <Download className="w-4 h-4 mr-2" /> Exportar Relatório PDF
          </Button>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center h-96">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          </div>
        ) : data ? (
          <div className="overflow-y-auto p-6 space-y-8 max-h-[calc(90vh-90px)]">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 shadow-lg shadow-emerald-200 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
                <div className="flex items-center gap-3 mb-4 opacity-90">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold tracking-wide text-sm uppercase">Total de Receitas</h3>
                </div>
                <p className="text-4xl font-black tracking-tight mb-6">{formatCurrency(data.revenue.total)}</p>
                <div className="space-y-2 text-sm font-medium bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-50">Lançamentos</span> <span className="font-bold bg-white/20 px-2 py-0.5 rounded text-white">{data.revenue.count}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-50">Ticket Médio</span> <span className="font-bold text-white">{formatCurrency(data.revenue.averageTicket)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-6 shadow-lg shadow-rose-200 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
                <div className="flex items-center gap-3 mb-4 opacity-90">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold tracking-wide text-sm uppercase">Total de Despesas</h3>
                </div>
                <p className="text-4xl font-black tracking-tight mb-6">{formatCurrency(data.expenses.total)}</p>
                <div className="space-y-2 text-sm font-medium bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-rose-50">Lançamentos</span> <span className="font-bold bg-white/20 px-2 py-0.5 rounded text-white">{data.expenses.count}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-rose-50">Juros Pagos</span> <span className="font-bold text-white">{formatCurrency(data.expenses.interestPaid)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl shadow-slate-200/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 text-slate-500 mb-4">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <Receipt className="w-5 h-5 text-slate-600" />
                    </div>
                    <h3 className="font-semibold tracking-wide text-sm uppercase">Balanço do Mês</h3>
                  </div>
                  <p className={`text-4xl font-black tracking-tight ${data.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(data.balance)}
                  </p>
                </div>
                <div className="mt-6 flex gap-3 text-xs font-semibold">
                  <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="text-slate-400 mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Pago (Despesas)</div>
                    <div className="text-slate-700 text-sm">{formatCurrency(data.expenses.paid)}</div>
                  </div>
                  <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="text-slate-400 mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3 text-amber-500" /> Aberto (Despesas)</div>
                    <div className="text-slate-700 text-sm">{formatCurrency(data.expenses.open)}</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Expenses By Category (Graphic View) */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl shadow-slate-200/40">
              <div className="bg-slate-50/80 px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-rose-100 p-2 rounded-lg">
                    <PieChart className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">Impacto de Despesas por Setor</h3>
                    <p className="text-xs text-slate-500 font-medium">Consolidação de gastos agrupados por categoria</p>
                  </div>
                </div>
              </div>
              
              <div className="p-2">
                {data.expensesByCategory.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                      <PieChart className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">Nenhuma despesa registrada neste mês.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 p-4">
                    {data.expensesByCategory.map((item, idx) => {
                      const percentage = data.expenses.total > 0 ? ((item.amount / data.expenses.total) * 100).toFixed(1) : '0.0';
                      // Cor varia de vermelho intenso (100%) para um laranja suave (0%)
                      const hue = Math.max(0, 45 - (Number(percentage) * 0.45)); 
                      
                      return (
                        <div key={item.category} className="group p-4 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                          <div className="flex justify-between items-end mb-3">
                            <span className="font-bold text-slate-700 text-sm uppercase tracking-wide">{item.category}</span>
                            <div className="text-right flex items-baseline gap-2">
                              <span className="font-black text-slate-800 text-lg">{formatCurrency(item.amount)}</span>
                              <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                                {percentage}%
                              </span>
                            </div>
                          </div>
                          
                          {/* Graphic Bar */}
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex relative shadow-inner">
                            <div 
                              className="h-full rounded-full transition-all duration-1000 ease-out" 
                              style={{ 
                                width: `${percentage}%`, 
                                backgroundColor: `hsl(${hue}, 85%, 55%)`,
                                boxShadow: `0 0 10px hsl(${hue}, 85%, 55%, 0.5)`
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
          <div className="text-center p-8 text-rose-500">Erro ao carregar dados.</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
