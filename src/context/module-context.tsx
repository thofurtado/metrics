
import { useQuery } from '@tanstack/react-query'
import { createContext, ReactNode, useContext, useMemo } from 'react'
import { jwtDecode } from 'jwt-decode'

import { getSystemConfig, SystemConfig } from '@/api/get-system-config'

// Mapeamento canônico: chave do system_config → slug da tabela modules
export const SYSTEM_CONFIG_TO_SLUG: Record<keyof Omit<SystemConfig, 'cestaBasicaValue' | 'financial_management_profile'>, string> = {
    merchandise:  'items',
    financial:    'finance',
    treatments:   'service',
    hr_module:    'hr',
}

// Slugs habilitados no nível de instância (system_config = true)
type ActiveSystemSlug = string

interface ModuleContextType {
    // Nível 1: o que a instância ativou (system_config)
    systemConfig: SystemConfig
    // Slugs que a instância deixou ativos
    instanceSlugs: ActiveSystemSlug[]
    // Slugs que o usuário logado tem permissão (do JWT)
    userSlugs: string[]
    // INTERSEÇÃO: módulo acessível = instância ativa E usuário tem permissão
    hasAccess: (slug: string) => boolean
    // Para o Header (filtro de nível 1 apenas — igual ao comportamento atual)
    isModuleActive: (moduleName: keyof SystemConfig) => boolean
    // Para o modal de permissões: apenas slugs que a instância permite
    availableForPermissions: ActiveSystemSlug[]
    isLoading: boolean
}

const ModuleContext = createContext({} as ModuleContextType)

function getUserSlugsFromToken(): string[] {
    try {
        const token = localStorage.getItem('token')
        if (!token) return []
        const decoded = jwtDecode<{ modules?: string[] }>(token)
        return decoded.modules ?? []
    } catch {
        return []
    }
}

export function ModuleProvider({ children }: { children: ReactNode }) {
    const { data: systemConfig, isLoading } = useQuery({
        queryKey: ['system-config'],
        queryFn: getSystemConfig,
        staleTime: 1000 * 60 * 5,
        retry: false,
        enabled: !!localStorage.getItem('token')
    })

    const safeConfig: SystemConfig = systemConfig || {
        merchandise: true,
        financial: true,
        treatments: true,
        hr_module: false,
        cestaBasicaValue: 0,
        financial_management_profile: 'ANALYTICAL',
    }

    // Slugs que a INSTÂNCIA permite (nível 1)
    const instanceSlugs = useMemo<string[]>(() => {
        return (Object.entries(SYSTEM_CONFIG_TO_SLUG) as [keyof typeof SYSTEM_CONFIG_TO_SLUG, string][])
            .filter(([key]) => safeConfig[key] === true)
            .map(([, slug]) => slug)
    }, [safeConfig])

    // Slugs do usuário logado (do JWT, nível 2)
    const userSlugs = useMemo(() => getUserSlugsFromToken(), [])

    // INTERSEÇÃO: ambas as camadas devem liberar o slug
    function hasAccess(slug: string): boolean {
        if (isLoading) return false
        return instanceSlugs.includes(slug) && userSlugs.includes(slug)
    }

    // Compatibilidade com o Header atual (filtra apenas por system_config)
    function isModuleActive(moduleName: keyof SystemConfig): boolean {
        if (isLoading) return true
        return !!(safeConfig[moduleName])
    }

    // Para o modal de permissões: apenas o que a instância permite
    const availableForPermissions = instanceSlugs

    return (
        <ModuleContext.Provider value={{
            systemConfig: safeConfig,
            instanceSlugs,
            userSlugs,
            hasAccess,
            isModuleActive,
            availableForPermissions,
            isLoading,
            // backward-compat alias
            modules: safeConfig,
        } as any}>
            {children}
        </ModuleContext.Provider>
    )
}

export function useModules() {
    const context = useContext(ModuleContext)
    if (!context) {
        throw new Error('useModules must be used within a ModuleProvider')
    }
    return context
}
