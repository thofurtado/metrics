import { api } from '@/lib/axios'

export interface VpnDevice {
  id: string
  identification: string
  clientName: string
  clientId: string
  isOnline: boolean
  lastSeenAt: string
  vpnIp: string
  telemetry?: any
}

export interface VpnNetworkGroup {
  id: string
  name: string
  description?: string
  headscaleUser?: string
  vpnPreauthKey?: string
  totalClients: number
  totalDevices: number
  onlineDevices: number
  devices: VpnDevice[]
}

export interface VpnNetworksResponse {
  groups: VpnNetworkGroup[]
  standaloneClients: Array<{
    id: string
    name: string
    totalDevices: number
    onlineDevices: number
    devices: any[]
  }>
}

export async function getVpnNetworks(): Promise<VpnNetworksResponse> {
  const response = await api.get('/vpn/networks')
  return response.data
}
