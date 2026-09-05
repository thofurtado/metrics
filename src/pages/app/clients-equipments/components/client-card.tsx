import React from 'react'
import {
  Building2,
  CheckCircle2,
  Plus,
  Monitor,
  Phone,
  Mail,
  FileText,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EquipmentCard } from './equipment-card'

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
    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/40 p-3 sm:p-4 shadow-sm transition-all dark:border-slate-800/90 dark:bg-slate-950/40">
      {/* Header do Cliente (Compacto e Elegante) */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/60 pb-3 dark:border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-sm shadow-indigo-600/20">
            <Building2 className="h-4 w-4" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {client.name}
              </h3>

              {/* Status do Contrato */}
              {client.contract ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Contrato Ativo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  Sem Contrato
                </span>
              )}

              {/* Contador de Máquinas */}
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                {totalCount} {totalCount === 1 ? 'máquina' : 'máquinas'}
                {onlineCount > 0 && ` • ${onlineCount} online`}
              </span>
            </div>

            {/* Contato rápido */}
            <div className="mt-0.5 flex flex-wrap items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400">
              {client.identification && (
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3 text-slate-400" />
                  {client.identification}
                </span>
              )}
              {client.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-400" />
                  {client.phone}
                </span>
              )}
              {client.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3 text-slate-400" />
                  {client.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Botão Novo Equipamento */}
        <Button
          size="sm"
          onClick={() => onAddEquipment(client.id)}
          className="h-8 self-start sm:self-center rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Novo Equipamento
        </Button>
      </div>

      {/* Grid de Equipamentos - Ultra Denso para caber várias máquinas por linha */}
      <div className="mt-3">
        {totalCount > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5">
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
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/40 p-4 text-center dark:border-slate-800 dark:bg-slate-900/30">
            <Monitor className="h-6 w-6 text-slate-300 dark:text-slate-600" />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Nenhuma máquina cadastrada para este cliente.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddEquipment(client.id)}
              className="mt-2 h-7 rounded-lg border-dashed text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50"
            >
              <Plus className="mr-1 h-3 w-3" />
              Adicionar Equipamento
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
