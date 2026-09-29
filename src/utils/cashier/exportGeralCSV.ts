import { getTenantDisplayName } from './tenantHelper'
export function exportarGeralCSV(lotes: any[]) {
  if (lotes.length === 0) return

  // Ordenação: Data crescente e Período
  const lotesOrdenados = [...lotes].sort((a, b) => {
    const dataA = new Date(a.dataReferencia).getTime()
    const dataB = new Date(b.dataReferencia).getTime()
    if (dataA !== dataB) return dataA - dataB
    return a.periodo === 'Almoço' ? -1 : 1
  })

  const headers = [
    'Data',
    'Periodo',
    'Abertura',
    'Entradas Dinheiro',
    'Saidas',
    'Saldo em Dinheiro',
    'PIX',
    'Debito',
    'Credito',
    'Voucher',
    'Funcionario',
    'Pro Labore',
    'Permuta',
    'Cortesia',
    'Caixinha',
    'Total Vendas',
    'Saldo Total',
  ]

  let totAbertura = 0
  let totDin = 0
  let totSai = 0
  let totSaldoGaveta = 0
  let totPix = 0
  let totDeb = 0
  let totCred = 0
  let totVouch = 0
  let totFunc = 0
  let totPro = 0
  let totPerm = 0
  let totCort = 0
  let totCaix = 0
  let totVendas = 0
  let totSaldoTotal = 0

  const rows = lotesOrdenados.map((l: any) => {
    const lanc = l.lancamentos || []
    const abertura = Number(l.valorAbertura || 0)
    const entDin = lanc
      .filter((i: any) => !i.isSaida && i.formaPagamento === 'Dinheiro')
      .reduce(
        (acc: number, i: any) => acc + (i.valor - (i.valorCaixinha || 0)),
        0,
      )
    const sai = lanc
      .filter((i: any) => i.isSaida)
      .reduce((acc: number, i: any) => acc + i.valor, 0)
    const getSum = (f: string) =>
      lanc
        .filter((i: any) => !i.isSaida && i.formaPagamento === f)
        .reduce((acc: number, i: any) => acc + i.valor, 0)

    const func = getSum('Funcionário')
    const pro = getSum('Pró-labore')
    const perm = getSum('Permuta')
    const cort = getSum('Cortesia')
    const caixinha = lanc
      .filter((i: any) => !i.isSaida && !i.is_withdrawal)
      .reduce((acc: number, i: any) => acc + Number(i.valorCaixinha || 0), 0)

    const totalVendas = lanc
      .filter((i: any) => !i.isSaida)
      .reduce((acc: number, i: any) => acc + i.valor, 0)

    const saldoDinheiro = abertura + entDin - sai
    const saldoTotal = totalVendas + abertura - sai

    totAbertura += abertura
    totDin += entDin
    totSai += sai
    totSaldoGaveta += saldoDinheiro
    totPix += getSum('PIX')
    totDeb += getSum('Débito')
    totCred += getSum('Crédito')
    totVouch += getSum('Voucher')
    totFunc += func
    totPro += pro
    totPerm += perm
    totCort += cort
    totCaix += caixinha
    totVendas += totalVendas
    totSaldoTotal += saldoTotal

    return [
      l.dataReferencia,
      l.periodo,
      abertura.toFixed(2).replace('.', ','),
      entDin.toFixed(2).replace('.', ','),
      sai.toFixed(2).replace('.', ','),
      saldoDinheiro.toFixed(2).replace('.', ','),
      getSum('PIX').toFixed(2).replace('.', ','),
      getSum('Débito').toFixed(2).replace('.', ','),
      getSum('Crédito').toFixed(2).replace('.', ','),
      getSum('Voucher').toFixed(2).replace('.', ','),
      func.toFixed(2).replace('.', ','),
      pro.toFixed(2).replace('.', ','),
      perm.toFixed(2).replace('.', ','),
      cort.toFixed(2).replace('.', ','),
      caixinha.toFixed(2).replace('.', ','),
      totalVendas.toFixed(2).replace('.', ','),
      saldoTotal.toFixed(2).replace('.', ','),
    ]
  })

  // Linha final com a soma dos totais do mês
  rows.push([
    'TOTAL DO MÊS',
    `${lotesOrdenados.length} caixas`,
    totAbertura.toFixed(2).replace('.', ','),
    totDin.toFixed(2).replace('.', ','),
    totSai.toFixed(2).replace('.', ','),
    totSaldoGaveta.toFixed(2).replace('.', ','),
    totPix.toFixed(2).replace('.', ','),
    totDeb.toFixed(2).replace('.', ','),
    totCred.toFixed(2).replace('.', ','),
    totVouch.toFixed(2).replace('.', ','),
    totFunc.toFixed(2).replace('.', ','),
    totPro.toFixed(2).replace('.', ','),
    totPerm.toFixed(2).replace('.', ','),
    totCort.toFixed(2).replace('.', ','),
    totCaix.toFixed(2).replace('.', ','),
    totVendas.toFixed(2).replace('.', ','),
    totSaldoTotal.toFixed(2).replace('.', ','),
  ])

  const csvContent = [
    headers.join(';'),
    ...rows.map((row) => row.join(';')),
  ].join('\n')
  const blob = new Blob(['\ufeff' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  })
  const link = document.createElement('a')
  link.setAttribute('href', URL.createObjectURL(blob))
  const tenantName = getTenantDisplayName()
  link.setAttribute('download', `${tenantName.toLowerCase()}_relatorio_geral.csv`)
  link.click()
}
