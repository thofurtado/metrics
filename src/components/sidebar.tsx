import { Link, useLocation } from 'react-router-dom'
import { 
  Blocks, 
  Headset, 
  PiggyBank, 
  Settings, 
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useModules } from '@/context/module-context'

interface SidebarItemProps {
  to: string
  icon: any
  label: string
  active?: boolean
}

function SidebarItem({ to, icon: Icon, label, active }: SidebarItemProps) {
  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center justify-center gap-1 p-3 rounded-lg transition-all duration-300 group",
        active 
          ? "bg-white shadow-sm text-primary ring-1 ring-black/5" 
          : "text-muted-foreground hover:text-primary hover:bg-white/50"
      )}
    >
      <Icon className={cn("h-6 w-6 stroke-[1.5px]", active && "text-primary")} />
      <span className={cn("text-[10px] font-black uppercase tracking-widest leading-none", active ? "opacity-100" : "opacity-40")}>
        {label}
      </span>
    </Link>
  )
}

export function Sidebar() {
  const { pathname } = useLocation()
  const { hasAccess } = useModules()

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-24 border-r bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md z-40 hidden md:flex flex-col items-center py-6 gap-4 font-manrope">
      {hasAccess('items') && (
        <SidebarItem 
          to="/items" 
          icon={Blocks} 
          label="Estoque" 
          active={pathname === '/items'} 
        />
      )}

      {hasAccess('service') && (
        <SidebarItem 
          to="/treatments" 
          icon={Headset} 
          label="Serviço" 
          active={pathname === '/treatments'} 
        />
      )}

      {hasAccess('finance') && (
        <SidebarItem 
          to="/transactions" 
          icon={PiggyBank} 
          label="Caixa" 
          active={pathname === '/transactions'} 
        />
      )}

      {hasAccess('hr') && (
        <SidebarItem 
          to="/hr" 
          icon={Users} 
          label="Equipe" 
          active={pathname.startsWith('/hr')} 
        />
      )}

      <div className="mt-auto">
        <SidebarItem 
          to="/settings" 
          icon={Settings} 
          label="Ajustes" 
          active={pathname.startsWith('/settings')} 
        />
      </div>
    </aside>
  )
}
