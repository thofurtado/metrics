import { Search, TrendingDown, X } from 'lucide-react'
import { useMemo, useState } from 'react'

interface OutflowsModalProps {
  isOpen: boolean
  onClose: () => void
  sessions: any[]
  monthName: string
  year: number
}

export function OutflowsModal({
  isOpen,
  onClose,
  sessions,
  monthName,
  year,
}: OutflowsModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'dono' | 'despesa' | 'vale'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Extrai e classifica todas as saídas das sessões do mês
  const allOutflows = useMemo(() => {
    const list: any[] = []

    sessions.forEach((s: any) => {
      const entries = s.entries || []
      entries.forEach((e: any) => {
        if (e.is_withdrawal) {
          const normIdent = (e.identification || '').toLowerCase()
          let category: 'dono' | 'despesa' | 'vale' = 'despesa'

          if (
            e.employee_id ||
            normIdent.includes('vale') ||
            normIdent.includes('vt') ||
            normIdent.includes('funcionario') ||
            e.type === 'WITHDRAWAL_EMPLOYEE'
          ) {
            category = 'vale'
          } else if (
            e.type === 'WITHDRAWAL_OWNER' ||
            normIdent.includes('samir') ||
            normIdent.includes('reserva') ||
            normIdent.includes('ronaldo') ||
            normIdent.includes('dono') ||
            normIdent.includes('socio') ||
            normIdent.includes('sócio') ||
            normIdent.includes('proprietario') ||
            normIdent.includes('proprietário') ||
            normIdent.includes('manobra') ||
            normIdent.includes('troco') ||
            normIdent.includes('cofre') ||
            normIdent.includes('recolhimento') ||
            (normIdent === 'sangria' && !e.sector_id)
          ) {
            category = 'dono'
          }

          list.push({
            id: e.id,
            sessionId: s.id,
            period: s.period || 'Dia Todo',
            operatorName: s.operator_name || 'Operador',
            date: s.opened_at,
            createdAt: e.created_at || s.opened_at,
            amount: Number(e.amount || 0),
            identification: e.identification || '(Sem descrição)',
            category,
            sectorId: e.sector_id,
            employeeId: e.employee_id,
          })
        }
      })
    })

    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [sessions])

  // Métricas agrupadas
  const metrics = useMemo(() => {
    let totalDono = 0
    let countDono = 0
    let totalDespesas = 0
    let countDespesas = 0
    let totalVales = 0
    let countVales = 0

    allOutflows.forEach((item) => {
      if (item.category === 'dono') {
        totalDono += item.amount
        countDono++
      } else if (item.category === 'vale') {
        totalVales += item.amount
        countVales++
      } else {
        totalDespesas += item.amount
        countDespesas++
      }
    })

    const totalGeral = totalDono + totalDespesas + totalVales
    const countGeral = allOutflows.length

    return {
      totalDono,
      countDono,
      totalDespesas,
      countDespesas,
      totalVales,
      countVales,
      totalGeral,
      countGeral,
    }
  }, [allOutflows])

  // Filtragem por aba e busca
  const filteredOutflows = useMemo(() => {
    return allOutflows.filter((item) => {
      const matchTab =
        activeTab === 'all' ? true : item.category === activeTab

      const query = searchTerm.toLowerCase().trim()
      const matchSearch =
        !query ||
        item.identification.toLowerCase().includes(query) ||
        item.operatorName.toLowerCase().includes(query) ||
        item.period.toLowerCase().includes(query) ||
        item.amount.toFixed(2).includes(query)

      return matchTab && matchSearch
    })
  }, [allOutflows, activeTab, searchTerm])

  if (!isOpen) return null

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400">
              <TrendingDown size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                Relatório Gerencial de Saídas do Caixa
              </h2>
              <p className="text-xs font-semibold text-slate-400">
                Detalhamento completo de sangrias, despesas e vales em {monthName} {year}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        {/* CARDS DE RESUMO POR CATEGORIA */}
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50/50 p-6 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800 dark:bg-slate-900/30">
          {/* Card 1: Cofre / Dono */}
          <div
            onClick={() => setActiveTab('dono')}
            className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
              activeTab === 'dono'
                ? 'border-blue-500 bg-blue-50/50 shadow-sm dark:border-blue-500/50 dark:bg-blue-950/20'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-400">
                🏦 Cofre / Dono
              </span>
              <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {metrics.countDono}
              </span>
            </div>
            <p className="mt-1 font-mono text-xl font-black text-blue-950 dark:text-blue-200">
              R$ {metrics.totalDono.toFixed(2)}
            </p>
            <span className="text-[10px] font-medium text-slate-400">
              Recolhimento / Custódia
            </span>
          </div>

          {/* Card 2: Despesas / Compras */}
          <div
            onClick={() => setActiveTab('despesa')}
            className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
              activeTab === 'despesa'
                ? 'border-amber-500 bg-amber-50/50 shadow-sm dark:border-amber-500/50 dark:bg-amber-950/20'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400">
                🛒 Despesas / Compras
              </span>
              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                {metrics.countDespesas}
              </span>
            </div>
            <p className="mt-1 font-mono text-xl font-black text-amber-950 dark:text-amber-200">
              R$ {metrics.totalDespesas.toFixed(2)}
            </p>
            <span className="text-[10px] font-medium text-slate-400">
              Gastos reais da loja
            </span>
          </div>

          {/* Card 3: Vales Funcionários */}
          <div
            onClick={() => setActiveTab('vale')}
            className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
              activeTab === 'vale'
                ? 'border-purple-500 bg-purple-50/50 shadow-sm dark:border-purple-500/50 dark:bg-purple-950/20'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-purple-700 dark:text-purple-400">
                👤 Vales Equipe (RH)
              </span>
              <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                {metrics.countVales}
              </span>
            </div>
            <p className="mt-1 font-mono text-xl font-black text-purple-950 dark:text-purple-200">
              R$ {metrics.totalVales.toFixed(2)}
            </p>
            <span className="text-[10px] font-medium text-slate-400">
              Adiantamentos de salário
            </span>
          </div>

          {/* Card 4: Total Geral */}
          <div
            onClick={() => setActiveTab('all')}
            className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
              activeTab === 'all'
                ? 'border-red-500 bg-red-50/50 shadow-sm dark:border-red-500/50 dark:bg-red-950/20'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-red-700 dark:text-red-400">
                📉 Total Geral de Saídas
              </span>
              <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                {metrics.countGeral}
              </span>
            </div>
            <p className="mt-1 font-mono text-xl font-black text-red-600 dark:text-red-400">
              -R$ {metrics.totalGeral.toFixed(2)}
            </p>
            <span className="text-[10px] font-medium text-slate-400">
              Soma de todas as saídas
            </span>
          </div>
        </div>

        {/* BARRA DE FILTROS E BUSCA */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-100 dark:border-slate-800">
          {/* Abas */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
            <button
              onClick={() => setActiveTab('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Todas ({metrics.countGeral})
            </button>
            <button
              onClick={() => setActiveTab('dono')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'dono'
                  ? 'bg-white text-blue-700 shadow-xs dark:bg-slate-800 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              🏦 Cofre / Dono
            </button>
            <button
              onClick={() => setActiveTab('despesa')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'despesa'
                  ? 'bg-white text-amber-700 shadow-xs dark:bg-slate-800 dark:text-amber-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              🛒 Despesas
            </button>
            <button
              onClick={() => setActiveTab('vale')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'vale'
                  ? 'bg-white text-purple-700 shadow-xs dark:bg-slate-800 dark:text-purple-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              👤 Vales RH
            </button>
          </div>

          {/* Campo de Busca */}
          <div className="relative w-full sm:w-64">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar motivo, operador..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>
        </div>

        {/* TABELA DE SAÍDAS */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 font-black uppercase tracking-wider text-slate-500 dark:bg-slate-900">
                <tr>
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Turno / Operador</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Motivo / Identificação</th>
                  <th className="p-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium dark:divide-slate-800">
                {filteredOutflows.length > 0 ? (
                  filteredOutflows.map((item) => {
                    const badge =
                      item.category === 'dono'
                        ? { label: '🏦 Cofre / Dono', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' }
                        : item.category === 'vale'
                          ? { label: '👤 Vale RH', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' }
                          : { label: '🛒 Despesa Loja', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' }

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/50"
                      >
                        <td className="p-3 text-slate-500 font-mono">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-200">
                          {item.period} • {item.operatorName}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                          {item.identification}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-red-500 dark:text-red-400">
                          -R$ {item.amount.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-xs font-bold text-slate-400"
                    >
                      Nenhuma saída encontrada com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
