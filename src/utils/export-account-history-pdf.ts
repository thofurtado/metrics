import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { AccountHistoryItem } from '@/api/get-account-history'

export function exportAccountHistoryPDF(account: { name: string; balance?: number }, history: (AccountHistoryItem & { runningBalance?: number })[]) {
  const doc = new jsPDF()
  const accountName = account.name

  // Header Background
  doc.setFillColor(15, 23, 42) // Slate 900
  doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F')

  // Title
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.text('EXTRATO DE MOVIMENTAÇÃO', 14, 20)

  // Subtitle / Account Name
  doc.setFontSize(14)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(200, 200, 200)
  doc.text(`Conta: ${accountName}`, 14, 30)

  // Date of generation
  doc.setFontSize(10)
  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  
  // Align right
  const pageWidth = doc.internal.pageSize.width
  doc.text(`Gerado em: ${today}`, pageWidth - 14, 30, { align: 'right' })

  // Summary box
  doc.setDrawColor(226, 232, 240) // Slate 200
  doc.setFillColor(248, 250, 252) // Slate 50
  doc.roundedRect(14, 45, pageWidth - 28, 25, 3, 3, 'FD')

  doc.setTextColor(71, 85, 105) // Slate 600
  doc.setFontSize(10)
  
  const currentBalance = history.length > 0 ? (history[0].runningBalance ?? history[0].new_balance ?? 0) : 0
  
  let initialBalance = currentBalance
  for (let i = 0; i < history.length; i++) {
    const item = history[i]
    if (item.type === 'adjustment') {
        initialBalance = item.previous_balance ?? (initialBalance - item.value)
    } else {
        if (item.operation === 'income') {
            initialBalance -= item.value
        } else {
            initialBalance += item.value
        }
    }
  }

  // Column 1: Saldo Inicial
  doc.text('Saldo Inicial:', 20, 53)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 23, 42)
  doc.text(`R$ ${initialBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, 60)

  // Column 2: Movimentações
  doc.setFont("helvetica", "normal")
  doc.setTextColor(71, 85, 105)
  doc.text('Movimentações:', 85, 53)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 23, 42)
  doc.text(`${history.length}`, 85, 60)

  // Column 3: Saldo Atual
  doc.setFont("helvetica", "normal")
  doc.setTextColor(71, 85, 105)
  doc.text('Saldo Atual:', 150, 53)
  doc.setFont("helvetica", "bold")
  
  const balanceColor = currentBalance >= 0 ? [16, 185, 129] : [244, 63, 94]
  doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2])
  doc.text(`R$ ${currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 150, 60)

  // Table
  const tableData = history.map((item) => {
    const isIncome = item.operation === 'income'
    const isAdjustment = item.type === 'adjustment'
    const signal = isAdjustment ? (item.value >= 0 ? '+' : '-') : isIncome ? '+' : '-'
    
    let typeDesc = item.description || 'Transação'
    if (isAdjustment) typeDesc = 'Ajuste Manual'

    const dateStr = new Date(item.date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const displayValue = Math.abs(item.value)
    const valueStr = `${signal} R$ ${displayValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    
    const runningBalanceVal = item.runningBalance ?? item.new_balance
    const balanceStr = runningBalanceVal !== undefined && runningBalanceVal !== null 
      ? `R$ ${runningBalanceVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
      : '-'

    return [
      dateStr,
      typeDesc,
      valueStr,
      balanceStr,
    ]
  })

  autoTable(doc, {
    startY: 80,
    head: [['Data', 'Descrição', 'Valor', 'Saldo Resultante']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [15, 23, 42], 
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left'
    },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 5,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      2: { halign: 'right', fontStyle: 'bold' },
      3: { halign: 'right' }
    },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 2) {
        const value = data.cell.raw as string
        if (value.startsWith('+')) {
          data.cell.styles.textColor = [16, 185, 129] // Emerald 500
        } else if (value.startsWith('-')) {
          data.cell.styles.textColor = [244, 63, 94] // Rose 500
        }
      }
    }
  })

  doc.save(`extrato_${accountName.replace(/\s+/g, '_').toLowerCase()}.pdf`)
}
