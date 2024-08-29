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
      <div className="flex flex-col gap-4">
        <h1 className="font-merienda text-4xl font-bold tracking-tight text-minsk-900">
          Centro de Comando
        </h1>
        <div className="grid grid-cols-4 gap-4 font-gaba">
          <MonthRevenueCard />
          <MonthExpendsCard />
          <MonthTreatmentAmountCard />
          <GeneralBalance />
        </div>
        <div className="grid grid-cols-9 gap-4 font-gaba">
          <RevenueChart />
          <ExpensesBySectorChart />
        </div>
      </div>
    </>
  )
}
