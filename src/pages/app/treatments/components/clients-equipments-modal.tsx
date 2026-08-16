import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Users, MonitorSmartphone } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClients } from '@/api/get-clients'
import { getOrphans } from '@/api/get-orphans'
import { linkEquipment } from '@/api/link-equipment'
import { Link2 } from 'lucide-react'

export function ClientsEquipmentsModal() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: clientsData, isLoading } = useQuery({
    queryKey: ['clients-and-equipments'],
    queryFn: getClients,
  })

  const { data: orphansData } = useQuery({
    queryKey: ['orphaned-equipments'],
    queryFn: getOrphans,
    refetchInterval: 10000 // A cada 10s procura novos
  })

  const { mutateAsync: handleLink } = useMutation({
    mutationFn: linkEquipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients-and-equipments'] })
      queryClient.invalidateQueries({ queryKey: ['orphaned-equipments'] })
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 rounded-xl px-6 font-bold">
          <Users className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Clientes e Equipamentos</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-slate-50/90 backdrop-blur-xl dark:bg-slate-900/90 rounded-3xl border-slate-200/50 dark:border-slate-800/50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Hub de Clientes & Frota
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Gerencie o cadastro de clientes e monitore a saúde dos equipamentos em tempo real.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="clients" className="mt-4">
          <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-white/50 p-1 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
            <TabsTrigger value="clients" className="rounded-xl py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900">
              <Users className="mr-2 h-4 w-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="equipments" className="rounded-xl py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900">
              <MonitorSmartphone className="mr-2 h-4 w-4" />
              Monitores de Saúde
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading ? (
                <div className="p-8 text-center text-slate-500">Carregando clientes...</div>
              ) : (
                clientsData?.map((client: any) => (
                  <div key={client.id} className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/60 p-6 shadow-sm backdrop-blur-md transition-all hover:scale-[1.02] hover:bg-white/80 dark:border-slate-800/50 dark:bg-slate-800/40 dark:hover:bg-slate-800/60 cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                        <Users className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{client.name}</h3>
                        <p className="text-xs font-semibold text-slate-500">{client.equipments?.length || 0} equipamentos</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="equipments" className="mt-6 space-y-6">
            
            {/* Alerta de Novos Equipamentos Pendentes (Orfãos) */}
            {orphansData && orphansData.length > 0 && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 dark:border-indigo-900/50 dark:bg-indigo-900/20">
                <h3 className="flex items-center font-bold text-indigo-800 dark:text-indigo-300 mb-4">
                  <span className="relative flex h-3 w-3 mr-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                  </span>
                  {orphansData.length} Equipamento(s) Aguardando Vínculo
                </h3>
                
                <div className="space-y-3">
                  {orphansData.map((orphan: any) => (
                    <div key={orphan.id} className="flex items-center justify-between rounded-xl bg-white/60 p-4 shadow-sm dark:bg-slate-800/60 backdrop-blur-sm">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">{orphan.details || orphan.identification}</p>
                        <p className="text-xs text-slate-500 font-semibold">{orphan.type}</p>
                      </div>
                      
                      <select 
                        className="rounded-lg border-slate-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 ml-4 max-w-[200px]"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleLink({ id: orphan.id, client_id: e.target.value })
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Vincular Cliente...</option>
                        {clientsData?.map((client: any) => (
                          <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {isLoading ? (
                <div className="p-8 text-center text-slate-500">Buscando telemetria da frota...</div>
              ) : (
                clientsData?.flatMap((client: any) => client.equipments?.map((eq: any) => {
                  const isOnline = eq.is_online
                  const telemetry = eq.last_telemetry || {}
                  const cpuLoad = telemetry.cpu?.currentLoad?.toFixed(0) || 0
                  const memUsed = telemetry.mem ? ((telemetry.mem.active / telemetry.mem.total) * 100).toFixed(0) : 0
                  const temp = telemetry.temp?.main || 0

                  let statusColor = 'bg-slate-400'
                  let pulseColor = ''
                  if (isOnline) {
                    if (cpuLoad > 90 || temp > 85) {
                      statusColor = 'bg-red-500'
                      pulseColor = 'animate-pulse'
                    } else if (cpuLoad > 75 || memUsed > 85) {
                      statusColor = 'bg-yellow-500'
                    } else {
                      statusColor = 'bg-emerald-500'
                      pulseColor = 'animate-pulse'
                    }
                  }

                  return (
                    <div key={eq.id} className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/60 p-6 shadow-sm backdrop-blur-md transition-all hover:scale-[1.02] hover:bg-white/80 dark:border-slate-800/50 dark:bg-slate-800/40 dark:hover:bg-slate-800/60 cursor-pointer">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <span className={`h-3 w-3 rounded-full ${statusColor} ${pulseColor}`}></span>
                            {eq.identification || eq.type || 'Equipamento'}
                          </h4>
                          <p className="text-xs text-slate-500 font-semibold">{client.name}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>

                      {isOnline && Object.keys(telemetry).length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                          <div className="text-center">
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">CPU</p>
                            <p className={`text-lg font-black ${cpuLoad > 80 ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>{cpuLoad}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">RAM</p>
                            <p className={`text-lg font-black ${memUsed > 85 ? 'text-yellow-500' : 'text-slate-700 dark:text-slate-200'}`}>{memUsed}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">TEMP</p>
                            <p className={`text-lg font-black ${temp > 80 ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>{temp}°C</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
