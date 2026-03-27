
import { useQuery } from '@tanstack/react-query'
import { createContext, ReactNode, useContext, useMemo } from 'react'

import { getSystemConfig, SystemConfig } from '@/api/get-system-config'
import { getProfile } from '@/api/get-profile'

// Mapeamento canônico: chave do system_config → slug da tabela modules
export const SYSTEM_CONFIG_TO_SLUG: Record<keyof Omit<SystemConfig, 'cestaBasicaValue' | 'financial_management_profile' | 'dashboard_cards'>, string> = {
    merchandise:  'items',
    financial:    'finance',
    treatments:   'service',
    hr_module:    'hr',
}

type ActiveSystemSlug = string

interface ModuleContextType {
    systemConfig: SystemConfig
    instanceSlugs: ActiveSystemSlug[]
    // Slugs do usuário — agora buscados da API (fonte de verdade = banco)
    userSlugs: string[]
    // INTERSEÇÃO: instância ativa E usuário tem permissão
    hasAccess: (slug: string) => boolean
    // Para o Header (filtro de nível 1 apenas)
    isModuleActive: (moduleName: keyof SystemConfig) => boolean
    // Para Cards da Dashboard (Cascata: Módulo Pai Ativo -> Card Filho Ativo)
    isCardVisible: (moduleName: keyof SystemConfig, cardSlug: string) => boolean
    // Para o modal de permissões
    availableForPermissions: ActiveSystemSlug[]
    isLoading: boolean
    modules: SystemConfig // Alias para compatibilidade
}

const ModuleContext = createContext({} as ModuleContextType)

export function ModuleProvider({ children }: { children: ReactNode }) {
    const isLoggedIn = !!localStorage.getItem('token')

    // Nível 1: configuração da instância
    const { data: systemConfig, isLoading: isLoadingConfig } = useQuery({
        queryKey: ['system-config'],
        queryFn: getSystemConfig,
        staleTime: 1000 * 60 * 5,
        retry: false,
        enabled: isLoggedIn,
    })

    // Nível 2: módulos do usuário logado — SEMPRE do banco via /me
    // staleTime: 0 garante que ao re-focar a aba ou navegar, repesca imediatamente
    const { data: profileData, isLoading: isLoadingProfile } = useQuery({
        queryKey: ['user-profile-modules'],
        queryFn: getProfile,
        staleTime: 0,
        retry: false,
        enabled: isLoggedIn,
    })

    const isLoading = isLoadingConfig || isLoadingProfile

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
            .filter(([key]) => !!safeConfig[key])
            .map(([, slug]) => slug)
    }, [safeConfig])

    // Slugs do usuário (nível 2) — vindos do banco via /me, sempre frescos
    const userSlugs: string[] = profileData?.modules ?? []

    // INTERSEÇÃO: ambas as camadas devem liberar
    function hasAccess(slug: string): boolean {
        if (isLoading) return false
        return instanceSlugs.includes(slug) && userSlugs.includes(slug)
    }

    function isModuleActive(moduleName: keyof SystemConfig): boolean {
        if (isLoadingConfig) return true
        return !!(safeConfig[moduleName])
    }

    function isCardVisible(moduleName: keyof SystemConfig, cardSlug: string): boolean {
        // Regra de Cascata: Se o módulo pai está desativado, o filho nunca aparece
        if (!isModuleActive(moduleName)) return false

        // Se estiver ativo, verifica o status granular no JSON
        const cardsConfig = safeConfig.dashboard_cards?.[moduleName as string]
        
        // Se não houver config específica no JSON, assume "true" por padrão (legado)
        if (!cardsConfig || cardsConfig[cardSlug] === undefined) return true

        return cardsConfig[cardSlug] === true
    }

    const availableForPermissions = instanceSlugs

    return (
        <ModuleContext.Provider value={{
            systemConfig: safeConfig,
            instanceSlugs,
            userSlugs,
            hasAccess,
            isModuleActive,
            isCardVisible,
            availableForPermissions,
            isLoading,
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
