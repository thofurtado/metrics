import { Pyramid, Zap, BarChart4 } from 'lucide-react'
import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    // Base (Mobile): 1 coluna | Desktop (lg): 2 colunas
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2 antialiased">
      
      {/* 1. LADO ESQUERDO (BRANDING) 
          - Este bloco é apenas para DESKTOP (lg:flex)
      */}
      <div className="hidden lg:flex h-full flex-col justify-between 
        // Gradiente: comece escuro, termine mais claro (tendência moderna)
        bg-gradient-to-br from-minsk-700 to-minsk-500 
        border-r border-minsk-800/20 p-10 text-white
      ">
        {/* LOGO SUPERIOR: APENAS NO DESKTOP */}
        <div className="flex items-center gap-3 text-2xl font-bold">
          <Pyramid className="h-7 w-7 text-minsk-200" />
          <span className="text-minsk-100">
            metrics
          </span>
        </div>
        
        {/* ILUSTRAÇÃO CENTRAL */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <BarChart4 className="h-40 w-40 text-minsk-200/50 opacity-70" /> 
          <div className="flex flex-col gap-2 text-center text-minsk-50">
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight">
              Gestão descomplicada
            </h2>
            <p className="text-base font-light">
              Seu centro de comando para métricas financeiras e crescimento.
            </p>
          </div>
        </div>
        
        <footer className="text-xs text-minsk-200/70">
          Painel do parceiro &copy; metrics - {new Date().getFullYear()}
        </footer>
      </div>

      {/* 2. LADO DIREITO (FORMULÁRIO) - Corrigido para incluir o logo no Mobile */}
      <div className="flex flex-col items-center justify-center p-8">
        
        {/* LOGO E NOME PARA MOBILE E DESKTOP (Fica no topo do formulário) */}
        <div className="flex items-center justify-center lg:hidden mb-8">
          <div className="flex items-center gap-2 text-2xl font-bold text-minsk-900 dark:text-minsk-50">
            <Pyramid className="h-6 w-6 text-minsk-600 dark:text-minsk-300" /> 
            <span>
              metrics
            </span>
          </div>
        </div>
        
        <div className="w-full max-w-sm lg:max-w-md p-6 sm:p-8 lg:p-10 rounded-2xl 
                      bg-white dark:bg-gray-900 
                      shadow-2xl shadow-gray-300/50 dark:shadow-gray-950/50">
          <Outlet />
        </div>
      </div>
    </div>
  )
}