import React from 'react'
import {
  Monitor,
  Laptop,
  Printer,
  Server,
  Smartphone,
  Bike,
  Car,
  Wrench,
  Cpu,
  Tv,
  Radio,
  Package,
} from 'lucide-react'

export interface PresetEquipmentType {
  id: string
  label: string
  icon: any
}

export const PRESET_EQUIPMENT_TYPES: PresetEquipmentType[] = [
  { id: 'computador', label: 'Computador', icon: Monitor },
  { id: 'notebook', label: 'Notebook', icon: Laptop },
  { id: 'netbook', label: 'Netbook', icon: Laptop },
  { id: 'servidor', label: 'Servidor', icon: Server },
  { id: 'impressora', label: 'Impressora', icon: Printer },
  { id: 'pdv', label: 'PDV / Caixa', icon: Tv },
  { id: 'smartphone', label: 'Celular / Tablet', icon: Smartphone },
  { id: 'moto', label: 'Moto / Jet Ski', icon: Bike },
  { id: 'veiculo', label: 'Veículo / Carro', icon: Car },
  { id: 'ferramenta', label: 'Parafusadeira / Ferramenta', icon: Wrench },
  { id: 'outro', label: 'Outro / Avulso', icon: Package },
]

export function getEquipmentIcon(type?: string | null): any {
  if (!type) return Monitor
  const t = type.toLowerCase().trim()

  if (t.includes('note') || t.includes('net') || t.includes('laptop') || t.includes('macbook')) {
    return Laptop
  }
  if (t.includes('imp') || t.includes('print') || t.includes('termica')) {
    return Printer
  }
  if (t.includes('serv') || t.includes('rack')) {
    return Server
  }
  if (t.includes('moto') || t.includes('jet') || t.includes('ski') || t.includes('bike')) {
    return Bike
  }
  if (t.includes('carro') || t.includes('veic') || t.includes('auto') || t.includes('caminhao')) {
    return Car
  }
  if (t.includes('parafusa') || t.includes('furad') || t.includes('ferram') || t.includes('maquin')) {
    return Wrench
  }
  if (t.includes('cel') || t.includes('smart') || t.includes('tab') || t.includes('ipad') || t.includes('fone')) {
    return Smartphone
  }
  if (t.includes('pdv') || t.includes('caixa') || t.includes('terminal') || t.includes('monitor') || t.includes('tv')) {
    return Tv
  }
  if (t.includes('comp') || t.includes('pc') || t.includes('desktop')) {
    return Monitor
  }
  return Cpu
}

export function formatEquipmentTypeLabel(type?: string | null): string {
  if (!type) return 'Equipamento'
  const found = PRESET_EQUIPMENT_TYPES.find(
    (p) => p.id === type.toLowerCase() || p.label.toLowerCase() === type.toLowerCase()
  )
  if (found) return found.label
  // Capitalize custom type
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export function getEquipmentDisplayName(equipment: any): string {
  if (!equipment) return 'Equipamento'

  const telemetry = equipment.last_telemetry || {}
  const typeLabel = formatEquipmentTypeLabel(equipment.type)

  const isMacOrHexId = (val?: string | null) => {
    if (!val || typeof val !== 'string') return false
    const clean = val.replace(/[:-]/g, '').trim()
    return /^[0-9A-Fa-f]{12}$/.test(clean) || /^[0-9A-Fa-f]{16,}$/.test(clean)
  }

  // 1. Apelido / Nome cadastrado no Windy (guardado em details ou nickname na telemetria)
  const nickname =
    (typeof equipment.details === 'string' && equipment.details.trim()) ||
    (typeof telemetry.nickname === 'string' && telemetry.nickname.trim()) ||
    (typeof telemetry.windy?.nickname === 'string' && telemetry.windy.nickname.trim()) ||
    (typeof equipment.name === 'string' && equipment.name.trim())

  if (nickname) return nickname

  // 2. Hostname do sistema operacional da máquina
  const hostname =
    (typeof telemetry.osInfo?.hostname === 'string' && telemetry.osInfo.hostname.trim()) ||
    (typeof telemetry.hostname === 'string' && telemetry.hostname.trim())

  if (hostname) return hostname

  // 3. Se identification NÃO for um MAC address hex puro, pode ser um nome digitado
  if (equipment.identification && !isMacOrHexId(equipment.identification)) {
    return equipment.identification.trim()
  }

  // 4. Fallback final: se só tiver MAC, usa o tipo ou o próprio identification
  return equipment.identification || typeLabel
}
