import { Helmet } from 'react-helmet-async'

import { ExpensesBySectorChart } from './expenses-by-sector-chart'
import { GeneralBalance } from './general-balance'
import { MonthExpendsCard } from './month-expends-card'
import { MonthRevenueCard } from './month-revenue-card'
import { MonthTreatmentAmountCard } from './month-treatments-amount-card'
import { RevenueChart } from './revenue-chart'

export function Dashboard() {
  return (
    <>
      <Helmet title="Dashboard" />
      {/* 1. Container Principal: Ajuste de cor de fundo e texto para dark mode */}
      <div className="flex flex-col gap-4 p-4 md:p-6">
        
        {/* Título: Ajuste para dark mode, usando uma cor de texto que se destaca em ambos os temas. */}
        {/* Use a classe 'text-minsk-900' para light mode e 'dark:text-minsk-50' para dark mode */}
        <h1 className="font-merienda text-4xl font-bold tracking-tight text-minsk-900 dark:text-minsk-50">
          Centro de Comando
        </h1>
        
        {/* 2. Cards de Métricas: Não precisa de alteração no container, os cards devem gerenciar suas próprias cores */}
        <div className="grid grid-cols-1 gap-4 font-gaba sm:grid-cols-2 lg:grid-cols-4">
          <MonthRevenueCard />
          <MonthExpendsCard />
          <MonthTreatmentAmountCard />
          <GeneralBalance />
        </div>
        
        {/* 3. Gráficos: Não precisa de alteração no container, os gráficos devem gerenciar suas próprias cores */}
        <div className="grid grid-cols-1 gap-4 font-gaba lg:grid-cols-9">
          {/* Adicionamos a prop className para controlar o tamanho */}
          <RevenueChart className="lg:col-span-6" /> 
          <ExpensesBySectorChart className="lg:col-span-3" />
        </div>
      </div>
    </>
  )
}