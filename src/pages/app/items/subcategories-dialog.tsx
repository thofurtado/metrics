import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Layers,
  PieChart,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { getCategories } from '@/api/get-categories'
import {
  createSubcategory,
  deleteSubcategory,
  getSubcategories,
  Subcategory,
  updateSubcategory,
} from '@/api/subcategories'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
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

export function SubcategoriesDialog() {
  const queryClient = useQueryClient()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [newSubName, setNewSubName] = useState('')
  const [acceptsFractions, setAcceptsFractions] = useState(false)
  const [maxFractions, setMaxFractions] = useState(2)

  // Fetch Categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  // Fetch Subcategories
  const { data: subcategoriesData, isLoading } = useQuery({
    queryKey: ['subcategories', selectedCategoryId],
    queryFn: () => getSubcategories(selectedCategoryId || undefined),
  })

  const categories = categoriesData?.categories || []
  const subcategories = subcategoriesData?.subcategories || []

  // Mutations
  const { mutateAsync: createSub, isPending: isCreating } = useMutation({
    mutationFn: createSubcategory,
    onSuccess: () => {
      toast.success('Subcategoria criada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['subcategories'] })
      setNewSubName('')
      setAcceptsFractions(false)
    },
    onError: () => toast.error('Erro ao criar subcategoria.'),
  })

  const { mutateAsync: updateSub } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateSubcategory(id, data),
    onSuccess: () => {
      toast.success('Subcategoria atualizada!')
      queryClient.invalidateQueries({ queryKey: ['subcategories'] })
    },
    onError: () => toast.error('Erro ao atualizar subcategoria.'),
  })

  const { mutateAsync: deleteSub } = useMutation({
    mutationFn: deleteSubcategory,
    onSuccess: () => {
      toast.success('Subcategoria removida!')
      queryClient.invalidateQueries({ queryKey: ['subcategories'] })
    },
    onError: () => toast.error('Erro ao remover subcategoria.'),
  })

  const handleCreate = async () => {
    if (!selectedCategoryId) {
      toast.error('Selecione uma categoria principal.')
      return
    }
    if (!newSubName.trim()) {
      toast.error('Informe o nome da subcategoria.')
      return
    }

    await createSub({
      category_id: selectedCategoryId,
      name: newSubName.trim(),
      accepts_fractions: acceptsFractions,
      max_fractions: acceptsFractions ? maxFractions : 1,
    })
  }

  return (
    <DialogContent className="max-w-3xl overflow-hidden border border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-2xl">
      {/* Header */}
      <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
              Subcategorias & Regras de Meia Pizza
            </DialogTitle>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Organize produtos e defina quais grupos aceitam fracionamento (1/2, 1/3, 1/4)
            </p>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-6 p-6">
        {/* Formulário de Criação Rápida */}
        <div className="space-y-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 p-4.5 dark:border-slate-800 dark:bg-slate-900/40">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Nova Subcategoria
          </span>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Categoria Principal
              </Label>
              <Select
                value={selectedCategoryId}
                onValueChange={setSelectedCategoryId}
              >
                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent className="border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Nome da Subcategoria
              </Label>
              <Input
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                placeholder="Ex: Grandes (8 Fatias), Broto, Combos..."
                className="h-10 rounded-xl border-slate-200 bg-white font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Configuração de Meia Pizza */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-3">
              <Switch
                checked={acceptsFractions}
                onCheckedChange={setAcceptsFractions}
                id="frac-switch"
              />
              <div>
                <Label
                  htmlFor="frac-switch"
                  className="cursor-pointer text-xs font-bold text-slate-900 dark:text-slate-100"
                >
                  Aceita Fracionamento (Meia Pizza / Sabores)
                </Label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Permite combinar produtos desta subcategoria no PDV e Cardápio
                </p>
              </div>
            </div>

            {acceptsFractions && (
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Máx. Sabores:
                </Label>
                <Select
                  value={String(maxFractions)}
                  onValueChange={(val) => setMaxFractions(Number(val))}
                >
                  <SelectTrigger className="h-8 w-24 rounded-lg font-mono text-xs font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Sabores</SelectItem>
                    <SelectItem value="3">3 Sabores</SelectItem>
                    <SelectItem value="4">4 Sabores</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleCreate}
              disabled={isCreating}
              className="h-9 rounded-xl bg-blue-600 px-4 text-xs font-black uppercase tracking-wider text-white hover:bg-blue-700"
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar Subcategoria
            </Button>
          </div>
        </div>

        {/* Lista de Subcategorias Existentes */}
        <div className="space-y-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Subcategorias Cadastradas ({subcategories.length})
          </span>

          <div className="max-h-[35vh] space-y-2 overflow-y-auto pr-1">
            {isLoading && (
              <p className="py-6 text-center text-xs text-slate-400">Carregando...</p>
            )}
            {!isLoading && subcategories.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-slate-800">
                Nenhuma subcategoria encontrada.
              </p>
            )}
            {subcategories.map((sub: Subcategory) => (
              <div
                key={sub.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {sub.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-slate-200 text-[10px] dark:border-slate-800"
                    >
                      {sub.category?.name || 'Sem Categoria'}
                    </Badge>
                    {sub.accepts_fractions && (
                      <Badge className="bg-emerald-500/15 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        Até {sub.max_fractions} Sabores
                      </Badge>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteSub(sub.id)}
                  className="h-8 w-8 text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DialogContent>
  )
}
