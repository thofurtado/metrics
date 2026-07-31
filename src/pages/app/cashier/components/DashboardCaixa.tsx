'use client'
import {
  AlertCircle,
  AlertTriangle,
  Calculator,
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
import { useEffect, useState } from 'react'

import { exportarParaCSV } from '../utils/exportCSV'
import { exportarGeralCSV } from '../utils/exportGeralCSV'
import { exportarRelatorioGeralPDF } from '../utils/exportGeralPDF'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DashboardProps {
  lotes: any[]
  onCriarNovo: (data: string, periodo: string, abertura: number) => void
  onSelecionar: (id: string) => void
  onApagar: (id: string) => void
}

export function DashboardCaixa({
  lotes,
  onCriarNovo,
  onSelecionar,
  onApagar,
}: DashboardProps) {
  const dataAtual = new Date()
  const [novaData, setNovaData] = useState(
    dataAtual.toISOString().split('T')[0],
  )
  const [novoPeriodo, setNovoPeriodo] = useState('Almoço')
  const [saldoAbertura, setSaldoAbertura] = useState('0.00')

  const [caixaToDelete, setCaixaToDelete] = useState<string | null>(null)
  const [deleteCountdown, setDeleteCountdown] = useState<number>(5)

  useEffect(() => {
    let timer: any
    if (caixaToDelete !== null && deleteCountdown > 0) {
      timer = setInterval(() => {
        setDeleteCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [caixaToDelete, deleteCountdown])

  const handleOpenDeleteModal = (id: string) => {
    setCaixaToDelete(id)
    setDeleteCountdown(5)
  }

  const handleConfirmDelete = () => {
    if (caixaToDelete) {
      onApagar(caixaToDelete)
      setCaixaToDelete(null)
      setDeleteCountdown(5)
    }
  }

  const [mesVisualizacao, setMesVisualizacao] = useState(dataAtual.getMonth())
  const [anoVisualizacao, setAnoVisualizacao] = useState(
    dataAtual.getFullYear(),
  )

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

  const lotesFiltradosEOrdenados = lotes
    .filter((l) => {
      const dataLote = new Date(l.dataReferencia + 'T00:00:00')
      return (
        dataLote.getMonth() === mesVisualizacao &&
        dataLote.getFullYear() === anoVisualizacao
      )
    })
    .sort((a, b) => {
      const dataA = new Date(a.dataReferencia).getTime()
      const dataB = new Date(b.dataReferencia).getTime()
      if (dataA !== dataB) return dataB - dataA
      return a.periodo === 'Jantar' ? -1 : 1
    })

  const formatarDataBR = (dataString: string) => {
    const [ano, mes, dia] = dataString.split('-')
    return `${dia}/${mes}/${ano}`
  }

  const handleCriar = () => {
    const existe = lotes.find(
      (l) => l.dataReferencia === novaData && l.periodo === novoPeriodo,
    )
    if (existe) {
      alert(`Já existe um caixa de ${novoPeriodo} para este dia.`)
      return
    }
    onCriarNovo(novaData, novoPeriodo, parseFloat(saldoAbertura) || 0)
    setSaldoAbertura('0.00')
  }

  // Função para renderizar o ícone de status na lista
  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'conferido':
        return <CheckCircle2 size={18} className="text-green-500" />
      case 'alerta':
        return <AlertCircle size={18} className="text-amber-500" />
      default:
        return <Clock size={18} className="text-zinc-300" />
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 p-4 text-zinc-900 md:p-6">
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-6">
        <header className="mb-8 flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-zinc-900 p-3 text-white shadow-xl">
              <Calculator size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase leading-none tracking-tighter">
                Metrics
              </h1>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">
                Caixa PDV
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open('/api/backup/export', '_blank')}
              className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-[10px] font-black uppercase text-white transition-colors hover:bg-zinc-800"
            >
              <Download size={14} /> Exportar Backup
            </button>

            <div className="relative">
              <input
                type="file"
                id="import-backup"
                className="hidden"
                accept=".json"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return

                  if (
                    !window.confirm(
                      `Você tem certeza que deseja restaurar o backup "${file.name}"? Isso irá sobrescrever/mesclar os dados atuais.`,
                    )
                  ) {
                    e.target.value = '' // Reset input
                    return
                  }

                  try {
                    const fileContent = await file.text()
                    const jsonData = JSON.parse(fileContent)

                    const response = await fetch('/api/backup/import', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(jsonData),
                    })

                    if (response.ok) {
                      alert('Backup restaurado com sucesso!')
                      window.location.reload()
                    } else {
                      const errorData = await response.json()
                      alert(
                        'Erro ao restaurar: ' +
                          (errorData.error || 'Erro desconhecido'),
                      )
                    }
                  } catch (err) {
                    console.error(err)
                    alert('Erro ao processar arquivo de backup.')
                  }
                  e.target.value = '' // Reset import
                }}
              />
              <label
                htmlFor="import-backup"
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[10px] font-black uppercase text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700"
              >
                <Clock size={14} /> Importar Backup
              </label>
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
                  Data
                </label>
                <input
                  type="date"
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                  className="w-full rounded-xl border border-zinc-100 bg-zinc-50 p-3 font-bold outline-none"
                />
              </div>
              <div>
                <label className="mb-1 ml-2 block text-[9px] font-bold uppercase text-zinc-400">
                  Período
                </label>
                <select
                  value={novoPeriodo}
                  onChange={(e) => setNovoPeriodo(e.target.value)}
                  className="w-full rounded-xl border border-zinc-100 bg-zinc-50 p-3 font-bold"
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
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      exportarRelatorioGeralPDF(lotesFiltradosEOrdenados)
                    }
                    className="flex items-center gap-2 rounded-lg border border-red-100 bg-white px-3 py-1.5 text-[10px] font-black text-red-600 transition-colors hover:bg-red-50"
                  >
                    <FileText size={14} /> PDF
                  </button>
                  <button
                    onClick={() => exportarGeralCSV(lotesFiltradosEOrdenados)}
                    className="flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-1.5 text-[10px] font-black text-blue-600 transition-colors hover:bg-blue-50"
                  >
                    <FileSpreadsheet size={14} /> Excel
                  </button>
                </div>
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
              {lotesFiltradosEOrdenados.length > 0 ? (
                lotesFiltradosEOrdenados.map((l) => (
                  <div
                    key={l.id}
                    className="group flex items-center justify-between px-6 py-4 transition-colors hover:bg-zinc-50"
                  >
                    <div
                      className="flex flex-1 cursor-pointer items-center gap-4"
                      onClick={() => onSelecionar(l.id)}
                    >
                      {renderStatusIcon(l.status)}
                      <div>
                        <p className="text-base font-black text-zinc-800">
                          {formatarDataBR(l.dataReferencia)}
                        </p>
                        <div className="flex gap-2">
                          <span className="rounded bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase text-blue-600">
                            {l.periodo}
                          </span>
                          <span className="text-[9px] font-bold text-zinc-400">
                            Abertura: R$ {Number(l.valorAbertura).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          exportarParaCSV(
                            [l],
                            `caixa-${l.dataReferencia}-${l.periodo}.csv`,
                          )
                        }}
                        className="p-2 text-zinc-300 transition-colors hover:text-green-600"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenDeleteModal(l.id)
                        }}
                        className="p-2 text-zinc-300 transition-colors hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
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

      {/* MODAL DE CONFIRMAÇÃO DE DELETAR CAIXA COMPLETO (COM TIMER DE 5s) */}
      <AlertDialog
        open={!!caixaToDelete}
        onOpenChange={(open) => {
          if (!open) setCaixaToDelete(null)
        }}
      >
        <AlertDialogContent className="max-w-md rounded-3xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              Deletar Caixa Completo?
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Atenção: Esta ação excluirá permanentemente este caixa e <strong>todos os seus lançamentos, sangrias, suprimentos e caixinhas vinculadas</strong>. Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row sm:gap-3">
            <AlertDialogCancel
              onClick={() => setCaixaToDelete(null)}
              className="rounded-xl border-slate-200 text-xs font-bold dark:border-slate-800"
            >
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              className="rounded-xl font-bold"
              disabled={deleteCountdown > 0}
              onClick={handleConfirmDelete}
            >
              {deleteCountdown > 0 ? (
                `Aguarde (${deleteCountdown}s)`
              ) : (
                'Sim, Deletar Caixa'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
