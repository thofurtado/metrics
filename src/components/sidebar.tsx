import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Boxes,
  Headset,
  PiggyBank,
  Users,
  Pyramid,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useModules } from '@/context/module-context'
import { useSidebar } from '@/context/sidebar-context'
import { ModeToggle } from './theme/theme-toogle'
import { AccountMenu } from './ui/account-menu'
import { Button } from './ui/button'
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import { useState } from 'react'

export function Sidebar() {
  const { hasAccess, isModuleActive } = useModules()
  const { pathname } = useLocation()
  const [sheetOpen, setSheetOpen] = useState(false)
  const { isCollapsed, toggleSidebar } = useSidebar()

  const menuItems = [
    { name: 'Metrics', path: '/dashboard', icon: LayoutDashboard, access: true },
    { name: 'Mercadoria', path: '/items', icon: Boxes, access: hasAccess('items') || isModuleActive('merchandise') },
    { name: 'Ordens de Serviço', path: '/treatments', icon: Headset, access: hasAccess('service') || isModuleActive('treatments') },
    { name: 'Financeiro', path: '/transactions', icon: PiggyBank, access: hasAccess('finance') || isModuleActive('financial') },
    { name: 'RH', path: '/hr', icon: Users, access: hasAccess('hr') || isModuleActive('hr_module') },
  ].filter((item) => item.access)

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => {
    const collapsed = !mobile && isCollapsed

    return (
      <div className={cn(
        "flex flex-col h-full bg-card/60 dark:bg-slate-950/80 backdrop-blur-2xl transition-all duration-500 ease-in-out border-r border-border/40",
        collapsed ? "w-[82px]" : "w-full"
      )}>
        <div className={cn("p-6 flex flex-col h-full", collapsed ? "items-center px-3" : "px-6")}>
          {/* HEADER / LOGO */}
          <div className="flex items-center justify-between mb-8 w-full group/header relative">
            <Link to="/" className="flex items-center gap-3 px-1 group" onClick={() => setSheetOpen(false)}>
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 group-hover:scale-110 transition-all duration-500">
                <Pyramid className="h-6 w-6" />
              </div>
              {!collapsed && (
                <span className="text-2xl font-manrope font-black tracking-tighter text-foreground uppercase truncate animate-in fade-in slide-in-from-left-4 duration-500">
                  metrics
                </span>
              )}
            </Link>

            {!mobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className={cn(
                  "h-8 w-8 rounded-xl bg-secondary/50 hover:bg-primary hover:text-primary-foreground transition-all duration-300 opacity-0 group-hover/header:opacity-100",
                  collapsed ? "absolute -right-10 top-1.5 opacity-100 scale-90 translate-x-2 shadow-xl border border-border/50 bg-card hover:translate-x-3" : ""
                )}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {/* MENU */}
          <TooltipProvider delayDuration={0}>
            <nav className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1 customize-scrollbar">
              {menuItems.map((item) => {
                const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
                
                return (
                  <Tooltip key={item.path} disableHoverableContent={!collapsed}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.path}
                        onClick={() => setSheetOpen(false)}
                        className={cn(
                          "group flex items-center gap-3.5 rounded-2xl transition-all duration-300 relative",
                          collapsed ? "p-3 justify-center" : "px-4 py-4",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                            : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                        )}
                      >
                        <item.icon className={cn(
                          "transition-transform duration-300 group-hover:scale-110",
                          collapsed ? "h-6 w-6" : "h-5 w-5",
                          isActive ? "text-primary-foreground stroke-[2.5px]" : "text-muted-foreground stroke-[1.5px] group-hover:text-foreground"
                        )} />
                        
                        {!collapsed && (
                          <span className={cn(
                            "font-manrope text-[15px] tracking-tight truncate animate-in fade-in slide-in-from-left-2",
                            isActive ? "font-bold" : "font-medium"
                          )}>
                            {item.name}
                          </span>
                        )}

                        {isActive && !collapsed && (
                          <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary-foreground/60 shadow-sm" />
                        )}
                      </Link>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right" sideOffset={12} className="font-manrope font-bold">
                        {item.name}
                      </TooltipContent>
                    )}
                  </Tooltip>
                )
              })}
            </nav>
          </TooltipProvider>

          {/* FOOTER */}
          <div className={cn(
            "mt-auto space-y-4 pt-6 border-t border-border/50 transition-all duration-500",
            collapsed ? "w-full flex flex-col items-center" : ""
          )}>
            <div className={cn(
                "flex items-center justify-between bg-secondary/30 rounded-2xl border border-border/10 overflow-hidden transition-all duration-500",
                collapsed ? "flex-col gap-4 p-2 w-full" : "p-2 px-3"
            )}>
              <div className={cn(collapsed ? "scale-90" : "")}>
                 <AccountMenu />
              </div>
              <ModeToggle />
            </div>

            <button className={cn(
                "flex items-center gap-3 transition-all duration-200 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl w-full",
                collapsed ? "justify-center p-3" : "px-4 py-3 text-sm font-manrope font-bold"
            )}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Encerrar Sessão</span>}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b bg-background/90 backdrop-blur-lg flex items-center justify-between px-6 z-40">
        <Link to="/" className="flex items-center gap-2 pr-4">
          <Pyramid className="h-6 w-6 text-primary" />
          <span className="text-xl font-manrope font-black tracking-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">metrics</span>
        </Link>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-2xl border border-border/40 bg-secondary/20 hover:bg-secondary/40">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 border-none w-[280px] bg-transparent backdrop-blur-none shadow-none">
            <NavContent mobile />
          </SheetContent>
        </Sheet>
      </div>

      <aside className={cn(
        "hidden lg:flex h-screen fixed left-0 top-0 overflow-visible z-50 transition-all duration-500",
        isCollapsed ? "w-[82px]" : "w-[260px]"
      )}>
        <NavContent />
      </aside>
    </>
  )
}
