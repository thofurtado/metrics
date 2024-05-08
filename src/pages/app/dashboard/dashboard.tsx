import { Helmet } from 'react-helmet-async'

import { ExpensesBySectorChart } from './expenses-by-sector-chart'
import { MonthExpendsCard } from './month-expends-card'
import { MonthRevenueCard } from './month-revenue-card'
import { MonthTreatmentAmountCard } from './month-treatments-amount-card'
import { RevenueChart } from './revenue-chart'

export function Dashboard() {
  return (
    <>
      <Helmet title="Dashboard" />
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid grid-cols-4 gap-4">
          <MonthRevenueCard />
          <MonthExpendsCard />
          <MonthTreatmentAmountCard />
        </div>
        <div className="grid grid-cols-9 gap-4">
          <RevenueChart />
          <ExpensesBySectorChart />
        </div>
      </div>
    </>
  )
}
