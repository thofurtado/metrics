import { useQuery } from '@tanstack/react-query'
import { Ban, Package, Receipt, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Navigate, useSearchParams } from 'react-router-dom'

import { getProfile } from '@/api/get-profile'
import { getFiltrosDasVendas } from '@/api/vendas'
import { cn } from '@/lib/utils'
import { periodoDoAtalho } from '@/utils/vendas/formatos'

import { CashierDashboard } from '../dashboard'
import { AbaCancelamentos } from './aba-cancelamentos'
import { AbaProdutos } from './aba-produtos'
import { AbaVendas } from './aba-vendas'
import { AbaVendedores } from './aba-vendedores'
import { DetalheDaVenda } from './detalhe-da-venda'
import type { PeriodoEscolhido } from './filtros'

/**
 * Módulo "Vendas" (decisões D1 e D2 do Thomás, 16/10/2026): o que era a "Conferência caixa" vira "Vendas", com cinco abas
 * nesta ordem: Vendas, Conferência de caixa, Produtos vendidos, Cancelamentos e Vendedores. A Conferência continua a tela de
 * sempre (com Salão ao vivo e Motoboys dentro dela). A aba e a venda aberta ficam no endereço (?aba=…&venda=…), para o
 * "Voltar" do navegador funcionar e um link abrir direto.
 */

export type AbaDoModulo =
  | 'vendas'
  | 'conferencia'
  | 'produtos'
  | 'cancelamentos'
  | 'vendedores'

const ABAS: { id: AbaDoModulo; nome: string; icone: typeof Receipt }[] = [
  { id: 'vendas', nome: 'Vendas', icone: Receipt },
  { id: 'conferencia', nome: 'Conferência de caixa', icone: Wallet },
  { id: 'produtos', nome: 'Produtos vendidos', icone: Package },
  { id: 'cancelamentos', nome: 'Cancelamentos', icone: Ban },
  { id: 'vendedores', nome: 'Vendedores', icone: Users },
]

/** Filtros que valem para as abas de relatório (o período e o caixa seguem de uma aba para a outra). */
export interface FiltrosComuns {
  periodo: PeriodoEscolhido
  caixa: string
  origem: string
  vendedor: string
}

export function VendasPage() {
  const [params, setParams] = useSearchParams()
  const token = localStorage.getItem('token')
  const { data: profile, isLoading: carregandoPerfil } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    retry: false,
    enabled: !!token,
  })

  const [comuns, setComuns] = useState<FiltrosComuns>(() => ({
    periodo: periodoDoAtalho('hoje'),
    caixa: '',
    origem: '',
    vendedor: '',
  }))

  const { data: disponiveis } = useQuery({
    queryKey: ['vendas', 'filtros', comuns.periodo.de, comuns.periodo.ate],
    queryFn: () => getFiltrosDasVendas(comuns.periodo),
    enabled: !!profile,
    staleTime: 60_000,
  })

  if ((!token || !profile) && !carregandoPerfil) {
    return <Navigate to="/cashier/sign-in" replace />
  }

  // O operador de caixa (CASHIER) abre na Conferência, o uso diário dele; os outros abrem em Vendas
  const padrao: AbaDoModulo =
    profile?.role === 'CASHIER' ? 'conferencia' : 'vendas'
  const pedida = params.get('aba') as AbaDoModulo | null
  const aba: AbaDoModulo =
    pedida && ABAS.some((a) => a.id === pedida) ? pedida : padrao
  const vendaAberta = params.get('venda')

  const irPara = (nova: AbaDoModulo) => {
    const p = new URLSearchParams(params)
    p.set('aba', nova)
    p.delete('venda')
    setParams(p)
  }
  const abrirVenda = (id: string) => {
    const p = new URLSearchParams(params)
    p.set('aba', aba)
    p.set('venda', id)
    setParams(p)
  }
  const fecharVenda = () => {
    const p = new URLSearchParams(params)
    p.delete('venda')
    setParams(p)
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-4 pb-8 text-slate-900 dark:text-slate-100">
      <Helmet title="Vendas" />
      <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
        Vendas
      </h1>

      {/* No celular as abas quebram em linhas (todas à vista, sem rolar para o lado) */}
      <nav aria-label="Abas do módulo Vendas">
        <div
          role="tablist"
          className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2 dark:border-slate-800"
        >
          {ABAS.map((a, i) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={aba === a.id}
              onClick={() => irPara(a.id)}
              className={cn(
                'flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors',
                aba === a.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
              )}
            >
              <a.icone className="h-4 w-4" aria-hidden />
              <span>
                <span className="sr-only">{i + 1}. </span>
                {a.nome}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {aba === 'vendas' && (
        <AbaVendas
          comuns={comuns}
          onComuns={setComuns}
          disponiveis={disponiveis}
          onAbrirVenda={abrirVenda}
        />
      )}
      {aba === 'conferencia' && <CashierDashboard embutido />}
      {aba === 'produtos' && (
        <AbaProdutos
          comuns={comuns}
          onComuns={setComuns}
          disponiveis={disponiveis}
        />
      )}
      {aba === 'cancelamentos' && (
        <AbaCancelamentos
          periodo={comuns.periodo}
          onPeriodo={(periodo) => setComuns((c) => ({ ...c, periodo }))}
          onAbrirVenda={abrirVenda}
        />
      )}
      {aba === 'vendedores' && (
        <AbaVendedores
          comuns={comuns}
          onComuns={setComuns}
          disponiveis={disponiveis}
        />
      )}

      {vendaAberta && (
        <DetalheDaVenda id={vendaAberta} onFechar={fecharVenda} />
      )}
    </div>
  )
}
