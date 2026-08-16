import { useQuery } from '@tanstack/react-query'
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Menu,
  PiggyBank,
  Pyramid,
  Settings,
  Users,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { getProfile } from '@/api/get-profile'
import { useModules } from '@/context/module-context'
import { useSidebar } from '@/context/sidebar-context'
import { cn } from '@/lib/utils'

import { MetricsIcon } from './MetricsIcon'
import { ModeToggle } from './theme/theme-toogle'
import { AccountMenu } from './ui/account-menu'
import { Button } from './ui/button'
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip'

export function Sidebar() {
  const { hasAccess, isModuleActive } = useModules()
  const { pathname } = useLocation()
  const [sheetOpen, setSheetOpen] = useState(false)
  const { isCollapsed, toggleSidebar } = useSidebar()
  const navigate = useNavigate()
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    staleTime: Infinity,
  })

  const menuItems = [
    {
      name: 'Mercadoria',
      path: '/items',
      icon: Boxes,
      access: hasAccess('items'),
    },
    {
      name: 'Atendimento',
      path: '/treatments',
      icon: ClipboardList,
      access: hasAccess('service'),
    },
    {
      name: 'Financeiro',
      path: '/transactions',
      icon: PiggyBank,
      access: hasAccess('finance'),
    },
    {
      name: 'ConferÃªncia Caixa',
      path: '/cashier',
      icon: Wallet,
      access: hasAccess('cashier'),
    },
    {
      name: 'Clientes & Equipamentos',
      path: '/clients-equipments',
      icon: Users,
      access: hasAccess('service') || hasAccess('finance'),
    },
    {
      name: 'Recursos Humanos',
      path: '/hr',
      icon: Users,
      access: hasAccess('hr'),
    },
  ].filter((item) => {
    if (profile?.role === 'CASHIER') {
      return item.path === '/cashier'
    }
    return item.access
  })

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => {
    const collapsed = !mobile && isCollapsed

    return (
      <div
        className={cn(
          'flex h-full flex-col border-r border-border/40 transition-all duration-500 ease-in-out',
          mobile
            ? 'bg-slate-50 shadow-2xl dark:bg-slate-950'
            : 'bg-card/60 backdrop-blur-2xl dark:bg-slate-950/80',
          collapsed ? 'w-[82px]' : 'w-full',
        )}
      >
        <div
          className={cn(
            'flex h-full flex-col p-6',
            collapsed ? 'items-center px-3' : 'px-6',
          )}
        >
          {/* HEADER / LOGO */}
          <div className="group/header relative mb-8 flex w-full items-center justify-between">
            <Link
              to="/"
              className="group flex items-center gap-3 px-1"
              onClick={() => setSheetOpen(false)}
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110">
                <MetricsIcon className="h-8 w-8" />
              </div>
              {!collapsed && (
                <span className="truncate font-manrope text-2xl font-black uppercase tracking-tighter text-foreground duration-500 animate-in fade-in slide-in-from-left-4">
                  METRICS
                </span>
              )}
            </Link>

            {!mobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className={cn(
                  'h-8 w-8 rounded-xl bg-secondary/50 opacity-100 transition-all duration-300 hover:bg-primary hover:text-primary-foreground',
                  collapsed
                    ? 'absolute -right-10 top-1.5 translate-x-2 scale-90 border border-border/50 bg-card shadow-xl hover:translate-x-3'
                    : '',
                )}
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {/* MENU */}
          <TooltipProvider delayDuration={0}>
            <nav className="customize-scrollbar flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {menuItems.map((item) => {
                const isActive =
                  pathname === item.path ||
                  (item.path !== '/' && pathname.startsWith(item.path))

                return (
                  <Tooltip key={item.path} disableHoverableContent={!collapsed}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.path}
                        onClick={() => setSheetOpen(false)}
                        className={cn(
                          'group relative flex items-center gap-3.5 rounded-2xl transition-all duration-300',
                          collapsed ? 'justify-center p-3' : 'px-4 py-4',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                            : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground',
                        )}
                      >
                        <item.icon
                          className={cn(
                            'transition-transform duration-300 group-hover:scale-110',
                            collapsed ? 'h-6 w-6' : 'h-5 w-5',
                            isActive
                              ? 'stroke-[2.5px] text-primary-foreground'
                              : 'stroke-[1.5px] text-muted-foreground group-hover:text-foreground',
                          )}
                        />

                        {!collapsed && (
                          <div className="flex flex-col truncate">
                            <span
                              className={cn(
                                'font-manrope text-base tracking-tight animate-in fade-in slide-in-from-left-2',
                                isActive ? 'font-extrabold' : 'font-bold',
                              )}
                            >
                              {item.name}
                            </span>
                            {'subtext' in item && item.subtext && (
                              <span
                                className={cn(
                                  'truncate font-manrope text-[10px] font-medium uppercase tracking-wider opacity-70',
                                  isActive
                                    ? 'text-primary-foreground/90'
                                    : 'text-muted-foreground',
                                )}
                              >
                                {item.subtext}
                              </span>
                            )}
                          </div>
                        )}

                        {isActive && !collapsed && (
                          <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-primary-foreground/60 shadow-sm" />
                        )}
                      </Link>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent
                        side="right"
                        sideOffset={12}
                        className="font-manrope font-bold"
                      >
                        {item.name}
                      </TooltipContent>
                    )}
                  </Tooltip>
                )
              })}
            </nav>
          </TooltipProvider>

          {/* FOOTER */}
          <div
            className={cn(
              'mt-auto space-y-4 border-t border-border/50 pt-6 transition-all duration-500',
              collapsed ? 'flex w-full flex-col items-center' : '',
            )}
          >
            <div
              className={cn(
                'flex items-center justify-between overflow-hidden rounded-2xl border border-border/10 bg-secondary/30 transition-all duration-500',
                collapsed ? 'w-full flex-col gap-4 p-2' : 'p-2 px-3',
              )}
            >
              <div className={cn(collapsed ? 'scale-90' : '')}>
                <AccountMenu isCollapsed={collapsed} />
              </div>
              <ModeToggle />
            </div>

            {profile?.role === 'ADMIN' && (
              <Link
                to="/settings/accounts"
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary',
                  collapsed
                    ? 'justify-center p-3'
                    : 'px-4 py-3 font-manrope text-sm font-bold',
                )}
              >
                <Settings className="h-4 w-4" />
                {!collapsed && <span>ConfiguraÃ§Ãµes</span>}
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b bg-background/90 px-6 backdrop-blur-lg lg:hidden">
        <Link to="/" className="flex items-center gap-2 pr-4">
          <MetricsIcon className="h-6 w-6" />
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text font-manrope text-xl font-black uppercase tracking-tight text-transparent">
            METRICS
          </span>
        </Link>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-2xl border border-border/40 bg-secondary/20 hover:bg-secondary/40"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[280px] border-none bg-white p-0 shadow-none dark:bg-slate-950"
          >
            <NavContent mobile />
          </SheetContent>
        </Sheet>
      </div>

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 hidden h-screen overflow-visible transition-all duration-500 lg:flex',
          isCollapsed ? 'w-[82px]' : 'w-[260px]',
        )}
      >
        <NavContent />
      </aside>
    </>
  )
}
