import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CircleDollarSign, Clock, SlidersHorizontal, Users } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/custom-tabs'
import { useModules } from '@/context/module-context'

import { EmployeesList } from './employees/employees-list'
import { PayrollClosing } from './payroll/closing'
import { HrRulesSettings } from './settings/hr-rules-settings'
import { TimeClockAudit } from './time-clock/audit'

export function HRDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = searchParams.get('tab') || 'employees'
  const { isModuleActive, isLoading } = useModules()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isModuleActive('hr_module')) {
      navigate('/')
    }
  }, [isLoading, isModuleActive, navigate])

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Carregando módulo de Recursos Humanos...
      </div>
    )
  }

  if (!isModuleActive('hr_module')) {
    return null
  }

  const handleTabChange = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', value)
      return next
    })
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Recursos Humanos"
        description="Gestão integrada e moderna de colaboradores, espelhos de ponto, escalas e fechamento de folha."
      />

      <Tabs
        value={currentTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 gap-1.5 rounded-2xl border border-slate-200/70 bg-slate-100/70 p-1.5 shadow-inner dark:border-slate-800 dark:bg-slate-900/60 sm:grid-cols-4">
          <TabsTrigger
            value="employees"
            className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100 sm:text-sm"
          >
            <Users className="h-4 w-4 text-blue-500" />
            <span>Colaboradores</span>
          </TabsTrigger>
          <TabsTrigger
            value="time-clock"
            className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100 sm:text-sm"
          >
            <Clock className="h-4 w-4 text-amber-500" />
            <span>Ponto Eletrônico</span>
          </TabsTrigger>
          <TabsTrigger
            value="payroll"
            className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100 sm:text-sm"
          >
            <CircleDollarSign className="h-4 w-4 text-emerald-500" />
            <span>Fechamento & Folha</span>
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100 sm:text-sm"
          >
            <SlidersHorizontal className="h-4 w-4 text-purple-500" />
            <span>Configurações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="outline-none">
          <EmployeesList />
        </TabsContent>

        <TabsContent value="time-clock" className="outline-none">
          <TimeClockAudit />
        </TabsContent>

        <TabsContent value="payroll" className="outline-none">
          <PayrollClosing />
        </TabsContent>

        <TabsContent value="settings" className="outline-none">
          <HrRulesSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
