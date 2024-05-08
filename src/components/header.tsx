import { Blocks, Headset, Home, PiggyBank, Pyramid } from 'lucide-react'

import { NavLink } from './nav-link'
import { ModeToggle } from './theme/theme-toogle'
import { AccountMenu } from './ui/account-menu'
import { Separator } from './ui/separator'

export function Header() {
  return (
    <div className="border-b">
      <div className="flex h-16 items-center gap-6 px-6">
        <Pyramid className="h6 w6" />
        <Separator orientation="vertical" className="h6" />
        <nav className="flex items-center space-x-4  lg:space-x-6">
          <NavLink to="/">
            <Home className="h-5 w-5" />
            Início
          </NavLink>
          <NavLink to="/items">
            <Blocks className="h-5 w-5" />
            Mercadoria
          </NavLink>
          <NavLink to="/treatments">
            <Headset className="h-5 w-5" />
            Atendimento
          </NavLink>
          <NavLink to="/transactions">
            <PiggyBank className="h-5 w-5" />
            Financeiro{' '}
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          <AccountMenu />
        </div>
      </div>
    </div>
  )
}
