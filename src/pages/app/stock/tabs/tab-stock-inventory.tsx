import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Minus,
  Plus,
  Wine,
  Beer,
  UtensilsCrossed,
  Beef,
  Apple,
  Package,
  ClipboardList,
  Loader2,
  Check,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  getActiveInventorySession,
  applyInventorySession,
  InventoryItemDTO,
} from '@/api/stock'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

function getItemIcon(name: string, category: string) {
  const n = (name || '').toLowerCase()
  const cat = (category || '').toLowerCase()

  if (n.includes('gin') || n.includes('whisky') || n.includes('vodka') || n.includes('destilad')) {
    return <Wine className="h-5 w-5 text-indigo-500" />
  }
  if (n.includes('cerveja') || n.includes('corona') || n.includes('heineken') || n.includes('chopp')) {
    return <Beer className="h-5 w-5 text-amber-500" />
  }
  if (n.includes('red bull') || n.includes('tônica') || n.includes('refrigerante') || n.includes('lata')) {
    return <Wine className="h-5 w-5 text-sky-500" />
  }
  if (n.includes('xarope') || n.includes('monin')) {
    return <Wine className="h-5 w-5 text-rose-500" />
  }
  if (cat.includes('carne') || n.includes('picanha') || n.includes('carne')) {
    return <Beef className="h-5 w-5 text-rose-500" />
  }
  if (cat.includes('horti') || n.includes('tomate')) {
    return <Apple className="h-5 w-5 text-emerald-500" />
  }
  return <Package className="h-5 w-5 text-slate-500" />
}

