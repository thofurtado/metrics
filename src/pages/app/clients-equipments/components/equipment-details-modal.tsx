import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Server, Activity, Wrench, DownloadCloud, Terminal, HardDrive, Cpu, AlertTriangle, MonitorPlay } from 'lucide-react'
import { toast } from 'sonner'

interface EquipmentDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipment: any
}

export function EquipmentDetailsModal({ open, onOpenChange, equipment }: EquipmentDetailsModalProps) {
  if (!equipment) return null

  const isOnline = equipment.is_online
  const telemetry = equipment.last_telemetry || {}
  
  // Extração segura dos dados de telemetria
  const osInfo = telemetry.osInfo || {}
  const cpuInfo = telemetry.cpu || {}
  const cpuLoad = telemetry.cpu?.currentLoad?.toFixed(1) || 0
  const mem = telemetry.mem || {}
  const memTotalGB = mem.total ? (mem.total / (1024 ** 3)).toFixed(1) : 0
  const memUsedPercent = mem.total ? ((mem.active / mem.total) * 100).toFixed(0) : 0
  const temp = telemetry.temp?.main || 0

  const handleSimulateCommand = (commandName: string) => {
    toast.info(`Comando enviado para o equipamento: ${commandName}`, {
      description: 'Aguardando confirmação do agente remoto...'
    })
    
    // Simular retorno
    setTimeout(() => {
      toast.success(`${commandName} executado com sucesso no equipamento!`)
    }, 2500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-50/95 backdrop-blur-xl dark:bg-slate-900/95 rounded-3xl border-slate-200/50 dark:border-slate-800/50">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <span className={`relative flex h-4 w-4`}>
                  {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-4 w-4 ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                </span>
                {equipment.identification || equipment.type || 'Máquina'}
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium mt-1">
                {equipment.client?.name ? `Propriedade de: ${equipment.client.name}` : 'Aguardando vínculo'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="telemetry" className="mt-6">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-white/50 p-1 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
            <TabsTrigger value="telemetry" className="rounded-xl py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-950">
              <Activity className="mr-2 h-4 w-4" />
              Saúde & Telemetria
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="rounded-xl py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-950">
              <Wrench className="mr-2 h-4 w-4" />
              Manutenção
            </TabsTrigger>
            <TabsTrigger value="install" className="rounded-xl py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-950">
              <DownloadCloud className="mr-2 h-4 w-4" />
              Instalação Expressa
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: TELEMETRIA */}
          <TabsContent value="telemetry" className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Card OS Info */}
              <div className="md:col-span-3 bg-white/80 dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 flex gap-4 items-center">
                <div className="h-16 w-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center">
                  <Server className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">Sistema Operacional</h4>
                  <p className="text-sm text-slate-500 font-medium">
                    {osInfo.distro} {osInfo.release} ({osInfo.arch})
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Processador: {cpuInfo.manufacturer} {cpuInfo.brand}
                  </p>
                </div>
              </div>

              {/* Card CPU */}
              <div className="bg-white/80 dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-indigo-500" /> CPU
                  </h4>
                  <span className="text-2xl font-black text-indigo-600">{cpuLoad}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${Math.min(Number(cpuLoad), 100)}%` }}></div>
                </div>
              </div>

              {/* Card RAM */}
              <div className="bg-white/80 dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-500" /> Memória RAM
                  </h4>
                  <span className="text-2xl font-black text-emerald-600">{memUsedPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(Number(memUsedPercent), 100)}%` }}></div>
                </div>
                <p className="text-xs text-slate-400 font-medium text-right mt-2">{memTotalGB} GB Total</p>
              </div>

              {/* Card Temperatura */}
              <div className="bg-white/80 dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${temp > 80 ? 'text-red-500' : 'text-amber-500'}`} /> Temperatura
                  </h4>
                  <span className={`text-2xl font-black ${temp > 80 ? 'text-red-600' : 'text-amber-600'}`}>{temp}°C</span>
                </div>
              </div>
              
            </div>
          </TabsContent>

          {/* ABA 2: MANUTENÇÃO */}
          <TabsContent value="maintenance" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="bg-white/80 dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                   onClick={() => handleSimulateCommand('Limpeza de Disco (CCleaner)')}>
                <div className="flex items-center gap-4">
                  <div className="bg-amber-100 text-amber-600 dark:bg-amber-900/30 p-3 rounded-xl">
                    <HardDrive className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">Limpeza de Disco Avançada</h4>
                    <p className="text-sm text-slate-500 mt-1">Limpa arquivos temporários, logs antigos e caches (Estilo CCleaner).</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                   onClick={() => handleSimulateCommand('Análise de Armazenamento (TreeSize)')}>
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 p-3 rounded-xl">
                    <MonitorPlay className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">Mapeamento de Armazenamento</h4>
                    <p className="text-sm text-slate-500 mt-1">Varredura de grandes arquivos e pastas no disco C: (Estilo TreeSize).</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                   onClick={() => handleSimulateCommand('Reiniciar Serviço Eureca')}>
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 p-3 rounded-xl">
                    <Activity className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">Reiniciar Agente</h4>
                    <p className="text-sm text-slate-500 mt-1">Força o reinício do serviço Eureca na máquina do cliente.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 p-6 rounded-2xl border border-red-200/50 dark:border-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                   onClick={() => handleSimulateCommand('Reiniciar Sistema Operacional')}>
                <div className="flex items-center gap-4">
                  <div className="bg-red-100 text-red-600 dark:bg-red-900/30 p-3 rounded-xl">
                    <Terminal className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-red-700 dark:text-red-400">Reboot Forçado</h4>
                    <p className="text-sm text-red-500/80 mt-1">Envia comando de reinicialização completa para o sistema operacional.</p>
                  </div>
                </div>
              </div>

            </div>
          </TabsContent>

          {/* ABA 3: INSTALAÇÃO EXPRESSA */}
          <TabsContent value="install" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              {[
                { name: 'WhatsApp', desc: 'Mensageiro', color: 'bg-emerald-50 text-emerald-600' },
                { name: 'qBittorrent', desc: 'Torrent Client', color: 'bg-blue-50 text-blue-600' },
                { name: 'Discord', desc: 'Comunicação', color: 'bg-indigo-50 text-indigo-600' },
                { name: 'Google Chrome', desc: 'Navegador', color: 'bg-red-50 text-red-600' },
                { name: 'WinRAR', desc: 'Compactador', color: 'bg-slate-100 text-slate-700' },
                { name: 'AnyDesk', desc: 'Acesso Remoto', color: 'bg-rose-50 text-rose-600' },
              ].map((app) => (
                <div 
                  key={app.name}
                  className="bg-white/80 dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 flex flex-col items-center justify-center text-center cursor-pointer hover:-translate-y-1 transition-all duration-300 hover:shadow-lg"
                  onClick={() => handleSimulateCommand(`Instalar ${app.name}`)}
                >
                  <div className={`h-12 w-12 rounded-2xl mb-3 flex items-center justify-center font-black text-xl ${app.color}`}>
                    {app.name[0]}
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">{app.name}</h4>
                  <p className="text-xs text-slate-500 font-medium">{app.desc}</p>
                </div>
              ))}

            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
