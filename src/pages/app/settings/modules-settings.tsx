import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Package,
    DollarSign,
    ClipboardList,
    Info,
    AlertCircle,
    Users
} from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'

import { updateSystemConfig } from '@/api/update-system-config'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useModules } from '@/context/module-context'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const formSchema = z.object({
    merchandise: z.boolean(),
    financial: z.boolean(),
    treatments: z.boolean(),
    hr_module: z.boolean(),
    cestaBasicaValue: z.coerce.number().min(0),
    financial_management_profile: z.enum(['ANALYTICAL', 'OPERATIONAL']),
    dashboard_cards: z.record(z.record(z.boolean())).optional()
})

type FormSchema = z.infer<typeof formSchema>

export function ModulesSettings() {
    const { modules, isLoading } = useModules()
    const queryClient = useQueryClient()

    const form = useForm<FormSchema>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            merchandise: true,
            financial: true,
            treatments: true,
            hr_module: false,
            cestaBasicaValue: 0,
            financial_management_profile: 'ANALYTICAL',
            dashboard_cards: {}
        },
    })

    // Sync form with loaded data
    useEffect(() => {
        if (modules) {
            form.reset({
                merchandise: modules.merchandise,
                financial: modules.financial,
                treatments: modules.treatments,
                hr_module: modules.hr_module ?? false,
                cestaBasicaValue: modules.cestaBasicaValue ?? 0,
                financial_management_profile: modules.financial_management_profile ?? 'ANALYTICAL',
                dashboard_cards: modules.dashboard_cards ?? {}
            })
        }
    }, [modules, form])

    const { mutateAsync: updateConfig, isPending } = useMutation({
        mutationFn: updateSystemConfig,
        onSuccess: (data) => {
            queryClient.setQueryData(['system-config'], data)
            toast.success('Configurações atualizadas com sucesso!', {
                description: 'As alterações já estão valendo para todo o sistema.'
            })
        },
        onError: () => {
            toast.error('Erro ao atualizar configurações.')
        },
    })

    async function onSubmit(data: FormSchema) {
        await updateConfig(data)
    }

    const merchandise = form.watch('merchandise')
    const financial = form.watch('financial')
    const treatments = form.watch('treatments')
    const hr_module = form.watch('hr_module')
    const dashboardCards = form.watch('dashboard_cards') || {}

    const isDependenciesMet = merchandise && financial

    const handleCardToggle = (moduleName: string, cardSlug: string, value: boolean) => {
        const currentCards = { ...dashboardCards }
        if (!currentCards[moduleName]) currentCards[moduleName] = {}
        currentCards[moduleName][cardSlug] = value
        
        form.setValue('dashboard_cards', currentCards, { shouldDirty: true })
    }

    const isCardChecked = (moduleName: string, cardSlug: string) => {
        return dashboardCards[moduleName]?.[cardSlug] ?? true
    }

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-minsk-600 border-t-transparent" />
                    <span className="text-sm text-muted-foreground">Carregando módulos...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-10">
            <div className="flex flex-col gap-2 px-4 md:px-0">
                <h1 className="text-3xl font-bold tracking-tight text-minsk-950 dark:text-minsk-50">
                    Módulos do Sistema
                </h1>
                <p className="text-muted-foreground text-lg">
                    Personalize sua experiência ativando apenas o que você precisa.
                </p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 px-4 md:px-0">

                {/* GRUPO: MÓDULOS CORE */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-vida-loca-500" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            Núcleo Operacional
                        </h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Card: Mercadorias */}
                        <ModuleCard
                            icon={<Package className="h-6 w-6 text-white" />}
                            color="bg-purple-600"
                            title="Mercadorias & Estoque"
                            description="Gerencie produtos, serviços, controle de estoque e fornecedores."
                            isActive={merchandise}
                            control={
                                <Switch
                                    checked={merchandise}
                                    onCheckedChange={(val) => form.setValue('merchandise', val, { shouldDirty: true })}
                                />
                            }
                        >
                            <div className="mt-4 pt-4 border-t space-y-3">
                                <h4 className={cn("text-xs font-bold uppercase text-muted-foreground", !merchandise && "opacity-50")}>Dashboard (Opções)</h4>
                                <div className="flex items-center justify-between opacity-90">
                                    <div className="flex flex-col">
                                        <span className={cn("text-sm font-medium", !merchandise && "text-muted-foreground")}>Inventário e Vendas</span>
                                        <span className="text-[10px] text-muted-foreground">Resumo de estoque e movimentações</span>
                                    </div>
                                    <Switch
                                        disabled={!merchandise}
                                        checked={isCardChecked('merchandise', 'inventory_summary')}
                                        onCheckedChange={(val) => handleCardToggle('merchandise', 'inventory_summary', val)}
                                    />
                                </div>
                            </div>
                        </ModuleCard>

                        {/* Card: Financeiro */}
                        <ModuleCard
                            icon={<DollarSign className="h-6 w-6 text-white" />}
                            color="bg-emerald-600"
                            title="Gestão Financeira"
                            description="Controle de fluxo de caixa, contas a pagar/receber e relatórios."
                            isActive={financial}
                            control={
                                <Switch
                                    checked={financial}
                                    onCheckedChange={(val) => form.setValue('financial', val, { shouldDirty: true })}
                                />
                            }
                        >
                            <div className="mt-4 pt-4 border-t space-y-4">
                                <h4 className={cn("text-xs font-bold uppercase text-muted-foreground", !financial && "opacity-50")}>Dashboard (Opções)</h4>
                                
                                <CardToggleItem 
                                    label="Fluxo de Saúde Financeira"
                                    description="Card principal de faturamento e entradas"
                                    isActive={financial}
                                    checked={isCardChecked('financial', 'financial_summary')}
                                    onChange={(val) => handleCardToggle('financial', 'financial_summary', val)}
                                />

                                <CardToggleItem 
                                    label="Agenda de Pagamentos"
                                    description="Controle de vencimentos e compromissos"
                                    isActive={financial}
                                    checked={isCardChecked('financial', 'payment_agenda')}
                                    onChange={(val) => handleCardToggle('financial', 'payment_agenda', val)}
                                />

                                <CardToggleItem 
                                    label="Previsão de Saldo"
                                    description="Gráfico de projeção bancária"
                                    isActive={financial}
                                    checked={isCardChecked('financial', 'balance_projection')}
                                    onChange={(val) => handleCardToggle('financial', 'balance_projection', val)}
                                />

                                <CardToggleItem 
                                    label="Despesas por Setor"
                                    description="Gráfico de distribuição de gastos"
                                    isActive={financial}
                                    checked={isCardChecked('financial', 'expenses_by_sector')}
                                    onChange={(val) => handleCardToggle('financial', 'expenses_by_sector', val)}
                                />
                            </div>
                        </ModuleCard>

                        {/* Card: Recursos Humanos */}
                        <ModuleCard
                            icon={<Users className="h-6 w-6 text-white" />}
                            color="bg-pink-600"
                            title="Recursos Humanos"
                            description="Gestão de funcionários, registro de ponto e processamento de folha."
                            isActive={hr_module}
                            control={
                                <Switch
                                    checked={hr_module}
                                    onCheckedChange={(val) => form.setValue('hr_module', val, { shouldDirty: true })}
                                />
                            }
                        >
                            <div className="mt-4 pt-4 border-t border-dashed">
                                <p className="text-[10px] text-muted-foreground italic">Em breve: Cards de dashboard para gestão de pessoal.</p>
                            </div>
                        </ModuleCard>
                    </div>
                </section>

                {/* GRUPO: PERFIL FINANCEIRO */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-vida-loca-500" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            Perfil de Gestão Financeira
                        </h2>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className={cn(
                            "cursor-pointer rounded-lg border-2 p-4 transition-all hover:bg-muted/50",
                            form.watch('financial_management_profile') === 'ANALYTICAL'
                                ? "border-minsk-500 bg-minsk-50 dark:bg-minsk-900/20"
                                : "border-muted"
                        )}>
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    type="radio"
                                    value="ANALYTICAL"
                                    className="hidden"
                                    {...form.register('financial_management_profile')}
                                />
                                <div className={cn(
                                    "flex h-4 w-4 items-center justify-center rounded-full border",
                                    form.watch('financial_management_profile') === 'ANALYTICAL'
                                        ? "border-minsk-500 bg-minsk-500"
                                        : "border-muted-foreground"
                                )}>
                                    {form.watch('financial_management_profile') === 'ANALYTICAL' && (
                                        <div className="h-2 w-2 rounded-full bg-white" />
                                    )}
                                </div>
                                <span className="font-semibold text-lg">Analítico (Padrão)</span>
                            </div>
                            <p className="text-sm text-muted-foreground ml-6">
                                Focado em contas individuais e detalhamento (quem deve, quem eu devo, fluxo por setores).
                            </p>
                        </label>

                        <label className={cn(
                            "cursor-pointer rounded-lg border-2 p-4 transition-all hover:bg-muted/50",
                            form.watch('financial_management_profile') === 'OPERATIONAL'
                                ? "border-minsk-500 bg-minsk-50 dark:bg-minsk-900/20"
                                : "border-muted"
                        )}>
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    type="radio"
                                    value="OPERATIONAL"
                                    className="hidden"
                                    {...form.register('financial_management_profile')}
                                />
                                <div className={cn(
                                    "flex h-4 w-4 items-center justify-center rounded-full border",
                                    form.watch('financial_management_profile') === 'OPERATIONAL'
                                        ? "border-minsk-500 bg-minsk-500"
                                        : "border-muted-foreground"
                                )}>
                                    {form.watch('financial_management_profile') === 'OPERATIONAL' && (
                                        <div className="h-2 w-2 rounded-full bg-white" />
                                    )}
                                </div>
                                <span className="font-semibold text-lg">Operacional (Grande Empresa)</span>
                            </div>
                            <p className="text-sm text-muted-foreground ml-6">
                                Focado em fluxo de caixa macro, giro de capital e ponto de equilíbrio.
                            </p>
                        </label>
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-vida-loca-500" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            Parâmetros Globais
                        </h2>
                    </div>

                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-100 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400">
                                <DollarSign className="h-6 w-6" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <h3 className="font-semibold text-lg leading-none tracking-tight">Valor da Cesta Básica</h3>
                                <p className="text-xs text-muted-foreground">Valor utilizado nos cálculos automáticos de folha do módulo RH.</p>
                            </div>
                            <div className="ml-auto w-full md:w-48">
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="0.00"
                                        {...form.register('cestaBasicaValue')}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* GRUPO: SERVIÇOS */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-vida-loca-500" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            Serviços e Atendimento
                        </h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                        {/* Card: Atendimentos */}
                        <ModuleCard
                            icon={<ClipboardList className="h-6 w-6 text-white" />}
                            color="bg-blue-600"
                            title="Ordens de Serviço"
                            description="Controle de chamados, ordens de serviço e acompanhamento técnico."
                            isActive={treatments}
                            control={
                                <Switch
                                    checked={treatments}
                                    onCheckedChange={(val) => form.setValue('treatments', val, { shouldDirty: true })}
                                />
                            }
                        >
                            <div className="mt-4 pt-4 border-t space-y-4">
                                <h4 className={cn("text-xs font-bold uppercase text-muted-foreground", !treatments && "opacity-50")}>Dashboard (Opções)</h4>
                                
                                <CardToggleItem 
                                    label="Gestão de Serviços"
                                    description="Resumo de atendimentos e produtividade"
                                    isActive={treatments}
                                    checked={isCardChecked('treatments', 'treatment_summary')}
                                    onChange={(val) => handleCardToggle('treatments', 'treatment_summary', val)}
                                />

                                <motion.div
                                    initial={false}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className="pt-2"
                                >
                                    {!isDependenciesMet && treatments ? (
                                        <Alert variant="default" className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900 border-none shadow-none p-3">
                                            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                                            <AlertTitle className="text-amber-800 dark:text-amber-500 font-medium text-xs">Modo Simplificado</AlertTitle>
                                            <AlertDescription className="text-amber-700 dark:text-amber-400 text-[10px] mt-0.5 leading-tight">
                                                Como <strong>Estoque</strong> ou <strong>Financeiro</strong> estão desativados, as vendas internas nas OSs ficarão ocultas.
                                            </AlertDescription>
                                        </Alert>
                                    ) : (
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/20 p-2 rounded-lg border border-dashed">
                                            <Info className="h-3.5 w-3.5 text-blue-500" />
                                            <span>Integração automática com Estoque e Financeiro ativa.</span>
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                        </ModuleCard>
                    </div>
                </section>

                {/* Footer Actions */}
                <div className="sticky bottom-0 z-10 -mx-4 md:-mx-0 flex items-center justify-end gap-4 p-4 border-t bg-background/80 backdrop-blur-sm">
                    {form.formState.isDirty && (
                        <span className="text-sm text-muted-foreground animate-pulse font-medium">
                            Alterações não salvas...
                        </span>
                    )}
                    <Button
                        type="submit"
                        disabled={isPending || !form.formState.isDirty}
                        size="lg"
                        className="min-w-[150px] shadow-lg shadow-vida-loca-500/20 bg-gradient-to-r from-vida-loca-600 to-vida-loca-500 hover:to-vida-loca-600 transition-all active:scale-95"
                    >
                        {isPending ? (
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                <span>Salvando...</span>
                            </div>
                        ) : (
                            'Salvar Configurações'
                        )}
                    </Button>
                </div>

            </form>
        </div>
    )
}

// Item reutilizável para o toggle de cards
function CardToggleItem({ label, description, isActive, checked, onChange }: { 
    label: string, 
    description: string, 
    isActive: boolean, 
    checked: boolean, 
    onChange: (val: boolean) => void 
}) {
    return (
        <div className="flex items-center justify-between opacity-90">
            <div className="flex flex-col">
                <span className={cn("text-sm font-medium", !isActive && "text-muted-foreground")}>{label}</span>
                <span className="text-[10px] text-muted-foreground">{description}</span>
            </div>
            <Switch
                disabled={!isActive}
                checked={checked}
                onCheckedChange={onChange}
            />
        </div>
    )
}

// Sub-component for standard module cards
function ModuleCard({ icon, color, title, description, isActive, control, children }: {
    icon: React.ReactNode
    color: string
    title: string
    description: string
    isActive: boolean
    control: React.ReactNode
    children?: React.ReactNode
}) {
    return (
        <div className={cn(
            "relative group overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-md h-fit",
            isActive ? "border-muted-foreground/20" : "border-transparent opacity-80"
        )}>
            <div className="p-6 pb-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl shadow-sm transition-colors", isActive ? color : "bg-muted")}>
                            {isActive ? icon : <div className="grayscale opacity-50">{icon}</div>}
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg leading-none tracking-tight">{title}</h3>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                                    isActive
                                        ? "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/10 dark:text-green-400"
                                        : "bg-gray-50 text-gray-600 ring-gray-500/10 dark:bg-gray-400/10 dark:text-gray-400"
                                )}>
                                    {isActive ? "Ativo" : "Inativo"}
                                </span>
                            </div>
                        </div>
                    </div>
                    {control}
                </div>

                <div className="mt-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {description}
                    </p>
                </div>
            </div>

            {children && (
                <div className="px-6 pb-6 pt-0">
                    {children}
                </div>
            )}

            {/* Decorative background element */}
            <div className={cn("pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl transition-all opacity-0 group-hover:opacity-100", color.replace('bg-', 'bg-') + '/10')} />
        </div>
    )
}
