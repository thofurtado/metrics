/* eslint-disable @typescript-eslint/no-explicit-any -- lançamentos e resumo vêm da API sem tipo (mesmo formato da página da sessão) */
import { extrairCaixinhaDeLancamento } from './caixinha.ts'
import { saidaNoPix } from './saida-pix.ts'

/**
 * Quadro dos lançamentos sem banco/maquininha (16/10/2026, caixa 10 da Katatau): o PDV manda o Pix "sem maquininha" (e
 * qualquer forma sem banco) sem `bank`. Antes esses lançamentos só entravam no Total Geral e sumiam do quadro CARTÕES / PIX
 * e dos quadros por banco: a web mostrava PIX R$ 1.999,72 e o PDV esperava R$ 2.029,22 (2 Pix sem banco, R$ 29,50).
 * Agora formam um "banco" a mais, com o mesmo formato dos outros, e entram nas linhas por forma. O Total Geral não muda
 * (cada lançamento continua somado uma vez só).
 */
export const SEM_MAQUININHA = 'SEM MAQUININHA'

/** Chaves fixas de cada quadro de banco; o resto são outras formas (ex.: "Online") daquele banco. */
export const CHAVES_FIXAS_DO_BANCO = [
  'PIX',
  'Débito',
  'Crédito',
  'Voucher',
  'caixinha',
  'total',
  'juros',
  'recebimentoCaixa',
]

const novoBanco = () => ({
  PIX: 0,
  Débito: 0,
  Crédito: 0,
  Voucher: 0,
  caixinha: 0,
  total: 0,
  juros: 0,
})

/**
 * Resumo da Conferência de caixa (sessão): GERAL (entradas, gorjetas, saldo), CAIXA (dinheiro), CASA (consumo interno e a
 * prazo) e um quadro por banco/maquininha, mais o SEM_MAQUININHA. Saiu da página da sessão (16/10/2026) para ter teste.
 */
export function computeResumoSessao(
  sessionObj: any,
  entriesList: any[],
  machines: any[],
) {
  const res: any = {
    GERAL: {
      entradas: 0,
      totalCaixinha: 0,
      saldo: 0,
    },
    CAIXA: {
      saldoAbertura: sessionObj?.initial_balance || 0,
      entradasDinheiro: 0,
      // Só as saídas que tiraram dinheiro da gaveta; as pagas no Pix ficam em saidasPix (mesma regra da conferência da nuvem)
      totalSaidas: 0,
      saidasPix: 0,
    },
    CASA: {
      total: 0,
    },
  }

  const padraoCasa = [
    'funcionário',
    'funcionario',
    'pró-labore',
    'pro-labore',
    'cortesia',
    'permuta',
    'a prazo',
    'correntista',
    'fiado',
    'convenio',
  ]

  for (const entry of entriesList || []) {
    const amount = Number(entry.amount || 0)
    const method = (entry.payment_method || '').trim()
    const bank = (entry.bank || '').toUpperCase().trim()

    if (entry.is_withdrawal) {
      // Saída paga no Pix (acerto do motoboy, 15/10/2026): não saiu da gaveta
      if (saidaNoPix(entry)) {
        res.CAIXA.saidasPix += amount
        continue
      }
      res.CAIXA.totalSaidas += amount
      if (entry.type === 'SANGRIA_DESTINO') {
        const destBank = bank || 'CAIXA CENTRAL'
        if (!res[destBank]) {
          res[destBank] = { ...novoBanco(), recebimentoCaixa: 0 }
        }
        res[destBank].recebimentoCaixa =
          (res[destBank].recebimentoCaixa || 0) + amount
      }
      continue
    }

    const { valorCaixinha: vCaixa, temCaixinha: hasTip } =
      extrairCaixinhaDeLancamento(entry)
    if (hasTip) {
      res.GERAL.totalCaixinha += vCaixa
    }

    res.GERAL.entradas += amount

    // Se for Dinheiro ou banco CAIXA
    if (method.toLowerCase() === 'dinheiro' || bank === 'CAIXA') {
      res.CAIXA.entradasDinheiro += amount
    }
    // Se for Consumo Interno / Conta Casa / Identificador
    else if (
      bank === 'CONTA DA CASA' ||
      padraoCasa.some((p) => method.toLowerCase().includes(p))
    ) {
      if (res.CASA[method] === undefined) {
        res.CASA[method] = 0
      }
      res.CASA[method] += amount
      res.CASA.total += amount
    }
    // Maquininha / banco digital (SAFRA, STONE, NUBANK, PAGBANK, CIELO, IFOOD, etc.) ou, sem banco, o quadro SEM MAQUININHA
    else {
      const chave = bank || SEM_MAQUININHA
      if (!res[chave]) {
        res[chave] = novoBanco()
      }

      let formaKey = method || 'Outros'
      let categoryNorm = ''
      if (method.toUpperCase() === 'PIX') {
        formaKey = 'PIX'
        categoryNorm = 'PIX'
      } else if (
        method.toLowerCase().includes('débito') ||
        method.toLowerCase().includes('debito')
      ) {
        formaKey = 'Débito'
        categoryNorm = 'DEBITO'
      } else if (
        method.toLowerCase().includes('crédito') ||
        method.toLowerCase().includes('credito')
      ) {
        formaKey = 'Crédito'
        categoryNorm = 'CREDITO'
      } else if (method.toLowerCase().includes('voucher')) {
        formaKey = 'Voucher'
        categoryNorm = 'VOUCHER'
      }

      if (res[chave][formaKey] !== undefined) {
        res[chave][formaKey] += amount
      } else {
        res[chave][formaKey] = amount
      }

      if (hasTip) {
        res[chave].caixinha += vCaixa
      }
      res[chave].total += amount

      // Juros aproximados: só de maquininha cadastrada (sem banco não tem taxa)
      let taxa = 0
      if (bank && categoryNorm && machines && machines.length > 0) {
        const machine = machines.find(
          (m: any) => m.name.trim().toUpperCase() === bank.toUpperCase(),
        )
        if (machine && machine.rates && machine.rates.length > 0) {
          const normalizeStr = (str: string) =>
            str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
          const target = normalizeStr(categoryNorm)
          const rate = machine.rates.find((r: any) =>
            normalizeStr(r.payment_category).includes(target),
          )
          if (rate && rate.tax_percentage) {
            taxa = (amount * rate.tax_percentage) / 100
          }
        }
      }
      res[chave].juros = (res[chave].juros || 0) + taxa
    }
  }

  res.GERAL.saldo =
    res.GERAL.entradas - res.CAIXA.totalSaidas - res.CAIXA.saidasPix
  return res
}
