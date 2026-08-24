import { Minus, Pizza, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface ComplementOption {
  id: string
  name: string
  price: number
}

export interface ComplementGroup {
  id: string
  name: string
  min_quantity: number
  max_quantity: number
  free_quantity: number
  options: ComplementOption[]
}

export interface Subcategory {
  id: string
  name: string
  accepts_fractions: boolean
  max_fractions: number
}

export interface ProductItem {
  id: string
  name: string
  price: number
  description: string | null
  measureUnit: string
  category: string
  imageUrl?: string
  subcategory?: Subcategory | null
  complementGroups?: ComplementGroup[]
}

export interface SelectedOptionPayload {
  groupId: string
  groupName: string
  optionId: string
  optionName: string
  price: number
  quantity: number
}

export interface CustomizedItemResult {
  product: ProductItem
  customKey: string
  displayName: string
  unitPrice: number
  quantity: number
  observation: string
  fractions: string[]
  selectedOptions: SelectedOptionPayload[]
}

interface ItemCustomizerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductItem | null
  allProducts: ProductItem[]
  onConfirm: (result: CustomizedItemResult) => void
  primaryColor?: string
}

export function ItemCustomizerDialog({
  open,
  onOpenChange,
  product,
  allProducts,
  onConfirm,
  primaryColor = '#10B981',
}: ItemCustomizerDialogProps) {
  if (!product) return null

  const acceptsFractions = Boolean(product.subcategory?.accepts_fractions)
  const maxFractions = product.subcategory?.max_fractions || 2

  // Estado de Sabores (Fracionamento)
  const [fractionCount, setFractionCount] = useState<number>(1)
  const [selectedFlavors, setSelectedFlavors] = useState<ProductItem[]>([product])

  // Estado de Complementos: Map de optionId -> quantidade
  const [selectedOptionsQty, setSelectedOptionsQty] = useState<Record<string, number>>({})

  // Estado de Quantidade do Item e Observação
  const [itemQuantity, setItemQuantity] = useState<number>(1)
  const [observation, setObservation] = useState<string>('')

  // Lista de produtos irmãos da mesma categoria para montagem de sabores
  const siblingProducts = useMemo(() => {
    const list = Array.isArray(allProducts) ? allProducts : []
    return list
      .filter((p) => p && p.category === product.category && (p.subcategory?.accepts_fractions ?? true))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [allProducts, product])

  // Troca a quantidade de frações (1, 2, 3, 4 sabores)
  const handleSetFractions = (count: number) => {
    setFractionCount(count)
    const newFlavors = [...selectedFlavors]
    while (newFlavors.length < count) {
      newFlavors.push(product)
    }
    setSelectedFlavors(newFlavors.slice(0, count))
  }

  const handleFlavorChange = (index: number, flavorId: string) => {
    const found = siblingProducts.find((p) => p.id === flavorId)
    if (!found) return
    const newFlavors = [...selectedFlavors]
    newFlavors[index] = found
    setSelectedFlavors(newFlavors)
  }

  // Grupos de adicionais do produto
  const groups = product.complementGroups || []

  // Manipulação de Quantidade de Complemento (+ / -)
  const handleIncreaseOption = (group: ComplementGroup, option: ComplementOption) => {
    const currentTotalInGroup = group.options.reduce(
      (sum, opt) => sum + (selectedOptionsQty[opt.id] || 0),
      0
    )

    if (currentTotalInGroup >= group.max_quantity) return

    setSelectedOptionsQty((prev) => ({
      ...prev,
      [option.id]: (prev[option.id] || 0) + 1,
    }))
  }

  const handleDecreaseOption = (option: ComplementOption) => {
    const current = selectedOptionsQty[option.id] || 0
    if (current <= 0) return

    setSelectedOptionsQty((prev) => {
      const updated = { ...prev }
      if (current === 1) {
        delete updated[option.id]
      } else {
        updated[option.id] = current - 1
      }
      return updated
    })
  }

  // Cálculo Comercial em Tempo Real
  const { unitPrice, isReadyToConfirm, validationError } = useMemo(() => {
    // 1. Preço Base dos Sabores: REGRA COMERCIAL DE OURO (MAIOR PREÇO)
    const flavorPrices = selectedFlavors.map((f) => f.price)
    const base = flavorPrices.length > 0 ? Math.max(...flavorPrices) : product.price

    // 2. Cálculo dos Adicionais considerando Cotas Gratuitas (Estilo iFood)
    let extra = 0
    let error: string | null = null

    for (const group of groups) {
      const selectedInGroup = group.options
        .map((opt) => ({ opt, qty: selectedOptionsQty[opt.id] || 0 }))
        .filter((item) => item.qty > 0)

      const totalQtyInGroup = selectedInGroup.reduce((sum, item) => sum + item.qty, 0)

      if (totalQtyInGroup < group.min_quantity) {
        error = 'O grupo "' + group.name + '" requer no mínimo ' + group.min_quantity + ' opção(ões).'
      }

      // Desconto de cotas grátis pelas opções de menor preço primeiro
      let freeRemaining = group.free_quantity
      const sortedByPrice = [...selectedInGroup].sort((a, b) => a.opt.price - b.opt.price)

      for (const item of sortedByPrice) {
        const paidQty = Math.max(0, item.qty - freeRemaining)
        freeRemaining = Math.max(0, freeRemaining - item.qty)
        extra += paidQty * item.opt.price
      }
    }

    const calculatedUnitPrice = base + extra

    return {
      basePrice: base,
      complementsExtraPrice: extra,
      unitPrice: calculatedUnitPrice,
      isReadyToConfirm: !error,
      validationError: error,
    }
  }, [selectedFlavors, selectedOptionsQty, groups, product])

  const handleConfirm = () => {
    if (!isReadyToConfirm) return

    const flavorNames = selectedFlavors.map((f) => f.name)
    const isFractioned = fractionCount > 1
    const displayName = isFractioned
      ? '1/' + fractionCount + ' ' + flavorNames.join(' + 1/' + fractionCount + ' ')
      : product.name

    const selectedOptionsPayload: SelectedOptionPayload[] = []
    const obsList: string[] = []

    if (isFractioned) {
      obsList.push('[Meio-a-Meio: ' + flavorNames.join(' + ') + ']')
    }

    for (const group of groups) {
      for (const opt of group.options) {
        const qty = selectedOptionsQty[opt.id] || 0
        if (qty > 0) {
          selectedOptionsPayload.push({
            groupId: group.id,
            groupName: group.name,
            optionId: opt.id,
            optionName: opt.name,
            price: opt.price,
            quantity: qty,
          })
          obsList.push(qty > 1 ? '+' + qty + 'x ' + opt.name : '+ ' + opt.name)
        }
      }
    }

    if (observation.trim()) {
      obsList.push('Obs: ' + observation.trim())
    }

    const optionsKey = Object.entries(selectedOptionsQty)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, qty]) => id + ':' + qty)
      .join('|')

    const flavorsKey = selectedFlavors.map((f) => f.id).sort().join('-')
    const customKey = product.id + '_' + fractionCount + '_' + flavorsKey + '_' + optionsKey + '_' + observation.trim()

    onConfirm({
      product,
      customKey,
      displayName,
      unitPrice,
      quantity: itemQuantity,
      observation: obsList.join(' | '),
      fractions: flavorNames,
      selectedOptions: selectedOptionsPayload,
    })

    onOpenChange(false)
  }

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-hidden p-0 sm:rounded-3xl">
        {/* CABEÇALHO */}
        <div className="border-b border-slate-100 bg-slate-50/80 p-5 backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-700">
                {product.category || 'Item'}
              </span>
              <DialogTitle className="mt-1 text-xl font-black tracking-tight text-slate-900">
                {product.name}
              </DialogTitle>
              {product.description && (
                <p className="mt-1 text-xs font-medium text-slate-500 line-clamp-2">
                  {product.description}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                A partir de
              </span>
              <p className="text-lg font-black text-slate-900">{formatBRL(product.price)}</p>
            </div>
          </div>
        </div>

        {/* CONTEÚDO SCROLLÁVEL */}
        <div className="max-h-[55vh] space-y-6 overflow-y-auto p-5">
          {/* SEÇÃO 1: FRACIONAMENTO / MEIO-A-MEIO */}
          {acceptsFractions && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Pizza className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900">Quantos Sabores você deseja?</h3>
              </div>

              {/* Botões de Frações */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSetFractions(1)}
                  className={'rounded-xl py-2 text-xs font-bold transition-all ' + (
                    fractionCount === 1
                      ? 'bg-slate-900 text-white shadow'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  )}
                >
                  1 Sabor
                </button>
                <button
                  type="button"
                  onClick={() => handleSetFractions(2)}
                  className={'rounded-xl py-2 text-xs font-bold transition-all ' + (
                    fractionCount === 2
                      ? 'bg-slate-900 text-white shadow'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  )}
                >
                  2 Sabores (1/2)
                </button>
                {maxFractions >= 3 && (
                  <button
                    type="button"
                    onClick={() => handleSetFractions(3)}
                    className={'rounded-xl py-2 text-xs font-bold transition-all ' + (
                      fractionCount === 3
                        ? 'bg-slate-900 text-white shadow'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    3 Sabores (1/3)
                  </button>
                )}
              </div>

              {/* Seletores de Sabores */}
              <div className="mt-4 space-y-2.5">
                {selectedFlavors.map((flv, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="w-28 text-xs font-bold text-slate-500">
                      {fractionCount === 1 ? 'Sabor:' : 'Sabor ' + (idx + 1) + ' (1/' + fractionCount + '):'}
                    </span>
                    <select
                      value={flv.id}
                      onChange={(e) => handleFlavorChange(idx, e.target.value)}
                      className="flex-1 h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {siblingProducts.map((sp) => (
                        <option key={sp.id} value={sp.id}>
                          {sp.name} ({formatBRL(sp.price)})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] font-semibold text-slate-400">
                💡 O valor base da pizza fracionada é calculado pelo <span className="font-bold text-slate-600">maior preço</span> entre os sabores.
              </p>
            </div>
          )}

          {/* SEÇÃO 2: GRUPOS DE ADICIONAIS ESTILO IFOOD */}
          {groups.map((group) => {
            const totalQtyInGroup = group.options.reduce(
              (sum, opt) => sum + (selectedOptionsQty[opt.id] || 0),
              0
            )
            const isMandatory = group.min_quantity > 0

            return (
              <div key={group.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{group.name}</h4>
                    <p className="text-[11px] font-semibold text-slate-500">
                      {isMandatory
                        ? 'Escolha no mínimo ' + group.min_quantity + ' e no máximo ' + group.max_quantity
                        : 'Escolha até ' + group.max_quantity}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isMandatory && (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800">
                        Obrigatório
                      </span>
                    )}
                    {group.free_quantity > 0 && (
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {group.free_quantity} Grátis
                      </span>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-slate-100 pt-2">
                  {group.options.map((opt) => {
                    const qty = selectedOptionsQty[opt.id] || 0
                    const canAdd = totalQtyInGroup < group.max_quantity

                    return (
                      <div key={opt.id} className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{opt.name}</p>
                          <p className="text-[11px] font-semibold text-slate-500">
                            {opt.price > 0 ? '+ ' + formatBRL(opt.price) : 'Grátis'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
                          <button
                            type="button"
                            onClick={() => handleDecreaseOption(opt)}
                            disabled={qty === 0}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition-all disabled:opacity-30 active:scale-95"
                          >
                            <Minus className="h-3 w-3 stroke-[3]" />
                          </button>
                          <span className="w-5 text-center text-xs font-black text-slate-900">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleIncreaseOption(group, opt)}
                            disabled={!canAdd}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm transition-all disabled:opacity-30 active:scale-95"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Plus className="h-3 w-3 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* SEÇÃO 3: OBSERVAÇÕES */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <Label className="text-xs font-bold text-slate-800">
              Observações para o restaurante (opcional):
            </Label>
            <Input
              placeholder="Ex: Tirar cebola, carne bem passada, enviar sachê..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="mt-2 text-xs border-slate-200"
              maxLength={200}
            />
          </div>
        </div>

        {/* RODAPÉ COM CONTROLE DE QUANTIDADE E CONFIRMAÇÃO */}
        <div className="border-t border-slate-100 bg-slate-50/80 p-5 backdrop-blur-md">
          {validationError && (
            <p className="mb-3 text-center text-xs font-bold text-amber-700">
              ⚠️ {validationError}
            </p>
          )}

          <div className="flex items-center justify-between gap-4">
            {/* Contador de Quantidade do Prato */}
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => setItemQuantity((q) => Math.max(1, q - 1))}
                disabled={itemQuantity <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-all disabled:opacity-30 active:scale-95"
              >
                <Minus className="h-4 w-4 stroke-[3]" />
              </button>
              <span className="w-8 text-center text-sm font-black text-slate-900">
                {itemQuantity}
              </span>
              <button
                type="button"
                onClick={() => setItemQuantity((q) => q + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-all active:scale-95"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
              </button>
            </div>

            {/* Botão de Adicionar */}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isReadyToConfirm}
              className="flex-1 flex items-center justify-between rounded-2xl px-5 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all disabled:opacity-40 active:scale-[0.98]"
              style={{ backgroundColor: primaryColor }}
            >
              <span>Adicionar à Sacola</span>
              <span>{formatBRL(unitPrice * itemQuantity)}</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
