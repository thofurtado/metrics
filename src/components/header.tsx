import { Link, useLocation } from 'react-router-dom'
import { 
  Pyramid, 
  LayoutDashboard, 
  Archive, 
  FileText 
} from 'lucide-react'

import { ModeToggle } from './theme/theme-toogle'
import { AccountMenu } from './ui/account-menu'
import { MobileAccountMenu } from './ui/mobile-account-menu'
import { Separator } from './ui/separator'
import { useModules } from '@/context/module-context'
import { cn } from '@/lib/utils'

function TopNavLink({ to, label, icon: Icon, active }: { to: string, label: string, icon: any, active: boolean }) {
  return (
    <Link 
      to={to} 
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200",
        active 
          ? "bg-primary text-primary-foreground shadow-md scale-[1.02]" 
          : "text-muted-foreground hover:text-primary hover:bg-primary/5"
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  )
}

export function Header() {
  const { hasAccess } = useModules()
  const { pathname } = useLocation()

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b z-50 px-6 flex items-center justify-between font-manrope">
      <div className="flex items-center gap-8">
        {/* Logo - Financial Architect */}
        <Link to="/dashboard" aria-label="Início" className="flex items-center gap-2 text-primary font-black uppercase tracking-tighter text-xl group">
          <div className="p-1.5 bg-primary rounded-lg text-white group-hover:rotate-12 transition-transform duration-300">
            <Pyramid className="h-5 w-5" />
          </div>
          <span>Financial <span className="text-slate-400 font-medium lowercase">Architect</span></span>
        </Link>

        <Separator orientation="vertical" className="h-6 hidden lg:block" />

        {/* Global Navigation - Dashboard, Inventory, Reports */}
        <nav className="hidden md:flex items-center gap-1">
          <TopNavLink 
            to="/dashboard" 
            label="Dashboard" 
            icon={LayoutDashboard} 
            active={pathname === '/dashboard'} 
          />
          {hasAccess('items') && (
            <TopNavLink 
              to="/items" 
              label="Inventory" 
              icon={Archive} 
              active={pathname === '/items'} 
            />
          )}
          <TopNavLink 
            to="/dashboard" 
            label="Reports" 
            icon={FileText} 
            active={pathname === '/reports'} 
          />
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <ModeToggle />
        
        <div className="sm:hidden">
          <MobileAccountMenu />
        </div>

        <div className="hidden sm:block">
          <AccountMenu />
        </div>
      </div>
    </header>
  )
}