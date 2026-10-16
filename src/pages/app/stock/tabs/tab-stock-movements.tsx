import { HistoricoDoEstoque } from '../components/historico-do-estoque'

interface TabStockMovementsProps {
  /** Produto ou insumo vindo da Posição de Estoque (botão "Histórico"). */
  itemId?: string | null
  onItemChange?: (itemId: string | null) => void
}

/**
 * Controle de Estoque › Histórico (D6): o extrato de todos os movimentos, com filtro por produto. Antes a tela mandava o
 * filtro "SALE_PDV" que a nuvem não conhecia (0 registros com 786 baixas no banco) e mostrava totais fixos de exemplo.
 */
export function TabStockMovements({
  itemId,
  onItemChange,
}: TabStockMovementsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Histórico do estoque
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Cada venda, compra, perda, ajuste e estorno, com o saldo antes e
          depois.
        </p>
      </div>
      <HistoricoDoEstoque
        itemInicial={itemId ?? null}
        onItemChange={onItemChange}
      />
    </div>
  )
}
