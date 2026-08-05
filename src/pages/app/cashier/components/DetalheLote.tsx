'use client'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronUp,
  Clock,
  Edit2,
  Eye,
  Filter,
  Lock,
  Printer,
  ShoppingBag,
  Trash2,
  User,
  Wallet2,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { exportarLotePDF } from '@/utils/cashier/exportPDF'

import { CaixinhasTable } from './CaixinhasTable'
import { SummaryCards } from './SummaryCards'
import { TransactionForm } from './TransactionForm'

interface DetalheLoteProps {
  loteAtivo: any
  resumoLote: any
  onVoltar: () => void
  onAdicionarLancamento: (l: any) => void
  onRemoverLancamento: (id: string) => void
  onEditarLancamento: (id: string, dadosAtualizados: any) => void
  onEditarAbertura: (novoValor: number) => void
  onAlterarStatus: (novoStatus: any) => void
  onConferirECaixaConferido?: () => void
  onEnviarParaConferencia?: () => void
  isAdmin?: boolean
}

export function DetalheLote({
  loteAtivo,
  resumoLote,
  onVoltar,
  onAdicionarLancamento,
  onRemoverLancamento,
  onEditarLancamento,
  onEditarAbertura,
  onAlterarStatus,
  onConferirECaixaConferido,
  onEnviarParaConferencia,
  isAdmin = true,
}: DetalheLoteProps) {
  const [filtro, setFiltro] = useState({ mesa: '', banco: '', forma: '' })
  const [sortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc' | null
  }>({ key: '', direction: null })
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [dadosEdicao, setDadosEdicao] = useState<any>({})
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [editandoAbertura, setEditandoAbertura] = useState(false)
  const [valorAberturaTemp, setValorAberturaTemp] = useState('0')
  const [activeTab, setActiveTab] = useState('Todas')
  const [exibirSumario, setExibirSumario] = useState(false)

  const formasCasa = ['Funcionário', 'Pró-labore', 'Cortesia', 'Permuta']

  // Extrair bancos únicos para o select
  const bancosUnicos = useMemo(() => {
    const bancos = loteAtivo.lancamentos
      .filter((l: any) => l.banco && !l.isSaida)
      .map((l: any) => l.banco)
      .filter(
        (b: any, i: number, self: any[]) =>
          self.indexOf(b) === i && b.trim() !== '',
      )
    return bancos.sort()
  }, [loteAtivo.lancamentos])

  const renderOrigemLabel = (l: any) => {
    const origin = l.origin || (l.mesa ? 'Mesa' : 'Balcão')
    const num = l.identification || l.mesa || ''
    let cleanNum = num.replace(/^(Mesa|Balcão|Delivery)\s*/i, '').trim()

    const nomeConsumidor = (l.consumidorCasa || l.client?.name || l.employee?.name || '').trim().toLowerCase()
    
    // Se a identificação (já sem o prefixo) for idêntica ao nome do consumidor (ou motivo), não repetimos na origem.
    if (nomeConsumidor && cleanNum.toLowerCase() === nomeConsumidor) {
        cleanNum = ''
    }

    // Se o identificador for um nome de consumidor (ex: João Silva), não usa como número de mesa
    const isNum = cleanNum && !isNaN(Number(cleanNum))

    if (origin === 'Mesa') {
      return isNum ? `Mesa ${cleanNum}` : cleanNum && !cleanNum.toLowerCase().includes('mesa') ? `Mesa ${cleanNum}` : 'Mesa'
    }
    if (origin === 'Delivery') {
      return isNum ? `Delivery ${cleanNum}` : cleanNum && !cleanNum.toLowerCase().includes('delivery') ? `Delivery ${cleanNum}` : 'Delivery'
    }
    if (origin === 'Balcão') {
      return isNum ? `Balcão ${cleanNum}` : cleanNum && !cleanNum.toLowerCase().includes('balcão') && !cleanNum.toLowerCase().includes('balcao') ? `Balcão ${cleanNum}` : 'Balcão'
    }
    return cleanNum ? `${origin} ${cleanNum}` : origin
  }

  const renderBancoConsumidor = (l: any) => {
    if (l.consumidorCasa && l.consumidorCasa !== 'CONTA DA CASA') {
      return l.consumidorCasa
    }
    if (l.client?.name) return l.client.name
    if (l.employee?.name) return l.employee.name

    const normForma = (l.formaPagamento || '').toLowerCase()
    const isCasa = ['funcionário', 'funcionario', 'pró-labore', 'pro-labore', 'cortesia', 'permuta', 'a prazo'].some(
      p => normForma.includes(p)
    )
    if (isCasa) return '-'

    return (l.banco && l.banco !== 'CONTA DA CASA') ? l.banco : '-'
  }

  const sangrias = [...loteAtivo.lancamentos.filter((l: any) => l.isSaida)].reverse()
  const suprimentos = [...loteAtivo.lancamentos.filter((l: any) => l.isSuprimento || l.formaPagamento === 'Suprimento')].reverse()

  const tabs = [
    { id: 'Todas', label: 'Todas' },
    { id: 'Dinheiro', label: 'Dinheiro' },
    { id: 'Pix', label: 'Pix' },
    { id: 'Débito', label: 'Débito' },
    { id: 'Crédito', label: 'Crédito' },
    { id: 'Voucher', label: 'Voucher' },
    { id: 'Consumo Interno', label: 'Consumo Interno' },
  ]

  const vendasFiltradas = useMemo(() => {
    let items = loteAtivo.lancamentos.filter((l: any) => !l.isSaida && !l.isSuprimento && l.formaPagamento !== 'Suprimento' && !l.isCaixinha)

    // Filtro por Aba
    if (activeTab === 'Dinheiro') {
      items = items.filter(
        (l: any) =>
          l.formaPagamento === 'Dinheiro' &&
          !formasCasa.includes(l.formaPagamento),
      )
    } else if (activeTab === 'Pix') {
      items = items.filter(
        (l: any) =>
          l.formaPagamento === 'PIX' && !formasCasa.includes(l.formaPagamento),
      )
    } else if (activeTab === 'Débito') {
      items = items.filter((l: any) => l.formaPagamento === 'Débito')
    } else if (activeTab === 'Crédito') {
      items = items.filter((l: any) => l.formaPagamento === 'Crédito')
    } else if (activeTab === 'Voucher') {
      items = items.filter((l: any) => l.formaPagamento === 'Voucher')
    } else if (activeTab === 'Consumo Interno') {
      items = items.filter((l: any) => formasCasa.includes(l.formaPagamento))
    } else if (activeTab === 'Todas') {
      // Todas mostra tudo exceto saídas (já filtrado acima)
      // Se quiser excluir consumo interno do 'Todas', descomente abaixo.
      // Assumindo que 'Todas' inclui consumo interno também.
    }

    // Filtros de Texto/Select
    if (filtro.mesa)
      items = items.filter((l: any) => l.mesa?.toString().includes(filtro.mesa))
    if (filtro.banco)
      items = items.filter((l: any) =>
        (l.banco || '').toLowerCase().includes(filtro.banco.toLowerCase()),
      )
    if (filtro.forma)
      items = items.filter((l: any) =>
        l.formaPagamento.toLowerCase().includes(filtro.forma.toLowerCase()),
      )

    // Ordenação
    if (sortConfig.key) {
      items.sort((a: any, b: any) => {
        const key = sortConfig.key as keyof typeof a
        if (a[key] < b[key]) return sortConfig.direction === 'asc' ? -1 : 1
        if (a[key] > b[key]) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    } else {
      items.reverse()
    }
    return items
  }, [loteAtivo.lancamentos, activeTab, filtro, sortConfig, formasCasa])

  const getStatusConfig = (status: string) => {
    const s = (status || '').toString().toLowerCase().trim()
    if (s === 'conferido' || s === 'audited') {
      return {
        label: 'CONFERIDO',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300',
        icon: <CheckCircle2 size={14} />,
      }
    }
    if (s === 'aberto' || s === 'open') {
      return {
        label: 'ABERTO',
        color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300',
        icon: <Clock size={14} />,
      }
    }
    return {
      label: 'PENDENTE (AGUARDANDO CONFERÊNCIA)',
      color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300',
      icon: <AlertCircle size={14} />,
    }
  }

  const alternarStatus = () => {
    const proximos: Record<string, string> = {
      pendente: 'alerta',
      alerta: 'conferido',
      conferido: 'pendente',
    }
    onAlterarStatus(proximos[loteAtivo.status || 'pendente'])
  }

  const statusConfig = getStatusConfig(loteAtivo.status)

  const iniciarEdicao = (lancamento: any) => {
    setEditandoId(lancamento.id)
    setDadosEdicao({ ...lancamento })
  }

  const cancelarEdicao = () => {
    setEditandoId(null)
    setDadosEdicao({})
  }

  const salvarEdicao = () => {
    if (editandoId) {
      onEditarLancamento(editandoId, dadosEdicao)
      setEditandoId(null)
      setDadosEdicao({})
    }
  }

  const iniciarEdicaoAbertura = () => {
    setEditandoAbertura(true)
    setValorAberturaTemp(loteAtivo.valorAbertura.toString())
  }

  const salvarEdicaoAbertura = () => {
    onEditarAbertura(parseFloat(valorAberturaTemp) || 0)
    setEditandoAbertura(false)
  }

  return (
    <div className="min-h-screen space-y-4 bg-zinc-50 p-3 text-zinc-900 md:space-y-6 md:p-8">
      <header className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={onVoltar}
            className="rounded-xl border bg-white p-3 text-zinc-400 shadow-sm active:bg-zinc-100"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-black uppercase leading-none md:text-xl">
                {new Date(loteAtivo.dataReferencia).toLocaleDateString(
                  'pt-BR',
                  { timeZone: 'America/Sao_Paulo' },
                )}
              </h1>
              {isAdmin && (
                <button
                  onClick={alternarStatus}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase transition-all active:scale-95 ${statusConfig.color}`}
                >
                  {statusConfig.icon}
                  {statusConfig.label}
                </button>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">
                {loteAtivo.periodo}
              </span>
              <span className="text-[9px] font-bold text-zinc-400">•</span>
              {editandoAbertura ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={valorAberturaTemp}
                    onChange={(e) => setValorAberturaTemp(e.target.value)}
                    className="w-24 rounded border border-green-300 bg-white px-2 py-1 text-[9px] font-bold"
                    autoFocus
                  />
                  <button
                    onClick={salvarEdicaoAbertura}
                    className="p-1 text-green-600"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => setEditandoAbertura(false)}
                    className="p-1 text-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  className="group flex cursor-pointer items-center gap-1"
                  onClick={iniciarEdicaoAbertura}
                >
                  <span className="text-[9px] font-bold text-zinc-400">
                    Abertura: R$ {Number(loteAtivo.valorAbertura).toFixed(2)}
                  </span>
                  <Edit2
                    size={10}
                    className="text-zinc-300 transition-colors group-hover:text-green-600"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge quando conferido */}
          {(loteAtivo.status === 'conferido' || loteAtivo.status === 'CONFERIDO' || loteAtivo.status === 'AUDITED') ? (
            <div className="flex items-center gap-1.5 rounded-xl bg-emerald-100 px-4 py-2.5 text-xs font-black uppercase text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300">
              <CheckCircle2 size={16} /> Caixa Conferido
            </div>
          ) : (
            <>
              {/* Botão CASHIER: Enviar para Conferência (só quando OPEN) */}
              {!isAdmin && onEnviarParaConferencia && (
                loteAtivo.status === 'ABERTO' || loteAtivo.status === 'OPEN' ? (
                  <button
                    onClick={onEnviarParaConferencia}
                    className="flex items-center gap-2 rounded-xl bg-amber-500 p-3 text-[10px] font-black uppercase text-white shadow-lg transition-transform hover:bg-amber-600 active:scale-95 md:rounded-2xl md:px-5 md:py-3 cursor-pointer"
                  >
                    <Clock size={18} />
                    <span>Enviar para Conferência</span>
                  </button>
                ) : (
                  // Status PENDING: já enviado, mostra apenas badge informativo
                  <div className="flex items-center gap-1.5 rounded-xl bg-amber-100 px-4 py-2.5 text-xs font-black uppercase text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300">
                    <Clock size={16} /> Aguardando Conferência
                  </div>
                )
              )}

              {/* Botões ADMIN: pode enviar para conferência E marcar como conferido */}
              {isAdmin && (
                <>
                  {/* Admin também pode enviar para conferência quando OPEN */}
                  {(loteAtivo.status === 'ABERTO' || loteAtivo.status === 'OPEN') && onEnviarParaConferencia && (
                    <button
                      onClick={onEnviarParaConferencia}
                      className="flex items-center gap-2 rounded-xl bg-amber-500 p-3 text-[10px] font-black uppercase text-white shadow-lg transition-transform hover:bg-amber-600 active:scale-95 md:rounded-2xl md:px-5 md:py-3 cursor-pointer"
                    >
                      <Clock size={18} />
                      <span>Enviar para Conferência</span>
                    </button>
                  )}
                  {/* Admin: Marcar como conferido (quando OPEN ou PENDING) */}
                  {onConferirECaixaConferido && (
                    <button
                      onClick={onConferirECaixaConferido}
                      className="flex items-center gap-2 rounded-xl bg-indigo-600 p-3 text-[10px] font-black uppercase text-white shadow-lg transition-transform hover:bg-indigo-700 active:scale-95 md:rounded-2xl md:px-5 md:py-3 cursor-pointer"
                    >
                      <CheckCircle2 size={18} />
                      <span>Marcar como Conferido</span>
                    </button>
                  )}
                </>
              )}
            </>
          )}

          <button
            onClick={() => {
              try {
                exportarLotePDF(loteAtivo, resumoLote)
                toast.success('Relatório PDF gerado com sucesso!')
              } catch (err: any) {
                console.error('Erro ao exportar PDF:', err)
                toast.error('Erro ao gerar relatório PDF.')
              }
            }}
            className="flex items-center gap-2 rounded-xl bg-zinc-900 p-3 text-[10px] font-black uppercase text-white shadow-lg transition-transform active:scale-95 md:rounded-2xl md:px-5 md:py-3 cursor-pointer"
          >
            <Printer size={18} />
            <span className="hidden md:inline">Exportar PDF</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] space-y-4 md:space-y-6">
        <button
          onClick={() => setExibirSumario(!exibirSumario)}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100/80 py-3 text-xs font-medium uppercase tracking-wider text-zinc-600 transition-colors hover:bg-zinc-200"
        >
          {exibirSumario ? (
            <>
              <ChevronUp size={16} /> Ocultar Painel
            </>
          ) : (
            <>
              <Eye size={16} /> Mostrar Painel de Conferência
            </>
          )}
        </button>

        {exibirSumario && (
          <SummaryCards resumo={resumoLote} onEditAbertura={onEditarAbertura} />
        )}
        
        {loteAtivo.status === 'ABERTO' || loteAtivo.status === 'Aberto' || loteAtivo.status === 'OPEN' ? (
          <TransactionForm onAdd={onAdicionarLancamento} />
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-center text-xs font-bold text-amber-900 flex items-center justify-center gap-2 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            <Lock size={16} /> Caixa {loteAtivo.status === 'CONFERIDO' || loteAtivo.status === 'conferido' || loteAtivo.status === 'AUDITED' ? 'Conferido' : 'Enviado para Conferência'} — Lançamentos bloqueados.
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-400">
              <ShoppingBag size={14} /> Lista de Vendas (
              {vendasFiltradas.length})
            </div>
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-[9px] font-black uppercase transition-colors ${mostrarFiltros ? 'bg-blue-100 text-blue-600' : 'bg-zinc-100 text-zinc-400'}`}
            >
              <Filter size={12} /> Filtros
            </button>
          </div>

          {/* Tabs Navigation */}
          <div className="mb-4 flex flex-wrap gap-2 overflow-x-auto border-b border-zinc-200 pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all
                                    ${
                                      activeTab === tab.id
                                        ? 'border-b-2 border-blue-600 text-blue-600'
                                        : 'text-zinc-400 hover:text-zinc-600'
                                    }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {mostrarFiltros && (
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 md:grid-cols-3">
              <div>
                <label className="mb-1 ml-1 block text-[9px] font-black uppercase text-zinc-400">
                  Mesa
                </label>
                <input
                  type="text"
                  value={filtro.mesa}
                  onChange={(e) =>
                    setFiltro({ ...filtro, mesa: e.target.value })
                  }
                  placeholder="Filtrar por mesa..."
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 ml-1 block text-[9px] font-black uppercase text-zinc-400">
                  Banco / Destino
                </label>
                <select
                  value={filtro.banco}
                  onChange={(e) =>
                    setFiltro({ ...filtro, banco: e.target.value })
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os Bancos</option>
                  {bancosUnicos.map((b: string) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 ml-1 block text-[9px] font-black uppercase text-zinc-400">
                  Forma
                </label>
                <input
                  type="text"
                  value={filtro.forma}
                  onChange={(e) =>
                  setFiltro({ ...filtro, forma: e.target.value })
                  }
                  placeholder="Filtrar por forma..."
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            {vendasFiltradas.length > 0 ? (
              vendasFiltradas.map((l: any) => {
                const isEdit = editandoId === l.id
                const isChecked = !!l.conferido

                // Definir ícone e cor baseado na forma de pagamento
                let IconStyle = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                let PaymentIcon = Wallet2
                const formaNorm = (l.formaPagamento || '').toLowerCase()
                
                if (formaNorm.includes('pix')) { IconStyle = 'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400'; PaymentIcon = CheckCircle2 }
                else if (formaNorm.includes('débito') || formaNorm.includes('debito')) { IconStyle = 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'; PaymentIcon = CheckCircle2 }
                else if (formaNorm.includes('crédito') || formaNorm.includes('credito')) { IconStyle = 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400'; PaymentIcon = CheckCircle2 }
                else if (formaNorm.includes('dinheiro')) { IconStyle = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'; PaymentIcon = CheckCircle2 }

                return (
                  <div key={l.id} className="group flex flex-col md:flex-row md:items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all dark:bg-slate-900/50 dark:border-slate-800">
                    
                    {isEdit ? (
                      /* MODO EDIÇÃO */
                      <div className="flex flex-col md:flex-row gap-3 w-full">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!dadosEdicao.conferido}
                            onChange={(e) => setDadosEdicao({ ...dadosEdicao, conferido: e.target.checked })}
                            className="h-5 w-5 rounded-md border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </div>
                        <input
                          type="text"
                          value={dadosEdicao.mesa || ''}
                          onChange={(e) => setDadosEdicao({ ...dadosEdicao, mesa: e.target.value })}
                          className="flex-1 rounded-xl border border-blue-200 bg-blue-50 p-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Mesa/Origem"
                        />
                        <select
                          value={dadosEdicao.banco}
                          onChange={(e) => setDadosEdicao({ ...dadosEdicao, banco: e.target.value })}
                          className="w-32 rounded-xl border border-blue-200 bg-blue-50 p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="CAIXA">CAIXA</option>
                          <option value="SAFRA">SAFRA</option>
                          <option value="PAGBANK">PAGBANK</option>
                          <option value="CIELO">CIELO</option>
                          <option value="STONE">STONE</option>
                          <option value="CONTA DA CASA">CONTA DA CASA</option>
                        </select>
                        <select
                          value={dadosEdicao.formaPagamento}
                          onChange={(e) => setDadosEdicao({ ...dadosEdicao, formaPagamento: e.target.value })}
                          className="w-32 rounded-xl border border-blue-200 bg-blue-50 p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Dinheiro">Dinheiro</option>
                          <option value="PIX">PIX</option>
                          <option value="Débito">Débito</option>
                          <option value="Crédito">Crédito</option>
                          <option value="Voucher">Voucher</option>
                          <option value="Funcionário">Funcionário</option>
                          <option value="Pró-labore">Pró-labore</option>
                          <option value="Permuta">Permuta</option>
                          <option value="Cortesia">Cortesia</option>
                          <option value="A Prazo">A Prazo</option>
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          value={dadosEdicao.valor || 0}
                          onChange={(e) => setDadosEdicao({ ...dadosEdicao, valor: Number(e.target.value) })}
                          className="w-24 rounded-xl border border-blue-200 bg-blue-50 p-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 text-right"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => { onEditarLancamento(l.id, dadosEdicao); setEditandoId(null) }} className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200">
                            <Check size={16} />
                          </button>
                          <button onClick={() => setEditandoId(null)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* MODO VISUALIZAÇÃO (CARD PREMIUM) */
                      <>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${IconStyle}`}>
                            <PaymentIcon size={20} />
                          </div>
                          
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm md:text-base">
                              {renderOrigemLabel(l)}
                            </span>
                            <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                              {renderBancoConsumidor(l)} 
                              <span className="w-1 h-1 rounded-full bg-slate-300"></span> 
                              {l.formaPagamento}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-6 mt-4 md:mt-0">
                          <div className="flex flex-col items-start md:items-end">
                            <span className="font-black text-slate-900 dark:text-white text-base">
                              {Number(l.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                            {isChecked ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full mt-1">
                                <Check size={10} /> Conferido
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full mt-1">
                                <Clock size={10} /> Pendente
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            {loteAtivo.status === 'ABERTO' || loteAtivo.status === 'OPEN' ? (
                              <>
                                <button
                                  onClick={() => {
                                    setEditandoId(l.id)
                                    setDadosEdicao({ ...l })
                                  }}
                                  className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shadow-sm"
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => onRemoverLancamento(l.id)}
                                  className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors shadow-sm"
                                  title="Remover"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center flex flex-col items-center justify-center dark:border-slate-800 dark:bg-slate-900/20">
                <ShoppingBag size={32} className="text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-500">Nenhum lançamento encontrado nesta categoria.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase text-red-400">
            <Wallet2 size={14} /> Sangrias
          </div>
          <div className="overflow-hidden rounded-[1.5rem] border border-red-100 bg-red-50/30 shadow-sm">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-red-100">
                {sangrias.length === 0 ? (
                  <tr>
                    <td className="p-8 text-center text-xs font-medium italic text-zinc-400">
                      Nenhuma sangria registrada
                    </td>
                  </tr>
                ) : (
                  sangrias.map((l: any) => (
                    <tr key={l.id}>
                      <td className="p-4 text-xs font-bold italic text-red-900">
                        {l.identificacao}
                      </td>
                      <td className="p-4 text-right font-mono font-black text-red-600">
                        R$ -{l.valor.toFixed(2)}
                      </td>
                      <td className="w-12 p-4 text-right">
                        <button
                          onClick={() => onRemoverLancamento(l.id)}
                          className="p-2 text-red-200 hover:text-red-600"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <CaixinhasTable lancamentos={loteAtivo.lancamentos} />
      </div>
    </div>
  )
}
