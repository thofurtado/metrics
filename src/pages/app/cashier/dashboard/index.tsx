import { useState } from 'react'
import { Anchor, Plus, Clock, Trash2, Download, FileSpreadsheet, FileText, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSessions, openSession, CashierSession } from '@/api/cashier/cashier'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'

export function CashierDashboard() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const dataAtual = new Date()

    const [saldoAbertura, setSaldoAbertura] = useState('0.00')
    const [periodo, setPeriodo] = useState('Almoço')
    const [mesVisualizacao, setMesVisualizacao] = useState(dataAtual.getMonth())
    const [anoVisualizacao, setAnoVisualizacao] = useState(dataAtual.getFullYear())

    const { data: sessions = [], isLoading } = useQuery({
        queryKey: ['cashier-sessions'],
        queryFn: getSessions,
    })

    const { mutateAsync: openSessionFn } = useMutation({
        mutationFn: openSession,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['cashier-sessions'] })
            navigate(`/cashier/session/${data.id}`)
        }
    })

    const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

    const navegarMes = (direcao: number) => {
        let novoMes = mesVisualizacao + direcao
        let novoAno = anoVisualizacao
        if (novoMes < 0) { novoMes = 11; novoAno-- }
        else if (novoMes > 11) { novoMes = 0; novoAno++ }
        setMesVisualizacao(novoMes)
        setAnoVisualizacao(novoAno)
    }

    const sessionsFiltradas = sessions
        .filter(s => {
            if (!s.opened_at) return false
            const dataLote = new Date(s.opened_at)
            return dataLote.getMonth() === mesVisualizacao && dataLote.getFullYear() === anoVisualizacao
        })
        .sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime())

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
            await openSessionFn({ initial_balance: parseFloat(saldoAbertura) || 0, period: periodo })
        } catch (error) {
            alert('Erro ao abrir caixa.')
        }
    }

    const renderStatusIcon = (status: string) => {
        switch (status) {
            case 'AUDITED': return <CheckCircle2 size={18} className="text-green-500" title="Conferido" />
            case 'CLOSED': return <AlertCircle size={18} className="text-amber-500" title="Fechado/Alerta" />
            case 'OPEN': return <Clock size={18} className="text-zinc-300" title="Aberto" />
            default: return <Clock size={18} className="text-zinc-300" />
        }
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-zinc-50 p-4 md:p-6 text-zinc-900 flex flex-col">
            <div className="max-w-5xl mx-auto space-y-6 flex-1 w-full">
                <header className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-zinc-900 p-3 rounded-2xl text-white shadow-xl">
                            <Anchor size={32} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">Caixa</h1>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Conferência</span>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 bg-white p-6 rounded-[2rem] border shadow-sm self-start">
                        <h2 className="text-[10px] font-black uppercase text-zinc-400 mb-6 flex items-center gap-2">
                            <Plus size={14} className="text-blue-600" /> Abrir Novo Caixa
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-bold text-zinc-400 uppercase ml-2 mb-1 block">Período</label>
                                <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="w-full border rounded-xl p-3 font-bold bg-zinc-50 border-zinc-100 outline-none">
                                    <option value="Almoço">Almoço</option>
                                    <option value="Jantar">Jantar</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-zinc-400 uppercase ml-2 mb-1 block text-green-600">Abertura em Dinheiro</label>
                                <input type="number" step="0.01" value={saldoAbertura} onChange={e => setSaldoAbertura(e.target.value)} className="w-full border rounded-xl p-3 font-mono font-bold bg-zinc-50 border-zinc-100 outline-none text-green-700" />
                            </div>
                            <button onClick={handleCriar} className="w-full bg-blue-600 text-white font-black uppercase text-[10px] py-4 rounded-xl shadow-lg hover:opacity-90 transition-opacity">Iniciar Expediente</button>
                        </div>
                    </div>

                    <div className="lg:col-span-8 bg-white rounded-[2rem] border shadow-sm overflow-hidden flex flex-col">
                        <div className="bg-zinc-50/50 px-6 py-4 border-b space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="font-black text-[10px] text-zinc-400 uppercase tracking-widest">Caixas do Mês</span>
                            </div>

                            <div className="flex items-center justify-between bg-white border rounded-xl p-2 shadow-sm">
                                <button onClick={() => navegarMes(-1)} className="p-1 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-zinc-900"><ChevronLeft size={20} /></button>
                                <div className="text-center">
                                    <span className="text-[10px] font-black uppercase text-zinc-900">{nomesMeses[mesVisualizacao]} <span className="text-blue-600">{anoVisualizacao}</span></span>
                                </div>
                                <button onClick={() => navegarMes(1)} className="p-1 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-zinc-900"><ChevronRight size={20} /></button>
                            </div>
                        </div>

                        <div className="overflow-y-auto max-h-[500px] divide-y min-h-[200px]">
                            {isLoading ? (
                                <div className="p-12 text-center text-zinc-400 font-bold text-sm">Carregando caixas...</div>
                            ) : sessionsFiltradas.length > 0 ? (
                                sessionsFiltradas.map(s => (
                                    <div key={s.id} className="px-6 py-4 flex justify-between items-center hover:bg-zinc-50 transition-colors group cursor-pointer" onClick={() => navigate(`/cashier/session/${s.id}`)}>
                                        <div className="flex items-center gap-4 flex-1">
                                            {renderStatusIcon(s.status)}
                                            <div>
                                                <p className="font-black text-zinc-800 text-base">{formatarDataBR(s.opened_at)}</p>
                                                <div className="flex gap-2">
                                                    <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{getPeriodo(s.opened_at)}</span>
                                                    <span className="text-[9px] font-bold text-zinc-400">Abertura: R$ {Number(s.initial_balance).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-12 text-center">
                                    <p className="text-[10px] font-black uppercase text-zinc-300 tracking-widest">Nenhum caixa neste período</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
