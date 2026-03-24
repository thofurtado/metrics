import { Outlet, NavLink } from 'react-router-dom'
import { Wallet, CreditCard, Blocks } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SettingsLayout() {
    return (
        <div className="flex flex-col gap-4 p-8 pt-6">
            <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
            <div className="grid grid-cols-5 gap-6">
                <aside className="-mx-4 lg:w-1/5">
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
                            {/* Uses Lucide generic User icon, assumes it's imported or will use standard styling. But since I can't guess if User is imported, I'll use Blocks for now or import it, wait, let's just use what's there or import Users */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            Permissões de Acesso
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
                <div className="col-span-3 lg:col-span-4 lg:border-l pl-6">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}
