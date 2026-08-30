import { Check, ChevronDown, ChevronUp, Minus, Pizza, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

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
  const [selectedFlavors, setSelectedFlavors] = useState<(ProductItem | null)[]>([product])
  const [activeFlavorStep, setActiveFlavorStep] = useState<number | null>(null)
  const [flavorSearch, setFlavorSearch] = useState<string>('')

  // Estado de Complementos: Map de optionId -> quantidade
  const [selectedOptionsQty, setSelectedOptionsQty] = useState<Record<string, number>>({})

  // Estado de Quantidade do Item e Observação
  const [itemQuantity, setItemQuantity] = useState<number>(1)
  const [observation, setObservation] = useState<string>('')

  // Reset ao abrir novo produto
  useEffect(() => {
    if (open && product) {
      setFractionCount(1)
      setSelectedFlavors([product])
      setActiveFlavorStep(null)
      setFlavorSearch('')
      setSelectedOptionsQty({})
      setItemQuantity(1)
      setObservation('')
    }
  }, [open, product])

  // Lista de produtos irmãos (mesma subcategoria ou categoria para meio-a-meio)
  const siblingProducts = useMemo(() => {
    if (!product) return []
    return allProducts.filter((p) => {
      if (product.subcategory?.id && p.subcategory?.id) {
        return p.subcategory.id === product.subcategory.id
      }
      return p.category === product.category
    })
  }, [allProducts, product])

  // Ajusta o array de sabores quando o usuário troca o número de frações (1, 2, 3...)
  const handleSetFractions = (num: number) => {
    setFractionCount(num)
    const newFlavors: (ProductItem | null)[] = Array(num).fill(null)
    newFlavors[0] = product // O primeiro sabor é sempre o produto clicado
    setSelectedFlavors(newFlavors)

    if (num > 1) {
      setActiveFlavorStep(1) // Abre automaticamente a seleção do 2º sabor
    } else {
      setActiveFlavorStep(null)
    }
  }

  // Seleciona um sabor para um slot fracionado
  const handleSelectFlavor = (slotIndex: number, flavor: ProductItem) => {
    const updated = [...selectedFlavors]
    updated[slotIndex] = flavor
    setSelectedFlavors(updated)
    setFlavorSearch('')

    // Abre o próximo slot se ainda houver algum pendente
    const nextPending = updated.findIndex((f, idx) => idx > slotIndex && f === null)
    if (nextPending !== -1) {
      setActiveFlavorStep(nextPending)
    } else {
      setActiveFlavorStep(null)
    }
  }

  // Grupos de adicionais / complementos vinculados
  const groups: ComplementGroup[] = useMemo(() => {
    if (!product.complementGroups || !Array.isArray(product.complementGroups)) return []
    return product.complementGroups
  }, [product])

  // Controle de Adicionais (Incremento / Decremento)
  const handleIncreaseOption = (group: ComplementGroup, option: ComplementOption) => {
    const currentTotalInGroup = group.options.reduce(
      (sum, opt) => sum + (selectedOptionsQty[opt.id] || 0),
      0,
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
      const next = { ...prev }
      if (current === 1) {
        delete next[option.id]
      } else {
        next[option.id] = current - 1
      }
      return next
    })
  }

  // Cálculo do Preço Unitário Total
  const { unitPrice, isReadyToConfirm, validationError } = useMemo(() => {
    // 1. Preço Base dos Sabores: No Brasil, o padrão de pizzarias/delivery é cobrar pelo MAIOR preço entre as metades
    let baseFlavorPrice = product.price
    if (acceptsFractions && fractionCount > 1) {
      const validSelected = selectedFlavors.filter((f): f is ProductItem => f !== null)
      if (validSelected.length > 0) {
        baseFlavorPrice = Math.max(...validSelected.map((f) => f.price))
      }
    }

    // 2. Preço dos Complementos
    let complementsTotal = 0
    groups.forEach((group) => {
      let groupChargedCount = 0
      group.options.forEach((opt) => {
        const qty = selectedOptionsQty[opt.id] || 0
        for (let i = 0; i < qty; i++) {
          groupChargedCount++
          // Se ultrapassar a quantidade grátis configurada, cobra o valor
          if (groupChargedCount > group.free_quantity) {
            complementsTotal += opt.price
          }
        }
      })
    })

    const finalUnitPrice = baseFlavorPrice + complementsTotal

    // 3. Validações de Obrigatórios
    let error: string | null = null

    // Validação de Frações pendentes
    if (acceptsFractions && fractionCount > 1) {
      const hasMissingFlavor = selectedFlavors.some((f) => f === null)
      if (hasMissingFlavor) {
        error = `Por favor, selecione todos os ${fractionCount} sabores.`
      }
    }

    // Validação de Grupos Obrigatórios
    if (!error) {
      for (const group of groups) {
        const totalInGroup = group.options.reduce(
          (sum, opt) => sum + (selectedOptionsQty[opt.id] || 0),
          0,
        )
        if (group.min_quantity > 0 && totalInGroup < group.min_quantity) {
          error = `O grupo "${group.name}" requer no mínimo ${group.min_quantity} opção(ões).`
          break
        }
      }
    }

    return {
      unitPrice: finalUnitPrice,
      isReadyToConfirm: !error,
      validationError: error,
    }
  }, [product, acceptsFractions, fractionCount, selectedFlavors, groups, selectedOptionsQty])

  // Montagem e Confirmação do Pedido Customizado
  const handleConfirm = () => {
    if (!isReadyToConfirm) return

    // Monta o nome de exibição
    let displayName = product.name
    const flavorNames = selectedFlavors.filter((f): f is ProductItem => f !== null).map((f) => f.name)
    if (acceptsFractions && fractionCount > 1 && flavorNames.length > 1) {
      displayName = `1/${fractionCount} ${flavorNames.join(` + 1/${fractionCount} `)}`
    }

    // Monta o payload de complementos selecionados
    const selectedOptionsPayload: SelectedOptionPayload[] = []
    groups.forEach((group) => {
      group.options.forEach((opt) => {
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
        }
      })
    })

    // Gera uma chave única determinística para identificar itens idênticos no carrinho
    const optionsKeyPart = selectedOptionsPayload
      .map((o) => `${o.optionId}x${o.quantity}`)
      .sort()
      .join(',')
    const flavorsKeyPart = flavorNames.sort().join('|')
    const customKey = `${product.id}_flavors:[${flavorsKeyPart}]_opts:[${optionsKeyPart}]_obs:[${observation.trim()}]`

    const obsList: string[] = []
    if (observation.trim()) obsList.push(observation.trim())

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
      <DialogContent className="max-h-[90vh] max-w-xl overflow-hidden p-0 sm:rounded-3xl !bg-white text-slate-900 border-none shadow-2xl">
        {/* CABEÇALHO 100% LIGHT */}
        <div className="border-b border-slate-100 bg-slate-50/90 p-5 backdrop-blur-md">
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
                Preço Base
              </span>
              <p className="text-lg font-black text-slate-900">{formatBRL(product.price)}</p>
            </div>
          </div>
        </div>

        {/* CONTEÚDO SCROLLÁVEL 100% LIGHT */}
        <div className="max-h-[55vh] space-y-6 overflow-y-auto p-5 bg-[#F8FAFC]">
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

              {/* Seletores de Sabores - Acordeão Colapsável Estilo iFood */}
              <div className="mt-4 space-y-2.5">
                {Array.from({ length: fractionCount }).map((_, idx) => {
                  const selectedFlavor = selectedFlavors[idx]
                  const isExpanded = activeFlavorStep === idx

                  // Filtro por busca rápida
                  const filteredSiblings = siblingProducts.filter((sp) => {
                    if (!flavorSearch.trim()) return true
                    const q = flavorSearch.toLowerCase()
                    return (
                      sp.name.toLowerCase().includes(q) ||
                      (sp.description && sp.description.toLowerCase().includes(q))
                    )
                  })

                  // 1. ESTADO EXPANDIDO (SELEÇÃO ABERTA)
                  if (isExpanded) {
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border-2 border-emerald-500 bg-white p-3.5 shadow-md transition-all"
                      >
                        {/* Cabeçalho do Slot Aberto */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white">
                              {idx + 1}
                            </span>
                            <h4 className="text-xs font-black text-slate-900">
                              Escolha o {idx + 1}º Sabor (1/{fractionCount})
                            </h4>
                          </div>
                          {selectedFlavor && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveFlavorStep(null)
                                setFlavorSearch('')
                              }}
                              className="text-[11px] font-bold text-slate-400 hover:text-slate-700 flex items-center gap-0.5"
                            >
                              Fechar <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Campo de Busca Rápida de Sabores */}
                        {siblingProducts.length > 5 && (
                          <div className="relative mb-2.5">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Buscar sabor (ex: calabresa, frango...)"
                              value={flavorSearch}
                              onChange={(e) => setFlavorSearch(e.target.value)}
                              className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-900"
                              autoFocus
                            />
                          </div>
                        )}

                        {/* Lista Scrollável de Sabores */}
                        <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 pr-1">
                          {filteredSiblings.map((sp) => {
                            const isCurrentSelected = selectedFlavor?.id === sp.id
                            return (
                              <div
                                key={sp.id}
                                onClick={() => handleSelectFlavor(idx, sp)}
                                className={
                                  'flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ' +
                                  (isCurrentSelected
                                    ? 'bg-emerald-50/80 text-emerald-950 font-bold'
                                    : 'hover:bg-slate-50 text-slate-700')
                                }
                              >
                                <div className="flex-1 pr-3">
                                  <p
                                    className={
                                      'text-xs ' +
                                      (isCurrentSelected
                                        ? 'font-black text-emerald-900'
                                        : 'font-bold text-slate-800')
                                    }
                                  >
                                    {sp.name}
                                  </p>
                                  {sp.description && (
                                    <p className="text-[11px] text-slate-500 line-clamp-1">
                                      {sp.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs font-bold text-slate-600">
                                    {formatBRL(sp.price)}
                                  </span>
                                  <div
                                    className={
                                      'flex h-5 w-5 items-center justify-center rounded-full border ' +
                                      (isCurrentSelected
                                        ? 'border-emerald-600 bg-emerald-600 text-white'
                                        : 'border-slate-300 bg-white')
                                    }
                                  >
                                    {isCurrentSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  }

                  // 2. ESTADO COLAPSADO - SELECIONADO
                  if (selectedFlavor) {
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setActiveFlavorStep(idx)
                          setFlavorSearch('')
                        }}
                        className="flex items-center justify-between p-3 bg-emerald-50/40 border border-emerald-200/80 rounded-2xl cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-xs group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xs">
                            <Check className="h-4 w-4 stroke-[3]" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                              {fractionCount === 1 ? 'Sabor Único' : `${idx + 1}º Sabor (1/${fractionCount})`}
                            </p>
                            <p className="text-xs font-black text-slate-900 truncate">
                              {selectedFlavor.name}
                            </p>
                            {selectedFlavor.description && (
                              <p className="text-[11px] font-medium text-slate-500 truncate max-w-sm">
                                {selectedFlavor.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-xs font-black text-slate-700">
                            {formatBRL(selectedFlavor.price)}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-700 group-hover:underline flex items-center gap-0.5">
                            Alterar <ChevronDown className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    )
                  }

                  // 3. ESTADO COLAPSADO - PENDENTE DE ESCOLHA
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setActiveFlavorStep(idx)
                        setFlavorSearch('')
                      }}
                      className="flex items-center justify-between p-3.5 bg-amber-50/40 border border-dashed border-amber-300 rounded-2xl cursor-pointer hover:bg-amber-50 hover:border-amber-400 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 font-black text-xs">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                            {idx + 1}º Sabor (1/{fractionCount}) • Escolha Obrigatória
                          </p>
                          <p className="text-xs font-bold text-amber-900">
                            Toque para escolher o {idx + 1}º sabor
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-amber-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Escolher &rarr;
                      </span>
                    </div>
                  )
                })}
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
              className="mt-2 text-xs border-slate-200 bg-white text-slate-900"
              maxLength={200}
            />
          </div>
        </div>

        {/* RODAPÉ COM CONTROLE DE QUANTIDADE E CONFIRMAÇÃO 100% LIGHT */}
        <div className="border-t border-slate-100 bg-slate-50/90 p-5 backdrop-blur-md">
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
