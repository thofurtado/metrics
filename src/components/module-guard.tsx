import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { SystemConfig } from '@/api/get-system-config'
import { SYSTEM_CONFIG_TO_SLUG, useModules } from '@/context/module-context'

export function ModuleGuard({
  module,
  children,
}: {
  module: keyof SystemConfig
  children: ReactNode
}) {
  const { isModuleActive, hasAccess, isLoading } = useModules()

  if (isLoading) {
    return null
  }

  const slug =
    SYSTEM_CONFIG_TO_SLUG[module as keyof typeof SYSTEM_CONFIG_TO_SLUG]

  // Validação da Interseção: Ativo na Empresa AND Usuário tem permissão
  const isAllowed = isModuleActive(module) && (slug ? hasAccess(slug) : true)

  if (!isAllowed) {
    return <Navigate to="/cashier" replace />
  }

  return <>{children}</>
}
