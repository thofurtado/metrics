import jsPDF from 'jspdf'
import autoTable, { RowInput } from 'jspdf-autotable'

const fmt = (valor: number) =>
  (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formatarDataBR = (dataString: string) => {
  if (!dataString) return '--/--/----'
  try {
    const d = new Date(dataString)
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d)
    }
  } catch {}
  return dataString
}

export function computeResumoFromLote(lote: any) {
  const lancamentos = lote?.lancamentos || []
  const abertura = Number(lote?.valorAbertura || 0)

  const res: any = {
    GERAL: {
      entradas: 0,
      totalCaixinha: 0,
      saldo: 0,
    },
    CAIXA: {
      saldoAbertura: abertura,
      entradasDinheiro: 0,
      totalSaidas: 0,
    },
    CASA: {
      total: 0,
    },
  }

  for (const l of lancamentos) {
    const val = Number(l.valor || 0)
    const isSaida = Boolean(l.isSaida)
    const isCaixinha = Boolean(l.isCaixinha)
    const forma = (l.formaPagamento || 'Dinheiro').trim()
    const valorCaixinha = Number(l.valorCaixinha || 0)
    const banco = (l.banco || l.bank || '').toUpperCase().trim()

    if (isSaida) {
      res.CAIXA.totalSaidas += val
      continue
    }

    if (isCaixinha) {
      res.GERAL.totalCaixinha += val
    } else if (valorCaixinha > 0) {
      res.GERAL.totalCaixinha += valorCaixinha
    }

    res.GERAL.entradas += val

    if (forma.toLowerCase() === 'dinheiro' || banco === 'CAIXA') {
      res.CAIXA.entradasDinheiro += val
    } else if (banco) {
      if (!res[banco]) {
        res[banco] = {
          PIX: 0,
          Débito: 0,
          Crédito: 0,
          Voucher: 0,
          caixinha: 0,
          total: 0,
        }
      }
      let formaKey = forma
      if (forma.toUpperCase() === 'PIX') formaKey = 'PIX'
      else if (forma.toLowerCase().includes('débito') || forma.toLowerCase().includes('debito')) formaKey = 'Débito'
      else if (forma.toLowerCase().includes('crédito') || forma.toLowerCase().includes('credito')) formaKey = 'Crédito'
      else if (forma.toLowerCase().includes('voucher')) formaKey = 'Voucher'

      if (res[banco][formaKey] !== undefined) {
        res[banco][formaKey] += val
      } else {
        res[banco][formaKey] = val
      }
      res[banco].total += val
    }
  }

  res.GERAL.saldo = res.GERAL.entradas - res.CAIXA.totalSaidas
  return res
}

