import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useModules, SYSTEM_CONFIG_TO_SLUG } from '@/context/module-context'
import { SystemConfig } from '@/api/get-system-config'

export function ModuleGuard({ module, children }: { module: keyof SystemConfig, children: ReactNode }) {
    const { isModuleActive, hasAccess, isLoading } = useModules()

    if (isLoading) {
        return null 
    }

    const slug = SYSTEM_CONFIG_TO_SLUG[module as keyof typeof SYSTEM_CONFIG_TO_SLUG]

    // Validação da Interseção: Ativo na Empresa AND Usuário tem permissão
    const isAllowed = isModuleActive(module) && (slug ? hasAccess(slug) : true)

    if (!isAllowed) {
        return <Navigate to="/dashboard" replace />
    }

    return <>{children}</>
}
