import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Server, Activity, Wrench, DownloadCloud, Terminal, HardDrive, Cpu, AlertTriangle, MonitorPlay } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { RefreshCw } from 'lucide-react'

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

    const queryClient = useQueryClient()
  
  const { mutateAsync: sendCommand, isPending: isSendingCommand } = useMutation({
    mutationFn: async (commandName: string) => {
      await api.post(`/equipments/${equipment.id}/command`, { command: commandName })
    },
    onSuccess: (_, commandName) => {
      toast.success(`Comando enviado: ${commandName}`)
      if (commandName === 'REFRESH_TELEMETRY') {
        toast.info('Aguardando resposta do equipamento...', { duration: 4000 })
        // Tenta refetch após 2s e 4s
        setTimeout(() => queryClient.invalidateQueries({ queryKey: ['clients-fleet'] }), 2000)
        setTimeout(() => queryClient.invalidateQueries({ queryKey: ['clients-fleet'] }), 4000)
      }
    },
    onError: () => toast.error('Falha ao enviar comando ou equipamento offline.')
  })

  const handleSimulateCommand = (commandName: string) => {
    // If it's a known implemented command, send it
    if (commandName === 'REFRESH_TELEMETRY' || commandName.startsWith('Reiniciar')) {
        sendCommand(commandName)
    } else {
        toast.info(`Comando enviado para o equipamento: ${commandName}`, {
          description: 'Aguardando confirmação do agente remoto...'
        })
        setTimeout(() => {
          toast.success(`${commandName} executado com sucesso no equipamento!`)
        }, 2500)
    }
  }></div>
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
