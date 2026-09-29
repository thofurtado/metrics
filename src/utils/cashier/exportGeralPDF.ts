import { getTenantDisplayName } from './tenantHelper'
import jsPDF from 'jspdf'
import autoTable, { RowInput } from 'jspdf-autotable'

const formatarData = (dStr: string) => {
  if (!dStr) return '--/--/----'
  try {
    const d = new Date(dStr)
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d)
    }
  } catch {}
  return dStr
}

export const exportarRelatorioGeralPDF = (lotes: any[]) => {
  if (!lotes || !Array.isArray(lotes) || lotes.length === 0) {
    throw new Error('Nenhum lote para exportar.')
  }

  // PDF em modo Paisagem (Landscape) para caber todas as colunas com folga
  const doc = new jsPDF('l', 'mm', 'a4')

  // Ordenação: Data decrescente (mais recente primeiro)
  const lotesOrdenados = [...lotes].sort((a, b) => {
    const dataA = new Date(a.dataReferencia || a.opened_at || 0).getTime()
    const dataB = new Date(b.dataReferencia || b.opened_at || 0).getTime()
    if (dataA !== dataB) return dataB - dataA
    return String(a.periodo || a.period) === 'Jantar' ? -1 : 1
  })

  // --- ESTILIZAÇÃO DO CABEÇALHO ---
  doc.setFillColor(15, 23, 42) // Azul Marinho Escuro (Zinc-900)
  doc.rect(0, 0, 297, 25, 'F')

  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  const tenantName = getTenantDisplayName()
  doc.text(`${tenantName} - RELATÓRIO GERENCIAL CONSOLIDADO`, 14, 12)

  doc.setFontSize(9)
  doc.setTextColor(148, 163, 184) // Cinza azulado
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
    14,
    18,
  )

  // --- ACUMULADORES DE TOTAIS GERAIS DO MÊS ---
  let totalAbertura = 0
  let totalDinheiro = 0
  let totalSangrias = 0
  let totalSaldoGaveta = 0
  let totalPix = 0
  let totalDebito = 0
  let totalCredito = 0
  let totalVoucher = 0
  let totalFuncionario = 0
  let totalProLabore = 0
  let totalPermuta = 0
  let totalCortesia = 0
  let totalCaixinha = 0
  let totalFaturamento = 0

  // --- MAPEAMENTO DOS DADOS COM CORES ---
  const body: RowInput[] = lotesOrdenados.map((l) => {
    const lanc = l.lancamentos || l.entries || []
    const abertura = Number(l.valorAbertura ?? l.initial_balance ?? 0)

    // Caixinha total arrecadada no turno (avulsa ou acoplada à venda)
    const caixinha = lanc
      .filter((i: any) => !i.isSaida && !i.is_withdrawal)
      .reduce((acc: number, i: any) => {
        if (i.isCaixinha || i.is_tip) {
          return acc + Number(i.valor ?? i.amount ?? 0)
        }
        return acc + Number(i.valorCaixinha || 0)
      }, 0)

    // Dinheiro que entrou (vendas - gorjetas em dinheiro)
    const entDin = lanc
      .filter(
        (i: any) =>
          !i.isSaida &&
          !i.is_withdrawal &&
          (i.formaPagamento === 'Dinheiro' || i.payment_method === 'Dinheiro'),
      )
      .reduce(
        (acc: number, i: any) =>
          acc +
          (Number(i.valor ?? i.amount ?? 0) -
            Number(i.valorCaixinha ?? (i.is_tip ? i.amount : 0) ?? 0)),
        0,
      )

    const sai = lanc
      .filter((i: any) => i.isSaida || i.is_withdrawal)
      .reduce(
        (acc: number, i: any) => acc + Number(i.valor ?? i.amount ?? 0),
        0,
      )

    const getSum = (forma: string) =>
      lanc
        .filter(
          (i: any) =>
            !i.isSaida &&
            !i.is_withdrawal &&
            ((i.formaPagamento &&
              i.formaPagamento.toLowerCase().includes(forma.toLowerCase())) ||
              (i.payment_method &&
                i.payment_method.toLowerCase().includes(forma.toLowerCase()))),
        )
        .reduce(
          (acc: number, i: any) => acc + Number(i.valor ?? i.amount ?? 0),
          0,
        )

    const totalVendas = lanc
      .filter((i: any) => !i.isSaida && !i.is_withdrawal)
      .reduce(
        (acc: number, i: any) => acc + Number(i.valor ?? i.amount ?? 0),
        0,
      )

    const saldoGaveta = abertura + entDin - sai

    const pixVal = getSum('PIX')
    const debVal = getSum('Débito')
    const credVal = getSum('Crédito')
    const vouchVal = getSum('Voucher')
    const funcVal = getSum('Funcionário')
    const proVal = getSum('Pró-labore')
    const permVal = getSum('Permuta')
    const cortVal = getSum('Cortesia')

    // Acumular totais do mês
    totalAbertura += abertura
    totalDinheiro += entDin
    totalSangrias += sai
    totalSaldoGaveta += saldoGaveta
    totalPix += pixVal
    totalDebito += debVal
    totalCredito += credVal
    totalVoucher += vouchVal
    totalFuncionario += funcVal
    totalProLabore += proVal
    totalPermuta += permVal
    totalCortesia += cortVal
    totalCaixinha += caixinha
    totalFaturamento += totalVendas

    const dateStr = formatarData(l.dataReferencia || l.opened_at)
    const periodoStr = String(l.periodo || l.period || '').toUpperCase()

    return [
      dateStr,
      {
        content: periodoStr,
        styles: { fontStyle: 'bold' as const },
      },
      abertura.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      entDin.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      {
        content: sai.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        styles: { textColor: [185, 28, 28] as any },
      }, // Vermelho para saídas
      {
        content: saldoGaveta.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        styles: { fontStyle: 'bold' as const, textColor: [21, 128, 61] as any },
      }, // Verde para saldo físico
      pixVal.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      debVal.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      credVal.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      vouchVal.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      funcVal.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      proVal.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      permVal.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      cortVal.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      {
        content: caixinha.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        styles: {
          fontStyle: 'bold' as const,
          textColor: [109, 40, 217] as any, // Roxo elegante para Caixinha
        },
      },
      {
        content: totalVendas.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        styles: {
          fontStyle: 'bold' as const,
          fillColor: [241, 245, 249] as any,
        },
      },
    ]
  })

  autoTable(doc, {
    startY: 30,
    head: [
      [
        'DATA',
        'TURNO',
        'ABER.',
        'DIN.',
        'SANG.',
        'SALDO',
        'PIX',
        'DÉB.',
        'CRÉD.',
        'VOUCH.',
        'FUNC.',
        'PRO.',
        'PERM.',
        'CORT.',
        'CAIX.',
        'TOTAL',
      ],
    ],
    body,
    foot: [
      [
        'TOTAL DO MÊS',
        `${lotesOrdenados.length} caixas`,
        totalAbertura.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        totalDinheiro.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        totalSangrias.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        totalSaldoGaveta.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        totalPix.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        totalDebito.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        totalCredito.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        totalVoucher.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        totalFuncionario.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        totalProLabore.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        totalPermuta.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        totalCortesia.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        totalCaixinha.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        totalFaturamento.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      ],
    ],
    theme: 'striped',
    showFoot: 'lastPage',
    styles: {
      fontSize: 6.2,
      halign: 'center',
      cellPadding: 1.8,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
    },
    footStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' },
      5: { fillColor: [240, 253, 244] }, // Fundo levemente esverdeado para o Saldo em Mão
      14: { fillColor: [250, 245, 255] }, // Fundo suave para Caixinha
      15: { fillColor: [239, 246, 255] }, // Fundo levemente azulado para o Faturamento Total
    },
  })

  // Nota explicativa no rodapé
  const finalY = (doc as any).lastAutoTable?.finalY || 30
  doc.setFontSize(7.5)
  doc.setTextColor(100)
  doc.text(
    'Legenda: SALDO GAVETA = (Abertura + Dinheiro Vendas - Sangrias). FATURAMENTO TOTAL = Soma de todas as formas de pagamento (exceto sangrias). CAIX. = Total de caixinhas e gorjetas arrecadadas no turno (para repasse à equipe).',
    14,
    finalY + 8,
  )

  doc.save(`${tenantName}_GERENCIAL_${new Date().getTime()}.pdf`)
}
