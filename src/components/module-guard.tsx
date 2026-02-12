
import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useModules } from '@/context/module-context'
import { SystemConfig } from '@/api/get-system-config'

export function ModuleGuard({ module, children }: { module: keyof SystemConfig, children: ReactNode }) {
    const { isModuleActive, isLoading } = useModules()

    if (isLoading) {
        return null // or a spinner
    }

    if (!isModuleActive(module)) {
        return <Navigate to="/dashboard" replace />
    }

    return <>{children}</>
}
