import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSearchParams, useNavigate } from "react-router-dom"
import { EmployeesList } from "./employees/employees-list"
import { TimeClockAudit } from "./time-clock/audit"
import { PayrollClosing } from "./payroll/closing"
import { useModules } from "@/context/module-context"
import { useEffect } from "react"

export function HRDashboard() {
    const [searchParams, setSearchParams] = useSearchParams()
    const currentTab = searchParams.get('tab') || 'employees'
    const { isModuleActive, isLoading } = useModules()
    const navigate = useNavigate()

    useEffect(() => {
        if (!isLoading && !isModuleActive('hr_module')) {
            navigate("/")
        }
    }, [isLoading, isModuleActive, navigate])

    if (isLoading) {
        return <div className="p-8 text-muted-foreground">Carregando módulo...</div>
    }

    if (!isModuleActive('hr_module')) {
        return null
    }

    const handleTabChange = (value: string) => {
        setSearchParams({ tab: value })
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Recursos Humanos</h1>
                <p className="text-muted-foreground">
                    Gestão integrada de colaboradores, ponto e pagamentos.
                </p>
            </div>

            <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="employees">Colaboradores</TabsTrigger>
                    <TabsTrigger value="time-clock">Ponto Eletrônico</TabsTrigger>
                    <TabsTrigger value="payroll">Fechamento & Financeiro</TabsTrigger>
                </TabsList>

                <TabsContent value="employees" className="outline-none">
                    {/* Render Employees List */}
                    <EmployeesList />
                </TabsContent>

                <TabsContent value="time-clock" className="outline-none">
                    {/* Render Time Clock Audit */}
                    <TimeClockAudit />
                </TabsContent>

                <TabsContent value="payroll" className="outline-none">
                    {/* Render Payroll Closing */}
                    <PayrollClosing />
                </TabsContent>
            </Tabs>
        </div>
    )
}
