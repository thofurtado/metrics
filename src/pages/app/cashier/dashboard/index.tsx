import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  AlertCircle,
  Anchor,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CashierSession, getSessions, openSession } from '@/api/cashier/cashier'

export function CashierDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const dataAtual = new Date()

  const [saldoAbertura, setSaldoAbertura] = useState('0.00')
  const [periodo, setPeriodo] = useState('Almoço')
  const [mesVisualizacao, setMesVisualizacao] = useState(dataAtual.getMonth())
  const [anoVisualizacao, setAnoVisualizacao] = useState(
    dataAtual.getFullYear(),
  )

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['cashier-sessions'],
    queryFn: getSessions,
  })

  const { mutateAsync: openSessionFn } = useMutation({
    mutationFn: openSession,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cashier-sessions'] })
      navigate(`/cashier/session/${data.id}`)
    },
  })

  const nomesMeses = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]

  const navegarMes = (direcao: number) => {
    let novoMes = mesVisualizacao + direcao
    let novoAno = anoVisualizacao
    if (novoMes < 0) {
      novoMes = 11
      novoAno--
    } else if (novoMes > 11) {
      novoMes = 0
      novoAno++
    }
    setMesVisualizacao(novoMes)
    setAnoVisualizacao(novoAno)
  }

  const sessionsFiltradas = sessions
    .filter((s) => {
      if (!s.opened_at) return false
      const dataLote = new Date(s.opened_at)
      return (
        dataLote.getMonth() === mesVisualizacao &&
        dataLote.getFullYear() === anoVisualizacao
      )
    })
    .sort(
      (a, b) =>
        new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime(),
    )

  const formatarDataBR = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy')
    } catch {
      return dateString
    }
  }

  const getPeriodo = (dateString: string) => {
    try {
      const hour = new Date(dateString).getHours()
      return hour < 16 ? 'Almoço' : 'Jantar'
    } catch {
      return 'Desconhecido'
    }
  }

  const handleCriar = async () => {
    try {
      await openSessionFn({
        initial_balance: parseFloat(saldoAbertura) || 0,
        period: periodo,
      })
    } catch (error) {
      alert('Erro ao abrir caixa.')
    }
  }

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'AUDITED':
        return (
          <CheckCircle2
            size={18}
            className="text-green-500"
            title="Conferido"
          />
        )
      case 'CLOSED':
        return (
          <AlertCircle
            size={18}
            className="text-amber-500"
            title="Fechado/Alerta"
          />
        )
      case 'OPEN':
        return <Clock size={18} className="text-zinc-300" title="Aberto" />
      default:
        return <Clock size={18} className="text-zinc-300" />
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-zinc-50 p-4 text-zinc-900 md:p-6">
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-6">
        <header className="mb-8 flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-zinc-900 p-3 text-white shadow-xl">
              <Anchor size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase leading-none tracking-tighter">
                Caixa
              </h1>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">
                Conferência
              </span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="self-start rounded-[2rem] border bg-white p-6 shadow-sm lg:col-span-4">
            <h2 className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase text-zinc-400">
              <Plus size={14} className="text-blue-600" /> Abrir Novo Caixa
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 ml-2 block text-[9px] font-bold uppercase text-zinc-400">
                  Período
                </label>
                <select
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  className="w-full rounded-xl border border-zinc-100 bg-zinc-50 p-3 font-bold outline-none"
                >
                  <option value="Almoço">Almoço</option>
                  <option value="Jantar">Jantar</option>
                </select>
              </div>
              <div>
                <label className="mb-1 ml-2 block text-[9px] font-bold uppercase text-green-600 text-zinc-400">
                  Abertura em Dinheiro
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={saldoAbertura}
                  onChange={(e) => setSaldoAbertura(e.target.value)}
                  className="w-full rounded-xl border border-zinc-100 bg-zinc-50 p-3 font-mono font-bold text-green-700 outline-none"
                />
              </div>
              <button
                onClick={handleCriar}
                className="w-full rounded-xl bg-blue-600 py-4 text-[10px] font-black uppercase text-white shadow-lg transition-opacity hover:opacity-90"
              >
                Iniciar Expediente
              </button>
            </div>
          </div>

          <div className="flex flex-col overflow-hidden rounded-[2rem] border bg-white shadow-sm lg:col-span-8">
            <div className="space-y-4 border-b bg-zinc-50/50 px-6 py-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Caixas do Mês
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border bg-white p-2 shadow-sm">
                <button
                  onClick={() => navegarMes(-1)}
                  className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="text-center">
                  <span className="text-[10px] font-black uppercase text-zinc-900">
                    {nomesMeses[mesVisualizacao]}{' '}
                    <span className="text-blue-600">{anoVisualizacao}</span>
                  </span>
                </div>
                <button
                  onClick={() => navegarMes(1)}
                  className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div className="max-h-[500px] min-h-[200px] divide-y overflow-y-auto">
              {isLoading ? (
                <div className="p-12 text-center text-sm font-bold text-zinc-400">
                  Carregando caixas...
                </div>
              ) : sessionsFiltradas.length > 0 ? (
                sessionsFiltradas.map((s) => (
                  <div
                    key={s.id}
                    className="group flex cursor-pointer items-center justify-between px-6 py-4 transition-colors hover:bg-zinc-50"
                    onClick={() => navigate(`/cashier/session/${s.id}`)}
                  >
                    <div className="flex flex-1 items-center gap-4">
                      {renderStatusIcon(s.status)}
                      <div>
                        <p className="text-base font-black text-zinc-800">
                          {formatarDataBR(s.opened_at)}
                        </p>
                        <div className="flex gap-2">
                          <span className="rounded bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase text-blue-600">
                            {getPeriodo(s.opened_at)}
                          </span>
                          <span className="text-[9px] font-bold text-zinc-400">
                            Abertura: R$ {Number(s.initial_balance).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                    Nenhum caixa neste período
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
