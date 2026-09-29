export const REGEX_CAIXINHA =
  /\[(?:Gorjeta|Caixinha):\s*R\$\s*([\d.,]+)(?:\s*\|\s*([^\]]+))?\]/i

export interface ExtractedCaixinha {
  valorCaixinha: number
  paraQuem: string
  temCaixinha: boolean
}

/**
 * Extrai com precisão a caixinha/gorjeta de um lançamento de caixa.
 * 
 * REGRA DO METRICS:
 * Caixinha é SOMENTE o excedente do pagamento (ex.: conta de R$ 182,00 passada no débito como R$ 200,00 = R$ 18,00 de caixinha).
 * Nunca somar o valor total da venda (R$ 200,00) como caixinha!
 * Se for caixinha avulsa pura (sem venda de produto, type === 'TIP' ou is_tip === true sem tag acoplada), o valor é o amount da entrada.
 * Se for venda comum sem marcação de caixinha, o valor é 0.
 */
export function extrairCaixinhaDeLancamento(entry: any): ExtractedCaixinha {
  if (!entry) {
    return { valorCaixinha: 0, paraQuem: '', temCaixinha: false }
  }

  const ident = String(entry.identification || entry.identificacao || '')
  const match = ident.match(REGEX_CAIXINHA)
  const valorLinked = match ? parseFloat(match[1].replace(',', '.')) : 0
  const paraQuemLinked = match && match[2] ? match[2].trim() : ''

  // 1. Se tem a marcação explícita de acoplamento na identificação, o valor É o excedente indicado
  if (valorLinked > 0) {
    return {
      valorCaixinha: valorLinked,
      paraQuem: paraQuemLinked || entry.paraQuem || '',
      temCaixinha: true,
    }
  }

  // 2. Se já veio um valorCaixinha pré-computado e for coerente
  const isExplicitTip = Boolean(
    entry.is_tip ||
      entry.type === 'TIP' ||
      entry.isCaixinha ||
      (entry.payment_method &&
        (entry.payment_method.toLowerCase() === 'caixinha' ||
          entry.payment_method.toLowerCase() === 'gorjeta')),
  )

  if (entry.valorCaixinha !== undefined && Number(entry.valorCaixinha) > 0) {
    const totalAmt = Number(entry.valor ?? entry.amount ?? 0)
    const vc = Number(entry.valorCaixinha)
    if (vc < totalAmt || isExplicitTip) {
      return {
        valorCaixinha: vc,
        paraQuem: entry.paraQuem || ident,
        temCaixinha: true,
      }
    }
  }

  // 3. Se for caixinha avulsa pura (sem venda acoplada, lançamento avulso de gorjeta)
  if (isExplicitTip) {
    const val = Number(entry.valor ?? entry.amount ?? 0)
    return {
      valorCaixinha: val,
      paraQuem: entry.paraQuem || ident,
      temCaixinha: true,
    }
  }

  // 4. Venda comum sem caixinha
  return {
    valorCaixinha: 0,
    paraQuem: '',
    temCaixinha: false,
  }
}

/**
 * Calcula o total de caixinha de um lote/sessão de caixa:
 * - Soma o excedente de cada lançamento (ou caixinha avulsa)
 * - Soma as taxas de serviço (service_fee) de vendas não canceladas
 */
export function calcularTotalCaixinhaLote(lote: any): number {
  if (!lote) return 0

  const entries = lote.lancamentos || lote.entries || []
  const tipFromEntries = entries
    .filter((i: any) => !i.isSaida && !i.is_withdrawal)
    .reduce((acc: number, i: any) => {
      return acc + extrairCaixinhaDeLancamento(i).valorCaixinha
    }, 0)

  const tipFromSales = (lote.sales || [])
    .filter((s: any) => s.status !== 'CANCELLED')
    .reduce((acc: number, s: any) => acc + Number(s.service_fee || 0), 0)

  return tipFromEntries + tipFromSales
}
