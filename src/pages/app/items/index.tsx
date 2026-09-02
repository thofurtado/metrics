import { useQuery } from '@tanstack/react-query'
import {
  ChefHat,
  Hammer,
  Layers,
  Plus,
  ShoppingBasket,
  Sliders,
  UtensilsCrossed,
} from 'lucide-react'
import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { getProducts } from '@/api/get-products'
import { getServices } from '@/api/get-services'
import { getSupplies } from '@/api/get-supplies'
import { EmptyState } from '@/components/empty-state'
import { ErrorBoundary } from '@/components/error-boundary'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { TableSkeleton } from '@/components/table-skeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/custom-tabs'
import { Dialog } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { ComplementsDialog } from './complements-dialog'
import { ComplementsTab } from './complements-tab'
import { CompositeTab } from './composite-tab'
import { ItemsTableFilters } from './item-table-filters'
import { ItemTableRow } from './item-table-row'
import { PrintDepartmentsDialog } from './print-departments-dialog'
import { ProductItemDialog } from './product-item-dialog'
import { SubcategoriesDialog } from './subcategories-dialog'

// 5 Abas Oficiais do Módulo de Mercadorias
export type ItemType =
  | 'PRODUCT'
  | 'SUPPLY'
  | 'COMPOSITION'
  | 'COMPLEMENTS'
  | 'SERVICE'

