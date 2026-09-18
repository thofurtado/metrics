import { Check, ChevronDown, ChevronUp, Minus, Pizza, Plus, Search, Sparkles, X, Edit3, Info, ShoppingBag } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { resolveImageUrl } from '@/lib/utils'

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
  category_id?: string
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

const FREQUENT_SHORTCUTS = [
  'Sem cebola',
  'Carne bem passada',
  'Ao ponto',
  'Molho à parte',
  'Enviar sachês',
  'Sem orégano',
  'Massa crocante',
  'Cortar em 8 pedaços',
  'Embalagem separada'
]

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
  const [flavorCategoryFilter, setFlavorCategoryFilter] = useState<string>('Todas')

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
      setFlavorCategoryFilter('Todas')
      setSelectedOptionsQty({})
      setItemQuantity(1)
      setObservation('')
    }
  }, [open, product])

  // Garante liberação de cliques/toques ao fechar modal
  useEffect(() => {
    if (!open) {
      document.body.style.pointerEvents = ''
    }
  }, [open])

  // Lista de produtos irmãos (mesma categoria/subcategoria que aceitem fracionamento)
  const siblingProducts = useMemo(() => {
    if (!product) return []
    return allProducts.filter((p) => {
      // Se for fracionado (ex: Pizza):
      if (product.subcategory?.accepts_fractions) {
        const isSameCategory = p.category === product.category || (p as any).category_id === (product as any).category_id
        return Boolean(p.subcategory?.accepts_fractions) && isSameCategory
      }
      if (product.subcategory?.id && p.subcategory?.id) {
        return p.subcategory.id === product.subcategory.id
      }
      return p.category === product.category
    })
  }, [allProducts, product])

  // Categorias disponíveis de sabores para as abas de filtro
  const availableFlavorTabs = useMemo(() => {
    const tabs = ['Todas']
    const hasTrad = siblingProducts.some((p) => (p.subcategory?.name || '').toLowerCase().includes('tradiciona'))
    const hasEsp = siblingProducts.some((p) => (p.subcategory?.name || '').toLowerCase().includes('especia') || (p.subcategory?.name || '').toLowerCase().includes('premium'))
    const hasDoces = siblingProducts.some((p) => (p.subcategory?.name || '').toLowerCase().includes('doce'))

    if (hasTrad) tabs.push('Tradicionais')
    if (hasEsp) tabs.push('Especiais')
    if (hasDoces) tabs.push('Doces')

    // Se houver outras subcategorias que não se encaixaram nas 3:
    siblingProducts.forEach((p) => {
      const name = p.subcategory?.name
      if (name && !name.toLowerCase().includes('tradiciona') && !name.toLowerCase().includes('especia') && !name.toLowerCase().includes('doce')) {
        if (!tabs.includes(name)) tabs.push(name)
      }
    })

    return tabs
  }, [siblingProducts])

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

  // Grupos de adicionais / complementos vinculados (Obrigatórios vêm no topo)
  const groups: ComplementGroup[] = useMemo(() => {
    if (!product.complementGroups || !Array.isArray(product.complementGroups)) return []
    return [...product.complementGroups].sort((a, b) => {
      const aReq = ((a.min_quantity && a.min_quantity > 0) || (a as any).is_required) ? 1 : 0
      const bReq = ((b.min_quantity && b.min_quantity > 0) || (b as any).is_required) ? 1 : 0
      if (aReq !== bReq) {
        return bReq - aReq // Obrigatórios primeiro!
      }
      return ((a as any).sort_order ?? 0) - ((b as any).sort_order ?? 0)
    })
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

  // Atalhos de observação rápidos (toggle chip)
  const handleToggleShortcut = (chip: string) => {
    setObservation((prev) => {
      const trimmed = prev.trim()
      if (!trimmed) return chip

      // Se já contém, remove
      const regex = new RegExp(`(,\\s*)?${chip}(,\\s*)?`, 'i')
      if (regex.test(trimmed)) {
        let clean = trimmed.replace(regex, ', ').replace(/^,\s*/, '').replace(/,\s*$/, '')
        return clean
      }

      // Senão adiciona
      const separator = trimmed.endsWith(',') ? ' ' : ', '
      const next = `${trimmed}${separator}${chip}`
      return next.slice(0, 140)
    })
  }

  // Cálculo do Preço Unitário Total
  const { unitPrice, isReadyToConfirm, validationError } = useMemo(() => {
    // 1. Preço Base dos Sabores: padrão de pizzarias/delivery é cobrar pelo MAIOR preço entre as metades
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
          if (groupChargedCount > group.free_quantity) {
            complementsTotal += opt.price
          }
        }
      })
    })

    const finalUnitPrice = baseFlavorPrice + complementsTotal

    // 3. Validações de Obrigatórios
    let error: string | null = null

    if (acceptsFractions && fractionCount > 1) {
      const hasMissingFlavor = selectedFlavors.some((f) => f === null)
      if (hasMissingFlavor) {
        error = `Por favor, selecione todos os ${fractionCount} sabores.`
      }
    }

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
    if (!isReadyToConfirm) {
      if (validationError) {
        alert(validationError)
      }
      return
    }

    let displayName = product.name
    const flavorNames = selectedFlavors.filter((f): f is ProductItem => f !== null).map((f) => f.name)
    if (acceptsFractions && fractionCount > 1 && flavorNames.length > 1) {
      displayName = `1/${fractionCount} ${flavorNames.join(` + 1/${fractionCount} `)}`
    }

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
      <DialogContent
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          document.body.style.pointerEvents = ''
        }}
        className="max-h-[94vh] sm:max-h-[90vh] w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl overflow-hidden p-0 sm:rounded-3xl !bg-white text-slate-900 border-none shadow-2xl flex flex-col [&>button]:hidden relative"
      >
        {/* BOTÃO FECHAR FIXO NO TOPO DIREITO (SEMPRE ACESSÍVEL E CLICÁVEL, NUNCA SOME NO SCROLL) */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-slate-900/75 text-white backdrop-blur-md shadow-xl transition-all hover:bg-slate-900 hover:scale-105 active:scale-95 touch-manipulation cursor-pointer border border-white/20"
          aria-label="Fechar"
        >
          <X className="h-5 w-5 stroke-[2.5]" />
        </button>

        {/* HERO BANNER COM PREÇO FLUTUANTE */}
        {product.imageUrl ? (
          <div className="relative h-60 sm:h-72 md:h-80 w-full shrink-0 overflow-hidden bg-slate-900">
            <img
              src={resolveImageUrl(product.imageUrl)}
              alt={product.name}
              className="h-full w-full object-cover"
            />
            {/* Gradiente sutil inferior sem interceptar cliques */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

            {/* Pílula de Preço Flutuante Fiel ao Stitch */}
            <div className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-black text-slate-900 shadow-md backdrop-blur-md tracking-tight">
              A PARTIR DE {formatBRL(product.price)}
            </div>
          </div>
        ) : (
          <div className="relative border-b border-slate-100 bg-slate-50 px-5 py-4 flex items-center justify-between pr-16">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-emerald-600/30 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> {product.category || 'ITEM'}
              </span>
              <span className="text-xs font-extrabold text-slate-700">
                A partir de {formatBRL(product.price)}
              </span>
            </div>
          </div>
        )}

        {/* INFORMAÇÕES DO PRODUTO (FIXAS ABAIXO DA IMAGEM) */}
        <div className="shrink-0 px-5 sm:px-6 pt-4 pb-2 bg-white border-b border-slate-100">
          {product.imageUrl && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                <Sparkles className="h-3 w-3 text-emerald-600" />
                {product.category || 'ITEM'}
              </span>
            </div>
          )}
          <DialogTitle className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">
            {product.name}
          </DialogTitle>
          {product.description && (
            <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl">
              {product.description}
            </p>
          )}
        </div>

        {/* CONTEÚDO SCROLLÁVEL */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 bg-slate-50/50">
          {/* SEÇÃO 1: FRACIONAMENTO / MEIO-A-MEIO (FIEL AO STITCH) */}
          {acceptsFractions && (
            <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4">
              {/* Cabeçalho do Seletor com Obrigatório */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pizza className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-sm font-black text-slate-900">Quantos sabores você deseja?</h3>
                </div>
                <span className="text-xs font-bold text-emerald-700">Obrigatório</span>
              </div>

              {/* Seletor em Pílulas */}
              <div className={`grid gap-2 bg-slate-100/90 p-1.5 rounded-2xl ${maxFractions >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <button
                  type="button"
                  onClick={() => handleSetFractions(1)}
                  className={`rounded-xl py-2.5 text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    fractionCount === 1
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>1 Sabor</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetFractions(2)}
                  className={`rounded-xl py-2.5 text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    fractionCount === 2
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>2 Sabores (1/2)</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </button>
                {maxFractions >= 3 && (
                  <button
                    type="button"
                    onClick={() => handleSetFractions(3)}
                    className={`rounded-xl py-2.5 text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      fractionCount === 3
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>3 Sabores (1/3)</span>
                  </button>
                )}
              </div>

              {/* Card Resumo do Meio a Meio */}
              {fractionCount > 1 && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative h-10 w-10 shrink-0 rounded-full border-2 border-emerald-600 overflow-hidden flex items-center justify-center shadow-xs">
                      <div className="w-1/2 h-full bg-emerald-500" />
                      <div className="w-1/2 h-full bg-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900">
                        Pizza Meio a Meio (50% / 50%)
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate">
                        2 metades equilibradas no mesmo disco grande (8 pedaços)
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-1 text-[10px] font-black text-emerald-800 shrink-0">
                    {selectedFlavors.filter(Boolean).length}/2 Selecionados
                  </span>
                </div>
              )}

              {/* Slot 1: Sabor Principal Incluído */}
              <div className="rounded-2xl border border-emerald-200 bg-white p-3.5 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-black text-xs shadow-xs mt-0.5">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </span>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                      1º SABOR (1/{fractionCount}) • {fractionCount === 1 ? '100%' : '50%'}
                    </span>
                    <p className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                      {selectedFlavors[0]?.name || product.name}
                    </p>
                    {selectedFlavors[0]?.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {selectedFlavors[0].description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-slate-800 block">
                    {formatBRL(selectedFlavors[0]?.price || product.price)}
                  </span>
                  {fractionCount > 1 && (
                    <button
                      type="button"
                      onClick={() => setActiveFlavorStep(0)}
                      className="text-[11px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                    >
                      Alterar <ChevronDown className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Slot 2 e outros (quando houver mais frações) */}
              {fractionCount > 1 &&
                Array.from({ length: fractionCount - 1 }).map((_, relIdx) => {
                  const idx = relIdx + 1
                  const selectedFlavor = selectedFlavors[idx]
                  const isExpanded = activeFlavorStep === idx

                  // Filtro por busca rápida e abas de categoria
                  const filteredSiblings = siblingProducts.filter((sp) => {
                    if (flavorCategoryFilter !== 'Todas') {
                      const subName = (sp.subcategory?.name || '').toLowerCase()
                      if (flavorCategoryFilter === 'Tradicionais' && !subName.includes('tradiciona')) return false
                      if (flavorCategoryFilter === 'Especiais' && !subName.includes('especia') && !subName.includes('premium')) return false
                      if (flavorCategoryFilter === 'Doces' && !subName.includes('doce')) return false
                    }
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
                        className="rounded-2xl border-2 border-emerald-500 bg-white p-3.5 sm:p-4 shadow-md transition-all space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">
                              {idx + 1}
                            </span>
                            <h4 className="text-xs sm:text-sm font-black text-slate-900">
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

                        {/* Abas de Categorias de Sabores Fiel ao Stitch */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                          {availableFlavorTabs.map((tab) => {
                            const isTabActive = flavorCategoryFilter === tab
                            return (
                              <button
                                key={tab}
                                type="button"
                                onClick={() => setFlavorCategoryFilter(tab)}
                                className={`px-3 py-1 rounded-full text-xs font-black transition-all shrink-0 ${
                                  isTabActive
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {tab}
                              </button>
                            )
                          })}
                        </div>

                        {/* Campo de Busca Rápida */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Buscar sabor (ex: calabresa, frango, margherita...)"
                            value={flavorSearch}
                            onChange={(e) => setFlavorSearch(e.target.value)}
                            className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-900"
                          />
                        </div>

                        {/* Lista Scrollável de Sabores */}
                        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 pr-1">
                          {filteredSiblings.map((sp) => {
                            const isCurrentSelected = selectedFlavor?.id === sp.id
                            const isMaisPedida = sp.name.toLowerCase().includes('calabresa') || sp.name.toLowerCase().includes('frango')

                            return (
                              <div
                                key={sp.id}
                                onClick={() => handleSelectFlavor(idx, sp)}
                                className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl cursor-pointer transition-all ${
                                  isCurrentSelected
                                    ? 'bg-emerald-50/90 text-emerald-950 font-bold ring-1 ring-emerald-400'
                                    : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex-1 pr-3">
                                  <div className="flex items-center gap-1.5">
                                    <p className={`text-xs sm:text-sm ${isCurrentSelected ? 'font-black text-emerald-950' : 'font-black text-slate-900'}`}>
                                      {sp.name}
                                    </p>
                                    {isMaisPedida && (
                                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-800">
                                        Mais Pedida
                                      </span>
                                    )}
                                  </div>
                                  {sp.description && (
                                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                      {sp.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2.5 shrink-0">
                                  <span className="text-xs font-black text-slate-800">
                                    {formatBRL(sp.price)}
                                  </span>
                                  <div
                                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                                      isCurrentSelected
                                        ? 'border-emerald-600 bg-emerald-600 text-white'
                                        : 'border-slate-300 bg-white'
                                    }`}
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
                        className="flex items-center justify-between p-3.5 bg-emerald-50/40 border border-emerald-200 rounded-2xl cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-xs group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-black text-xs shadow-xs">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </span>
                          <div className="min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                              {idx + 1}º SABOR (1/{fractionCount}) • 50%
                            </span>
                            <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                              {selectedFlavor.name}
                            </p>
                            {selectedFlavor.description && (
                              <p className="text-[11px] text-slate-500 truncate max-w-sm">
                                {selectedFlavor.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-xs font-black text-slate-800">
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
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 font-black text-xs">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">
                            {idx + 1}º Sabor (1/{fractionCount}) • OBRIGATÓRIO
                          </span>
                          <p className="text-xs font-black text-amber-900">
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
          )}

          {/* SEÇÃO 2: GRUPOS DE ADICIONAIS ESTILO STITCH (OBRIGATÓRIOS DESTACADOS NO TOPO) */}
          {groups.map((group) => {
            const totalQtyInGroup = group.options.reduce(
              (sum, opt) => sum + (selectedOptionsQty[opt.id] || 0),
              0,
            )
            const isMandatory = (group.min_quantity && group.min_quantity > 0) || (group as any).is_required
            const isSatisfied = isMandatory ? totalQtyInGroup >= group.min_quantity : true

            return (
              <div
                key={group.id}
                id={`group-${group.id}`}
                className={`rounded-3xl border bg-white p-4 sm:p-5 shadow-xs transition-all ${
                  isMandatory && !isSatisfied
                    ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-300'
                    : 'border-slate-200/90'
                }`}
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">{group.name}</h4>
                      {group.free_quantity > 0 && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                          {group.free_quantity === 1 ? '1º Grátis' : `${group.free_quantity} Grátis`}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                      {isMandatory
                        ? `Escolha no mínimo ${group.min_quantity} e no máximo ${group.max_quantity}`
                        : `Escolha até ${group.max_quantity} opções`}
                    </p>
                  </div>
                  {isMandatory && (
                    <span
                      className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-all ${
                        isSatisfied
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-500 text-white shadow-xs'
                      }`}
                    >
                      {isSatisfied ? '✓ Obrigatório' : 'Obrigatório'}
                    </span>
                  )}
                </div>

                {group.free_quantity > 0 && (
                  <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-2.5 text-[11px] text-emerald-900">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>
                      {group.free_quantity === 1
                        ? 'O primeiro item é por nossa conta! Demais são cobrados à parte.'
                        : `Os primeiros ${group.free_quantity} itens são por nossa conta! Demais são cobrados à parte.`}
                    </span>
                  </div>
                )}

                <div className="divide-y divide-slate-100 pt-1">
                  {group.options.map((opt) => {
                    const qty = selectedOptionsQty[opt.id] || 0
                    const canAdd = totalQtyInGroup < group.max_quantity

                    return (
                      <div
                        key={opt.id}
                        className="flex items-center justify-between py-2.5 sm:py-3"
                      >
                        <div>
                          <p className="text-sm sm:text-base font-black text-slate-900 leading-snug">{opt.name}</p>
                          <p className="text-[11px] font-semibold text-slate-500">
                            {opt.price > 0 ? `+ ${formatBRL(opt.price)}` : 'Grátis'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/80 p-1">
                          <button
                            type="button"
                            onClick={() => handleDecreaseOption(opt)}
                            disabled={qty === 0}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-800 border border-slate-200 shadow-xs transition-all hover:bg-slate-100 disabled:opacity-20 active:scale-90"
                          >
                            <Minus className="h-3.5 w-3.5 stroke-[3]" />
                          </button>
                          <span className="w-6 text-center text-sm font-black text-slate-900">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleIncreaseOption(group, opt)}
                            disabled={!canAdd}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-white shadow-xs transition-all disabled:opacity-20 active:scale-90"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Plus className="h-3.5 w-3.5 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* SEÇÃO 3: OBSERVAÇÕES PARA PRODUÇÃO COM ATALHOS FREQUENTES (FIEL À IMAGEM 2) */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3">
            {/* Header com ícone de edição */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <Edit3 className="h-5 w-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm sm:text-base font-black text-slate-900">
                      Observações para Produção
                    </h4>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      Opcional
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Avise sobre pontos da carne, remoção de ingredientes ou alergias
                  </p>
                </div>
              </div>
            </div>

            {/* Atalhos Frequentes Chips */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  ATALHOS FREQUENTES
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  Toque para adicionar rápido
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FREQUENT_SHORTCUTS.map((chip) => {
                  const isSelected = observation.toLowerCase().includes(chip.toLowerCase())
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleToggleShortcut(chip)}
                      className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all border ${
                        isSelected
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected ? '✓' : '+'} {chip}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Textarea com Contador e Aviso */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
              <textarea
                placeholder="Ex: Tirar cebola, carne bem passada, enviar sachês..."
                value={observation}
                onChange={(e) => setObservation(e.target.value.slice(0, 140))}
                className="w-full h-20 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none font-medium"
                maxLength={140}
              />
              <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400">
                <div className="flex items-center gap-1 text-slate-400">
                  <Info className="h-3 w-3" />
                  <span>Não informe dados sensíveis ou pagamento aqui</span>
                </div>
                <span className="font-bold">{observation.length}/140</span>
              </div>
            </div>

            {/* Botão de Limpar */}
            {observation.length > 0 && (
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => setObservation('')}
                  className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors"
                >
                  Limpar observação
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RODAPÉ COM CONTROLE DE QUANTIDADE E CONFIRMAÇÃO */}
        <div className="border-t border-slate-100 bg-white p-4 sm:p-5 shrink-0">
          {acceptsFractions && fractionCount > 1 && selectedFlavors.filter(Boolean).length === fractionCount && (
            <p className="mb-2 text-center text-xs font-black text-emerald-700 flex items-center justify-center gap-1.5 animate-fade-in">
              <Check className="h-4 w-4 stroke-[3]" /> {fractionCount} de {fractionCount} Sabores selecionados com sucesso!
            </p>
          )}

          {validationError && (
            <p className="mb-2 text-center text-xs font-bold text-amber-700">
              ⚠️ {validationError}
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            {/* Contador de Quantidade do Prato */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setItemQuantity((q) => Math.max(1, q - 1))}
                disabled={itemQuantity <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-700 shadow-xs transition-all disabled:opacity-30 active:scale-95"
              >
                <Minus className="h-3.5 w-3.5 stroke-[2.5]" />
              </button>
              <span className="w-6 text-center text-sm font-black text-slate-900">
                {itemQuantity}
              </span>
              <button
                type="button"
                onClick={() => setItemQuantity((q) => q + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-700 shadow-xs transition-all active:scale-95"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              </button>
            </div>

            {/* Botão de Adicionar à Sacola */}
            <button
              type="button"
              onClick={handleConfirm}
              className={`flex-1 flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-md transition-all active:scale-[0.98] touch-manipulation cursor-pointer ${
                isReadyToConfirm ? 'hover:brightness-105' : 'bg-amber-600 hover:bg-amber-500'
              }`}
              style={isReadyToConfirm ? { backgroundColor: primaryColor } : undefined}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>{isReadyToConfirm ? 'ADICIONAR À SACOLA' : 'SELECIONE OS OBRIGATÓRIOS'}</span>
              <span className="ml-1 opacity-90">{formatBRL(unitPrice * itemQuantity)}</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
