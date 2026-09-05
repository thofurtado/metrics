import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, Check } from "lucide-react"

import { createEquipment } from "@/api/create-equipment"
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

interface CreateEquipmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients: any[]
  preselectedClientId?: string | null
}

export function CreateEquipmentModal({
  open,
  onOpenChange,
  clients,
  preselectedClientId,
}: CreateEquipmentModalProps) {
  const queryClient = useQueryClient()

  const [clientId, setClientId] = useState<string>("")
  const [type, setType] = useState<string>("computador")
  const [customType, setCustomType] = useState<string>("")
  const [identification, setIdentification] = useState<string>("")
  const [brand, setBrand] = useState<string>("")
  const [details, setDetails] = useState<string>("")

  useEffect(() => {
    if (open) {
      setClientId(preselectedClientId || "")
      setType("computador")
      setCustomType("")
      setIdentification("")
      setBrand("")
      setDetails("")
    }
  }, [open, preselectedClientId])

  const { mutateAsync: handleCreate, isPending } = useMutation({
    mutationFn: createEquipment,
    onSuccess: () => {
      toast.success("Equipamento cadastrado com sucesso!")
      queryClient.invalidateQueries({ queryKey: ["clients-fleet"] })
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      onOpenChange(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erro ao cadastrar equipamento.")
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const finalType = (customType.trim() || type.trim() || "computador").toLowerCase()

    if (!identification.trim()) {
      toast.error("Informe a identificação ou nome do equipamento.")
      return
    }

    await handleCreate({
      client_id: clientId && clientId !== "none" ? clientId : null,
      type: finalType,
      identification: identification.trim(),
      brand: brand.trim() || null,
      details: details.trim() || null,
    })
  }

  const selectedClient = clients?.find((c) => c.id === clientId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Plus className="h-5 w-5 text-indigo-600" />
            Cadastrar Novo Equipamento
          </DialogTitle>
          <DialogDescription>
            Cadastre equipamentos avulsos ou computadores manuais com vínculo direto ao cliente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="client-select" className="text-sm font-semibold">
              Cliente Dono
            </Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="client-select" className="w-full">
                <SelectValue placeholder="Selecione um cliente (ou deixe avulso)..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="none">-- Sem cliente (Avulso / Estoque) --</SelectItem>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.contract ? "⭐ (Contrato)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClient && (
              <p className="text-xs text-muted-foreground">
                Vinculado a: <strong className="text-foreground">{selectedClient.name}</strong>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Tipo do Equipamento</Label>
              <span className="text-xs text-muted-foreground">Selecione ou digite abaixo</span>
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
                placeholder="Ou digite um tipo personalizado (ex: Moto, Jet Ski, Parafusadeira...)"
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
              <Label htmlFor="identification" className="text-sm font-semibold">
                Identificação / Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="identification"
                placeholder="Ex: Notebook Dell Financeiro"
                value={identification}
                onChange={(e) => setIdentification(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="brand" className="text-sm font-semibold">Marca / Modelo</Label>
              <Input
                id="brand"
                placeholder="Ex: Dell Inspiron 15 / Makita 18V"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="details" className="text-sm font-semibold">
              Detalhes / Acessórios / Observações
            </Label>
            <Textarea
              id="details"
              rows={2}
              placeholder="Ex: Acompanha fonte carregador original, bateria com 85% de saúde..."
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
              {isPending ? "Salvando..." : "Cadastrar Equipamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}