import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { AccountHistoryItem } from '@/api/get-account-history'

export function exportAccountHistoryPDF(accountName: string, history: AccountHistoryItem[]) {
  const doc = new jsPDF()

  // Título
  doc.setFontSize(16)
  doc.text(`Relatório de Movimento - ${accountName}`, 14, 20)

  // Data de geração
  doc.setFontSize(10)
  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  doc.text(`Gerado em: ${today}`, 14, 28)

  // Tabela
  const tableData = history.map((item) => {
    const isIncome = item.operation === 'income'
    const isAdjustment = item.type === 'adjustment'
    const signal = isIncome ? '+' : '-'
    
    let typeDesc = item.description || 'Transação'
    if (isAdjustment) typeDesc = 'Ajuste Manual'

    const dateStr = new Date(item.date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const valueStr = `${signal} R$ ${item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    const newBalanceStr = item.new_balance !== undefined && item.new_balance !== null 
      ? `R$ ${item.new_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
      : '-'

    return [
      dateStr,
      typeDesc,
      valueStr,
      newBalanceStr,
    ]
  })

  autoTable(doc, {
    startY: 35,
    head: [['Data', 'Descrição', 'Valor', 'Saldo Resultante (Ajustes)']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
  })

  doc.save(`relatorio_${accountName.replace(/\s+/g, '_').toLowerCase()}.pdf`)
}
