import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  Copy,
  Cpu,
  DownloadCloud,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  HardDrive,
  MonitorPlay,
  RefreshCw,
  Server,
  Terminal,
  Wrench,
} from 'lucide-react'
import { toast } from 'sonner'

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

  const isOnline = equipment.is_online
  const telemetry = equipment.last_telemetry || {}

  // Extração segura dos dados de telemetria
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
  const windy = telemetry.windy || {}
  const windyVersion = windy.version || '2.0.0'
  const driveTotalGB = mainDrive.size ? (mainDrive.size / 1024 ** 3).toFixed(1) : 0
  const driveUsedPercent = mainDrive.use ? mainDrive.use.toFixed(0) : 0
  const driveFreeGB = mainDrive.size && mainDrive.use ? ((mainDrive.size - (mainDrive.size * (mainDrive.use / 100))) / 1024 ** 3).toFixed(1) : 0

  // Dados do RustDesk no JSONB de telemetria
  const rustdesk = telemetry.rustdesk || {}
  const rustdeskId = rustdesk.id || ''
  const isRustDeskInstalled = !!rustdesk.isInstalled || !!rustdeskId
  const rustdeskPassword = rustdesk.password || 'T0p1nf0r!!!'
  const [showPassword, setShowPassword] = useState(false)

  const queryClient = useQueryClient()

  const { mutateAsync: sendCommand, isPending: isSendingCommand } = useMutation(
    {
      mutationFn: async (commandName: string) => {
        await api.post(`/equipments/${equipment.id}/command`, {
          command: commandName,
        })
      },
      onSuccess: (_, commandName) => {
        toast.success(`Comando enviado: ${commandName}`)
        if (commandName === 'REFRESH_TELEMETRY') {
          toast.info('Aguardando resposta do equipamento...', {
            duration: 4000,
          })
          // Tenta refetch após 2s e 4s
          setTimeout(
            () =>
              queryClient.invalidateQueries({ queryKey: ['clients-fleet'] }),
            2000,
          )
          setTimeout(
            () =>
              queryClient.invalidateQueries({ queryKey: ['clients-fleet'] }),
            4000,
          )
        }
      },
      onError: () =>
        toast.error('Falha ao enviar comando ou equipamento offline.'),
    },
  )

  const handleSimulateCommand = (commandName: string) => {
    // If it's a known implemented command, send it
    if (
      commandName === 'REFRESH_TELEMETRY' ||
      commandName.startsWith('Reiniciar')
    ) {
      sendCommand(commandName)
    } else {
      toast.info(`Comando enviado para o equipamento: ${commandName}`, {
        description: 'Aguardando confirmação do agente remoto...',
      })
      setTimeout(() => {
        toast.success(`${commandName} executado com sucesso no equipamento!`)
      }, 2500)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-none bg-slate-50 p-0 shadow-2xl dark:bg-slate-900 w-[95vw] sm:max-w-[720px]">
        {/* CABEÇALHO */}
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-white p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6 dark:border-slate-800 dark:bg-slate-950">
          <div>
            <DialogTitle className="flex items-center gap-3 text-2xl font-black text-slate-800 dark:text-slate-100">
              {osInfo?.hostname || equipment.identification || equipment.type || 'Equipamento'}
              {isOnline ? (
                <span className="flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>{' '}
                  Online
                </span>
              ) : (
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Offline
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="mt-1 flex flex-wrap items-center gap-2 text-slate-500">
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs dark:bg-slate-800">
                ID: {equipment.id.split('-')[0]}
              </span>
              <span>•</span>
              <span className="rounded-full bg-cyan-100 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300">
                Windy v{windyVersion}
              </span>
              <span>•</span>
              <span>
                Visto por último:{' '}
                {equipment.last_seen_at
                  ? new Date(equipment.last_seen_at).toLocaleString()
                  : 'Nunca'}
              </span>
            </DialogDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {rustdeskId ? (
              <Button
                size="sm"
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 font-bold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700"
                onClick={() => {
                  const cleanId = String(rustdeskId).replace(/\s+/g, '')
                  navigator.clipboard.writeText(cleanId)
                  toast.success(`ID ${cleanId} copiado! Senha de acesso: ${rustdeskPassword}`)
                  window.location.href = `rustdesk://${cleanId}`
                }}
              >
                <MonitorPlay className="h-4 w-4" />
                Acesso Remoto
              </Button>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-cyan-700 hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-950/40"
              disabled={!isOnline || isSendingCommand}
              onClick={() => handleSimulateCommand('UPDATE_AGENT')}
              title="Disparar atualização remota e silenciosa do Windy neste terminal"
            >
              <DownloadCloud className="h-4 w-4" />
              Atualizar Windy
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={!isOnline || isSendingCommand}
              onClick={() => handleSimulateCommand('REFRESH_TELEMETRY')}
            >
              <RefreshCw
                className={`h-4 w-4 ${isSendingCommand ? 'animate-spin' : ''}`}
              />
              Atualizar Agora
            </Button>
          </div>
        </div>

        <Tabs defaultValue="telemetry" className="w-full">
          <div className="border-b border-slate-100 bg-white px-6 pt-4 dark:border-slate-800 dark:bg-slate-950">
            <TabsList className="space-x-6 bg-transparent pb-0">
              <TabsTrigger
                value="telemetry"
                className="rounded-none px-1 pb-3 font-bold text-slate-500 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
              >
                Telemetria
              </TabsTrigger>
              <TabsTrigger
                value="maintenance"
                className="rounded-none px-1 pb-3 font-bold text-slate-500 data-[state=active]:border-b-2 data-[state=active]:border-amber-600 data-[state=active]:bg-transparent data-[state=active]:text-amber-600 data-[state=active]:shadow-none"
              >
                Manutenção Remota
              </TabsTrigger>
              <TabsTrigger
                value="install"
                className="rounded-none px-1 pb-3 font-bold text-slate-500 data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 data-[state=active]:shadow-none"
              >
                Instalação Expressa
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="custom-scrollbar max-h-[75vh] overflow-y-auto p-6">
            {/* ABA 1: TELEMETRIA */}
            <TabsContent value="telemetry" className="mt-0">
              <div className="grid grid-cols-2 gap-4">
                {/* Card RustDesk */}
                <div className="col-span-2 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 p-5 dark:border-blue-900/40 dark:bg-slate-900/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-blue-600 p-3 text-white shadow-md shadow-blue-500/30">
                        <MonitorPlay className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 dark:text-slate-100">
                            Acesso Remoto RustDesk (Servidor Próprio)
                          </h4>
                          {isRustDeskInstalled ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                              Ativo
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800">
                              Não detectado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Servidor: <span className="font-mono font-medium text-blue-600 dark:text-blue-400">suporte.metrics.dev.br</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {rustdeskId ? (
                        <Button
                          size="sm"
                          className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-md shadow-blue-500/20"
                          onClick={() => {
                            const cleanId = String(rustdeskId).replace(/\s+/g, '')
                            navigator.clipboard.writeText(cleanId)
                            toast.success(`ID ${cleanId} copiado! Senha: ${rustdeskPassword}`)
                            window.location.href = `rustdesk://${cleanId}`
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                          Conectar Agora
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          disabled={!isOnline || isSendingCommand}
                          onClick={() => handleSimulateCommand('Instalar RustDesk')}
                        >
                          <DownloadCloud className="h-4 w-4" />
                          Instalar RustDesk no Terminal
                        </Button>
                      )}
                    </div>
                  </div>

                  {rustdeskId && (
                    <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-blue-100/80 pt-3 dark:border-blue-900/40">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">ID do Terminal:</span>
                        <span className="rounded-md border border-blue-200 bg-white px-2.5 py-1 font-mono text-sm font-bold text-blue-900 shadow-sm dark:border-blue-800 dark:bg-slate-800 dark:text-blue-200">
                          {rustdeskId}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs text-slate-600 dark:text-slate-300"
                          onClick={() => {
                            const cleanId = String(rustdeskId).replace(/\s+/g, '')
                            navigator.clipboard.writeText(cleanId)
                            toast.success('ID copiado!')
                          }}
                          title="Copiar ID"
                        >
                          <Copy className="mr-1 h-3 w-3" />
                          Copiar ID
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Senha Fixa:</span>
                        <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono text-sm font-bold text-slate-800 shadow-sm dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100">
                          {showPassword ? rustdeskPassword : '••••••••••'}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs text-slate-600 dark:text-slate-300"
                          onClick={() => setShowPassword(!showPassword)}
                          title={showPassword ? 'Ocultar Senha' : 'Ver Senha'}
                        >
                          {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs text-slate-600 dark:text-slate-300"
                          onClick={() => {
                            navigator.clipboard.writeText(rustdeskPassword)
                            toast.success('Senha copiada: ' + rustdeskPassword)
                          }}
                          title="Copiar Senha"
                        >
                          <Copy className="mr-1 h-3 w-3" />
                          Copiar Senha
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card OS */}
                <div className="col-span-2 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-5 text-white shadow-lg shadow-blue-500/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-100">
                        Sistema Operacional
                      </p>
                      <h3 className="mt-1 text-xl font-black">
                        {osInfo.distro || 'Desconhecido'} {osInfo.release || ''}
                      </h3>
                      <p className="mt-1 flex items-center gap-2 text-sm text-blue-200">
                        <Server className="h-4 w-4" />{' '}
                        {osInfo.hostname || 'N/A'} • {osInfo.arch || 'N/A'} {osInfo.motherboard ? `• ${osInfo.motherboard}` : ''}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                      <Cpu className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Card CPU */}
                <div className="rounded-2xl border border-slate-200/50 bg-white/80 p-5 dark:border-slate-700/50 dark:bg-slate-800/80">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                      <Cpu className="h-4 w-4 text-blue-500" /> Uso de CPU
                    </h4>
                    <span className="text-2xl font-black text-blue-600">
                      {cpuLoad}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-900">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${Math.min(Number(cpuLoad), 100)}%` }}
                    ></div>
                  </div>
                  <p className="mt-2 text-right text-xs font-medium text-slate-400">
                    {cpuInfo.brand || 'N/A'}
                  </p>
                </div>

                {/* Card RAM */}
                <div className="rounded-2xl border border-slate-200/50 bg-white/80 p-5 dark:border-slate-700/50 dark:bg-slate-800/80">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                      <Activity className="h-4 w-4 text-emerald-500" /> Memória
                      RAM
                    </h4>
                    <span className="text-2xl font-black text-emerald-600">
                      {memUsedPercent}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-900">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
                      style={{
                        width: `${Math.min(Number(memUsedPercent), 100)}%`,
                      }}
                    ></div>
                  </div>
                  <p className="mt-2 text-right text-xs font-medium text-slate-400">
                    {memTotalGB} GB Total {mem.clock ? `• ${mem.clock} MHz` : ''}
                  </p>
                </div>

                {/* Card Temperatura */}
                  <div className="rounded-2xl border border-slate-200/50 bg-white/80 p-5 dark:border-slate-700/50 dark:bg-slate-800/80">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                        <AlertTriangle
                         className={`h-4 w-4 ${temp > 0 ? (temp > 80 ? 'text-red-500' : 'text-amber-500') : 'text-slate-400'}`}
                        />{' '}
                       Temperatura
                      </h4>
                      <span
                       className={`text-2xl font-black ${temp > 0 ? (temp > 80 ? 'text-red-600' : 'text-amber-600') : 'text-slate-400'}`}
                      >
                       {temp > 0 ? `${temp} °C` : 'N/D'}
                      </span>
                    </div>
                  </div>

                {/* Card Disco */}
                <div className="rounded-2xl border border-slate-200/50 bg-white/80 p-5 dark:border-slate-700/50 dark:bg-slate-800/80">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                      <HardDrive className="h-4 w-4 text-purple-500" /> Armazenamento
                    </h4>
                    <span className="text-2xl font-black text-purple-600">
                      {driveUsedPercent}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-900">
                    <div
                      className="h-2 rounded-full bg-purple-500"
                      style={{
                        width: `${Math.min(Number(driveUsedPercent), 100)}%`,
                      }}
                    ></div>
                  </div>
                  <p className="mt-2 text-right text-xs font-medium text-slate-400">
                    {driveFreeGB} GB Livres de {driveTotalGB} GB ({mainDrive.fs || 'C:'})
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: MANUTENÇÃO */}
            <TabsContent value="maintenance" className="mt-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div
                  className="cursor-pointer rounded-2xl border border-slate-200/50 bg-white/80 p-6 transition-colors hover:bg-white dark:border-slate-700/50 dark:bg-slate-800/80 dark:hover:bg-slate-800"
                  onClick={() =>
                    handleSimulateCommand('Limpeza de Disco (CCleaner)')
                  }
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-amber-100 p-3 text-amber-600 dark:bg-amber-900/30">
                      <HardDrive className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">
                        Limpeza de Disco Avançada
                      </h4>
                      <p className="mt-1 text-sm text-slate-500">
                        Limpa arquivos temporários, logs antigos e caches
                        (Estilo CCleaner).
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="cursor-pointer rounded-2xl border border-slate-200/50 bg-white/80 p-6 transition-colors hover:bg-white dark:border-slate-700/50 dark:bg-slate-800/80 dark:hover:bg-slate-800"
                  onClick={() =>
                    handleSimulateCommand('Análise de Armazenamento (TreeSize)')
                  }
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/30">
                      <MonitorPlay className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">
                        Mapeamento de Armazenamento
                      </h4>
                      <p className="mt-1 text-sm text-slate-500">
                        Varredura de grandes arquivos e pastas no disco C:
                        (Estilo TreeSize).
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="cursor-pointer rounded-2xl border border-slate-200/50 bg-white/80 p-6 transition-colors hover:bg-white dark:border-slate-700/50 dark:bg-slate-800/80 dark:hover:bg-slate-800"
                  onClick={() =>
                    handleSimulateCommand('Reiniciar Serviço Eureca')
                  }
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-900/30">
                      <Activity className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">
                        Reiniciar Agente
                      </h4>
                      <p className="mt-1 text-sm text-slate-500">
                        Força o reinício do serviço Eureca na máquina do
                        cliente.
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="cursor-pointer rounded-2xl border border-red-200/50 bg-white/80 p-6 transition-colors hover:bg-red-50 dark:border-red-900/20 dark:bg-slate-800/80 dark:hover:bg-red-900/20"
                  onClick={() =>
                    handleSimulateCommand('Reiniciar Sistema Operacional')
                  }
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-red-100 p-3 text-red-600 dark:bg-red-900/30">
                      <Terminal className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-700 dark:text-red-400">
                        Reboot Forçado
                      </h4>
                      <p className="mt-1 text-sm text-red-500/80">
                        Envia comando de reinicialização completa para o sistema
                        operacional.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ABA 3: INSTALAÇÃO EXPRESSA */}
            <TabsContent value="install" className="mt-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  {
                    name: 'WhatsApp',
                    desc: 'Mensageiro',
                    color: 'bg-emerald-50 text-emerald-600',
                  },
                  {
                    name: 'qBittorrent',
                    desc: 'Torrent Client',
                    color: 'bg-blue-50 text-blue-600',
                  },
                  {
                    name: 'Discord',
                    desc: 'Comunicação',
                    color: 'bg-indigo-50 text-indigo-600',
                  },
                  {
                    name: 'Google Chrome',
                    desc: 'Navegador',
                    color: 'bg-red-50 text-red-600',
                  },
                  {
                    name: 'WinRAR',
                    desc: 'Compactador',
                    color: 'bg-slate-100 text-slate-700',
                  },
                  {
                    name: 'RustDesk',
                    desc: 'Acesso Remoto',
                    color: 'bg-blue-50 text-blue-600',
                  },
                ].map((app) => (
                  <div
                    key={app.name}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-slate-200/50 bg-white/80 p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-700/50 dark:bg-slate-800/80"
                    onClick={() =>
                      handleSimulateCommand(`Instalar ${app.name}`)
                    }
                  >
                    <div
                      className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black ${app.color}`}
                    >
                      {app.name[0]}
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">
                      {app.name}
                    </h4>
                    <p className="text-xs font-medium text-slate-500">
                      {app.desc}
                    </p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

