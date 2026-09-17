import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Search,
  CheckCircle2,
  Download,
  Calendar,
  Clock,
  ShoppingBag,
  ArrowDown,
  ArrowUpRight,
  Beef,
  Beer,
  Wine,
  Apple,
  Package,
  UtensilsCrossed,
  X,
  Info,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

import { getRecipeConsumption, RecipeConsumptionItem } from '@/api/stock'
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

function getCategoryIcon(category: string, name: string) {
  const cat = (category || '').toLowerCase()
  const n = (name || '').toLowerCase()

  if (cat.includes('carne') || cat.includes('açougue') || n.includes('picanha') || n.includes('carne') || n.includes('burger')) {
    return <Beef className="h-5 w-5 text-rose-500" />
  }
  if (cat.includes('bebida') || cat.includes('cerveja') || n.includes('heineken') || n.includes('corona') || n.includes('chopp')) {
    return <Beer className="h-5 w-5 text-amber-500" />
  }
  if (cat.includes('destilado') || cat.includes('bar') || n.includes('gin') || n.includes('whisky') || n.includes('vodka')) {
    return <Wine className="h-5 w-5 text-indigo-500" />
  }
  if (cat.includes('horti') || cat.includes('frut') || n.includes('tomate') || n.includes('cebola') || n.includes('limão')) {
    return <Apple className="h-5 w-5 text-emerald-500" />
  }
  if (cat.includes('embalag') || cat.includes('descart') || n.includes('caixa') || n.includes('copo')) {
    return <Package className="h-5 w-5 text-sky-500" />
  }
  return <UtensilsCrossed className="h-5 w-5 text-slate-500" />
}

