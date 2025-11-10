import { Helmet } from 'react-helmet-async'

// 1. IMPORTAÇÃO DOS CARDS
import { FinanceCard } from './FinanceCard'
import { InventoryCard } from './InventoryCard'

// Os outros imports permanecem:
import { ExpensesBySectorChart } from './expenses-by-sector-chart'
import { MonthTreatmentAmountCard } from './TreatmentCard'
import { RevenueChart } from './revenue-chart'


export function Dashboard() {
  return (
    <>
      <Helmet title="Dashboard" />
      {/* Container principal - Adicionar 'overflow-x-hidden' aqui pode ser um bom plano B */}
      <div className="flex flex-col gap-4 p-4 md:p-6 overflow-x-hidden">

        <h1 className="font-merienda text-4xl font-bold tracking-tight text-minsk-900 dark:text-minsk-50">
          Centro de Comando
        </h1>

        {/* 💡 CORREÇÃO APLICADA AQUI:
            Removido sm:grid-cols-2. Agora usa 1 coluna (grid-cols-1) em mobile/tablet
            e só passa para 3 colunas em telas grandes (lg:grid-cols-3).
        */}
        <div className="grid grid-cols-1 gap-4 font-gaba lg:grid-cols-3">

          <FinanceCard className="lg:col-span-1" />
          <InventoryCard className="lg:col-span-1" />
          <MonthTreatmentAmountCard className="lg:col-span-1" />
        </div>

        {/* GRID DE GRÁFICOS (Mantido, pois a lógica de 1 coluna em mobile está correta) */}
        <div className="grid grid-cols-1 gap-4 font-gaba lg:grid-cols-9">
          <RevenueChart className="lg:col-span-6" />
          <ExpensesBySectorChart className="lg:col-span-3" />
        </div>
      </div>
    </>
  )
}