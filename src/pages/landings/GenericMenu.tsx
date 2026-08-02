import { ArrowRight, Loader2, Store } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

interface GenericMenuProps {
  tenantName: string
  profile?: any
}

export default function GenericMenu({ tenantName, profile }: GenericMenuProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background-color)] p-4">
      <div className="w-full max-w-md space-y-6 overflow-hidden rounded-2xl border border-slate-100 bg-[var(--secondary-color)] p-8 text-center shadow-xl">
        <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--background-color)' }}>
          {profile?.logo_url ? (
            <img src={profile.logo_url} alt="Logo da Empresa" className="h-full w-full object-cover" />
          ) : (
            <Store className="h-10 w-10" style={{ color: 'var(--primary-color)' }} />
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">
            Bem-vindo ao(à){' '}
            <span style={{ color: 'var(--primary-color)' }}>{tenantName}</span>!
          </h1>
          <p className="text-slate-500">
            Nosso cardápio digital interativo está em construção. Em breve você
            poderá fazer seus pedidos por aqui!
          </p>
        </div>

        <div className="flex justify-center pt-4">
          <div 
            className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
            style={{ 
              backgroundColor: 'var(--background-color)', 
              color: 'var(--primary-color)',
              border: '1px solid var(--primary-color)'
            }}
          >
            <Loader2 className="h-4 w-4 animate-spin" /> Em desenvolvimento
          </div>
        </div>

        <div className="border-t border-slate-100 pt-8">
          <p className="mb-3 text-xs text-slate-400">Faz parte da equipe?</p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/sign-in">
              Acessar o Sistema <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
