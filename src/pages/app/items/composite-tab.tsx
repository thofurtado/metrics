import { useQuery } from '@tanstack/react-query'
import {
  ChefHat,
  Plus,
  Search,
} from 'lucide-react'
import { useState } from 'react'

import { getProducts } from '@/api/get-products'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CompositeProductForm } from './forms/composite-product-form'

export function CompositeTab() {
  const [search, setSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['composite-products', search],
    queryFn: () => getProducts({ query: search, pageIndex: 1, perPage: 100 }),
  })

  const compositeProducts = (data?.data?.products || []).filter(
    (p: any) => p.is_composite,
  )

  const handleEdit = (product: any) => {
    setSelectedProduct(product)
    setIsFormOpen(true)
  }

  const handleNew = () => {
    setSelectedProduct(null)
    setIsFormOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Header & Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar ficha técnica por prato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-xl border-slate-200 bg-white pl-9 text-xs font-semibold text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <Button
          onClick={handleNew}
          className="h-10 rounded-xl bg-purple-600 px-4 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-purple-600/20 hover:bg-purple-700"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Nova Ficha Técnica
        </Button>
      </div>

      {/* Tabela de Produtos Compostos */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-100 bg-slate-50/50 hover:bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/50">
              <TableHead className="pl-6 text-[11px] font-black uppercase tracking-wider text-slate-500">
                Prato / Produto Composto
              </TableHead>
              <TableHead className="text-center text-[11px] font-black uppercase tracking-wider text-slate-500">
                Insumos
              </TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Custo de Produção (CMV)
              </TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Preço de Venda
              </TableHead>
              <TableHead className="text-center text-[11px] font-black uppercase tracking-wider text-slate-500">
                Margem de Lucro
              </TableHead>
              <TableHead className="pr-6 text-right text-[11px] font-black uppercase tracking-wider text-slate-500">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-xs text-slate-400">
                  Carregando fichas técnicas...
                </TableCell>
              </TableRow>
            ) : compositeProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <ChefHat className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Nenhuma ficha técnica cadastrada
                    </p>
                    <p className="max-w-md text-xs text-slate-400">
                      Crie fichas técnicas para calcular custos exatos de receitas e dar baixa automática de insumos nas vendas.
                    </p>
                    <Button
                      onClick={handleNew}
                      size="sm"
                      className="mt-2 rounded-xl bg-purple-600 text-xs font-bold text-white hover:bg-purple-700"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Criar Primeira Receita
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              compositeProducts.map((product: any) => {
                const cost = Number(product.cost || 0)
                const price = Number(product.price || 0)
                const margin = cost > 0 ? ((price - cost) / cost) * 100 : 0
                const numIngredients = product.compositions?.length || 0

                return (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/70 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                    onClick={() => handleEdit(product)}
                  >
                    <TableCell className="py-4 pl-6 font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                          <ChefHat className="h-4 w-4" />
                        </div>
                        <div>
                          <span>{product.name}</span>
                          {product.category && (
                            <span className="block text-[11px] font-medium text-slate-400">
                              {typeof product.category === 'string'
                                ? product.category
                                : product.category?.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-center font-semibold">
                      <Badge variant="outline" className="border-purple-200 bg-purple-50 text-[11px] font-bold text-purple-700 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-300">
                        {numIngredients} insumos
                      </Badge>
                    </TableCell>

                    <TableCell className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      R$ {cost.toFixed(2)}
                    </TableCell>

                    <TableCell className="font-mono font-black text-slate-900 dark:text-slate-100">
                      R$ {price.toFixed(2)}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        className={
                          margin >= 100
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : margin >= 50
                              ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        }
                      >
                        +{margin.toFixed(0)}% margem
                      </Badge>
                    </TableCell>

                    <TableCell className="pr-6 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-lg text-xs font-bold text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/30"
                      >
                        Editar Receita
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <CompositeProductForm
          initialData={selectedProduct}
          onSuccess={() => setIsFormOpen(false)}
        />
      </Dialog>
    </div>
  )
}
