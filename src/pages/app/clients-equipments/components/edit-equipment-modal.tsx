import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Edit3, Check } from "lucide-react"

import { updateEquipment } from "@/api/update-equipment"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PRESET_EQUIPMENT_TYPES } from "../equipment-types"

interface EditEquipmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipment: any | null
  clients: any[]
}

export function EditEquipmentModal({
  open,
  onOpenChange,
  equipment,
  clients,
}: EditEquipmentModalProps) {
  const queryClient = useQueryClient()

  const [identification, setIdentification] = useState<string>("")
  const [type, setType] = useState<string>("computador")
  const [customType, setCustomType] = useState<string>("")
  const [brand, setBrand] = useState<string>("")
  const [details, setDetails] = useState<string>("")
  const [clientId, setClientId] = useState<string>("")

  useEffect(() => {
    if (equipment && open) {
      setIdentification(equipment.identification || equipment.last_telemetry?.osInfo?.hostname || "")
      const currentType = (equipment.type || "computador").toLowerCase()
      const isPreset = PRESET_EQUIPMENT_TYPES.some((p) => p.id === currentType)
      if (isPreset) {
        setType(currentType)
        setCustomType("")
      } else {
        setType("custom")
        setCustomType(equipment.type || "")
      }
      setBrand(equipment.brand || "")
      setDetails(equipment.details || "")
      setClientId(equipment.client_id || equipment.client?.id || "none")
    }
  }, [equipment, open])

  const { mutateAsync: handleUpdate, isPending } = useMutation({
    mutationFn: updateEquipment,
    onSuccess: () => {
      toast.success("Equipamento atualizado com sucesso!")
      queryClient.invalidateQueries({ queryKey: ["clients-fleet"] })
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      onOpenChange(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erro ao atualizar equipamento.")
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!equipment?.id) return

    const finalType = (customType.trim() || type.trim() || "computador").toLowerCase()

    if (!identification.trim()) {
      toast.error("Informe a identificação ou nome do equipamento.")
      return
    }

    await handleUpdate({
      id: equipment.id,
      identification: identification.trim(),
      type: finalType,
      brand: brand.trim() || null,
      details: details.trim() || null,
      client_id: clientId && clientId !== "none" ? clientId : null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Edit3 className="h-5 w-5 text-indigo-600" />
            Editar Equipamento
          </DialogTitle>
          <DialogDescription>
            Altere o tipo (ex: Computador para Notebook ou Netbook), renomeie ou atualize informações.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-identification" className="text-sm font-semibold">
              Identificação / Nome do Equipamento <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-identification"
              placeholder="Ex: Notebook Gerência ou Hostname"
              value={identification}
              onChange={(e) => setIdentification(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Tipo do Equipamento</Label>
              <span className="text-xs text-muted-foreground">Selecione para alterar o padrão do Windy</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PRESET_EQUIPMENT_TYPES.map((preset) => {
                const Icon = preset.icon
                const isSelected = type === preset.id && !customType
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setType(preset.id)
                      setCustomType("")
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50 font-bold text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-300"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {preset.label}
                    {isSelected && <Check className="ml-0.5 h-3 w-3" />}
                  </button>
                )
              })}
            </div>

            <div className="pt-1">
              <Input
                placeholder="Ou digite um tipo personalizado..."
                value={customType}
                onChange={(e) => {
                  setCustomType(e.target.value)
                  if (e.target.value) setType("custom")
                }}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-client" className="text-sm font-semibold">Cliente Associado</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="edit-client" className="w-full">
                  <SelectValue placeholder="Selecione o cliente..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none">-- Sem cliente (Avulso) --</SelectItem>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.contract ? "⭐" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-brand" className="text-sm font-semibold">Marca / Modelo</Label>
              <Input
                id="edit-brand"
                placeholder="Ex: Dell, Lenovo, HP, Makita"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-details" className="text-sm font-semibold">
              Observações / Detalhes Adicionais
            </Label>
            <Textarea
              id="edit-details"
              rows={2}
              placeholder="Observações do equipamento..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-indigo-600 font-bold text-white hover:bg-indigo-700"
            >
              {isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}