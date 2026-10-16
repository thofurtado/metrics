import {
  ClipboardList,
  FileText,
  History,
  LineChart,
  Package,
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'

import { PageHeader } from '@/components/page-header'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/custom-tabs'

import { TabRecipeConsumption } from './tabs/tab-recipe-consumption'
import { TabStockIntake } from './tabs/tab-stock-intake'
import { TabStockInventory } from './tabs/tab-stock-inventory'
import { TabStockMovements } from './tabs/tab-stock-movements'
import { TabStockPosition } from './tabs/tab-stock-position'

export type StockTabId =
  | 'position'
  | 'intake'
  | 'recipe'
  | 'inventory'
  | 'history'
  | 'movements'

export function StockDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab') as StockTabId
  const currentTab: StockTabId =
    rawTab === 'movements' ? 'history' : rawTab || 'position'

  const setTab = (tab: StockTabId) => {
    setSearchParams({ tab })
  }

  // Histórico de um produto ou insumo (botão "Histórico" da Posição de Estoque): /stock?tab=history&item=<id>
  const itemDoHistorico = searchParams.get('item')
  const abrirHistorico = (itemId: string | null) => {
    setSearchParams(
      itemId ? { tab: 'history', item: itemId } : { tab: 'history' },
    )
  }

  return (
    <div className="flex flex-col gap-3.5">
      <Helmet title="Controle de Estoque" />

      <PageHeader
        title="Controle de Estoque"
        description="Saldo de cada produto e insumo, entradas por NF-e, fichas técnicas, contagem e o histórico de cada movimento."
      />

      <Tabs
        value={currentTab}
        onValueChange={(val) => setTab(val as StockTabId)}
        className="w-full"
      >
        {/* Nomes curtos que cabem no celular de 320 px (antes "Posição de Estoque" e "Entrada de Mercadorias" se sobrepunham) */}
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
          <TabsTrigger
            value="position"
            className="min-h-11 flex-1 rounded-xl font-bold"
          >
            <Package className="mr-2 h-4 w-4 text-emerald-500" aria-hidden />
            Posição
          </TabsTrigger>
          <TabsTrigger
            value="intake"
            className="min-h-11 flex-1 rounded-xl font-bold"
          >
            <FileText className="mr-2 h-4 w-4 text-blue-500" aria-hidden />
            Entrada de NF-e
          </TabsTrigger>
          <TabsTrigger
            value="recipe"
            className="min-h-11 flex-1 rounded-xl font-bold"
          >
            <LineChart className="mr-2 h-4 w-4 text-purple-500" aria-hidden />
            Ficha técnica
          </TabsTrigger>
          <TabsTrigger
            value="inventory"
            className="min-h-11 flex-1 rounded-xl font-bold"
          >
            <ClipboardList
              className="mr-2 h-4 w-4 text-amber-500"
              aria-hidden
            />
            Inventário
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="min-h-11 flex-1 rounded-xl font-bold"
          >
            <History className="mr-2 h-4 w-4 text-slate-500" aria-hidden />
            Histórico
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* CONTEÚDO DA ABA SELECIONADA */}
      <div className="pt-1">
        {currentTab === 'position' && (
          <TabStockPosition
            onOpenHistory={(itemId) => abrirHistorico(itemId)}
          />
        )}
        {currentTab === 'intake' && <TabStockIntake />}
        {currentTab === 'recipe' && <TabRecipeConsumption />}
        {currentTab === 'inventory' && (
          <TabStockInventory onFinished={() => setTab('history')} />
        )}
        {currentTab === 'history' && (
          <TabStockMovements
            itemId={itemDoHistorico}
            onItemChange={abrirHistorico}
          />
        )}
      </div>
    </div>
  )
}

export default StockDashboard
