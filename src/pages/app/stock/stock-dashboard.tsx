import React from 'react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
import {
  Package,
  FileText,
  LineChart,
  ClipboardList,
  History,
} from 'lucide-react'

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

  return (
    <div className="flex flex-col gap-3.5">
      <Helmet title="Controle de Estoque" />

      <PageHeader
        title="Controle de Estoque"
        description="Gerencie posições de estoque, entradas de NF-e, fichas técnicas, inventário e histórico de movimentações."
      />

      <Tabs
        value={currentTab}
        onValueChange={(val) => setTab(val as StockTabId)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 gap-1 rounded-xl p-1 h-auto sm:h-10 sm:grid-cols-5 bg-slate-100 dark:bg-slate-800/80">
          <TabsTrigger value="position" className="rounded-xl font-bold">
            <Package className="mr-2 h-4 w-4 text-emerald-500" />
            1. Posição de Estoque
          </TabsTrigger>
          <TabsTrigger value="intake" className="rounded-xl font-bold">
            <FileText className="mr-2 h-4 w-4 text-blue-500" />
            2. Entrada de Mercadorias
          </TabsTrigger>
          <TabsTrigger value="recipe" className="rounded-xl font-bold">
            <LineChart className="mr-2 h-4 w-4 text-purple-500" />
            3. Ficha Técnica
          </TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-xl font-bold">
            <ClipboardList className="mr-2 h-4 w-4 text-amber-500" />
            4. Inventário
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl font-bold">
            <History className="mr-2 h-4 w-4 text-slate-500" />
            5. Histórico / Extrato
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* CONTEÚDO DA ABA SELECIONADA */}
      <div className="pt-1">
        {currentTab === 'position' && (
          <TabStockPosition
            onNavigateToIntake={() => setTab('intake')}
            onNavigateToRecipe={() => setTab('recipe')}
          />
        )}
        {currentTab === 'intake' && <TabStockIntake />}
        {currentTab === 'recipe' && <TabRecipeConsumption />}
        {currentTab === 'inventory' && (
          <TabStockInventory onFinished={() => setTab('history')} />
        )}
        {(currentTab === 'history' || currentTab === 'movements') && (
          <TabStockMovements />
        )}
      </div>
    </div>
  )
}

export default StockDashboard
