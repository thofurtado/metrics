import { Blocks, Headset, Home, PiggyBank, Pyramid } from 'lucide-react'

import { NavLink } from './nav-link'
import { ModeToggle } from './theme/theme-toogle'
import { AccountMenu } from './ui/account-menu'
import { MobileAccountMenu } from './ui/mobile-account-menu' // Importe o novo componente
import { Separator } from './ui/separator'

export function Header() {
  return (
    <div className="border-b">
      <div className="flex h-16 items-center gap-6 px-6">
        {/* Logo - sempre visível em todas as telas */}
        <Pyramid className="h-6 w-6" />
        
        <Separator orientation="vertical" className="h-6" />
        
        <nav className="flex flex-1 items-center justify-between sm:justify-start sm:space-x-4 lg:space-x-6">
          <NavLink to="/">
            <Home className="h-5 w-5" />
            <span className="hidden sm:inline">Início</span>
          </NavLink>
          <NavLink to="/items">
            <Blocks className="h-5 w-5" />
            <span className="hidden sm:inline">Mercadoria</span>
          </NavLink>
          <NavLink to="/treatments">
            <Headset className="h-5 w-5" />
            <span className="hidden sm:inline">Atendimento</span>
          </NavLink>
          <NavLink to="/transactions">
            <PiggyBank className="h-5 w-5" />
            <span className="hidden sm:inline">Financeiro</span>
          </NavLink>
        </nav>
        
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          
          {/* No mobile: MobileAccountMenu com iniciais */}
          <div className="sm:hidden">
            <MobileAccountMenu />
          </div>
          
          {/* No desktop: AccountMenu normal */}
          <div className="hidden sm:block">
            <AccountMenu />
          </div>
        </div>
      </div>
    </div>
  )
}