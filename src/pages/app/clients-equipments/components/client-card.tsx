import React from "react"
import {
  Building2,
  CheckCircle2,
  Plus,
  Monitor,
  Phone,
  Mail,
  FileText,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { EquipmentCard } from "./equipment-card"

interface ClientCardProps {
  client: any
  equipments: any[]
  checkIsOnline: (eq: any) => boolean
  onAddEquipment: (clientId: string) => void
  onEditEquipment: (equipment: any) => void
  onDeleteEquipment: (equipment: any) => void
  onOpenDetails: (equipment: any) => void
  onPrintLabel: (equipment: any) => void
}

export function ClientCard({
  client,
  equipments,
  checkIsOnline,
  onAddEquipment,
  onEditEquipment,
  onDeleteEquipment,
  onOpenDetails,
  onPrintLabel,
}: ClientCardProps) {
  const onlineCount = equipments.filter((eq) => checkIsOnline(eq)).length
  const totalCount = equipments.length

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-slate-50/50 p-4 shadow-sm transition-all dark:border-slate-800/90 dark:bg-slate-950/50 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-indigo-600 font-bold text-white shadow-md shadow-indigo-600/20">
            <Building2 className="h-6 w-6" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {client.name}
              </h3>

              {client.contract ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Contrato Ativo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  Sem Contrato
                </span>
              )}

              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                {totalCount} {totalCount === 1 ? "máquina" : "máquinas"}
                {onlineCount > 0 && ` • ${onlineCount} online`}
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              {client.identification && (
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  {client.identification}
                </span>
              )}
              {client.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {client.phone}
                </span>
              )}
              {client.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {client.email}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            size="sm"
            onClick={() => onAddEquipment(client.id)}
            className="h-9 rounded-xl bg-indigo-600 px-3.5 font-bold text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Novo Equipamento
          </Button>
        </div>
      </div>

      <div className="mt-4">
        {totalCount > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {equipments.map((equipment) => (
              <EquipmentCard
                key={equipment.id}
                equipment={equipment}
                isOnline={checkIsOnline(equipment)}
                onEdit={onEditEquipment}
                onDelete={onDeleteEquipment}
                onOpenDetails={onOpenDetails}
                onPrintLabel={onPrintLabel}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center dark:border-slate-800 dark:bg-slate-900/40">
            <Monitor className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              Nenhum computador ou equipamento cadastrado para este cliente.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddEquipment(client.id)}
              className="mt-3 rounded-xl border-dashed text-xs font-semibold text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Adicionar Primeiro Equipamento
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}