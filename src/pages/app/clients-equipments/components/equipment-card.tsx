import React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Edit3,
  Printer,
  ExternalLink,
  Trash2,
  Activity,
  Cpu,
  HardDrive,
  Flame,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getEquipmentIcon, formatEquipmentTypeLabel } from '../equipment-types'

interface EquipmentCardProps {
  equipment: any
  isOnline: boolean
  onEdit: (equipment: any) => void
  onDelete: (equipment: any) => void
  onOpenDetails: (equipment: any) => void
  onPrintLabel: (equipment: any) => void
}

export function EquipmentCard({
  equipment,
  isOnline,
  onEdit,
  onDelete,
  onOpenDetails,
  onPrintLabel,
}: EquipmentCardProps) {
  const Icon = getEquipmentIcon(equipment.type)
  const typeLabel = formatEquipmentTypeLabel(equipment.type)
  const telemetry = equipment.last_telemetry || {}

  const windyVersion = telemetry?.windy?.version
  const hasWindy = Boolean(windyVersion || equipment.last_telemetry)

  const hostname =
    equipment.identification ||
    telemetry?.osInfo?.hostname ||
    typeLabel

  // CPU Load %
  const cpuLoad =
    telemetry?.cpu?.currentLoad !== undefined && telemetry?.cpu?.currentLoad !== null
      ? Math.round(Number(telemetry.cpu.currentLoad))
      : null

  // RAM Used % - corrigido para suportar mem.usedPercent, mem.active/mem.total
  const mem = telemetry?.mem || {}
  const memUsedPercent =
    mem.usedPercent !== undefined && mem.usedPercent !== null
      ? Math.round(Number(mem.usedPercent))
      : mem.total && mem.active
        ? Math.round((Number(mem.active) / Number(mem.total)) * 100)
        : null

  // Temperatura CPU (°C)
  const tempObj = telemetry?.temp || {}
  const cpuTemp =
    tempObj.main !== undefined && tempObj.main !== null && Number(tempObj.main) > 0
      ? Math.round(Number(tempObj.main))
      : typeof telemetry?.temp === 'number' && telemetry.temp > 0
        ? Math.round(telemetry.temp)
        : null

  // OS / Distro
  const osDistro = telemetry?.osInfo?.distro || telemetry?.osInfo?.platform

  // Data/hora da última atualização pelo Windy
  const lastSeenFormatted = equipment.last_seen_at
    ? format(new Date(equipment.last_seen_at), 'dd/MM HH:mm', { locale: ptBR })
    : null

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-sm transition-all duration-150 hover:border-indigo-300 hover:shadow-md dark:border-slate-800/90 dark:bg-slate-900/90 dark:hover:border-indigo-700">
      <div>
        {/* Linha 1: Status com Data do Último Contato lado a lado + Tag Windy */}
        <div className="flex items-center justify-between gap-1 text-[10px]">
          {/* Status + Última atualização ao lado */}
          <div className="flex items-center gap-1.5 truncate">
            <span
              className={`h-2 w-2 flex-shrink-0 rounded-full ${
                isOnline ? 'animate-pulse bg-emerald-500 shadow-sm shadow-emerald-400' : 'bg-slate-400'
              }`}
            />
            <span
              className={`font-bold uppercase tracking-wider ${
                isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {isOnline ? 'Online' : 'Offline'}
            </span>
            {lastSeenFormatted && (
              <span className="text-slate-400 dark:text-slate-500 truncate">
                • {lastSeenFormatted}
              </span>
            )}
          </div>

          {/* Versão Windy ou Manual */}
          {hasWindy ? (
            <span className="flex-shrink-0 rounded bg-cyan-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200/50 dark:border-cyan-800/50">
              v{windyVersion || '2.3'}
            </span>
          ) : (
            <span className="flex-shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
              Avulso
            </span>
          )}
        </div>

        {/* Linha 2: Ícone do Tipo + Nome/Hostname + Tipo e Marca */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <h4
              onClick={() => onOpenDetails(equipment)}
              className="cursor-pointer truncate text-xs font-bold text-slate-800 transition-colors hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
              title={hostname}
            >
              {hostname}
            </h4>

            <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {typeLabel}
              </span>
              {equipment.brand && (
                <span className="truncate text-slate-400">
                  • {equipment.brand}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Linha 3: Métricas Super Compactas (CPU, RAM, Temperatura) */}
        <div className="mt-2 rounded-lg bg-slate-50/90 px-2 py-1.5 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/70">
          {hasWindy ? (
            <div>
              <div className="flex items-center justify-between text-[10px]">
                {/* CPU */}
                <span
                  className={`inline-flex items-center gap-0.5 font-bold ${
                    (cpuLoad || 0) > 85
                      ? 'text-rose-600 dark:text-rose-400'
                      : (cpuLoad || 0) > 60
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-indigo-600 dark:text-indigo-400'
                  }`}
                  title="Uso da CPU"
                >
                  <Cpu className="h-2.5 w-2.5" />
                  {cpuLoad !== null ? `${cpuLoad}%` : '--'}
                </span>

                {/* RAM */}
                <span
                  className={`inline-flex items-center gap-0.5 font-bold ${
                    (memUsedPercent || 0) > 85
                      ? 'text-rose-600 dark:text-rose-400'
                      : (memUsedPercent || 0) > 70
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                  title="Consumo de Memória RAM"
                >
                  <HardDrive className="h-2.5 w-2.5" />
                  RAM {memUsedPercent !== null ? `${memUsedPercent}%` : '--'}
                </span>

                {/* Temperatura */}
                <span
                  className={`inline-flex items-center gap-0.5 font-bold ${
                    (cpuTemp || 0) >= 80
                      ? 'text-rose-600 dark:text-rose-400'
                      : (cpuTemp || 0) >= 65
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                  title="Temperatura do Processador"
                >
                  <Flame className="h-2.5 w-2.5 text-orange-500" />
                  {cpuTemp !== null ? `${cpuTemp}°C` : '--'}
                </span>
              </div>

              {osDistro && (
                <div className="mt-0.5 truncate text-[9px] text-slate-400 dark:text-slate-500">
                  {osDistro}
                </div>
              )}
            </div>
          ) : (
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {equipment.details || 'Equipamento avulso / sem telemetria'}
            </div>
          )}
        </div>
      </div>

      {/* Linha 4: Ações Mini Compactas */}
      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 dark:border-slate-800">
        <div className="flex items-center gap-0.5">
          {/* Editar */}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800"
            onClick={() => onEdit(equipment)}
            title="Editar tipo, nome e dados"
          >
            <Edit3 className="h-3 w-3" />
          </Button>

          {/* Telemetria / Diagnóstico */}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
            onClick={() => onOpenDetails(equipment)}
            title="Abrir telemetria e diagnóstico completo"
          >
            <Activity className="h-3 w-3" />
          </Button>

          {/* Etiqueta Niimbot */}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
            onClick={() => onPrintLabel(equipment)}
            title="Imprimir etiqueta térmica Niimbot"
          >
            <Printer className="h-3 w-3" />
          </Button>

          {/* Prontuário Público */}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
            onClick={() => window.open(`/equipamento/${equipment.id}`, '_blank')}
            title="Abrir Prontuário Público"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>

        {/* Excluir (Limpar duplicatas) */}
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
          onClick={() => onDelete(equipment)}
          title="Remover da base (duplicatas ou baixas)"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
