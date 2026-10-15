import {
  Building2,
  CheckCircle2,
  FileText,
  Monitor,
  Pencil,
  Phone,
  Plus,
} from 'lucide-react'
import React from 'react'

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
  onEditClient?: (client: any) => void
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
  onEditClient,
}: ClientCardProps) {
  const onlineCount = equipments.filter((eq) => checkIsOnline(eq)).length
  const totalCount = equipments.length

  return (
    <div className="mb-3 break-inside-avoid rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-sm transition-all duration-150 hover:border-indigo-300 hover:shadow-md dark:border-slate-800/90 dark:bg-slate-900/90 dark:hover:border-indigo-700">
      {/* Header do Cliente (Compacto, Alta Densidade) */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-sm shadow-indigo-600/20">
            <Building2 className="h-3.5 w-3.5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3
                className="max-w-[200px] truncate text-xs font-bold text-slate-900 dark:text-slate-100 sm:text-sm"
                title={client.name}
              >
                {client.name}
              </h3>

              {/* Badge de Contrato */}
              {client.contract ? (
                <span className="py-0.2 inline-flex items-center gap-0.5 rounded-full border border-emerald-300/60 bg-emerald-50 px-1.5 text-[9px] font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Contrato
                </span>
              ) : (
                <span className="py-0.2 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 text-[9px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  Avulso
                </span>
              )}
            </div>

            {/* Metadados rápidos: Quantidade de Máquinas + Documento/Telefone */}
            <div className="mt-0.5 flex items-center gap-2 truncate text-[10px] text-slate-400 dark:text-slate-500">
              <span>
                <strong className="text-slate-700 dark:text-slate-300">
                  {totalCount}
                </strong>{' '}
                {totalCount === 1 ? 'máquina' : 'máquinas'}
                {onlineCount > 0 && (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {' '}
                    • {onlineCount} online
                  </span>
                )}
              </span>
              {client.identification && (
                <span className="truncate text-slate-400">
                  • {client.identification}
                </span>
              )}
              {client.phone && !client.identification && (
                <span className="truncate text-slate-400">
                  • {client.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Fase 4 do Mergulho (16:A7): corrigir ou excluir o cadastro do cliente */}
        {onEditClient && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEditClient(client)}
            className="h-7 w-7 flex-shrink-0 p-0 text-slate-500 hover:text-indigo-600"
            title="Editar cadastro do cliente"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="sr-only">Editar cliente</span>
          </Button>
        )}

        {/* Botão Compacto Adicionar Equipamento */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAddEquipment(client.id)}
          className="h-7 flex-shrink-0 gap-1 rounded-lg border-indigo-200/80 px-2 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
          title="Adicionar novo equipamento para este cliente"
        >
          <Plus className="h-3 w-3" />
          <span className="hidden sm:inline">Equip.</span>
        </Button>
      </div>

      {/* Grid de Equipamentos dentro do Card do Cliente */}
      <div className="mt-2.5">
        {totalCount > 0 ? (
          <div
            className={`grid gap-2 ${
              equipments.length === 1
                ? 'grid-cols-1'
                : 'grid-cols-1 sm:grid-cols-2'
            }`}
          >
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
          <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-2 text-xs dark:border-slate-800 dark:bg-slate-900/30">
            <span className="text-[11px] text-slate-400">
              Nenhuma máquina cadastrada
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAddEquipment(client.id)}
              className="h-6 px-1.5 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50"
            >
              <Plus className="mr-1 h-2.5 w-2.5" />
              Adicionar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
