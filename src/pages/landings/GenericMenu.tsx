import { Link } from 'react-router-dom'
import { Store, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GenericMenuProps {
  tenantName: string
}

export default function GenericMenu({ tenantName }: GenericMenuProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 text-center p-8 space-y-6">
        
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
          <Store className="w-10 h-10 text-indigo-600" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">
            Bem-vindo ao(à) <span className="text-indigo-600">{tenantName}</span>!
          </h1>
          <p className="text-slate-500">
            Nosso cardápio digital interativo está em construção. Em breve você poderá fazer seus pedidos por aqui!
          </p>
        </div>

        <div className="flex justify-center pt-4">
          <div className="inline-flex items-center justify-center gap-2 text-sm text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full font-medium">
            <Loader2 className="w-4 h-4 animate-spin" /> Em desenvolvimento
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100">
          <p className="text-xs text-slate-400 mb-3">Faz parte da equipe?</p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/sign-in">
              Acessar o Sistema <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

      </div>
    </div>
  )
}
