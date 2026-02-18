import { Link } from 'react-router-dom'
import { Blocks, Headset, PiggyBank, Pyramid, Users } from 'lucide-react'

import { NavLink } from './nav-link'
import { ModeToggle } from './theme/theme-toogle'
import { AccountMenu } from './ui/account-menu'
import { MobileAccountMenu } from './ui/mobile-account-menu' // Importe o novo componente
import { Separator } from './ui/separator'
import { useModules } from '@/context/module-context'

export function Header() {
  const { isModuleActive } = useModules()
  return (
    <div className="border-b">
      <div className="flex h-16 items-center gap-6 px-6">
        {/* Logo - sempre visível em todas as telas */}
        <Link to="/" aria-label="Início" className="flex items-center gap-2 text-foreground font-semibold">
          <Pyramid className="h-6 w-6" />
          <span className="hidden lg:inline-block">metrics</span>
        </Link>

        <Separator orientation="vertical" className="h-6" />

        <nav className="flex flex-1 items-center justify-between sm:justify-start sm:space-x-4 lg:space-x-6">

          {isModuleActive('merchandise') && (
            <NavLink to="/items">
              <Blocks className="h-5 w-5" />
              <span className="hidden sm:inline">Mercadoria</span>
            </NavLink>
          )}

          {isModuleActive('treatments') && (
            <NavLink to="/treatments">
              <Headset className="h-5 w-5" />
              <span className="hidden sm:inline">Atendimento</span>
            </NavLink>
          )}

          {isModuleActive('financial') && (
            <NavLink to="/transactions">
              <PiggyBank className="h-5 w-5" />
              <span className="hidden sm:inline">Financeiro</span>
            </NavLink>
          )}

          {isModuleActive('hr_module') && (
            <NavLink to="/hr">
              <Users className="h-5 w-5" />
              <span className="hidden sm:inline">RH</span>
            </NavLink>
          )}
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