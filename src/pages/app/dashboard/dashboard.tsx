import { useState } from 'react'
import { Helmet } from 'react-helmet-async'

// 1. IMPORTAÇÃO DOS CARDS
import { FinanceCard } from './FinanceCard'
import { FinanceCardOperacional } from './FinanceCardOperacional'
import { InventoryCard } from './InventoryCard'
import { MonthTreatmentAmountCard } from './TreatmentCard' // Card de Serviços
import { AgendaPagamentosCard } from './AgendaPagamentosCard' // Card de Agenda (Fallback)

// Os outros imports permanecem:
import { ExpensesBySectorChart } from './expenses-by-sector-chart'
import { BalanceProjectionChart } from './BalanceProjectionChart'


import { useModules } from '@/context/module-context'
import { MonthPicker } from '@/components/MonthPicker'
import { cn } from '@/lib/utils'

export function Dashboard() {
  const { isCardVisible, modules } = useModules()
  const [date, setDate] = useState<Date>(new Date())

  const month = date.getMonth() + 1
  const year = date.getFullYear()

  const showTreatment = isCardVisible('treatments', 'treatment_summary')
  const showInventory = isCardVisible('merchandise', 'inventory_summary')
  const showFinanceSummary = isCardVisible('financial', 'financial_summary')
  const showPaymentAgenda = isCardVisible('financial', 'payment_agenda')
  const showExpensesBySector = isCardVisible('financial', 'expenses_by_sector')
  const showBalanceProjection = isCardVisible('financial', 'balance_projection')

  // Lógica de agrupamento dos 3 cards financeiros (se alinham de 4 em 4 ou de 6 em 6)
  const financeGroupCount = [showFinanceSummary, showPaymentAgenda, showExpensesBySector].filter(Boolean).length
  const financeSpan = financeGroupCount === 3 ? "lg:col-span-4" : financeGroupCount === 2 ? "lg:col-span-6" : "lg:col-span-12"

  // Lógica para OS e Inventário (topo) - Se ambos existirem, dividem a linha. Se apenas um, ocupa o topo.
  const topGroupCount = [showTreatment, showInventory].filter(Boolean).length
  const topSpan = topGroupCount === 2 ? "lg:col-span-6" : "lg:col-span-12"

  return (
    <>
      <Helmet title="Dashboard" />

      {/* CONTAINER PRINCIPAL */}
      <div className="flex flex-col gap-8 p-0">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="font-manrope text-3xl sm:text-5xl font-extrabold tracking-tighter text-slate-900 dark:text-slate-100">
            Centro de Comando
          </h1>

          <MonthPicker date={date} setDate={setDate} />
        </div>

        {/* CONTAINER GRID UNIFICADO */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12 grid-flow-row-dense">
          
          {/* CARDS TOPO (OS e Inventário) */}
          {showTreatment && (
            <MonthTreatmentAmountCard 
              month={month} 
              year={year} 
              className={cn("md:col-span-6", topSpan)} 
            />
          )}

          {showInventory && (
            <InventoryCard 
              month={month} 
              year={year} 
              className={cn("md:col-span-6", topSpan)} 
            />
          )}

          {/* GRUPO FINANCEIRO (Fluxo, Agenda e Despesas por Setor) */}
          {showFinanceSummary && (
            modules.financial_management_profile === 'OPERATIONAL' ? (
              <FinanceCardOperacional 
                month={month} 
                year={year} 
                className={cn("md:col-span-6", financeSpan)} 
              />
            ) : (
              <FinanceCard 
                month={month} 
                year={year} 
                className={cn("md:col-span-6", financeSpan)} 
              />
            )
          )}

          {showPaymentAgenda && (
            <AgendaPagamentosCard 
              className={cn("md:col-span-6", financeSpan)} 
            />
          )}

          {showExpensesBySector && (
            <ExpensesBySectorChart 
              month={month} 
              year={year} 
              className={cn("md:col-span-6", financeSpan)} 
            />
          )}

          {/* BASE (Gráfico de Previsão de Saldo) */}
          {showBalanceProjection && (
            <BalanceProjectionChart 
              className="md:col-span-12 lg:col-span-12" 
            />
          )}

        </div>
      </div>
    </>
  )
}
