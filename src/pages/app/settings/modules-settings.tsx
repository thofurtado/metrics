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
                cestaBasicaValue: modules.cestaBasicaValue ?? 0
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

    // Auto-save on switch toggle (Optional, but demanded "modern SaaS feel" often implies auto-save or quick save)
    // For now, keeping the button to be safe, but making the UI feel responsive.

    async function onSubmit(data: FormSchema) {
        await updateConfig(data)
    }

    const merchandise = form.watch('merchandise')
    const financial = form.watch('financial')
    const treatments = form.watch('treatments')
    const hr_module = form.watch('hr_module')

    const isDependenciesMet = merchandise && financial

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
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-minsk-950 dark:text-minsk-50">
                    Módulos do Sistema
                </h1>
                <p className="text-muted-foreground text-lg">
                    Personalize sua experiência ativando apenas o que você precisa.
                </p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

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
                        />

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
                        />

                        {/* Card: Recursos Humanos */}
                        <ModuleCard
                            icon={<Users className="h-6 w-6 text-white" />}
                            color="bg-pink-600"
                            title="Recursos Humanos"
                            description="Gestão de funcionários, registro de ponto e processamento de folha/rateio."
                            isActive={hr_module}
                            control={
                                <Switch
                                    checked={hr_module}
                                    onCheckedChange={(val) => form.setValue('hr_module', val, { shouldDirty: true })}
                                />
                            }
                        />
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-vida-loca-500" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            Parâmetros Globais
                        </h2>
                    </div>

                    <div className="rounded-lg border bg-card p-6 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-100 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400">
                                <DollarSign className="h-6 w-6" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <h3 className="font-semibold text-lg leading-none tracking-tight">Valor da Cesta Básica</h3>
                                <p className="text-sm text-muted-foreground">Valor utilizado nos cálculos automáticos de folha (Dia 05 e 20) do módulo RH.</p>
                            </div>
                            <div className="ml-auto w-full md:w-48">
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

                    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                        {/* Card: Atendimentos */}
                        <div className={cn(
                            "relative group overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-md",
                            treatments ? "border-minsk-200 dark:border-minsk-800" : "border-transparent opacity-90 grayscale-[0.3]"
                        )}>
                            <div className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl shadow-sm transition-colors", treatments ? "bg-blue-600" : "bg-muted")}>
                                            <ClipboardList className={cn("h-6 w-6", treatments ? "text-white" : "text-muted-foreground")} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg leading-none tracking-tight">Ordens de Serviço</h3>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                                                    treatments
                                                        ? "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/10 dark:text-green-400"
                                                        : "bg-gray-50 text-gray-600 ring-gray-500/10 dark:bg-gray-400/10 dark:text-gray-400"
                                                )}>
                                                    {treatments ? "Ativo" : "Inativo"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={treatments}
                                        onCheckedChange={(val) => form.setValue('treatments', val, { shouldDirty: true })}
                                    />
                                </div>

                                <div className="mt-4">
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Controle completo de chamados, ordens de serviço e acompanhamento técnico.
                                    </p>
                                </div>

                                {/* Dependency Info Area */}
                                <motion.div
                                    initial={false}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className="mt-6"
                                >
                                    {!isDependenciesMet && treatments ? (
                                        <Alert variant="default" className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900">
                                            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                                            <AlertTitle className="text-amber-800 dark:text-amber-500 font-medium">Modo Simplificado</AlertTitle>
                                            <AlertDescription className="text-amber-700 dark:text-amber-400 text-xs mt-1">
                                                Como <strong>Estoque</strong> ou <strong>Financeiro</strong> estão desativados, a gestão de peças e vendas dentro das OSs ficará oculta.
                                            </AlertDescription>
                                        </Alert>
                                    ) : (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-dashed">
                                            <Info className="h-4 w-4 text-blue-500" />
                                            <span>Este módulo se integra automaticamente com Estoque e Financeiro quando disponíveis.</span>
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                            {/* Decorative background element */}
                            {/* Decorative background element */}
                            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-500/5 blur-2xl transition-all group-hover:bg-blue-500/10" />
                        </div>
                    </div>
                </section>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-4 pt-4 border-t">
                    {form.formState.isDirty && (
                        <span className="text-sm text-muted-foreground animate-pulse">
                            Você tem alterações não salvas...
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

// Sub-component for standard module cards
function ModuleCard({ icon, color, title, description, isActive, control }: {
    icon: React.ReactNode
    color: string
    title: string
    description: string
    isActive: boolean
    control: React.ReactNode
}) {
    return (
        <div className={cn(
            "relative group overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-md",
            isActive ? "border-muted-foreground/20" : "border-transparent opacity-80"
        )}>
            <div className="p-6">
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
            {/* Decorative background element */}
            {/* Decorative background element */}
            <div className={cn("pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl transition-all opacity-0 group-hover:opacity-100", color.replace('bg-', 'bg-') + '/10')} />
        </div>
    )
}
