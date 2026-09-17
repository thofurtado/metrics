import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Plus,
  SlidersHorizontal,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Beef,
  Beer,
  Apple,
  Package,
  Wine,
  UtensilsCrossed,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  getStockOverview,
  adjustStockBalance,
  createStockSupply,
  StockOverviewItem,
} from '@/api/stock'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// Helper de ícone por categoria
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

export function TabStockPosition() {
  const queryClient = useQueryClient()

  // Filtros
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [onlyLowStock, setOnlyLowStock] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Modals
  const [adjustModalItem, setAdjustModalItem] = useState<StockOverviewItem | null>(null)
  const [newStockValue, setNewStockValue] = useState('')
  const [adjustReason, setAdjustReason] = useState('AJUSTE_POSITIVO')
  const [adjustNotes, setAdjustNotes] = useState('')

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('Bebidas')
  const [newUnit, setNewUnit] = useState('UN')
  const [newCost, setNewCost] = useState('')
  const [newInitialStock, setNewInitialStock] = useState('')

  // Query Principal
  const { data, isLoading } = useQuery({
    queryKey: ['stock-overview', search, selectedCategory, onlyLowStock],
    queryFn: () =>
      getStockOverview({
        query: search,
        category: selectedCategory === 'Todos' ? undefined : selectedCategory,
        onlyLowStock,
      }),
    refetchInterval: 30000,
  })

  // Mutation de Ajuste de Saldo
  const { mutateAsync: adjustBalanceMutation, isPending: isAdjusting } = useMutation({
    mutationFn: adjustStockBalance,
    onSuccess: (res) => {
      toast.success(res.message || 'Saldo atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['stock-overview'] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
      queryClient.invalidateQueries({ queryKey: ['stock-recipe-consumption'] })
      setAdjustModalItem(null)
      setNewStockValue('')
      setAdjustNotes('')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao ajustar saldo de estoque.')
    },
  })

  // Mutation de Criação de Insumo
  const { mutateAsync: createSupplyMutation, isPending: isCreating } = useMutation({
    mutationFn: createStockSupply,
    onSuccess: () => {
      toast.success('Novo insumo cadastrado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['stock-overview'] })
      setCreateModalOpen(false)
      setNewName('')
      setNewCost('')
      setNewInitialStock('')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao cadastrar insumo.')
    },
  })

  // Handlers
  const handleOpenAdjust = (item: StockOverviewItem) => {
    setAdjustModalItem(item)
    setNewStockValue(item.currentStock.toString())
    setAdjustReason(item.situation !== 'NORMAL' ? 'AJUSTE_POSITIVO' : 'QUEBRA')
    setAdjustNotes('')
  }

  const handleConfirmAdjust = async () => {
    if (!adjustModalItem) return
    const num = parseFloat(newStockValue)
    if (isNaN(num) || num < 0) {
      toast.error('Informe uma quantidade válida.')
      return
    }

    await adjustBalanceMutation({
      targetId: adjustModalItem.id,
      targetType: adjustModalItem.type,
      newStock: num,
      reason: adjustReason as any,
      notes: adjustNotes,
    })
  }

  const handleConfirmCreate = async () => {
    if (!newName.trim()) {
      toast.error('Nome do insumo é obrigatório.')
      return
    }
    await createSupplyMutation({
      name: newName.trim(),
      category: newCategory,
      unit: newUnit,
      cost: parseFloat(newCost) || 0,
      initialStock: parseFloat(newInitialStock) || 0,
    })
  }

  const items = data?.items || []
  const summary = data?.summary || { totalCount: 0, lowStockCount: 0, normalCount: 0 }

  // Paginação local
  const totalPages = Math.ceil(items.length / itemsPerPage) || 1
  const paginatedItems = items.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )

  const categories = [
    'Todos',
    'Bebidas',
    'Carnes',
    'Hortifrúti',
    'Secos & Laticínios',
  ]

  return (
    <div className="space-y-6">
      {/* ─── HEADER DA ABA ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
              Estoque Atual
            </h2>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Total: {summary.totalCount} insumos
              </span>
              {summary.lowStockCount > 0 && (
                <span className="flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-0.5 text-xs font-bold text-rose-600 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  {summary.lowStockCount} itens acabando
                </span>
              )}
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Acompanhe seus insumos em tempo real e identifique prontamente o que precisa de reposição antes do próximo turno.
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="h-11 gap-2 rounded-xl bg-emerald-600 px-5 font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>Novo Insumo</span>
        </Button>
      </div>

      {/* ─── BARRA DE BUSCA E CHIPS DE FILTRO ─── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar insumo por nome, SKU ou código de barras..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-sm shadow-xs focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-900/80"
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

        {/* Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat)
                  setCurrentPage(1)
                }}
                className={cn(
                  'rounded-xl px-3.5 py-2 text-xs font-bold transition-all',
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900'
                    : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
              >
                {cat}
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => {
              setOnlyLowStock(!onlyLowStock)
              setCurrentPage(1)
            }}
            className={cn(
              'flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all',
              onlyLowStock
                ? 'border-rose-500 bg-rose-500 text-white shadow-xs'
                : 'border-rose-200/80 bg-rose-50/50 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400',
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Apenas Acabando</span>
          </button>
        </div>
      </div>

      {/* ─── TABELA DE ESTOQUE ATUAL ─── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900/70">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-400">
                <th className="px-6 py-4">Insumo</th>
                <th className="px-6 py-4 text-center">Estoque Atual</th>
                <th className="px-6 py-4 text-center">Estoque Mínimo</th>
                <th className="px-6 py-4 text-center">Situação</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-500" />
                    <span className="mt-2 block text-xs font-medium">Carregando saldo de estoque...</span>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Nenhum insumo encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const isLow = item.situation !== 'NORMAL'

                  return (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      {/* INSUMO */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800/80 shadow-xs">
                            {getCategoryIcon(item.category, item.name)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                              <span>{item.category}</span>
                              <span>•</span>
                              <span>
                                {item.batchNumber ? `Lote #${item.batchNumber}` : 'Estoque Geral'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* ESTOQUE ATUAL */}
                      <td className="px-6 py-4 text-center">
                        <span
                          className={cn(
                            'text-lg font-black tracking-tight',
                            isLow
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-900 dark:text-slate-100',
                          )}
                        >
                          {item.currentStock.toLocaleString('pt-BR', {
                            minimumFractionDigits: item.unit.toLowerCase() === 'kg' ? 1 : 0,
                            maximumFractionDigits: 2,
                          })}{' '}
                          <span className="text-xs font-semibold lowercase tracking-normal">
                            {item.unit}
                          </span>
                        </span>
                      </td>

                      {/* ESTOQUE MÍNIMO */}
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          Mín: {item.minStock} {item.unit}
                        </span>
                      </td>

                      {/* SITUAÇÃO */}
                      <td className="px-6 py-4 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200/80 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                            Acabando
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Normal
                          </span>
                        )}
                      </td>

                      {/* AÇÕES */}
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenAdjust(item)}
                          className="h-9 gap-1.5 rounded-lg px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                          <span>Ajustar Saldo</span>
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── RODAPÉ COM PAGINAÇÃO ─── */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Mostrando <strong className="text-slate-900 dark:text-white">{paginatedItems.length}</strong> de{' '}
            <strong className="text-slate-900 dark:text-white">{items.length}</strong> insumos
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 gap-1 text-xs rounded-lg font-bold"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Anterior</span>
            </Button>

            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 px-2">
              Página {currentPage} de {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-8 gap-1 text-xs rounded-lg font-bold"
            >
              <span>Próxima</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ─── MODAL DE AJUSTE RÁPIDO DE SALDO ─── */}
      <Dialog open={!!adjustModalItem} onOpenChange={(open) => !open && setAdjustModalItem(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
              Ajustar Saldo em Estoque
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Atualize a quantidade física real deste item e registre a justificativa para auditoria.
            </DialogDescription>
          </DialogHeader>

          {adjustModalItem && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/80 dark:bg-slate-900/60 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Item Selecionado</span>
                <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                  {adjustModalItem.name}
                </p>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>Saldo Teórico Atual:</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {adjustModalItem.currentStock} {adjustModalItem.unit}
                  </strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Novo Saldo Real ({adjustModalItem.unit})
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    value={newStockValue}
                    onChange={(e) => setNewStockValue(e.target.value)}
                    className="h-12 text-lg font-black rounded-xl pr-14"
                    autoFocus
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {adjustModalItem.unit}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Motivo do Ajuste
                </Label>
                <Select value={adjustReason} onValueChange={setAdjustReason}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AJUSTE_POSITIVO">Ajuste de Inventário / Sobra física (+)</SelectItem>
                    <SelectItem value="AJUSTE_NEGATIVO">Ajuste de Inventário / Falta física (-)</SelectItem>
                    <SelectItem value="QUEBRA">Quebra / Avaria de mercadoria</SelectItem>
                    <SelectItem value="PERDA">Perda / Descarte de Cozinha</SelectItem>
                    <SelectItem value="CONSUMO_INTERNO">Consumo Interno da Equipe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Observação / Justificativa (opcional)
                </Label>
                <Input
                  placeholder="Ex: Garrafa quebrou na reposição do bar..."
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setAdjustModalItem(null)}
              className="rounded-xl font-bold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAdjust}
              disabled={isAdjusting}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isAdjusting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Ajuste'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL DE NOVO INSUMO ─── */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
              Cadastrar Novo Insumo
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Adicione uma nova matéria-prima para controle de estoque e receitas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Nome do Insumo
              </Label>
              <Input
                placeholder="Ex: Picanha Bovina Resfriada"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-11 rounded-xl"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Categoria
                </Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Carnes & Açougue">Carnes & Açougue</SelectItem>
                    <SelectItem value="Bebidas">Bebidas & Bar</SelectItem>
                    <SelectItem value="Hortifrúti">Hortifrúti</SelectItem>
                    <SelectItem value="Secos & Laticínios">Secos & Laticínios</SelectItem>
                    <SelectItem value="Embalagens">Embalagens & Descartáveis</SelectItem>
                    <SelectItem value="Geral">Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Unidade de Medida
                </Label>
                <Select value={newUnit} onValueChange={setNewUnit}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KG">Quilograma (KG)</SelectItem>
                    <SelectItem value="UN">Unidade (UN)</SelectItem>
                    <SelectItem value="L">Litro (L)</SelectItem>
                    <SelectItem value="GAR">Garrafa (GAR)</SelectItem>
                    <SelectItem value="LATA">Lata (LATA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Custo Unitário (R$)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Estoque Inicial
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={newInitialStock}
                  onChange={(e) => setNewInitialStock(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
              className="rounded-xl font-bold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmCreate}
              disabled={isCreating}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                'Cadastrar Insumo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
