import { Outlet, NavLink } from 'react-router-dom'
import { Wallet, CreditCard, Blocks, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SettingsLayout() {
    return (
        <div className="flex flex-col gap-4 p-8 pt-6">
            <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
            <div className="flex flex-col lg:flex-row gap-8">
                <aside className="w-full lg:w-64 flex-shrink-0">
                    <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
                        <NavLink
                            to="/settings/modules"
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-muted text-primary border-l-4 border-l-primary"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-4 border-l-transparent"
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
                                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-muted text-primary border-l-4 border-l-primary"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-4 border-l-transparent"
                                )
                            }
                        >
                            <Shield className="h-4 w-4" />
                            Usuários e Permissões
                        </NavLink>
                        <div className="my-2 border-t border-border/40 mx-3 hidden lg:block" />
                        <span className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 hidden lg:block">
                            Financeiro
                        </span>
                        <NavLink
                            to="/settings/accounts"
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-muted text-primary border-l-4 border-l-primary"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-4 border-l-transparent"
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
                                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-muted text-primary border-l-4 border-l-primary"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-4 border-l-transparent"
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
                                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-muted text-primary border-l-4 border-l-primary"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-4 border-l-transparent"
                                )
                            }
                        >
                            <CreditCard className="h-4 w-4" />
                            Formas de Pagamento
                        </NavLink>
                    </nav>
                </aside>
                <div className="flex-1 min-w-0 lg:border-l lg:pl-8">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}
