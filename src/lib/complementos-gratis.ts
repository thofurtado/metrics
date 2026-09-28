/**
 * Regra do "N grátis" num grupo de complementos (decisão de 28/09/2026, igual ao PDV): ficam de graça os N itens
 * MAIS BARATOS escolhidos no grupo; os demais são cobrados. Antes o cardápio dava de graça os primeiros da lista de
 * opções, e o mesmo pedido saía com preço diferente no cardápio e no PDV.
 */
export function valorCobradoDoGrupo(
  escolhas: { preco: number; quantidade: number }[],
  gratis: number,
): number {
  const unidades: number[] = []
  for (const escolha of escolhas) {
    for (let i = 0; i < Math.max(0, escolha.quantidade || 0); i++) unidades.push(escolha.preco || 0)
  }
  unidades.sort((a, b) => a - b)
  return unidades.slice(Math.max(0, gratis || 0)).reduce((soma, preco) => soma + preco, 0)
}
