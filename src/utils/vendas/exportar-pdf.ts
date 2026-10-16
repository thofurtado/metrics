import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import type { ContaDasVendas, ProdutoVendido, VendaDaLista } from '@/api/vendas'
import { getTenantDisplayName } from '@/utils/cashier/tenantHelper'

import { csvDasVendas, csvDosProdutos, nomeDoArquivo } from './exportar-csv'
import {
  dataCompleta,
  diaEHora,
  moeda,
  numeroDaVenda,
  percentual,
  quantidade,
  textoDoPeriodo,
} from './formatos'

/**
 * Arquivos do módulo Vendas (D10, 16/10/2026): CSV e PDF da lista de vendas e dos produtos vendidos. O PDF repete a conta
 * única no topo (Total vendido, Total recebido e a linha da diferença), para o papel bater com a tela.
 */

/** A fonte padrão do PDF (helvetica, WinAnsi) não tem o sinal "−" (U+2212): vira "-". */
const paraPdf = (t: string) => t.replace(/−/g, '-')

/** Baixa um arquivo gerado no navegador. */
export function baixarArquivo(
  conteudo: string | Blob,
  nome: string,
  tipo = 'text/csv;charset=utf-8',
) {
  const blob =
    typeof conteudo === 'string'
      ? new Blob([conteudo], { type: tipo })
      : conteudo
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function baixarCsvDasVendas(
  vendas: VendaDaLista[],
  periodo: { de: string; ate: string } | null,
) {
  baixarArquivo(csvDasVendas(vendas), nomeDoArquivo('vendas', periodo, 'csv'))
}

export function baixarCsvDosProdutos(
  produtos: ProdutoVendido[],
  veCusto: boolean,
  periodo: { de: string; ate: string } | null,
) {
  baixarArquivo(
    csvDosProdutos(produtos, veCusto),
    nomeDoArquivo('produtos-vendidos', periodo, 'csv'),
  )
}

function cabecalho(
  doc: jsPDF,
  titulo: string,
  periodo: { de: string; ate: string } | null,
  conta?: ContaDasVendas | null,
) {
  const largura = doc.internal.pageSize.getWidth()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(paraPdf(`${getTenantDisplayName()} · ${titulo}`), 14, 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(
    periodo ? `Período: ${textoDoPeriodo(periodo)}` : 'Caixa inteiro',
    14,
    23,
  )
  doc.text(
    `Gerado em ${diaEHora(new Date().toISOString())}`,
    largura - 14,
    23,
    { align: 'right' },
  )
  let y = 29
  if (conta) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(
      paraPdf(
        `Total vendido ${moeda(conta.vendido.total)}   ·   Total recebido ${moeda(conta.recebido.total)}`,
      ),
      14,
      y,
    )
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const linhas = doc.splitTextToSize(
      paraPdf(
        [conta.diferenca.linha, conta.diferenca.canceladas]
          .filter(Boolean)
          .join('  '),
      ),
      largura - 28,
    )
    doc.text(linhas, 14, y + 5)
    y += 5 + linhas.length * 4.2
  }
  return y + 2
}

export function pdfDasVendas(
  vendas: VendaDaLista[],
  periodo: { de: string; ate: string } | null,
  conta?: ContaDasVendas | null,
) {
  // eslint-disable-next-line new-cap -- o nome da classe na biblioteca é jsPDF
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const inicio = cabecalho(doc, 'Vendas', periodo, conta)
  autoTable(doc, {
    startY: inicio,
    head: [
      ['Dia e hora', 'Venda', 'Origem', 'Caixa', 'Formas', 'Nota', 'Total'],
    ],
    body: vendas.map((v) => [
      // Um dia só: a hora basta; vários dias: a data com o ano
      !periodo || periodo.de !== periodo.ate
        ? dataCompleta(v.criadaEm)
        : diaEHora(v.criadaEm),
      numeroDaVenda(v),
      v.origem.rotulo,
      v.caixa
        ? `${v.caixa.nome}${v.caixa.computador ? ` · ${v.caixa.computador}` : ''}`
        : '—',
      v.cancelada
        ? `Cancelada${v.cancelamento?.motivo ? `: ${v.cancelamento.motivo}` : ''}`
        : v.formas.map((f) => `${f.forma} ${moeda(f.valor)}`).join(' + ') ||
          '—',
      v.nota
        ? `${v.nota.rotulo ?? v.nota.situacao}${v.nota.numero ? ` nº ${v.nota.numero}` : ''}`
        : '—',
      moeda(v.total),
    ]),
    styles: { fontSize: 8.5, cellPadding: 1.6 },
    headStyles: { fillColor: [30, 64, 175] },
    columnStyles: { 6: { halign: 'right' } },
    didParseCell: (d) => {
      d.cell.text = d.cell.text.map(paraPdf)
      // Cancelada: cinza, fora dos totais (D12)
      if (d.section === 'body' && vendas[d.row.index]?.cancelada)
        d.cell.styles.textColor = [150, 150, 150]
    },
  })
  doc.save(nomeDoArquivo('vendas', periodo, 'pdf'))
}

export function pdfDosProdutos(
  produtos: ProdutoVendido[],
  veCusto: boolean,
  periodo: { de: string; ate: string } | null,
  conta?: ContaDasVendas | null,
) {
  // eslint-disable-next-line new-cap -- o nome da classe na biblioteca é jsPDF
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const inicio = cabecalho(doc, 'Produtos vendidos', periodo, conta)
  const head = [
    'Código',
    'Produto',
    'Quantidade',
    'Vendas',
    'Faturamento',
    'Participação',
  ]
  if (veCusto) head.push('Custo', 'Margem', 'Margem %')
  autoTable(doc, {
    startY: inicio,
    head: [head],
    body: produtos.map((p) => {
      const l = [
        p.codigo == null ? '—' : String(p.codigo),
        p.nome,
        quantidade(p.quantidade, p.unidade),
        String(p.vendas),
        moeda(p.faturamento),
        percentual(p.participacao),
      ]
      if (veCusto)
        l.push(moeda(p.custo), moeda(p.margem), percentual(p.margemPercentual))
      return l
    }),
    styles: { fontSize: 8.5, cellPadding: 1.6 },
    headStyles: { fillColor: [30, 64, 175] },
    didParseCell: (d) => {
      d.cell.text = d.cell.text.map(paraPdf)
    },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right' },
    },
  })
  doc.save(nomeDoArquivo('produtos-vendidos', periodo, 'pdf'))
}
