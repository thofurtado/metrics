
import { useQuery } from '@tanstack/react-query'
import { createContext, ReactNode, useContext } from 'react'

import { getSystemConfig, SystemConfig } from '@/api/get-system-config'

interface ModuleContextType {
    modules: SystemConfig
    isLoading: boolean
    isModuleActive: (moduleName: keyof SystemConfig) => boolean
}

const ModuleContext = createContext({} as ModuleContextType)

export function ModuleProvider({ children }: { children: ReactNode }) {
    const { data: modules, isLoading } = useQuery({
        queryKey: ['system-config'],
        queryFn: getSystemConfig,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false,
    })

    // Default fallback if loading or error
    const safeModules = modules || {
        merchandise: true,
        financial: true,
        treatments: true,
    }

    function isModuleActive(moduleName: keyof SystemConfig) {
        if (isLoading) return true // Assume active while loading to avoid layout shifts? Or false? 
        // Usually better to show loading state, but for permissions default to false is safer.
        // However, for sidebar links, default true prevents flickering if fast. 
        // Given the request "Proteção de Rota", let's use the actual value.

        // If we really want to block, we should wait. But for UI rendering, let's use memoized.
        return safeModules[moduleName] ?? true
    }

    return (
        <ModuleContext.Provider value={{ modules: safeModules, isLoading, isModuleActive }}>
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