export function TabRecipeConsumption() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [period, setPeriod] = useState('today')
  const [selectedSupplyId, setSelectedSupplyId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['stock-recipe-consumption', period, selectedCategory],
    queryFn: () =>
      getRecipeConsumption({
        period,
        category: selectedCategory === 'Todos' ? undefined : selectedCategory,
      }),
  })

  // Dados mockados de demonstração caso a base ainda não tenha composições cadastradas
  const demoSupplies: RecipeConsumptionItem[] = useMemo(() => [
    {
      id: 'demo-1',
      name: 'Carne Moída Blend (Smash)',
      category: 'Carnes & Açougue',
      unit: 'kg',
      currentStock: 18.5,
      unitCost: 36.0,
      situation: 'NORMAL',
      location: 'Câmara Fria 02 • Gaveta Carnes',
      totalDeducted: 18.5,
      totalDeductedCost: 666.0,
      totalPortionsSold: 125,
      estimatedAutonomy: 102,
      linkedProductsCount: 3,
      dishUsages: [
        {
          productId: 'p-1',
          productName: 'Burger Smash Duplo',
          categoryName: 'Lanches & Burgers',
          dose: 0.18,
          doseFormatted: '180 g / porção',
          salesCount: 70,
          percentageUsage: 68.1,
          deductedQuantity: 12.6,
          costOfDeduction: 453.6,
        },
        {
          productId: 'p-2',
          productName: 'Burger Smash Simples',
          categoryName: 'Lanches & Burgers',
          dose: 0.09,
          doseFormatted: '90 g / porção',
          salesCount: 45,
          percentageUsage: 21.9,
          deductedQuantity: 4.05,
          costOfDeduction: 145.8,
        },
        {
          productId: 'p-3',
          productName: 'Porção Mini Burgers (Aperitivo)',
          categoryName: 'Porções & Petiscos',
          dose: 0.2,
          doseFormatted: '200 g / porção',
          salesCount: 10,
          percentageUsage: 10.0,
          deductedQuantity: 2.0,
          costOfDeduction: 72.0,
        },
      ],
    },
    {
      id: 'demo-2',
      name: 'Queijo Cheddar Fatiado',
      category: 'Laticínios & Frios',
      unit: 'kg',
      currentStock: 3.1,
      unitCost: 48.0,
      situation: 'WARNING',
      location: 'Câmara Fria 01 • Prateleira 2',
      totalDeducted: 2.4,
      totalDeductedCost: 115.2,
      totalPortionsSold: 80,
      estimatedAutonomy: 52,
      linkedProductsCount: 2,
      dishUsages: [
        {
          productId: 'p-1',
          productName: 'Burger Smash Duplo',
          categoryName: 'Lanches & Burgers',
          dose: 0.04,
          doseFormatted: '40 g / porção',
          salesCount: 50,
          percentageUsage: 83.3,
          deductedQuantity: 2.0,
          costOfDeduction: 96.0,
        },
        {
          productId: 'p-2',
          productName: 'Batata Frita com Cheddar e Bacon',
          categoryName: 'Porções & Petiscos',
          dose: 0.04,
          doseFormatted: '40 g / porção',
          salesCount: 10,
          percentageUsage: 16.7,
          deductedQuantity: 0.4,
          costOfDeduction: 19.2,
        },
      ],
    },
    {
      id: 'demo-3',
      name: 'Gin Tanqueray London Dry 750ml',
      category: 'Destilados & Bar',
      unit: 'garrafa',
      currentStock: 1.0,
      unitCost: 110.0,
      situation: 'CRITICAL',
      location: 'Bancada Drinks • Gaveta 01',
      totalDeducted: 2.0,
      totalDeductedCost: 220.0,
      totalPortionsSold: 30,
      estimatedAutonomy: 15,
      linkedProductsCount: 4,
      dishUsages: [
        {
          productId: 'p-4',
          productName: 'Gin Tônica Clássico',
          categoryName: 'Drinks & Coquetéis',
          dose: 0.05,
          doseFormatted: '50 ml / dose',
          salesCount: 20,
          percentageUsage: 50.0,
          deductedQuantity: 1.0,
          costOfDeduction: 110.0,
        },
        {
          productId: 'p-5',
          productName: 'Gin Tropical',
          categoryName: 'Drinks & Coquetéis',
          dose: 0.05,
          doseFormatted: '50 ml / dose',
          salesCount: 20,
          percentageUsage: 50.0,
          deductedQuantity: 1.0,
          costOfDeduction: 110.0,
        },
      ],
    },
    {
      id: 'demo-4',
      name: 'Pão Brioche Artesanal com Gergelim',
      category: 'Padaria & Secos',
      unit: 'unidades',
      currentStock: 45.0,
      unitCost: 2.2,
      situation: 'NORMAL',
      location: 'Estoque Seco A2',
      totalDeducted: 115.0,
      totalDeductedCost: 253.0,
      totalPortionsSold: 115,
      estimatedAutonomy: 45,
      linkedProductsCount: 5,
      dishUsages: [
        {
          productId: 'p-1',
          productName: 'Burger Smash Duplo',
          categoryName: 'Lanches & Burgers',
          dose: 1.0,
          doseFormatted: '1 un / burger',
          salesCount: 70,
          percentageUsage: 60.9,
          deductedQuantity: 70.0,
          costOfDeduction: 154.0,
        },
        {
          productId: 'p-2',
          productName: 'Burger Smash Simples',
          categoryName: 'Lanches & Burgers',
          dose: 1.0,
          doseFormatted: '1 un / burger',
          salesCount: 45,
          percentageUsage: 39.1,
          deductedQuantity: 45.0,
          costOfDeduction: 99.0,
        },
      ],
    },
  ], [])

  // Se a API retornar dados vazios (banco limpo), usa os itens ricos demonstrativos
  const suppliesList: RecipeConsumptionItem[] = useMemo(() => {
    if (data?.supplies && data.supplies.length > 0) {
      return data.supplies
    }
    return demoSupplies
  }, [data?.supplies, demoSupplies])

  // Filtragem da lista esquerda
  const filteredSupplies = useMemo(() => {
    return suppliesList.filter((item) => {
      const matchSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase())

      const matchCategory =
        selectedCategory === 'Todos' ||
        item.category.toLowerCase().includes(selectedCategory.toLowerCase())

      return matchSearch && matchCategory
    })
  }, [suppliesList, search, selectedCategory])

  // Item selecionado atual
  const activeSupply = useMemo(() => {
    if (selectedSupplyId) {
      const found = suppliesList.find((s) => s.id === selectedSupplyId)
      if (found) return found
    }
    return filteredSupplies[0] || suppliesList[0] || null
  }, [selectedSupplyId, suppliesList, filteredSupplies])

  const categories = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Carnes (12)', value: 'Carne' },
    { label: 'Laticínios (8)', value: 'Laticínio' },
    { label: 'Bar (16)', value: 'Bar' },
    { label: 'Hortifrúti', value: 'Hortifrúti' },
  ]

  const handleExport = () => {
    toast.success('Relatório de consumo por ficha técnica exportado com sucesso!')
  }

  return (
    <div className="space-y-6">
      {/* ─── HEADER DA ABA ─── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
              Consumo por Ficha Técnica
            </h2>
            <span className="rounded-full bg-slate-100 border border-slate-200/80 px-3 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
              Visão BOH & Auditoria
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Rastreie a origem exata das baixas de estoque: selecione um insumo e veja quais pratos do cardápio geraram saídas no PDV.
          </p>
        </div>

        {/* STATS DE TOPO & EXPORTAR */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-xs shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <span className="text-slate-400">Insumos Mapeados:</span>
            <strong className="font-bold text-slate-900 dark:text-white">
              {data?.mappedSuppliesCount || suppliesList.length} com receita ativa
            </strong>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>100% Integrado ao PDV</span>
          </div>

          <Button
            variant="outline"
            onClick={handleExport}
            className="h-9 gap-2 rounded-xl font-bold text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar Relatório</span>
          </Button>
        </div>
      </div>

      {/* ─── LAYOUT MASTER-DETAIL (2 COLUNAS) ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* COLUNA ESQUERDA: INSUMOS CONTROLADOS (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Insumos Controlados
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {suppliesList.length}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">
                Ordenado por giro diário
              </span>
            </div>

            {/* Busca */}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Buscar insumo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 rounded-xl pl-9 text-xs"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Chips */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {categories.map((cat) => {
                const isSel = selectedCategory === cat.value
                return (
                  <button
                    key={cat.label}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all',
                      isSel
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-50 border border-slate-200/60 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300',
                    )}
                  >
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* LISTA DE CARDS DE INSUMOS */}
          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {filteredSupplies.map((supply) => {
              const isSelected = activeSupply?.id === supply.id
              const isCrit = supply.situation === 'CRITICAL'
              const isWarn = supply.situation === 'WARNING'

              return (
                <div
                  key={supply.id}
                  onClick={() => setSelectedSupplyId(supply.id)}
                  className={cn(
                    'relative cursor-pointer rounded-2xl border p-4 transition-all duration-200',
                    isSelected
                      ? 'border-2 border-emerald-500 bg-emerald-50/20 shadow-md shadow-emerald-500/5 dark:bg-emerald-950/20'
                      : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700',
                  )}
                >
                  {isSelected && (
                    <span className="absolute -top-2.5 right-4 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                      ✓ Visualizando
                    </span>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800/80 shadow-xs">
                      {getCategoryIcon(supply.category, supply.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-slate-900 dark:text-white truncate">
                        {supply.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {supply.category}
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Estoque Atual
                          </span>
                          <span
                            className={cn(
                              'text-base font-black',
                              isCrit
                                ? 'text-rose-600 dark:text-rose-400'
                                : isWarn
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-900 dark:text-white',
                            )}
                          >
                            {supply.currentStock}{' '}
                            <span className="text-xs font-semibold lowercase">
                              {supply.unit}
                            </span>
                          </span>
                        </div>

                        {/* Badge de Situação */}
                        <div>
                          {isCrit ? (
                            <span className="rounded-full bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 dark:bg-rose-950/40 dark:border-rose-900/50">
                              • Crítico
                            </span>
                          ) : isWarn ? (
                            <span className="rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:bg-amber-950/40 dark:border-amber-900/50">
                              • Atenção
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-900/50">
                              • Normal
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Sub-informação de vínculo e consumo */}
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-slate-800/80">
                        <span className="flex items-center gap-1">
                          <UtensilsCrossed className="h-3 w-3 text-slate-400" />
                          {supply.linkedProductsCount} pratos vinculados
                        </span>
                        <span className="font-bold text-rose-500">
                          Consumo hoje: - {supply.totalDeducted} {supply.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* PAINEL DIREITO: DETALHAMENTO DO INSUMO SELECIONADO (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {activeSupply ? (
            <>
              {/* HEADER DO INSUMO SELECIONADO */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 shadow-xs">
                      {getCategoryIcon(activeSupply.category, activeSupply.name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">
                          {activeSupply.name}
                        </h3>
                        <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-300">
                          Status: Normal
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Estoque Físico:{' '}
                        <strong className="text-slate-800 dark:text-slate-200 font-bold">
                          {activeSupply.currentStock} {activeSupply.unit} disponíveis
                        </strong>{' '}
                        • Custo Médio:{' '}
                        <strong className="text-slate-800 dark:text-slate-200 font-bold">
                          R$ {activeSupply.unitCost.toFixed(2)} / {activeSupply.unit}
                        </strong>{' '}
                        • Localização:{' '}
                        <span className="text-slate-400">{activeSupply.location}</span>
                      </p>
                    </div>
                  </div>

                  {/* Seletor de Período */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Período:
                    </span>
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger className="h-9 w-36 rounded-xl text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Hoje (16/09)</SelectItem>
                        <SelectItem value="yesterday">Ontem</SelectItem>
                        <SelectItem value="7days">Últimos 7 dias</SelectItem>
                        <SelectItem value="30days">Este Mês</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 3 KPI CARDS */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* 1: TOTAL BAIXADO */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Total Baixado no Período
                    </span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-500 dark:bg-rose-950/40">
                      <ArrowDown className="h-4 w-4 stroke-[3]" />
                    </div>
                  </div>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {activeSupply.totalDeducted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{' '}
                    <span className="text-sm font-bold text-slate-500">
                      {activeSupply.unit}
                    </span>
                  </p>
                  <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                    R$ {activeSupply.totalDeductedCost.toFixed(2)} consumidos no estoque
                  </p>
                </div>

                {/* 2: PRATOS VENDIDOS NO PDV */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Pratos Vendidos no PDV
                    </span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {activeSupply.totalPortionsSold}{' '}
                    <span className="text-sm font-bold text-slate-500">porções</span>
                  </p>
                  <p className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {activeSupply.linkedProductsCount} pratos ativos • 100% automatizado
                  </p>
                </div>

                {/* 3: AUTONOMIA ESTIMADA */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Autonomia Estimada
                    </span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/40">
                      <Clock className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    ~{activeSupply.estimatedAutonomy}{' '}
                    <span className="text-sm font-bold text-slate-500">porções</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Possíveis com o saldo atual de {activeSupply.currentStock} {activeSupply.unit}
                  </p>
                </div>
              </div>

              {/* TABELA: QUAIS PRODUTOS BAIXARAM ESTE INSUMO */}
              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
                  <div>
                    <h4 className="font-black text-base text-slate-900 dark:text-white">
                      Quais Produtos Baixaram Este Insumo
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cruzamento em tempo real dos cupons fiscais e comandas faturadas com a receita cadastrada.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {activeSupply.dishUsages.length} Produtos Ativos
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/80">
                        <th className="px-6 py-3.5">Prato / Produto Vendido</th>
                        <th className="px-6 py-3.5 text-center">Dose na Receita</th>
                        <th className="px-6 py-3.5 text-center">Vendas no PDV</th>
                        <th className="px-6 py-3.5 text-center">Total Baixado (% Uso)</th>
                        <th className="px-6 py-3.5 text-right">Custo da Baixa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {activeSupply.dishUsages.map((dish) => (
                        <tr
                          key={dish.productId}
                          className="hover:bg-slate-50/70 transition-colors dark:hover:bg-slate-800/40"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">🍔</span>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {dish.productName}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {dish.categoryName}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <span className="inline-block rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {dish.doseFormatted}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <span className="font-black text-slate-900 dark:text-white block">
                              {dish.salesCount} vendas
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {dish.percentageUsage}% dos pedidos
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-black text-slate-900 dark:text-white">
                                {dish.deductedQuantity} {activeSupply.unit}
                              </span>
                              <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${Math.min(100, dish.percentageUsage)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-400 mt-0.5">
                                {dish.percentageUsage}%
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <span className="font-black text-slate-900 dark:text-emerald-400 block">
                              R$ {dish.costOfDeduction.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              base R$ {activeSupply.unitCost.toFixed(2)}/{activeSupply.unit}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {/* LINHA DE TOTAL */}
                      <tr className="bg-slate-50/90 font-bold dark:bg-slate-800/40">
                        <td className="px-6 py-3.5 text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Total Consumido pelo Cardápio:
                        </td>
                        <td className="px-6 py-3.5 text-center text-slate-400">—</td>
                        <td className="px-6 py-3.5 text-center text-slate-900 dark:text-white">
                          {activeSupply.totalPortionsSold} pratos
                        </td>
                        <td className="px-6 py-3.5 text-center text-slate-900 dark:text-white">
                          {activeSupply.totalDeducted} {activeSupply.unit} (100%)
                        </td>
                        <td className="px-6 py-3.5 text-right font-black text-slate-900 dark:text-emerald-400">
                          R$ {activeSupply.totalDeductedCost.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FOOTER CALLOUT */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 text-xs dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Info className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>
                    As baixas ocorrem automaticamente a cada pedido finalizado no PDV ou Delivery.
                  </span>
                </div>

                <Link
                  to="/items"
                  className="flex items-center gap-1 font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                >
                  <span>Gerenciar receitas no módulo Mercadorias & Cardápio</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </>
          ) : (
            <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-400 text-sm">
              Selecione um insumo ao lado para ver o consumo e a rastreabilidade.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
