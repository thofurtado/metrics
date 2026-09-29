export const REGEX_CAIXINHA =
  /\[(?:Gorjeta|Caixinha):\s*R\$\s*([\d.,]+)(?:\s*\|\s*([^\]]+))?\]/i

export interface ExtractedCaixinha {
  valorCaixinha: number
  paraQuem: string
  temCaixinha: boolean
}

/**
 * Converte valor em formato string para float lidando com formatos brasileiros e americanos:
 * - '1.250,00' -> 1250.00
 * - '1250.00'  -> 1250.00
 * - '1250,00'  -> 1250.00
 * - '18.00'    -> 18.00
 * - '18,00'    -> 18.00
 */
export function parseMoedaBR(rawStr: string): number {
  if (!rawStr) return 0
  const limpo = rawStr.trim()

  // Se contém ponto e vírgula:
  if (limpo.includes('.') && limpo.includes(',')) {
    if (limpo.lastIndexOf(',') > limpo.lastIndexOf('.')) {
      // Padrão brasileiro: 1.250,00
      return parseFloat(limpo.replace(/\./g, '').replace(',', '.')) || 0
    } else {
      // Padrão internacional: 1,250.00
      return parseFloat(limpo.replace(/,/g, '')) || 0
    }
  }

  // Se contém apenas vírgula: 18,00 ou 1250,00
  if (limpo.includes(',')) {
    return parseFloat(limpo.replace(',', '.')) || 0
  }

  // Se contém múltiplos pontos: 1.250.000
  if ((limpo.match(/\./g) || []).length > 1) {
    return parseFloat(limpo.replace(/\./g, '')) || 0
  }

  return parseFloat(limpo) || 0
}

/**
 * Extrai com precisão a caixinha/gorjeta de um lançamento de caixa.
 * 
 * REGRA DO METRICS (Decisão do Thomás):
 * 1. Caixinha é SOMENTE o excedente do pagamento (ex.: conta de R$ 182,00 passada no débito como R$ 200,00 = R$ 18,00 de caixinha).
 * 2. Serviço (taxa de 10% / service_fee) NÃO é caixinha: é parte da conta e vai na nota fiscal. Nunca somar service_fee na caixinha!
 * 3. Se for caixinha avulsa pura (type === 'TIP' ou is_tip === true sem tag acoplada), o valor é o amount da entrada.
 * 4. Se for venda comum sem marcação, caixinha = 0.
 */
export function extrairCaixinhaDeLancamento(entry: any): ExtractedCaixinha {
  if (!entry) {
    return { valorCaixinha: 0, paraQuem: '', temCaixinha: false }
  }

  const ident = String(entry.identification || entry.identificacao || '')
  const match = ident.match(REGEX_CAIXINHA)
  const valorLinked = match ? parseMoedaBR(match[1]) : 0
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
 * - Soma estritamente o excedente de cada lançamento (ou caixinha avulsa)
 * - NUNCA soma service_fee (serviço é parte da conta e vai na nota)
 */
export function calcularTotalCaixinhaLote(lote: any): number {
  if (!lote) return 0

  const entries = lote.lancamentos || lote.entries || []
  return entries
    .filter((i: any) => !i.isSaida && !i.is_withdrawal)
    .reduce((acc: number, i: any) => {
      return acc + extrairCaixinhaDeLancamento(i).valorCaixinha
    }, 0)
}
