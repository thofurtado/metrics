import { Helmet } from 'react-helmet-async'

// 1. IMPORTAÇÃO DOS CARDS
import { FinanceCard } from './FinanceCard'
import { InventoryCard } from './InventoryCard'
import { MonthTreatmentAmountCard } from './TreatmentCard' // Card de Serviços

// Os outros imports permanecem:
import { ExpensesBySectorChart } from './expenses-by-sector-chart'
import { RevenueChart } from './revenue-chart'
import { BalanceProjectionChart } from './BalanceProjectionChart'


export function Dashboard() {
  return (
    <>
      <Helmet title="Dashboard" />

      {/* CONTAINER PRINCIPAL: Redução de padding e gap para subir o conteúdo. */}
      <div className="flex flex-col gap-3 p-3 md:p-5 overflow-x-hidden">

        <h1 className="font-merienda text-4xl font-bold tracking-tight text-minsk-900 dark:text-minsk-50">
          Centro de Comando
        </h1>

        {/* LINHA DE CARDS: Reordenada para priorizar Serviços */}
        <div className="grid grid-cols-1 gap-4 font-gaba lg:grid-cols-3">

          {/* PRIMEIRO CARD: Gestão de Serviços */}
          <MonthTreatmentAmountCard className="lg:col-span-1" />

          {/* SEGUNDO CARD: Visão Financeira */}
          <FinanceCard className="lg:col-span-1" />

          {/* TERCEIRO CARD: Inventário e Vendas */}
          <InventoryCard className="lg:col-span-1" />

        </div>

        {/* GRID DE GRÁFICOS */}
        <div className="grid grid-cols-1 gap-4 font-gaba lg:grid-cols-9">
          <BalanceProjectionChart className="lg:col-span-6" />
          <ExpensesBySectorChart className="lg:col-span-3" />
        </div>
      </div>
    </>
  )
}