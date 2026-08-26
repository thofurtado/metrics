import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  ShieldCheck, 
  Activity, 
  RefreshCw, 
  Server, 
  Monitor, 
  Wifi, 
  WifiOff, 
  Key, 
  Copy,
  Layers,
  ArrowUpRight
} from 'lucide-react'
import { toast } from 'sonner'

import { getVpnNetworks, VpnNetworksResponse } from '@/api/vpn-networks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function VpnNocTab() {
  const { data: vpnData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['vpn-networks'],
    queryFn: getVpnNetworks,
    refetchInterval: 10000, // Atualiza a cada 10s
  })

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado para a área de transferência!`)
  }

  const groups = vpnData?.groups || []
  const standalone = vpnData?.standaloneClients || []

  return (
    <div className="space-y-6">
      {/* HEADER DA ABA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-500" />
            Central de Redes Privadas (NOC Headscale VPN)
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitoramento em tempo real da malha WireGuard segura em <span className="font-mono text-indigo-400">vpn.metrics.dev.br</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            size="sm" 
            className="gap-2"
            disabled={isRefetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            Atualizar Status
          </Button>
        </div>
      </div>

      {/* KPI METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/60 backdrop-blur-xl border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Grupos de Redes Ativas</CardDescription>
            <CardTitle className="text-2xl font-black text-indigo-400 flex items-center gap-2">
              <Layers className="h-6 w-6" /> {groups.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/60 backdrop-blur-xl border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Máquinas na Malha VPN</CardDescription>
            <CardTitle className="text-2xl font-black text-emerald-400 flex items-center gap-2">
              <Monitor className="h-6 w-6" /> 
              {groups.reduce((acc, g) => acc + g.totalDevices, 0) + standalone.reduce((acc, s) => acc + s.totalDevices, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/60 backdrop-blur-xl border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Servidor Headscale Central</CardDescription>
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2 font-mono">
              <Server className="h-5 w-5 text-sky-400" /> vpn.metrics.dev.br
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* LISTAGEM DE REDES POR GRUPO */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground animate-pulse">
          Consultando nós e conexões do Headscale...
        </div>
      ) : groups.length === 0 && standalone.length === 0 ? (
        <Card className="border-dashed bg-card/40 text-center py-12">
          <CardContent className="flex flex-col items-center justify-center gap-3">
            <WifiOff className="h-12 w-12 text-muted-foreground/40" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Nenhuma máquina conectada na VPN ainda</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Instale o Windy nos computadores dos clientes e clique no botão de VPN para conectá-los automaticamente.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <Card key={group.id} className="border-border/60 bg-card/60 backdrop-blur-xl overflow-hidden shadow-lg">
              <CardHeader className="bg-secondary/20 pb-3 border-b border-border/40">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        {group.name}
                        <Badge variant="outline" className="font-mono text-[10px] text-indigo-400 border-indigo-500/30">
                          {group.headscaleUser}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {group.totalClients} empresas/lojas vinculadas • {group.onlineDevices} de {group.totalDevices} máquinas online
                      </CardDescription>
                    </div>
                  </div>

                  {group.vpnPreauthKey && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs font-mono gap-1.5 h-8 bg-background/50 border border-border/50"
                      onClick={() => copyToClipboard(group.vpnPreauthKey!, 'AuthKey do Grupo')}
                    >
                      <Key className="h-3.5 w-3.5 text-amber-400" />
                      Copiar AuthKey
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12 text-center">Status</TableHead>
                      <TableHead>Identificação / Computador</TableHead>
                      <TableHead>Loja / Empresa</TableHead>
                      <TableHead>IP VPN (Tailscale)</TableHead>
                      <TableHead>Última Conexão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.devices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground italic">
                          Nenhum dispositivo registrado neste grupo ainda.
                        </TableCell>
                      </TableRow>
                    ) : (
                      group.devices.map((device) => (
                        <TableRow key={device.id}>
                          <TableCell className="text-center">
                            {Boolean(
    device.lastSeenAt &&
    !isNaN(new Date(device.lastSeenAt).getTime()) &&
    (Date.now() - new Date(device.lastSeenAt).getTime()) > -120000 &&
    (Date.now() - new Date(device.lastSeenAt).getTime()) < 6 * 60 * 1000
  ) ? (
                              <span className="flex h-2.5 w-2.5 mx-auto rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" title="Online" />
                            ) : (
                              <span className="flex h-2.5 w-2.5 mx-auto rounded-full bg-slate-500" title="Offline" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-xs flex items-center gap-2">
                            <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                            {device.identification || 'Computador Sem Nome'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {device.clientName}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-indigo-400 font-semibold">
                            {device.vpnIp}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString('pt-BR') : 'Desconhecido'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
