/**
 * Saída do caixa paga no Pix (o acerto do motoboy no Pix, 15/10/2026): o dinheiro NÃO saiu da gaveta. Mesma regra da nuvem
 * (metrics-node/src/modules/cashier/services/plataformas.ts: saiDaGaveta), que já não desconta essas saídas na conferência
 * nem no "Vendas em Dinheiro − despesas" do Caixa Central. Onde a web soma as saídas para o dinheiro esperado na gaveta,
 * usar estas funções.
 */

type LancamentoDeSaida = {
  is_withdrawal?: boolean | null
  isSaida?: boolean | null
  payment_method?: string | null
  formaPagamento?: string | null
}

const semAcento = (texto: string | null | undefined) =>
  (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** É uma saída (sangria, vale, despesa)? Aceita o lançamento da nuvem e o já mapeado da tela. */
function ehSaida(l: LancamentoDeSaida): boolean {
  return Boolean(l.is_withdrawal || l.isSaida)
}

/** A saída foi paga no Pix (não tirou dinheiro da gaveta)? */
export function saidaNoPix(l: LancamentoDeSaida): boolean {
  return ehSaida(l) && semAcento(l.payment_method ?? l.formaPagamento).includes('pix')
}

/** A saída tirou dinheiro da gaveta? (sangria, vale e despesa em dinheiro sim; a paga no Pix não) */
export function saiuDaGaveta(l: LancamentoDeSaida): boolean {
  return ehSaida(l) && !saidaNoPix(l)
}
