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

export function Dashboard() {
  const { isCardVisible, isModuleActive, modules } = useModules()
  const [date, setDate] = useState<Date>(new Date())

  const month = date.getMonth() + 1
  const year = date.getFullYear()

  return (
    <>
      <Helmet title="Dashboard" />

      {/* CONTAINER PRINCIPAL: Redução de padding e gap para subir o conteúdo. */}
      <div className="flex flex-col gap-3 p-3 md:p-5">

        <div className="flex items-center justify-between">
          <h1 className="font-merienda text-2xl sm:text-4xl font-bold tracking-tight text-minsk-900 dark:text-minsk-50">
            Centro de Comando
          </h1>

          <MonthPicker date={date} setDate={setDate} />
        </div>

        {/* LINHA DE CARDS: Reordenada para priorizar Serviços */}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-4 font-gaba lg:grid-cols-3">

          {/* PRIMEIRO CARD: Gestão de Serviços */}
          {isCardVisible('treatments', 'treatment_summary') && (
            <MonthTreatmentAmountCard month={month} year={year} className="lg:col-span-1" />
          )}

          {/* SEGUNDO CARD: Visão Financeira (Condicionado ao Perfil) */}
          {isCardVisible('financial', 'financial_summary') && (
            modules.financial_management_profile === 'OPERATIONAL' ? (
              <FinanceCardOperacional month={month} year={year} className="lg:col-span-1" />
            ) : (
              <FinanceCard month={month} year={year} className="lg:col-span-1" />
            )
          )}

          {/* TERCEIRO CARD: Inventário e Vendas */}
          {isCardVisible('merchandise', 'inventory_summary') && (
            <InventoryCard month={month} year={year} className="lg:col-span-1" />
          )}

          {/* QUARTO CARD: Agenda de Pagamentos (Fallback fallback se algum módulo for desativado) */}
          {(!isModuleActive('treatments') || !isModuleActive('merchandise')) && (
            <AgendaPagamentosCard className="lg:col-span-1" />
          )}

        </div>

        {/* GRID DE GRÁFICOS */}
        <div className="grid grid-cols-1 gap-4 font-gaba lg:grid-cols-9">
          {isModuleActive('financial') && (
            <>
              <BalanceProjectionChart className="lg:col-span-6" />
              <ExpensesBySectorChart month={month} year={year} className="lg:col-span-3" />
            </>
          )}
        </div>
      </div>
    </>
  )
}