export const exportarLotePDF = (lote: any, resumoParam?: any) => {
  if (!lote) return

  const resumo =
    resumoParam && Object.keys(resumoParam).length > 0 && resumoParam.CAIXA
      ? resumoParam
      : computeResumoFromLote(lote)

  const doc = new jsPDF()
  const dataFormatada = formatarDataBR(lote.dataReferencia)
  const periodoStr = lote.periodo ? String(lote.periodo).toUpperCase() : 'EXPEDIENTE'

  // --- HEADER DESIGN ---
  doc.setFillColor(15, 23, 42) // Navy Dark
  doc.rect(0, 0, 210, 40, 'F')

  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text('RELATÓRIO DE FECHAMENTO DE TURNO', 14, 15)

  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text(`MARUJO - ${periodoStr}`, 14, 28)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(dataFormatada, 196, 28, { align: 'right' })

  // --- DASHBOARD DE MÉTRICAS (KPIs) ---
  const caixaEntradas = Number(resumo?.CAIXA?.entradasDinheiro || 0)
  const caixaAbertura = Number(resumo?.CAIXA?.saldoAbertura || 0)
  const caixaSaidas = Number(resumo?.CAIXA?.totalSaidas || 0)

  const saldoGaveta = caixaEntradas + caixaAbertura - caixaSaidas

  // Faturamento total (soma entradas em dinheiro + total de todos os bancos/operadoras)
  const bankKeys = Object.keys(resumo || {}).filter(
    (k) => !['GERAL', 'CAIXA', 'CASA'].includes(k),
  )

  let faturamentoTotal = caixaEntradas
  for (const b of bankKeys) {
    if (resumo[b] && typeof resumo[b].total === 'number') {
      faturamentoTotal += resumo[b].total
    }
  }

  // Cards Principais com Cores de Destaque
  doc.setFillColor(240, 253, 244) // Verde claro
  doc.roundedRect(14, 48, 85, 22, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setTextColor(21, 128, 61)
  doc.text('DINHEIRO EM GAVETA (CONFERÊNCIA)', 18, 54)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(fmt(saldoGaveta), 18, 63)

  doc.setFillColor(239, 246, 255) // Azul claro
  doc.roundedRect(110, 48, 85, 22, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setTextColor(29, 78, 216)
  doc.setFont('helvetica', 'normal')
  doc.text('FATURAMENTO BRUTO TOTAL', 114, 54)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(fmt(faturamentoTotal), 114, 63)

  // Mini-Cards de Índices
  const lancamentos = lote.lancamentos || []
  const consumoInterno = lancamentos
    .filter(
      (i: any) =>
        !i.isSaida &&
        ['Funcionário', 'Cortesia', 'Pró-labore', 'Permuta'].includes(i.formaPagamento),
    )
    .reduce((acc: number, i: any) => acc + (Number(i.valor) || 0), 0)

  let totalPix = 0
  let totalDebito = 0
  let totalCredito = 0

  for (const b of bankKeys) {
    if (resumo[b]) {
      totalPix += Number(resumo[b].PIX || 0)
      totalDebito += Number(resumo[b].Débito || 0)
      totalCredito += Number(resumo[b].Crédito || 0)
    }
  }

  const miniCards = [
    { label: 'ABERTURA', val: fmt(caixaAbertura) },
    { label: 'PIX', val: fmt(totalPix) },
    { label: 'DÉBITO', val: fmt(totalDebito) },
    { label: 'CRÉDITO', val: fmt(totalCredito) },
    { label: 'GORJETAS', val: fmt(resumo?.GERAL?.totalCaixinha || 0) },
    { label: 'CONSUMO', val: fmt(consumoInterno) },
  ]

  const startX = 14
  const startY = 75
  const cardWidth = 28.5
  const cardHeight = 15

  miniCards.forEach((card, index) => {
    doc.setFillColor(248, 250, 252)
    doc.rect(
      startX + index * (cardWidth + 2.5),
      startY,
      cardWidth,
      cardHeight,
      'F',
    )
    doc.setFontSize(6)
    doc.setTextColor(100)
    doc.setFont('helvetica', 'normal')
    doc.text(card.label, startX + index * (cardWidth + 2.5) + 2, startY + 5)
    doc.setFontSize(7.5)
    doc.setTextColor(30, 41, 59)
    doc.setFont('helvetica', 'bold')
    doc.text(card.val, startX + index * (cardWidth + 2.5) + 2, startY + 11)
  })

  // --- TABELA DE VENDAS ---
  const vendas = lancamentos.filter((l: any) => !l.isSaida)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('1. DETALHAMENTO DE VENDAS (CAIXA)', 14, 100)

  autoTable(doc, {
    startY: 104,
    head: [
      [
        'Mesa / Ident.',
        'Forma Pagto',
        'Valor Bruto',
        'Gorjeta',
        'Valor Líquido',
        'Observações',
      ],
    ],
    body: vendas.map((v: any) => [
      v.mesa || v.identificacao || v.identification || '--',
      v.formaPagamento || 'Dinheiro',
      fmt(Number(v.valor) || 0),
      fmt(Number(v.valorCaixinha) || 0),
      fmt((Number(v.valor) || 0) - (Number(v.valorCaixinha) || 0)),
      v.observacoes || v.identificacao || '',
    ]),
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], halign: 'center' },
    styles: { fontSize: 7.5, halign: 'center' },
    columnStyles: { 0: { fontStyle: 'bold' }, 5: { halign: 'left' } },
  })

  // --- SANGRIAS E SAÍDAS ---
  const sangrias = lancamentos.filter((l: any) => l.isSaida)
  let lastY = (doc as any).lastAutoTable?.finalY || 140

  if (sangrias.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(153, 27, 27)
    doc.text('2. SANGRIAS E SAÍDAS DE CAIXA', 14, lastY + 12)

    autoTable(doc, {
      startY: lastY + 16,
      head: [['Descrição / Identificação', 'Valor']],
      body: sangrias.map((s: any) => [
        s.identificacao || s.identification || 'Saída de Caixa',
        fmt(Number(s.valor) || 0),
      ]),
      headStyles: { fillColor: [153, 27, 27] },
      styles: { fontSize: 7.5, halign: 'center' },
      columnStyles: { 0: { halign: 'left' } },
    })

    lastY = (doc as any).lastAutoTable?.finalY || lastY + 30
  }

  // --- RESUMO POR OPERADORA (BANCOS) ---
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(21, 128, 61)
  doc.text('3. CONSOLIDAÇÃO POR OPERADORA (BANCOS)', 14, lastY + 12)

  const bodyBancos: RowInput[] = bankKeys.map((b) => [
    b,
    fmt(Number(resumo[b]?.PIX || 0)),
    fmt(Number(resumo[b]?.Débito || 0)),
    fmt(Number(resumo[b]?.Crédito || 0)),
    fmt(Number(resumo[b]?.Voucher || 0)),
    fmt(Number(resumo[b]?.total || 0)),
  ])

  if (bodyBancos.length === 0) {
    bodyBancos.push([
      'DINHEIRO / CAIXA',
      fmt(0),
      fmt(0),
      fmt(0),
      fmt(0),
      fmt(caixaEntradas),
    ])
  }

  autoTable(doc, {
    startY: lastY + 16,
    head: [['Banco / Operadora', 'PIX', 'Débito', 'Crédito', 'Voucher', 'Total']],
    body: bodyBancos,
    theme: 'grid',
    headStyles: { fillColor: [21, 128, 61] },
    styles: { fontSize: 7.5, halign: 'center' },
  })

  // --- RODAPÉ ---
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text(
      `Marujo - Página ${i} de ${totalPages} - Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      105,
      288,
      { align: 'center' },
    )
  }

  const safeFileName = `FECHAMENTO_${periodoStr}_${dataFormatada.replace(/\//g, '-')}.pdf`
  doc.save(safeFileName)
}
