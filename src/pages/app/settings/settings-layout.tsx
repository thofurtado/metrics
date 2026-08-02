import { Blocks, Cpu, CreditCard, Shield, Tag, Wallet, Store } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { cn } from '@/lib/utils'

export function SettingsLayout() {
  return (
    <div className="flex flex-col gap-4 p-8 pt-6">
      <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="w-full flex-shrink-0 lg:w-64">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
            <NavLink
              to="/settings/modules"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'border-l-4 border-l-primary bg-muted text-primary'
                    : 'border-l-4 border-l-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )
              }
            >
              <Blocks className="h-4 w-4" />
              Módulos do Sistema
            </NavLink>
            <NavLink
              to="/settings/permissions"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'border-l-4 border-l-primary bg-muted text-primary'
                    : 'border-l-4 border-l-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )
              }
            >
              <Shield className="h-4 w-4" />
              Usuários e Permissões
            </NavLink>
            <NavLink
              to="/settings/cardapio"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'border-l-4 border-l-primary bg-muted text-primary'
                    : 'border-l-4 border-l-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )
              }
            >
              <Store className="h-4 w-4" />
              Meu Cardápio (White Label)
            </NavLink>

            <div className="mx-3 my-2 hidden border-t border-border/40 lg:block" />
            <span className="mb-2 hidden px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 lg:block">
              Caixa & Pagamentos
            </span>

            <NavLink
              to="/settings/pos-machines"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'border-l-4 border-l-primary bg-muted text-primary'
                    : 'border-l-4 border-l-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )
              }
            >
              <Cpu className="h-4 w-4" />
              Maquininhas & Taxas
            </NavLink>

            <NavLink
              to="/settings/payment-identifiers"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'border-l-4 border-l-primary bg-muted text-primary'
                    : 'border-l-4 border-l-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )
              }
            >
              <Tag className="h-4 w-4" />
              Identificadores (Caixa/Estoque)
            </NavLink>

            <div className="mx-3 my-2 hidden border-t border-border/40 lg:block" />
            <span className="mb-2 hidden px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 lg:block">
              Financeiro
            </span>
            <NavLink
              to="/settings/accounts"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'border-l-4 border-l-primary bg-muted text-primary'
                    : 'border-l-4 border-l-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )
              }
            >
              <Wallet className="h-4 w-4" />
              Contas Bancárias
            </NavLink>
            <NavLink
              to="/settings/credit-cards"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'border-l-4 border-l-primary bg-muted text-primary'
                    : 'border-l-4 border-l-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )
              }
            >
              <CreditCard className="h-4 w-4" />
              Cartões de Crédito
            </NavLink>
            <NavLink
              to="/settings/payments"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'border-l-4 border-l-primary bg-muted text-primary'
                    : 'border-l-4 border-l-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )
              }
            >
              <CreditCard className="h-4 w-4" />
              Formas de Pagamento
            </NavLink>
          </nav>
        </aside>
        <div className="min-w-0 flex-1 lg:border-l lg:pl-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