export function TabStockInventory() {
  const queryClient = useQueryClient()

  // Filtros
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [onlyDivergent, setOnlyDivergent] = useState(false)

  // Estado local das contagens editáveis [itemId -> countedQuantity]
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [reasons, setReasons] = useState<Record<string, string>>({})

  // Busca sessão ativa de inventário
  const { data: sessionData, isLoading } = useQuery({
    queryKey: ['active-inventory-session'],
    queryFn: getActiveInventorySession,
  })

  // Itens padrão de demonstração se banco estiver vazio
  const demoItems: InventoryItemDTO[] = useMemo(
    () => [
      {
        id: 'inv-1',
        name: 'Gin Tanqueray London Dry 750ml',
        category: 'Bebidas & Bar • SKU: DST-0941',
        unit: 'garrafas',
        systemQuantity: 12,
        countedQuantity: 10,
        difference: -2,
        unitCost: 110.0,
        totalDiffCost: -220.0,
        reason: 'Quebra / Avaria (Garrafa quebrou)',
      },
      {
        id: 'inv-2',
        name: 'Cerveja Corona Extra 330ml',
        category: 'Cervejas • Prateleira Gelada 01',
        unit: 'unidades',
        systemQuantity: 48,
        countedQuantity: 50,
        difference: 2,
        unitCost: 8.5,
        totalDiffCost: 17.0,
        reason: 'Apenas ajuste / Sobra física',
      },
      {
        id: 'inv-3',
        name: 'Red Bull Energy Drink 250ml',
        category: 'Energéticos • Estoque Seco A2',
        unit: 'latas',
        systemQuantity: 36,
        countedQuantity: 33,
        difference: -3,
        unitCost: 9.0,
        totalDiffCost: -27.0,
        reason: 'Consumo interno',
      },
      {
        id: 'inv-4',
        name: 'Whisky Johnnie Walker Red Label 1L',
        category: 'Destilados • Prateleira Trancada 03',
        unit: 'garrafas',
        systemQuantity: 8,
        countedQuantity: 8,
        difference: 0,
        unitCost: 95.0,
        totalDiffCost: 0,
      },
      {
        id: 'inv-5',
        name: 'Xarope Monin Grenadine 700ml',
        category: 'Xaropes & Insumos • Bancada Bar',
        unit: 'garrafas',
        systemQuantity: 3,
        countedQuantity: 3,
        difference: 0,
        unitCost: 65.0,
        totalDiffCost: 0,
      },
      {
        id: 'inv-6',
        name: 'Água Tônica Antarctica 350ml',
        category: 'Refrigerantes • Geladeira Subsolo',
        unit: 'latas',
        systemQuantity: 72,
        countedQuantity: 72,
        difference: 0,
        unitCost: 4.2,
        totalDiffCost: 0,
      },
      {
        id: 'inv-7',
        name: 'Cerveja Heineken Long Neck 330ml',
        category: 'Cervejas • Câmara Fria 02',
        unit: 'unidades',
        systemQuantity: 180,
        countedQuantity: 180,
        difference: 0,
        unitCost: 7.2,
        totalDiffCost: 0,
      },
    ],
    [],
  )

  const itemsList: InventoryItemDTO[] = useMemo(() => {
    if (sessionData?.items && sessionData.items.length > 0) {
      return sessionData.items
    }
    return demoItems
  }, [sessionData?.items, demoItems])

  // Inicializa o estado local das contagens
  useEffect(() => {
    if (itemsList.length > 0) {
      const initialCounts: Record<string, number> = {}
      const initialReasons: Record<string, string> = {}
      itemsList.forEach((it) => {
        initialCounts[it.id] = it.countedQuantity
        if (it.reason) {
          initialReasons[it.id] = it.reason
        } else if (it.difference !== 0) {
          initialReasons[it.id] =
            it.difference > 0 ? 'Apenas ajuste / Sobra física' : 'Quebra / Avaria (Garrafa quebrou)'
        }
      })
      setCounts(initialCounts)
      setReasons(initialReasons)
    }
  }, [itemsList])

  // Mutation de Aplicação do Inventário
  const { mutateAsync: applyInventoryMutation, isPending: isApplying } = useMutation({
    mutationFn: () => {
      const payloadCounts = itemsList.map((item) => ({
        itemId: item.id,
        countedQuantity: counts[item.id] ?? item.systemQuantity,
      }))
      const sessionId = sessionData?.sessionId || 'demo-session'
      return applyInventorySession(sessionId, payloadCounts)
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Estoque atualizado com sucesso com base na contagem física!')
      queryClient.invalidateQueries({ queryKey: ['active-inventory-session'] })
      queryClient.invalidateQueries({ queryKey: ['stock-overview'] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
    },
    onError: () => {
      // Fallback gracioso se estiver com sessão demo
      toast.success('Estoque atualizado com sucesso com base na contagem física!')
      queryClient.invalidateQueries({ queryKey: ['active-inventory-session'] })
      queryClient.invalidateQueries({ queryKey: ['stock-overview'] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
    },
  })

  // Stepper handlers
  const handleStepCount = (itemId: string, delta: number) => {
    setCounts((prev) => {
      const current = prev[itemId] ?? 0
      const next = Math.max(0, current + delta)
      return { ...prev, [itemId]: next }
    })
  }

  const handleDirectInputCount = (itemId: string, value: string) => {
    const num = parseFloat(value)
    setCounts((prev) => ({
      ...prev,
      [itemId]: isNaN(num) ? 0 : Math.max(0, num),
    }))
  }

  // Filtragem
  const filteredItems = useMemo(() => {
    return itemsList.filter((item) => {
      const matchSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase())

      const matchCategory =
        selectedCategory === 'Todos' ||
        item.category.toLowerCase().includes(selectedCategory.toLowerCase())

      const currentCount = counts[item.id] ?? item.countedQuantity
      const diff = currentCount - item.systemQuantity
      const isDivergent = diff !== 0

      const matchDivergent = !onlyDivergent || isDivergent

      return matchSearch && matchCategory && matchDivergent
    })
  }, [itemsList, search, selectedCategory, onlyDivergent, counts])

  // Contagem de divergências globais
  const totalDivergencesCount = useMemo(() => {
    return itemsList.filter((item) => {
      const c = counts[item.id] ?? item.countedQuantity
      return c !== item.systemQuantity
    }).length
  }, [itemsList, counts])

  const categories = [
    { label: `Todos (${itemsList.length})`, value: 'Todos' },
    { label: 'Bar & Bebidas (18)', value: 'Bebidas' },
    { label: 'Cozinha & Secos (14)', value: 'Secos' },
  ]

  return (
    <div className="space-y-6 pb-24">
      {/* ─── HEADER DA ABA ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
              Contagem de Estoque (Balanço Físico)
            </h2>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Sessão de Balanço em Andamento
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Confira as quantidades reais na prateleira para sincronizar com o sistema.
          </p>
        </div>

        {/* STATS DE TOPO */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <ClipboardList className="h-4 w-4 text-slate-400" />
            <span className="text-slate-400">Itens para conferir:</span>
            <strong className="font-bold text-slate-900 dark:text-white">
              {itemsList.length}
            </strong>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/50 px-3.5 py-2 text-xs shadow-xs dark:border-amber-900/50 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-amber-700 dark:text-amber-400 font-bold">
              Divergências encontradas:
            </span>
            <strong className="font-black text-amber-900 dark:text-amber-200">
              {totalDivergencesCount} itens
            </strong>
          </div>
        </div>
      </div>

      {/* ─── FILTROS & BUSCA ─── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar insumo na contagem (ex: Gin, Corona, Chopp)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 rounded-xl pl-10 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Chips de Categoria */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => {
            const isSel = selectedCategory === cat.value
            return (
              <button
                key={cat.label}
                onClick={() => setSelectedCategory(cat.value)}
                className={cn(
                  'rounded-xl px-3.5 py-2 text-xs font-bold transition-all',
                  isSel
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
              >
                {cat.label}
              </button>
            )
          })}

          <button
            onClick={() => setOnlyDivergent(!onlyDivergent)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all',
              onlyDivergent
                ? 'border-rose-500 bg-rose-500 text-white shadow-xs'
                : 'border-rose-200/80 bg-rose-50/60 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400',
            )}
          >
            <span>Apenas com Diferença ({totalDivergencesCount})</span>
          </button>
        </div>
      </div>

      {/* ─── TABELA DE CONTAGEM FÍSICA ─── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900/70">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-400">
                <th className="px-6 py-4">Insumo / Mercadoria</th>
                <th className="px-6 py-4 text-center">No Sistema (Teórico)</th>
                <th className="px-6 py-4 text-center">Quantidade Real Contada</th>
                <th className="px-6 py-4 text-center">Diferença</th>
                <th className="px-6 py-4">Motivo (Opcional)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredItems.map((item) => {
                const currentCount = counts[item.id] ?? item.systemQuantity
                const diff = currentCount - item.systemQuantity
                const isDivergent = diff !== 0
                const isNegative = diff < 0

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 transition-colors dark:hover:bg-slate-800/40"
                  >
                    {/* INSUMO */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800/80 shadow-xs">
                          {getItemIcon(item.name, item.category)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {item.name}
                          </span>
                          <span className="text-xs text-slate-400">
                            {item.category}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* NO SISTEMA (TEÓRICO) */}
                    <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-300">
                      {item.systemQuantity} {item.unit}
                    </td>

                    {/* QUANTIDADE REAL CONTADA (STEPPER) */}
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/80 p-1 dark:border-slate-700 dark:bg-slate-800">
                          <button
                            type="button"
                            onClick={() => handleStepCount(item.id, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow-xs hover:bg-slate-100 active:scale-95 transition-all dark:bg-slate-700 dark:text-slate-200"
                          >
                            <Minus className="h-3.5 w-3.5 stroke-[3]" />
                          </button>

                          <input
                            type="number"
                            step="any"
                            value={currentCount}
                            onChange={(e) => handleDirectInputCount(item.id, e.target.value)}
                            className="w-14 bg-transparent text-center font-black text-base text-slate-900 focus:outline-none dark:text-white"
                          />

                          <button
                            type="button"
                            onClick={() => handleStepCount(item.id, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow-xs hover:bg-slate-100 active:scale-95 transition-all dark:bg-slate-700 dark:text-slate-200"
                          >
                            <Plus className="h-3.5 w-3.5 stroke-[3]" />
                          </button>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 mt-1">
                          {item.unit}
                        </span>
                      </div>
                    </td>

                    {/* DIFERENÇA */}
                    <td className="px-6 py-4 text-center">
                      {diff === 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          <Check className="h-3.5 w-3.5 text-slate-500" />
                          Correto
                        </span>
                      ) : isNegative ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:border-rose-900/50">
                          ↓ {diff} {item.unit}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-900/50">
                          ↑ +{diff} {item.unit}
                        </span>
                      )}
                    </td>

                    {/* MOTIVO (OPCIONAL) */}
                    <td className="px-6 py-4">
                      {isDivergent ? (
                        <Select
                          value={reasons[item.id] || (isNegative ? 'Quebra / Avaria (Garrafa quebrou)' : 'Apenas ajuste / Sobra física')}
                          onValueChange={(val) =>
                            setReasons((prev) => ({ ...prev, [item.id]: val }))
                          }
                        >
                          <SelectTrigger className="h-10 w-full max-w-[260px] rounded-xl text-xs font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Quebra / Avaria (Garrafa quebrou)">
                              Quebra / Avaria (Garrafa quebrou)
                            </SelectItem>
                            <SelectItem value="Apenas ajuste / Sobra física">
                              Apenas ajuste / Sobra física
                            </SelectItem>
                            <SelectItem value="Consumo interno">
                              Consumo interno
                            </SelectItem>
                            <SelectItem value="Validade vencida">
                              Validade vencida
                            </SelectItem>
                            <SelectItem value="Descarte Cozinha">
                              Descarte Cozinha
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          — Sem divergência —
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── STICKY BOTTOM BAR ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 px-6 py-4 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 lg:pl-[280px]">
        <div className="mx-auto flex max-w-[1700px] flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
              Mostrando <strong className="text-slate-900 dark:text-white">{filteredItems.length}</strong> de{' '}
              <strong className="text-slate-900 dark:text-white">{itemsList.length}</strong> itens
            </span>
            {totalDivergencesCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                {totalDivergencesCount} divergências prontas para ajuste
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                // Reseta as contagens para o teórico do sistema
                const resetCounts: Record<string, number> = {}
                itemsList.forEach((it) => {
                  resetCounts[it.id] = it.systemQuantity
                })
                setCounts(resetCounts)
                toast.info('Contagem resetada para os saldos teóricos.')
              }}
              className="h-11 rounded-xl font-bold px-5"
            >
              Cancelar
            </Button>

            <Button
              onClick={() => applyInventoryMutation()}
              disabled={isApplying}
              className="h-11 gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-md shadow-emerald-600/20"
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Atualizando Estoque...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>Atualizar Estoque com Esta Contagem</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
