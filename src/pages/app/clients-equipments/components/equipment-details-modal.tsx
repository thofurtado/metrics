import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Cpu,
  DownloadCloud,
  ExternalLink,
  Eye,
  EyeOff,
  HardDrive,
  MonitorPlay,
  Play,
  Printer,
  RefreshCw,
  Server,
  ShoppingCart,
  Terminal,
  Wifi,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { NiimbotLabelModal } from '../../treatments/components/niimbot-label-modal'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/axios'

interface EquipmentDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipment: any
}

export function EquipmentDetailsModal({
  open,
  onOpenChange,
  equipment,
}: EquipmentDetailsModalProps) {
  if (!equipment) return null

    const isOnline = Boolean(
    equipment.last_seen_at &&
      !isNaN(new Date(equipment.last_seen_at).getTime()) &&
      (Date.now() - new Date(equipment.last_seen_at).getTime()) > -120000 &&
      (Date.now() - new Date(equipment.last_seen_at).getTime()) < 6 * 60 * 1000
  )
  const telemetry = equipment.last_telemetry || {}

  // Extração dos dados de telemetria
  const osInfo = telemetry.osInfo || {}
  const cpuInfo = telemetry.cpu || {}
  const cpuLoad = telemetry.cpu?.currentLoad?.toFixed(1) || 0
  const mem = telemetry.mem || {}
  const memTotalGB = mem.total ? (mem.total / 1024 ** 3).toFixed(1) : 0
  const memUsedPercent = mem.total
    ? ((mem.active / mem.total) * 100).toFixed(0)
    : 0
  const temp = telemetry.temp?.main || 0
  const fsSize = telemetry.fsSize || []
  const mainDrive = fsSize[0] || {}
  const driveTotalGB = mainDrive.size ? (mainDrive.size / 1024 ** 3).toFixed(1) : 0
  const driveUsedPercent = mainDrive.use ? mainDrive.use.toFixed(0) : 0
  const driveFreeGB = mainDrive.size && mainDrive.use ? ((mainDrive.size - (mainDrive.size * (mainDrive.use / 100))) / 1024 ** 3).toFixed(1) : 0

  // Identificação do Perfil do Equipamento (PDV, Windy, Híbrido)
  const windy = telemetry.windy || {}
  const hasWindy = !!windy.version || !!osInfo.distro || !equipment.type?.toLowerCase().includes('pdv')
  const windyVersion = windy.version || '2.1.3'

  const pdv = telemetry.pdv || {}
  const isPdvExplicit = equipment.type?.toLowerCase().includes('pdv') || equipment.identification?.toLowerCase().includes('pdv') || !!telemetry.pdv
  const hasPdv = isPdvExplicit || !!pdv.version
  const pdvVersion = pdv.version || '2.4.0'
  const pdvCoreServiceOnline = pdv.coreServiceOnline ?? true
  const pdvLastSync = pdv.lastSyncTime || null
  const pdvPendingFiscal = pdv.contingenciaPendentes ?? 0

  const profileType =
    hasPdv && hasWindy && osInfo.distro
      ? 'HYBRID'
      : hasPdv && !osInfo.distro
      ? 'PDV_ONLY'
      : 'WINDY_ONLY'

  // Dados do RustDesk
  const rustdesk = telemetry.rustdesk || {}
  const rustdeskId = rustdesk.id || ''
  const rustdeskPassword = rustdesk.password || 'T0p1nf0r!!!'
  const [showPassword, setShowPassword] = useState(false)
  const [labelModalOpen, setLabelModalOpen] = useState(false)

  const queryClient = useQueryClient()

  const { mutateAsync: sendCommand, isPending: isSendingCommand } = useMutation(
    {
      mutationFn: async (commandName) => {
        await api.post('/equipments/' + equipment.id + '/command', {
          command: commandName,
        })
      },
      onSuccess: (_, commandName) => {
        toast.success('Comando enviado: ' + commandName)
        if (commandName === 'REFRESH_TELEMETRY') {
          toast.info('Aguardando resposta do equipamento...', { duration: 4000 })
          setTimeout(() => queryClient.invalidateQueries({ queryKey: ['clients-fleet'] }), 2000)
          setTimeout(() => queryClient.invalidateQueries({ queryKey: ['clients-fleet'] }), 4000)
        }
      },
      onError: () => toast.error('Falha ao enviar comando ou equipamento offline.'),
    },
  )

  const handleSimulateCommand = (commandName) => {
    if (commandName === 'UPDATE_AGENT' || commandName === 'ATUALIZAR_WINDY') {
      toast.info('Solicitando atualização remota do Windy...', {
        description: 'O terminal vai baixar a última versão e reiniciar em segundo plano.',
        duration: 5000,
      })
      sendCommand('ATUALIZAR_WINDY')
    } else if (commandName === 'ATUALIZAR_PDV') {
      toast.info('Solicitando atualização remota do Metrics PDV...', {
        description: 'O PDV vai baixar o novo instalador e aplicar o patch em segundo plano.',
        duration: 5000,
      })
      sendCommand('ATUALIZAR_PDV')
    } else {
      sendCommand(commandName)
    }
  }

  const defaultTab = profileType === 'PDV_ONLY' ? 'pdv' : profileType === 'HYBRID' ? 'overview' : 'telemetry'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94vh] w-[96vw] sm:max-w-[920px] flex-col overflow-hidden border-none bg-slate-50 p-0 shadow-2xl dark:bg-slate-900 rounded-3xl">
        
        {/* CABEÇALHO FIXO RESPONSIVO */}
        <div className="flex-none border-b border-slate-100 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <DialogTitle className="flex flex-wrap items-center gap-2 text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100">
                {osInfo?.hostname || equipment.identification || equipment.type || 'Equipamento'}
                {isOnline ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>{' '}
                    Online
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    Offline
                  </span>
                )}
                {profileType === 'HYBRID' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                    💎 Híbrido (PDV + TI)
                  </span>
                )}
                {profileType === 'PDV_ONLY' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                    🏷️ Frente de Caixa (PDV)
                  </span>
                )}
                {profileType === 'WINDY_ONLY' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-bold text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300">
                    🪶 Monitor Suporte TI
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500">
                <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs dark:bg-slate-800">
                  ID: {equipment.id.split('-')[0]}
                </span>
                {equipment.client?.name && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {equipment.client.name}
                    </span>
                  </>
                )}
                {hasPdv && (
                  <>
                    <span>•</span>
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                      PDV v{pdvVersion}
                    </span>
                  </>
                )}
                {hasWindy && (
                  <>
                    <span>•</span>
                    <span className="rounded-md bg-cyan-50 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300">
                      Windy v{windyVersion}
                    </span>
                  </>
                )}
              </DialogDescription>
            </div>

            {/* BOTÕES DE AÇÃO RÁPIDA NO HEADER */}
            <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
              {rustdeskId ? (
                <Button
                  size="sm"
                  className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 font-bold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700"
                  onClick={() => {
                    const cleanId = String(rustdeskId).replace(/\s+/g, '')
                    navigator.clipboard.writeText(cleanId)
                    toast.success('ID ' + cleanId + ' copiado! Senha: ' + rustdeskPassword)
                    window.location.href = 'rustdesk://' + cleanId
                  }}
                >
                  <MonitorPlay className="h-4 w-4" />
                  <span className="hidden sm:inline">Acesso Remoto</span>
                  <span className="sm:hidden">Remoto</span>
                </Button>
              ) : null}

              {hasPdv && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                  disabled={isSendingCommand}
                  onClick={() => handleSimulateCommand('ATUALIZAR_PDV')}
                  title="Atualizar Metrics PDV remotamente"
                >
                  <DownloadCloud className="h-4 w-4" />
                  <span>Update PDV</span>
                </Button>
              )}

              {hasWindy && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-950/40"
                  disabled={isSendingCommand}
                  onClick={() => handleSimulateCommand('ATUALIZAR_WINDY')}
                  title="Atualizar Windy remotamente"
                >
                  <DownloadCloud className="h-4 w-4" />
                  <span>Update Windy</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                onClick={() => setLabelModalOpen(true)}
                title="Imprimir Etiqueta Niimbot D110"
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Etiqueta</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                onClick={() => window.open('/equipamento/' + equipment.id, '_blank')}
                title="Abrir Laudo Técnico Público"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={isSendingCommand}
                onClick={() => handleSimulateCommand('REFRESH_TELEMETRY')}
                title="Atualizar Telemetria"
              >
                <RefreshCw className={'h-4 w-4 ' + (isSendingCommand ? 'animate-spin' : '')} />
              </Button>
            </div>
          </div>
        </div>

        {/* ÁREA DE ABAS */}
        <Tabs defaultValue={defaultTab} className="flex flex-1 flex-col overflow-hidden">
          
          <div className="flex-none border-b border-slate-100 bg-white px-4 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
            <TabsList className="flex flex-wrap gap-2 sm:gap-6 bg-transparent pb-0">
              {profileType === 'HYBRID' && (
                <TabsTrigger
                  value="overview"
                  className="rounded-none px-1 pb-3 font-bold text-slate-500 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:bg-transparent data-[state=active]:text-purple-600"
                >
                  Visão Geral
                </TabsTrigger>
              )}

              {hasPdv && (
                <TabsTrigger
                  value="pdv"
                  className="rounded-none px-1 pb-3 font-bold text-slate-500 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600"
                >
                  Ponto de Venda (PDV)
                </TabsTrigger>
              )}

              {hasWindy && (
                <TabsTrigger
                  value="telemetry"
                  className="rounded-none px-1 pb-3 font-bold text-slate-500 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600"
                >
                  Hardware & NOC
                </TabsTrigger>
              )}

              <TabsTrigger
                value="maintenance"
                className="rounded-none px-1 pb-3 font-bold text-slate-500 data-[state=active]:border-b-2 data-[state=active]:border-amber-600 data-[state=active]:bg-transparent data-[state=active]:text-amber-600"
              >
                Manutenção Remota
              </TabsTrigger>

              {hasWindy && (
                <TabsTrigger
                  value="install"
                  className="rounded-none px-1 pb-3 font-bold text-slate-500 data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-600"
                >
                  Instalação Expressa
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-6">
            
            {/* ABA: VISÃO GERAL (HÍBRIDO) */}
            {profileType === 'HYBRID' && (
              <TabsContent value="overview" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Card PDV Status Resumo */}
                  <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm dark:border-indigo-950 dark:from-slate-900 dark:to-indigo-950/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-xl bg-indigo-600 p-2.5 text-white shadow-md shadow-indigo-500/20">
                          <ShoppingCart className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100">Metrics PDV</h4>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Versão {pdvVersion}</p>
                        </div>
                      </div>
                      <span className={'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ' + (pdvCoreServiceOnline ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-red-100 text-red-700')}>
                        {pdvCoreServiceOnline ? 'CoreService Ativo' : 'Parado'}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-white/80 p-2.5 dark:bg-slate-800">
                        <span className="text-slate-500">Contingências:</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{pdvPendingFiscal} pendentes</p>
                      </div>
                      <div className="rounded-lg bg-white/80 p-2.5 dark:bg-slate-800">
                        <span className="text-slate-500">Sincronismo:</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{pdvLastSync ? new Date(pdvLastSync).toLocaleTimeString() : 'Automático'}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        className="w-full gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                        onClick={() => handleSimulateCommand('ATUALIZAR_PDV')}
                      >
                        <DownloadCloud className="h-4 w-4" /> Atualizar PDV
                      </Button>
                    </div>
                  </div>

                  {/* Card Saúde Hardware Resumo */}
                  <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm dark:border-blue-950 dark:from-slate-900 dark:to-blue-950/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-xl bg-blue-600 p-2.5 text-white shadow-md shadow-blue-500/20">
                          <Cpu className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100">Saúde do Terminal</h4>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{osInfo.distro || 'Windows 11'}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-500">CPU {cpuLoad}% • RAM {memUsedPercent}%</span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-white/80 p-2.5 text-center dark:bg-slate-800">
                        <span className="text-slate-400">RAM</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{memTotalGB} GB</p>
                      </div>
                      <div className="rounded-lg bg-white/80 p-2.5 text-center dark:bg-slate-800">
                        <span className="text-slate-400">Disco C:</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{driveUsedPercent}%</p>
                      </div>
                      <div className="rounded-lg bg-white/80 p-2.5 text-center dark:bg-slate-800">
                        <span className="text-slate-400">Temp</span>
                        <p className={'font-bold ' + (temp > 75 ? 'text-red-500' : 'text-slate-800 dark:text-slate-200')}>{temp > 0 ? (temp + '°C') : 'N/D'}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300"
                        onClick={() => handleSimulateCommand('ATUALIZAR_WINDY')}
                      >
                        <DownloadCloud className="h-4 w-4" /> Atualizar Windy
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}

            {/* ABA: PONTO DE VENDA (PDV) */}
            {hasPdv && (
              <TabsContent value="pdv" className="mt-0 space-y-6">
                {/* Banner Status PDV */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 text-white shadow-lg shadow-indigo-600/20">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-white/20 px-2 py-0.5 text-xs font-black uppercase tracking-wider">
                        Versão Instalada
                      </span>
                      <span className="font-mono text-sm font-bold">v{pdvVersion}</span>
                    </div>
                    <h3 className="mt-2 text-2xl font-black">Metrics PDV & CoreService</h3>
                    <p className="mt-1 text-sm text-indigo-100">
                      Serviço local de retaguarda, contingência offline e impressões de comandas.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="gap-2 bg-white font-black text-indigo-700 shadow-lg hover:bg-indigo-50"
                    onClick={() => handleSimulateCommand('ATUALIZAR_PDV')}
                  >
                    <DownloadCloud className="h-5 w-5" />
                    Atualizar PDV Remoto
                  </Button>
                </div>

                {/* Cards de Métricas Operacionais do PDV */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Core Service (Porta 5000)</span>
                      <Activity className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={'h-3 w-3 rounded-full ' + (pdvCoreServiceOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500')} />
                      <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                        {pdvCoreServiceOnline ? 'Em Execução' : 'Parado'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Gerencia sincronização e impressoras</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contingência NFC-e</span>
                      <Server className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="mt-2">
                      <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                        {pdvPendingFiscal} Pendente(s)
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Transmissão automática com SEFAZ</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sincronização em Nuvem</span>
                      <Wifi className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="mt-2">
                      <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                        {pdvLastSync ? new Date(pdvLastSync).toLocaleTimeString() : 'Ativa (WebSocket)'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Cardápio online, estoque e fechamentos</p>
                  </div>
                </div>

                {/* Comandos Rápidos do PDV */}
                <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
                  <h4 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-200">Ações Rápidas de Manutenção do PDV</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      className="justify-start gap-2 bg-white text-xs font-semibold hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                      onClick={() => handleSimulateCommand('RESTART_CORE_SERVICE')}
                    >
                      <RefreshCw className="h-4 w-4 text-indigo-500" />
                      Reiniciar Core Service
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start gap-2 bg-white text-xs font-semibold hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                      onClick={() => handleSimulateCommand('FORCE_SYNC')}
                    >
                      <Zap className="h-4 w-4 text-emerald-500" />
                      Forçar Sincronismo Geral
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start gap-2 bg-white text-xs font-semibold hover:bg-amber-50 hover:text-amber-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                      onClick={() => handleSimulateCommand('TEST_PRINTER')}
                    >
                      <Printer className="h-4 w-4 text-amber-500" />
                      Testar Impressão de Comanda
                    </Button>
                  </div>
                </div>
              </TabsContent>
            )}

            {/* ABA: TELEMETRIA & HARDWARE (WINDY) */}
            {hasWindy && (
              <TabsContent value="telemetry" className="mt-0 space-y-6">
                {/* Card OS Full Width */}
                <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-5 text-white shadow-lg shadow-blue-500/20">
                  <div>
                    <p className="text-sm font-medium text-blue-100 uppercase tracking-wider">
                      Sistema Operacional
                    </p>
                    <h3 className="mt-1 text-2xl font-black">
                      {osInfo.distro || 'Windows'} {osInfo.release || ''}
                    </h3>
                    <p className="mt-1 flex items-center gap-2 text-sm text-blue-200">
                      <Server className="h-4 w-4" />{' '}
                      {osInfo.hostname || 'N/A'} • {osInfo.arch || 'N/A'} {osInfo.motherboard ? ('• ' + osInfo.motherboard) : ''}
                    </p>
                  </div>
                  <div className="hidden sm:block rounded-xl bg-white/20 p-4 backdrop-blur-sm">
                    <MonitorPlay className="h-8 w-8 text-white" />
                  </div>
                </div>

                {/* Grid 4 Colunas (Métricas Rápidas) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* CPU */}
                  <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-800">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                        <Cpu className="h-4 w-4 text-blue-500" /> CPU
                      </h4>
                      <span className="text-xl font-black text-blue-600">{cpuLoad}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-900">
                      <div
                        className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                        style={{ width: Math.min(Number(cpuLoad), 100) + '%' }}
                      />
                    </div>
                    <p className="mt-3 truncate text-xs font-medium text-slate-400" title={cpuInfo.brand}>
                      {cpuInfo.brand || 'N/A'}
                    </p>
                  </div>

                  {/* RAM */}
                  <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-800">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                        <Activity className="h-4 w-4 text-emerald-500" /> RAM
                      </h4>
                      <span className="text-xl font-black text-emerald-600">{memUsedPercent}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-900">
                      <div
                        className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: Math.min(Number(memUsedPercent), 100) + '%' }}
                      />
                    </div>
                    <p className="mt-3 text-xs font-medium text-slate-400">
                      {memTotalGB} GB Total {mem.clock ? ('• ' + mem.clock + ' MHz') : ''}
                    </p>
                  </div>

                  {/* DISCO */}
                  <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-800">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                        <HardDrive className="h-4 w-4 text-purple-500" /> Armazenamento
                      </h4>
                      <span className="text-xl font-black text-purple-600">{driveUsedPercent}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-900">
                      <div
                        className="h-2 rounded-full bg-purple-500 transition-all duration-500"
                        style={{ width: Math.min(Number(driveUsedPercent), 100) + '%' }}
                      />
                    </div>
                    <p className="mt-3 text-xs font-medium text-slate-400">
                      {driveFreeGB} GB Livres de {driveTotalGB} GB
                    </p>
                  </div>

                  {/* TEMPERATURA */}
                  <div className="rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-800">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                        <AlertTriangle
                          className={'h-4 w-4 ' + (temp > 0 ? (temp > 80 ? 'text-red-500' : 'text-amber-500') : 'text-slate-400')}
                        />{' '}
                        Temp.
                      </h4>
                      <span
                        className={'text-xl font-black ' + (temp > 0 ? (temp > 80 ? 'text-red-600' : 'text-amber-600') : 'text-slate-400')}
                      >
                        {temp > 0 ? (temp + ' °C') : 'N/D'}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-900">
                      <div
                        className={'h-2 rounded-full transition-all duration-500 ' + (temp > 80 ? 'bg-red-500' : temp > 60 ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700')}
                        style={{ width: (temp > 0 ? Math.min(Number(temp), 100) : 0) + '%' }}
                      />
                    </div>
                    <p className="mt-3 text-xs font-medium text-slate-400">
                      Sensores de Hardware
                    </p>
                  </div>
                </div>

                {/* RustDesk Credentials Box */}
                {rustdeskId && (
                  <div className="rounded-2xl border border-slate-200/50 bg-slate-50 p-5 dark:border-slate-800/50 dark:bg-slate-900/50">
                    <h4 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-200">Credenciais Fixas de Acesso Remoto</h4>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">ID:</span>
                        <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100">{rustdeskId}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          onClick={() => {
                            const cleanId = String(rustdeskId).replace(/\s+/g, '')
                            navigator.clipboard.writeText(cleanId)
                            toast.success('ID copiado!')
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Senha:</span>
                        <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
                          {showPassword ? rustdeskPassword : '••••••••••'}
                        </span>
                        <div className="flex items-center gap-1 border-l border-slate-100 pl-2 dark:border-slate-700">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            onClick={() => {
                              navigator.clipboard.writeText(rustdeskPassword)
                              toast.success('Senha copiada!')
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            )}

            {/* ABA: MANUTENÇÃO REMOTA */}
            <TabsContent value="maintenance" className="mt-0">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div
                  className="cursor-pointer rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-700/50 dark:bg-slate-800"
                  onClick={() => handleSimulateCommand('Limpeza de Disco (CCleaner)')}
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-amber-100 p-3 text-amber-600 dark:bg-amber-900/30">
                      <HardDrive className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">
                        Limpeza de Disco Avançada
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Limpa arquivos temporários, logs antigos e caches do sistema.
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="cursor-pointer rounded-2xl border border-slate-200/50 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-700/50 dark:bg-slate-800"
                  onClick={() => handleSimulateCommand('Reiniciar Serviço Eureca')}
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-900/30">
                      <Activity className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">
                        Reiniciar Agentes em Segundo Plano
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Força o reinício limpo dos serviços do Windy e do PDV.
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="group cursor-pointer rounded-2xl border border-red-200/50 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:bg-red-50 hover:shadow-md dark:border-red-900/20 dark:bg-slate-800 dark:hover:bg-red-900/20"
                  onClick={() => handleSimulateCommand('Reiniciar Sistema Operacional')}
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-red-100 p-3 text-red-600 transition-colors group-hover:bg-red-200 dark:bg-red-900/30">
                      <Terminal className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 group-hover:text-red-700 dark:text-slate-200 dark:group-hover:text-red-400">
                        Reboot Remoto Forçado
                      </h4>
                      <p className="mt-1 text-xs text-slate-500 group-hover:text-red-600/80">
                        Envia comando de reinicialização segura para o Windows.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ABA: INSTALAÇÃO EXPRESSA */}
            {hasWindy && (
              <TabsContent value="install" className="mt-0">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {[
                    { name: 'WhatsApp', desc: 'Mensageiro', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' },
                    { name: 'qBittorrent', desc: 'Torrent Client', color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' },
                    { name: 'Discord', desc: 'Comunicação', color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20' },
                    { name: 'Google Chrome', desc: 'Navegador', color: 'bg-red-50 text-red-600 dark:bg-red-900/20' },
                    { name: 'WinRAR', desc: 'Compactador', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800' },
                    { name: 'RustDesk', desc: 'Acesso Remoto', color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' },
                  ].map((app) => (
                    <div
                      key={app.name}
                      className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-slate-200/50 bg-white p-4 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-700/50 dark:bg-slate-800"
                      onClick={() => handleSimulateCommand('Instalar ' + app.name)}
                    >
                      <div className={'mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black shadow-sm ' + app.color}>
                        {app.name[0]}
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {app.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">{app.desc}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}

          </div>
        </Tabs>
      </DialogContent>
      <NiimbotLabelModal
        open={labelModalOpen}
        onOpenChange={setLabelModalOpen}
        equipment={{
          id: equipment.id,
          identification: osInfo?.hostname || equipment.identification || equipment.type,
          clientName: equipment.client?.name || 'Cliente',
          type: equipment.type,
        }}
      />
    </Dialog>
  )
}
