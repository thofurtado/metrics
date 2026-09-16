import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  PackageSearch,
  Scale,
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { ComplementOption } from '@/api/complements'
import { getSupplies } from '@/api/get-supplies'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface EditComplementOptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupName: string
  option: ComplementOption | null
  onSave: (updatedOption: ComplementOption) => void
}

export function EditComplementOptionDialog({
  open,
  onOpenChange,
  groupName,
  option,
  onSave,
}: EditComplementOptionDialogProps) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState(0)
  const [active, setActive] = useState(true)
  const [hasTechSheet, setHasTechSheet] = useState(false)
  const [linkedSupplyId, setLinkedSupplyId] = useState<string>('')
  const [supplyQuantity, setSupplyQuantity] = useState<number>(0.05)

  // Fetch Supplies from Inventory
  const { data: suppliesData, isLoading: isLoadingSupplies } = useQuery({
    queryKey: ['supplies-for-complements'],
    queryFn: () => getSupplies({ perPage: 150 }),
    enabled: open,
  })

  const supplies = suppliesData?.data?.supplies || []

  // Load option data when modal opens
  useEffect(() => {
    if (option && open) {
      setName(option.name || '')
      setPrice(Number(option.price || 0))
      setActive(option.active !== false)
      const hasSupply = !!option.linked_supply_id
      setHasTechSheet(hasSupply)
      setLinkedSupplyId(option.linked_supply_id || '')
      setSupplyQuantity(
        option.supply_quantity !== null && option.supply_quantity !== undefined
          ? Number(option.supply_quantity)
          : 0.05,
      )
    }
  }, [option, open])

  // Selected supply details
  const selectedSupply = useMemo(() => {
    return supplies.find((s) => s.id === linkedSupplyId)
  }, [supplies, linkedSupplyId])

  // Financial Calculations
  const calculations = useMemo(() => {
    const unitCost = Number(selectedSupply?.cost || 0)
    const qty = Number(supplyQuantity || 0)
    const portionCost = hasTechSheet ? unitCost * qty : 0
    const salePrice = Number(price || 0)
    const grossProfit = salePrice - portionCost
    const cmvPercent = salePrice > 0 ? (portionCost / salePrice) * 100 : 0
    const marginPercent = salePrice > 0 ? (grossProfit / salePrice) * 100 : 0

    return {
      portionCost,
      salePrice,
      grossProfit,
      cmvPercent: Math.min(100, Math.max(0, cmvPercent)),
      marginPercent: Math.max(0, marginPercent),
    }
  }, [selectedSupply, supplyQuantity, price, hasTechSheet])

  const handleConfirm = () => {
    if (!name.trim()) return

    onSave({
      ...option,
      name: name.trim(),
      price: Number(price || 0),
      active,
      linked_supply_id: hasTechSheet && linkedSupplyId ? linkedSupplyId : null,
      supply_quantity: hasTechSheet && linkedSupplyId ? Number(supplyQuantity || 0) : null,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden border border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-2xl">
        {/* Header com breadcrumb */}
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Cardápio • Grupos de Complementos • {groupName}
          </span>
          <DialogTitle className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
            Editar Opção de Complemento
          </DialogTitle>
        </div>

        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-6">
          {/* Linha Principal: Nome, Preço e Status */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="space-y-1 sm:col-span-6">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Nome do Adicional <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Ex: Bacon Crocante em Cubos 50g"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-white font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1 sm:col-span-3">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Preço de Venda <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400">
                  R$
                </span>
                <CurrencyInput
                  placeholder="0,00"
                  value={price}
                  onValueChange={(val) => setPrice(Number(val || 0))}
                  className="h-10 rounded-xl border-slate-200 bg-white pl-8 font-mono text-sm font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="space-y-1 sm:col-span-3">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Status no PDV
              </Label>
              <Select
                value={active ? 'active' : 'inactive'}
                onValueChange={(v) => setActive(v === 'active')}
              >
                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Ativo
                    </span>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <span className="flex items-center gap-1.5 text-slate-400 font-bold">
                      <span className="h-2 w-2 rounded-full bg-slate-300" /> Inativo
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Seção de Ficha Técnica & Insumo de Estoque */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4.5 dark:border-slate-800 dark:bg-slate-900/40 space-y-4">
            {/* Toggle Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    Vincular Ficha Técnica ao Estoque
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Baixa automática de insumo por porção consumida
                  </p>
                </div>
              </div>
              <Switch
                checked={hasTechSheet}
                onCheckedChange={setHasTechSheet}
              />
            </div>

            {/* Campos de Insumo e Quantidade */}
            {hasTechSheet && (
              <div className="space-y-4 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                  <div className="space-y-1 sm:col-span-8">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Insumo de Estoque Vinculado <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={linkedSupplyId}
                      onValueChange={setLinkedSupplyId}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                        <SelectValue placeholder="Selecione o insumo no almoxarifado..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {supplies.map((sup: any) => (
                          <SelectItem key={sup.id} value={sup.id}>
                            <span className="font-bold">{sup.name}</span>
                            <span className="text-xs text-slate-400 ml-2">
                              (Estoque: {sup.stock} {sup.unit || 'un'} • Custo: R${' '}
                              {Number(sup.cost || 0).toFixed(2)})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 sm:col-span-4">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Qtd. por Porção <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={supplyQuantity}
                        onChange={(e) => setSupplyQuantity(Number(e.target.value))}
                        className="h-10 rounded-xl border-slate-200 bg-white pr-10 font-mono text-sm font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {selectedSupply?.unit || 'Kg'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card de Simulação Instantânea de Rentabilidade (Conforme Imagem Stitch) */}
                {selectedSupply && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                        Simulação Instantânea de Rentabilidade
                      </span>
                      <Badge
                        variant="secondary"
                        className={
                          calculations.cmvPercent <= 35
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                        }
                      >
                        {calculations.cmvPercent <= 35
                          ? 'Margem Excelente'
                          : 'Atenção ao CMV'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 pt-1">
                      <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Custo da Porção
                        </span>
                        <div className="text-base font-mono font-black text-slate-900 dark:text-slate-100">
                          R$ {calculations.portionCost.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {supplyQuantity} {selectedSupply.unit || 'un'} × R${' '}
                          {Number(selectedSupply.cost || 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Preço de Venda
                        </span>
                        <div className="text-base font-mono font-black text-blue-600 dark:text-blue-400">
                          R$ {calculations.salePrice.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Cobrado no PDV
                        </span>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Lucro Bruto Unit.
                        </span>
                        <div className="text-base font-mono font-black text-emerald-600 dark:text-emerald-400">
                          R$ {calculations.grossProfit.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-emerald-600 font-bold">
                          +{calculations.marginPercent.toFixed(1)}% margem
                        </span>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          CMV do Adicional
                        </span>
                        <div className="text-base font-mono font-black text-slate-900 dark:text-slate-100">
                          {calculations.cmvPercent.toFixed(1)}%
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {calculations.cmvPercent <= 35 ? 'Dentro da meta' : 'Acima do ideal'}
                        </span>
                      </div>
                    </div>

                    {/* Barra de Distribuição Custo vs Margem */}
                    <div className="space-y-1 pt-1">
                      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="bg-emerald-600 transition-all"
                          style={{ width: `${calculations.cmvPercent}%` }}
                        />
                        <div
                          className="bg-blue-500 transition-all"
                          style={{ width: `${100 - calculations.cmvPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400">
                        <span className="text-emerald-600">
                          Custo Físico ({calculations.cmvPercent.toFixed(1)}%)
                        </span>
                        <span className="text-blue-500">
                          Margem de Contribuição Bruta ({calculations.marginPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
          <span className="text-xs text-slate-500">
            Atualização instantânea no cardápio
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              className="rounded-xl bg-blue-600 text-white hover:bg-blue-700"
            >
              Salvar Opção de Complemento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
