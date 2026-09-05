import React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Edit3,
  Printer,
  ExternalLink,
  Trash2,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { getEquipmentIcon, formatEquipmentTypeLabel } from "../equipment-types"

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

  const windyVersion = equipment.last_telemetry?.windy?.version
  const hasWindy = Boolean(windyVersion || equipment.last_telemetry)

  const hostname =
    equipment.identification ||
    equipment.last_telemetry?.osInfo?.hostname ||
    typeLabel

  const cpuLoad = equipment.last_telemetry?.cpu?.currentLoad
    ? Math.round(equipment.last_telemetry.cpu.currentLoad)
    : null

  const memTotal = equipment.last_telemetry?.mem?.total
  const memUsed = equipment.last_telemetry?.mem?.used
  const memPercent =
    memTotal && memUsed ? Math.round((memUsed / memTotal) * 100) : null

  const osDistro = equipment.last_telemetry?.osInfo?.distro || equipment.last_telemetry?.osInfo?.platform

  const lastSeenFormatted = equipment.last_seen_at
    ? format(new Date(equipment.last_seen_at), "dd/MM HH:mm", { locale: ptBR })
    : "Sem telemetria"

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800/90 dark:bg-slate-900/90 dark:hover:border-slate-700">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isOnline ? "animate-pulse bg-emerald-500 shadow-sm shadow-emerald-400" : "bg-slate-400"
              }`}
            />
            <span
              className={`text-[11px] font-bold uppercase tracking-wide ${
                isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>

          {hasWindy ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200/50 dark:border-cyan-800/50">
              <Sparkles className="h-3 w-3" />
              Windy v{windyVersion || "2.0"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
              Avulso / Manual
            </span>
          )}
        </div>

        <div className="mt-3 flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
            <Icon className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <h4
              onClick={() => onOpenDetails(equipment)}
              className="cursor-pointer truncate text-sm font-bold text-slate-800 transition-colors hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
              title={hostname}
            >
              {hostname}
            </h4>

            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {typeLabel}
              </span>
              {equipment.brand && (
                <span className="truncate text-slate-500 dark:text-slate-400">
                  • {equipment.brand}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3.5 rounded-xl bg-slate-50/80 p-2.5 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          {hasWindy ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Cpu className="h-3 w-3 text-indigo-500" />
                      CPU
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {cpuLoad !== null ? `${cpuLoad}%` : "--"}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        (cpuLoad || 0) > 85
                          ? "bg-rose-500"
                          : (cpuLoad || 0) > 60
                          ? "bg-amber-500"
                          : "bg-indigo-500"
                      }`}
                      style={{ width: `${Math.min(cpuLoad || 0, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3 text-cyan-500" />
                      RAM
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {memPercent !== null ? `${memPercent}%` : "--"}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        (memPercent || 0) > 85
                          ? "bg-rose-500"
                          : (memPercent || 0) > 70
                          ? "bg-amber-500"
                          : "bg-cyan-500"
                      }`}
                      style={{ width: `${Math.min(memPercent || 0, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200/60 pt-1.5 text-[10px] text-slate-500 dark:border-slate-700/60 dark:text-slate-400">
                <span className="truncate max-w-[130px]" title={osDistro || "Sistema Operacional"}>
                  {osDistro || "Windows"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  {lastSeenFormatted}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
              {equipment.details ? (
                <p className="line-clamp-2 text-[11px] italic text-slate-500 dark:text-slate-400">
                  "{equipment.details}"
                </p>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Equipamento avulso sem telemetria em tempo real.
                </p>
              )}
              <div className="flex items-center justify-between border-t border-slate-200/60 pt-1 text-[10px] text-slate-400 dark:border-slate-700/60">
                <span>Entrada: {equipment.entry ? format(new Date(equipment.entry), "dd/MM/yyyy", { locale: ptBR }) : "-"}</span>
                <span>Manual</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
            onClick={() => onEdit(equipment)}
            title="Editar tipo, nome e dados"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
            onClick={() => onOpenDetails(equipment)}
            title="Abrir telemetria e diagnóstico completo"
          >
            <Activity className="h-3.5 w-3.5" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
            onClick={() => onPrintLabel(equipment)}
            title="Imprimir etiqueta térmica Niimbot"
          >
            <Printer className="h-3.5 w-3.5" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
            onClick={() => window.open(`/equipamento/${equipment.id}`, "_blank")}
            title="Abrir Prontuário Público"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
          onClick={() => onDelete(equipment)}
          title="Remover equipamento (limpar duplicatas ou baixas)"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}