export function Items() {
  const [searchParams, setSearchParams] = useSearchParams()

  const pageIndex = z.coerce
    .number()
    .transform((page) => page - 1)
    .parse(searchParams.get('page') ?? '1')
  const nameFilter = searchParams.get('name') ?? ''
  const displayIdFilter = searchParams.get('display_id') ?? ''

  const activeTabType: ItemType =
    (searchParams.get('type') as ItemType) ?? 'PRODUCT'

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createDialogType, setCreateDialogType] = useState<ItemType>('PRODUCT')
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false)
  const [isComplementsOpen, setIsComplementsOpen] = useState(false)
  const [isSubcategoriesOpen, setIsSubcategoriesOpen] = useState(false)

  const {
    data: result = {
      items: [],
      meta: { pageIndex: 1, perPage: 10, totalCount: 0 },
    },
    isFetching,
    isLoading,
  } = useQuery({
    queryKey: ['items', activeTabType, pageIndex, nameFilter, displayIdFilter],
    queryFn: async ({ signal }) => {
      try {
        if (activeTabType === 'PRODUCT') {
          const res = await getProducts({
            signal,
            pageIndex: pageIndex + 1,
            query: nameFilter,
          })
          return {
            items:
              res.data?.products?.map((p: any) => ({
                ...p,
                type: 'PRODUCT',
                product: p,
              })) ?? [],
            meta: res.data?.meta ?? {
              pageIndex: 1,
              perPage: 10,
              totalCount: 0,
            },
          }
        } else if (activeTabType === 'SERVICE') {
          const res = await getServices({
            signal,
            pageIndex: pageIndex + 1,
            query: nameFilter,
          })
          return {
            items:
              res.data?.services?.map((s: any) => ({
                ...s,
                type: 'SERVICE',
                service: s,
              })) ?? [],
            meta: res.data?.meta ?? {
              pageIndex: 1,
              perPage: 10,
              totalCount: 0,
            },
          }
        } else if (activeTabType === 'SUPPLY') {
          const res = await getSupplies({
            signal,
            pageIndex: pageIndex + 1,
            query: nameFilter,
          })
          return {
            items:
              res.data?.supplies?.map((s: any) => ({
                ...s,
                type: 'SUPPLY',
                supply: s,
              })) ?? [],
            meta: res.data?.meta ?? {
              pageIndex: 1,
              perPage: 10,
              totalCount: 0,
            },
          }
        }
        return {
          items: [],
          meta: { pageIndex: 1, perPage: 10, totalCount: 0 },
        }
      } catch {
        return {
          items: [],
          meta: { pageIndex: 1, perPage: 10, totalCount: 0 },
        }
      }
    },
    enabled:
      activeTabType === 'PRODUCT' ||
      activeTabType === 'SERVICE' ||
      activeTabType === 'SUPPLY',
  })

  function handlePaginate(newPageIndex: number) {
    setSearchParams((state) => {
      state.set('page', (newPageIndex + 1).toString())
      return state
    })
  }

  function handleTabChange(type: string) {
    setSearchParams((state) => {
      state.set('type', type)
      state.set('page', '1')
      return state
    })
  }

  function handleOpenCreateDialog(type: ItemType) {
    setCreateDialogType(type)
    setIsCreateDialogOpen(true)
  }

  return (
    <ErrorBoundary>
      <Helmet title="Mercadorias" />
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Mercadorias"
          description="Gerencie produtos, insumos, fichas técnicas de receitas e adicionais."
        >
          {(activeTabType === 'PRODUCT' ||
            activeTabType === 'SUPPLY' ||
            activeTabType === 'SERVICE') && (
            <Button
              onClick={() => handleOpenCreateDialog(activeTabType)}
              className="h-10 w-auto rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground shadow-lg hover:bg-primary/90"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              <span>
                {activeTabType === 'PRODUCT'
                  ? 'Novo Produto'
                  : activeTabType === 'SUPPLY'
                    ? 'Novo Insumo'
                    : 'Novo Serviço'}
              </span>
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => setIsSubcategoriesOpen(true)}
            className="h-10 w-auto rounded-xl border-slate-200 px-3.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Layers className="mr-1.5 h-4 w-4 text-blue-500" />
            Subcategorias & Frações
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsDeptDialogOpen(true)}
            className="h-10 w-auto rounded-xl border-slate-200 px-3.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Departamentos
          </Button>

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <ProductItemDialog
              initialType={createDialogType as any}
              onSuccess={() => setIsCreateDialogOpen(false)}
            />
          </Dialog>

          <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
            <PrintDepartmentsDialog />
          </Dialog>

          <Dialog open={isComplementsOpen} onOpenChange={setIsComplementsOpen}>
            <ComplementsDialog />
          </Dialog>

          <Dialog
            open={isSubcategoriesOpen}
            onOpenChange={setIsSubcategoriesOpen}
          >
            <SubcategoriesDialog />
          </Dialog>
        </PageHeader>

        {/* 5 ABAS OFICIAIS NA ORDEM SOLICITADA */}
        <Tabs
          value={activeTabType}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 gap-1 rounded-2xl p-1 sm:grid-cols-5">
            <TabsTrigger value="PRODUCT" className="rounded-xl font-bold">
              <ShoppingBasket className="mr-2 h-4 w-4 text-blue-500" />
              1. Produtos
            </TabsTrigger>
            <TabsTrigger value="SUPPLY" className="rounded-xl font-bold">
              <UtensilsCrossed className="mr-2 h-4 w-4 text-emerald-500" />
              2. Insumos
            </TabsTrigger>
            <TabsTrigger value="COMPOSITION" className="rounded-xl font-bold">
              <ChefHat className="mr-2 h-4 w-4 text-purple-500" />
              3. Ficha Técnica
            </TabsTrigger>
            <TabsTrigger value="COMPLEMENTS" className="rounded-xl font-bold">
              <Sliders className="mr-2 h-4 w-4 text-orange-500" />
              4. Adicionais & Opcionais
            </TabsTrigger>
            <TabsTrigger value="SERVICE" className="rounded-xl font-bold">
              <Hammer className="mr-2 h-4 w-4 text-amber-500" />
              5. Serviços
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* CONTEÚDO DA ABA SELECIONADA */}
        {activeTabType === 'COMPOSITION' ? (
          <CompositeTab />
        ) : activeTabType === 'COMPLEMENTS' ? (
          <ComplementsTab />
        ) : (
          <>
            <ItemsTableFilters />

            <div
              className={`space-y-4 px-2 transition-opacity duration-200 ${
                isFetching && !isLoading
                  ? 'pointer-events-none opacity-60'
                  : 'opacity-100'
              }`}
            >
              <div className="overflow-hidden rounded-3xl border-none bg-white shadow-sm dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="border-none bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-800/50">
                        {(activeTabType === 'PRODUCT' ||
                          activeTabType === 'SERVICE') && (
                          <TableHead className="hidden w-[80px] pl-8 text-[11px] font-bold uppercase tracking-widest text-slate-500 sm:table-cell">
                            ID
                          </TableHead>
                        )}
                        <TableHead className="pl-6 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                          Nome
                        </TableHead>

                        {activeTabType === 'PRODUCT' && (
                          <>
                            <TableHead className="w-[120px] text-center text-[11px] font-bold uppercase tracking-widest text-slate-500">
                              Estoque
                            </TableHead>
                            <TableHead className="w-[140px] text-[11px] font-bold uppercase tracking-widest text-slate-500">
                              Custo
                            </TableHead>
                            <TableHead className="w-[140px] text-[12px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                              Preço de Venda
                            </TableHead>
                            <TableHead className="hidden text-[11px] font-bold uppercase tracking-widest text-slate-500 md:table-cell">
                              Código de Barras
                            </TableHead>
                          </>
                        )}

                        {activeTabType === 'SERVICE' && (
                          <>
                            <TableHead className="w-[150px] text-[12px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                              Preço
                            </TableHead>
                            <TableHead className="w-[150px] text-[11px] font-bold uppercase tracking-widest text-slate-500">
                              Tempo Estimado
                            </TableHead>
                          </>
                        )}

                        {activeTabType === 'SUPPLY' && (
                          <>
                            <TableHead className="w-[120px] text-center text-[11px] font-bold uppercase tracking-widest text-slate-500">
                              Estoque
                            </TableHead>
                            <TableHead className="w-[150px] text-[12px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                              Custo Unitário
                            </TableHead>
                            <TableHead className="w-[100px] text-center text-[11px] font-bold uppercase tracking-widest text-slate-500">
                              Unidade
                            </TableHead>
                          </>
                        )}

                        {activeTabType === 'PRODUCT' && (
                          <TableHead className="w-[110px] text-center text-[11px] font-bold uppercase tracking-widest text-slate-500">
                            Cardápio
                          </TableHead>
                        )}

                        <TableHead className="w-[100px] text-center text-[11px] font-bold uppercase tracking-widest text-slate-500">
                          Status
                        </TableHead>
                        <TableHead className="w-[140px] pr-8 text-right text-[11px] font-bold uppercase tracking-widest text-slate-500">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableSkeleton columns={6} rows={10} />
                      ) : result.items && result.items.length > 0 ? (
                        result.items.map((item: any) => (
                          <ItemTableRow
                            key={item.id}
                            item={item}
                            activeTabType={activeTabType}
                          />
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={activeTabType === 'PRODUCT' ? 9 : 8} className="h-64 text-center">
                            <EmptyState
                              title="Nenhum item encontrado"
                              description="Tente ajustar os filtros ou adicione um novo item."
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {result.meta && result.meta.totalCount > 0 && (
                <Pagination
                  pageIndex={pageIndex}
                  totalCount={result.meta.totalCount}
                  perPage={result.meta.perPage}
                  onPageChange={handlePaginate}
                />
              )}
            </div>
          </>
        )}
      </div>
    </ErrorBoundary>
  )
}
