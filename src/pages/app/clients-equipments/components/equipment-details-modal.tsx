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
  Thermometer,
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
  const cpuLoad = telemetry.cpu?.currentLoad !== undefined ? telemetry.cpu.currentLoad.toFixed(1) : 0
  const cpuDailyAvg = telemetry.cpu?.dailyAverage !== undefined ? telemetry.cpu.dailyAverage.toFixed(1) : null
  const cpuDailyPeak = telemetry.cpu?.dailyPeak !== undefined ? telemetry.cpu.dailyPeak.toFixed(1) : null

  const mem = telemetry.mem || {}
  const memTotalGB = mem.total ? (mem.total / 1024 ** 3).toFixed(1) : 0
  const memUsedPercent = mem.usedPercent !== undefined
    ? Number(mem.usedPercent).toFixed(0)
    : mem.total
      ? ((mem.active / mem.total) * 100).toFixed(0)
      : 0
  const memDailyAvg = telemetry.mem?.dailyAveragePercent !== undefined ? Number(telemetry.mem.dailyAveragePercent).toFixed(0) : null
  const memDailyPeak = telemetry.mem?.dailyPeakPercent !== undefined ? Number(telemetry.mem.dailyPeakPercent).toFixed(0) : null
  const needsRamUpgrade = telemetry.mem?.needsRamUpgrade ?? (Number(memDailyAvg ?? memUsedPercent) >= 75)

  const temp = telemetry.temp?.main || 0
  const tempObj = telemetry.temp || {}
  const tempMain = tempObj.main ? Math.round(Number(tempObj.main)) : (temp > 0 ? Math.round(temp) : null)
  const tempDailyAvg = tempObj.dailyAverage ? Math.round(Number(tempObj.dailyAverage)) : null
  const tempDailyPeak = tempObj.dailyPeak ? Math.round(Number(tempObj.dailyPeak)) : null
  const tempStatus = tempObj.status || (tempMain ? (tempMain >= 85 ? 'warning' : tempMain >= 70 ? 'moderate' : 'normal') : 'normal')
  const tempStatusLabel = tempObj.statusLabel || (tempStatus === 'warning' ? 'Superaquecimento' : tempStatus === 'moderate' ? 'Moderada' : 'Normal')
  const tempRecommendation = tempObj.recommendation || (
    tempStatus === 'warning'
      ? 'Atenção: CPU muito quente. Verificar ventoinhas e pasta térmica.'
      : tempStatus === 'moderate'
        ? 'Aceitável sob carga de processamento.'
        : 'Refrigeração ideal, sem preocupações.'
  )
  const fsSize = telemetry.fsSize || []
  const mainDrive = fsSize[0] || {}
  const driveTotalGB = mainDrive.size ? (mainDrive.size / 1024 ** 3).toFixed(1) : 0
  const driveUsedPercent = mainDrive.use ? mainDrive.use.toFixed(0) : 0
  const driveFreeGB = mainDrive.size && mainDrive.use ? ((mainDrive.size - (mainDrive.size * (mainDrive.use / 100))) / 1024 ** 3).toFixed(1) : 0

  // Informações do Disco do Sistema (Windy v2.1.4+)
  const systemDrive = telemetry.systemDrive || null
  const sysDriveLetter = systemDrive?.driveLetter || 'C:'
  const sysDriveTotalGB = systemDrive?.totalGB !== undefined ? systemDrive.totalGB.toFixed(1) : driveTotalGB
  const sysDriveFreeGB = systemDrive?.freeGB !== undefined ? systemDrive.freeGB.toFixed(1) : driveFreeGB
  const sysDriveUsedPercent = systemDrive?.usedPercent !== undefined ? Number(systemDrive.usedPercent).toFixed(0) : driveUsedPercent
  const sysDriveIsLow = systemDrive?.isLowSpace ?? (Number(sysDriveFreeGB) < 15 || Number(sysDriveUsedPercent) > 90)
  const diskActivePercent = systemDrive?.activeTimePercent !== undefined ? Number(systemDrive.activeTimePercent).toFixed(0) : null
  const diskDailyAvgActive = systemDrive?.dailyAverageActivePercent !== undefined ? Number(systemDrive.dailyAverageActivePercent).toFixed(0) : null
  const diskDailyPeakActive = systemDrive?.dailyPeakActivePercent !== undefined ? Number(systemDrive.dailyPeakActivePercent).toFixed(0) : null
  const isHighDiskActive = systemDrive?.isHighDiskUsage ?? (Number(diskActivePercent ?? 0) >= 90)

  // Top Programas Consumidores
  const topProcesses: Array<{ name: string; memoryMB: number }> = telemetry.topProcesses || []

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
      <DialogContent className="flex max-h-[92vh] w-[96vw] md:max-w-5xl lg:max-w-6xl xl:max-w-[1280px] 2xl:max-w-[1400px] flex-col overflow-hidden border-none bg-slate-50 p-0 shadow-2xl dark:bg-slate-900 rounded-3xl">
        
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
                {/* Hero Card: Sistema Operacional & Ambiente NOC */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 sm:p-7 text-white shadow-xl shadow-indigo-950/30 border border-indigo-500/30">
                  <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
                  <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-300 border border-blue-400/30 shadow-inner">
                          <Server className="h-3.5 w-3.5 text-blue-400" />
                          Sistema Operacional & Ambiente
                        </span>
                        {osInfo.arch && (
                          <span className="rounded-lg bg-white/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-slate-300 border border-white/5">
                            {osInfo.arch}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                          Telemetria Ativa
                        </span>
                      </div>

                      <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                        {osInfo.distro || 'Windows'} {osInfo.release || ''}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-300 pt-1">
                        <span className="flex items-center gap-1.5 font-bold text-white bg-white/10 px-3 py-1 rounded-xl backdrop-blur-sm">
                          🖥️ Host: {osInfo.hostname || 'Terminal'}
                        </span>
                        {osInfo.motherboard && (
                          <span className="flex items-center gap-1.5 font-mono text-slate-300 bg-white/5 px-3 py-1 rounded-xl border border-white/5">
                            Placa-Mãe: <strong className="text-indigo-200">{osInfo.motherboard}</strong>
                          </span>
                        )}
                        {cpuInfo.brand && (
                          <span className="flex items-center gap-1.5 text-slate-300 font-medium bg-white/5 px-3 py-1 rounded-xl border border-white/5">
                            CPU: <strong className="text-blue-200 truncate max-w-[320px]">{cpuInfo.brand}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Widgets Laterais do Hero */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md min-w-[150px]">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Agente Windy</p>
                        <p className="flex items-center gap-2 font-black text-emerald-400 text-base mt-0.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
                          v{windyVersion}
                        </p>
                        <span className="text-[10px] text-slate-400">Suporte Remoto Ativo</span>
                      </div>

                      {rustdeskId && (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md min-w-[170px]">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Acesso RustDesk</p>
                          <p className="font-mono font-black text-blue-300 text-base mt-0.5 tracking-wider">
                            {rustdeskId}
                          </p>
                          <span className="text-[10px] text-emerald-400">Pronto para Conectar</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Grid 4 Colunas (Métricas Rápidas & Médias Diárias Espaçosas) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                  {/* CPU */}
                  <div className="rounded-3xl border border-slate-200/70 bg-white p-5 sm:p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90 flex flex-col justify-between">
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shadow-sm">
                            <Cpu className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Processador</h4>
                            <span className="text-[11px] text-slate-400 font-medium">Uso Instantâneo</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                            {cpuLoad}%
                          </span>
                        </div>
                      </div>

                      <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                          style={{ width: Math.min(Number(cpuLoad), 100) + '%' }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 space-y-2">
                      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-2.5 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <div className="text-center border-r border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-[10px] uppercase text-slate-400 block font-bold">Média do Dia</span>
                          <strong className="text-sm font-black text-slate-900 dark:text-slate-100">{cpuDailyAvg ? `${cpuDailyAvg}%` : `${cpuLoad}%`}</strong>
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] uppercase text-slate-400 block font-bold">Pico Diário</span>
                          <strong className="text-sm font-black text-amber-600 dark:text-amber-400">{cpuDailyPeak ? `${cpuDailyPeak}%` : `${cpuLoad}%`}</strong>
                        </div>
                      </div>
                      <p className="truncate text-[11px] text-slate-400 text-center font-medium" title={cpuInfo.brand}>
                        {cpuInfo.brand || 'Processador da Máquina'}
                      </p>
                    </div>
                  </div>

                  {/* RAM */}
                  <div className={`rounded-3xl border p-5 sm:p-6 shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                    needsRamUpgrade
                      ? 'border-amber-300/80 bg-gradient-to-b from-amber-50/30 to-white dark:border-amber-500/40 dark:from-amber-950/20 dark:to-slate-900'
                      : 'border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900/90'
                  }`}>
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`rounded-2xl p-2.5 shadow-sm ${
                            needsRamUpgrade
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                          }`}>
                            <Activity className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Memória RAM</h4>
                            <span className="text-[11px] text-slate-400 font-medium">Consumo Atual</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-2xl sm:text-3xl font-black tracking-tight ${needsRamUpgrade ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {memUsedPercent}%
                          </span>
                        </div>
                      </div>

                      <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            needsRamUpgrade ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          }`}
                          style={{ width: Math.min(Number(memUsedPercent), 100) + '%' }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 space-y-2">
                      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-2.5 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <div className="text-center border-r border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-[10px] uppercase text-slate-400 block font-bold">Média do Dia</span>
                          <strong className={`text-sm font-black ${needsRamUpgrade ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}>
                            {memDailyAvg ? `${memDailyAvg}%` : `${memUsedPercent}%`}
                          </strong>
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] uppercase text-slate-400 block font-bold">Pico Diário</span>
                          <strong className="text-sm font-black text-amber-600 dark:text-amber-400">{memDailyPeak ? `${memDailyPeak}%` : `${memUsedPercent}%`}</strong>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-0.5">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">{memTotalGB} GB Total {mem.clock ? `(${mem.clock} MHz)` : ''}</span>
                        {needsRamUpgrade ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-black text-[10px] text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            ⚠️ Upgrade Indicado
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-[10px] text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            🟢 Estável
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* DISCO DO SISTEMA (C:) - TEMPO DE ATIVIDADE (USO) & CAPACIDADE */}
                  <div className={`rounded-3xl border p-5 sm:p-6 shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                    isHighDiskActive
                      ? 'border-red-400/80 bg-gradient-to-b from-red-50/40 to-white dark:border-red-500/50 dark:from-red-950/30 dark:to-slate-900 ring-2 ring-red-500/20'
                      : sysDriveIsLow
                        ? 'border-amber-300/80 bg-gradient-to-b from-amber-50/30 to-white dark:border-amber-500/40 dark:from-amber-950/20 dark:to-slate-900'
                        : 'border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900/90'
                  }`}>
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`rounded-2xl p-2.5 shadow-sm ${
                            isHighDiskActive
                              ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 animate-pulse'
                              : 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400'
                          }`}>
                            <HardDrive className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Disco ({sysDriveLetter})</h4>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {diskActivePercent !== null ? 'Tempo de Atividade (Uso)' : 'Armazenamento'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-2xl sm:text-3xl font-black tracking-tight ${
                            isHighDiskActive 
                              ? 'text-red-600 dark:text-red-400' 
                              : diskActivePercent !== null 
                                ? 'text-purple-600 dark:text-purple-400' 
                                : sysDriveIsLow ? 'text-amber-600 dark:text-amber-400' : 'text-purple-600 dark:text-purple-400'
                          }`}>
                            {diskActivePercent !== null ? `${diskActivePercent}%` : `${sysDriveUsedPercent}%`}
                          </span>
                        </div>
                      </div>

                      <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isHighDiskActive 
                              ? 'bg-gradient-to-r from-red-500 to-rose-600' 
                              : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                          }`}
                          style={{ width: Math.min(Number(diskActivePercent ?? sysDriveUsedPercent), 100) + '%' }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 space-y-2">
                      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-2.5 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {diskActivePercent !== null ? (
                          <>
                            <div className="text-center border-r border-slate-200/60 dark:border-slate-700/60">
                              <span className="text-[10px] uppercase text-slate-400 block font-bold">Média Atividade</span>
                              <strong className="text-sm font-black text-slate-900 dark:text-slate-100">
                                {diskDailyAvgActive ? `${diskDailyAvgActive}%` : `${diskActivePercent}%`}
                              </strong>
                            </div>
                            <div className="text-center">
                              <span className="text-[10px] uppercase text-slate-400 block font-bold">Pico Atividade</span>
                              <strong className={`text-sm font-black ${isHighDiskActive ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                {diskDailyPeakActive ? `${diskDailyPeakActive}%` : `${diskActivePercent}%`}
                              </strong>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-center border-r border-slate-200/60 dark:border-slate-700/60">
                              <span className="text-[10px] uppercase text-slate-400 block font-bold">Espaço Livre</span>
                              <strong className={`text-sm font-black ${sysDriveIsLow ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                {sysDriveFreeGB} GB
                              </strong>
                            </div>
                            <div className="text-center">
                              <span className="text-[10px] uppercase text-slate-400 block font-bold">Capacidade</span>
                              <strong className="text-sm font-black text-slate-900 dark:text-slate-100">{sysDriveTotalGB} GB</strong>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-0.5">
                        <span className="font-semibold text-slate-500 dark:text-slate-400 truncate pr-1">
                          {sysDriveFreeGB} GB livres de {sysDriveTotalGB} GB ({sysDriveUsedPercent}% ocupado)
                        </span>
                        {isHighDiskActive ? (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 font-black text-[10px] text-red-800 dark:bg-red-950 dark:text-red-300 whitespace-nowrap">
                            ⚠️ 100% de Disco
                          </span>
                        ) : sysDriveIsLow ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-[10px] text-amber-800 dark:bg-amber-950 dark:text-amber-300 whitespace-nowrap">
                            ⚠️ Pouco Espaço
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-[10px] text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 whitespace-nowrap">
                            🟢 I/O Normal
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* TEMPERATURA DA CPU (PROCESSADOR) */}
                  <div className={`rounded-3xl border p-5 sm:p-6 shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                    tempStatus === 'warning'
                      ? 'border-red-300/80 bg-gradient-to-b from-red-50/30 to-white dark:border-red-500/40 dark:from-red-950/20 dark:to-slate-900'
                      : tempStatus === 'moderate'
                        ? 'border-amber-300/80 bg-gradient-to-b from-amber-50/30 to-white dark:border-amber-500/40 dark:from-amber-950/20 dark:to-slate-900'
                        : 'border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900/90'
                  }`}>
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`rounded-2xl p-2.5 shadow-sm ${
                            tempStatus === 'warning'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                              : tempStatus === 'moderate'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                          }`}>
                            <Thermometer className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Temperatura</h4>
                            <span className="text-[11px] text-slate-400 font-medium">Sensores CPU</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-2xl sm:text-3xl font-black tracking-tight ${
                              tempStatus === 'warning' ? 'text-red-600 dark:text-red-400' : tempStatus === 'moderate' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {tempMain ? `${tempMain} °C` : 'N/D'}
                          </span>
                        </div>
                      </div>

                      <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            tempStatus === 'warning' ? 'bg-gradient-to-r from-red-500 to-rose-600' : tempStatus === 'moderate' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          }`}
                          style={{ width: (tempMain ? Math.min(Number(tempMain), 100) : 0) + '%' }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 space-y-2">
                      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-2.5 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <div className="text-center border-r border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-[10px] uppercase text-slate-400 block font-bold">Média do Dia</span>
                          <strong className="text-sm font-black text-slate-900 dark:text-slate-100">{tempDailyAvg ? `${tempDailyAvg} °C` : (tempMain ? `${tempMain} °C` : '-')}</strong>
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] uppercase text-slate-400 block font-bold">Pico Diário</span>
                          <strong className={`text-sm font-black ${tempStatus === 'warning' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {tempDailyPeak ? `${tempDailyPeak} °C` : (tempMain ? `${tempMain} °C` : '-')}
                          </strong>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 pt-0.5">
                        {tempStatus === 'warning' ? (
                          <span className="rounded-full bg-red-100 px-2.5 py-0.5 font-black text-[10px] text-red-800 dark:bg-red-950 dark:text-red-300">
                            🔴 {tempStatusLabel}
                          </span>
                        ) : tempStatus === 'moderate' ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-[10px] text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            🟡 {tempStatusLabel}
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-[10px] text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            🟢 {tempStatusLabel}
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-slate-400 truncate max-w-[180px]" title={tempRecommendation}>
                          {tempRecommendation}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* NOVO BLOCO: TOP PROGRAMAS QUE MAIS CONSOMEM MEMÓRIA (ESPAÇOSO PADRÃO OURO) */}
                {topProcesses && topProcesses.length > 0 && (
                  <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 shadow-sm">
                          <Activity className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-slate-900 dark:text-slate-100">
                            Top Processos Mais Pesados em Memória (RAM)
                          </h4>
                          <p className="text-xs text-slate-400 font-medium">Diagnóstico Ativo em Tempo Real do Windy</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-indigo-50 px-3 py-1 font-mono text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 w-fit">
                        {topProcesses.length} Maiores Consumidores
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
                      {topProcesses.map((proc, i) => {
                        const mb = proc.memoryMB || 0
                        const formattedMem = mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${Math.round(mb)} MB`
                        const totalMemMB = Number(memTotalGB || 8) * 1024
                        const pctOfTotal = totalMemMB > 0 ? ((mb / totalMemMB) * 100).toFixed(1) : '0'

                        return (
                          <div
                            key={i}
                            className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50/80 to-white p-4 transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:from-slate-800/40 dark:to-slate-900"
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 font-mono text-xs font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                #{i + 1}
                              </span>
                              <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                                {formattedMem}
                              </span>
                            </div>

                            <p
                              className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                              title={proc.name}
                            >
                              {proc.name}
                            </p>

                            <div className="mt-3 space-y-1.5">
                              <div className="flex justify-between text-[11px] text-slate-400">
                                <span className="font-medium">Impacto na RAM</span>
                                <span className="font-bold text-slate-600 dark:text-slate-300">{pctOfTotal}%</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500"
                                  style={{ width: `${Math.min(Math.max(Number(pctOfTotal) * 2.5, 6), 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* RustDesk Credentials Box - Design Console NOC */}
                {rustdeskId && (
                  <div className="rounded-3xl border border-slate-200/70 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 text-white shadow-xl shadow-slate-950/20">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            <MonitorPlay className="h-4 w-4" />
                          </span>
                          <h4 className="font-black text-white text-base tracking-tight">
                            Credenciais Fixas de Acesso Remoto (RustDesk)
                          </h4>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">
                          Servidor dedicado corporativo: <strong className="text-slate-200 font-mono">suporte.metrics.dev.br</strong>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {/* ID */}
                        <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-sm shadow-inner">
                          <span className="text-xs font-bold uppercase text-slate-400">ID:</span>
                          <span className="font-mono text-base font-black text-white tracking-wider">{rustdeskId}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-300 hover:bg-white/10 hover:text-white"
                            onClick={() => {
                              const cleanId = String(rustdeskId).replace(/\s+/g, '')
                              navigator.clipboard.writeText(cleanId)
                              toast.success('ID copiado!')
                            }}
                            title="Copiar ID"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* SENHA */}
                        <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-sm shadow-inner">
                          <span className="text-xs font-bold uppercase text-slate-400">Senha:</span>
                          <span className="font-mono text-base font-black text-white tracking-widest">
                            {showPassword ? rustdeskPassword : '••••••••••'}
                          </span>
                          <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-300 hover:bg-white/10 hover:text-white"
                              onClick={() => setShowPassword(!showPassword)}
                              title={showPassword ? 'Ocultar Senha' : 'Ver Senha'}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-300 hover:bg-white/10 hover:text-white"
                              onClick={() => {
                                navigator.clipboard.writeText(rustdeskPassword)
                                toast.success('Senha copiada!')
                              }}
                              title="Copiar Senha"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Botão Conectar Remoto */}
                        <Button
                          className="gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 transition-all hover:scale-[1.02]"
                          onClick={() => {
                            const cleanId = String(rustdeskId).replace(/\s+/g, '')
                            navigator.clipboard.writeText(cleanId)
                            toast.success('ID ' + cleanId + ' copiado! Abrindo RustDesk...')
                            window.location.href = 'rustdesk://' + cleanId
                          }}
                        >
                          <MonitorPlay className="h-4 w-4" />
                          Conectar Agora
                        </Button>
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
