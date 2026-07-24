import { useQuery } from '@tanstack/react-query'
import { Hammer, Plus, ShoppingBasket, UtensilsCrossed } from 'lucide-react'
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

import { ItemsTableFilters } from './item-table-filters'
import { ItemTableRow } from './item-table-row'
import { PrintDepartmentsDialog } from './print-departments-dialog'
import { ProductItemDialog } from './product-item-dialog'

// Define the possible item types for tabs
type ItemType = 'PRODUCT' | 'SERVICE' | 'SUPPLY'

export function Items() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Parse filters from URL
  const pageIndex = z.coerce
    .number()
    .transform((page) => page - 1)
    .parse(searchParams.get('page') ?? '1')
  const nameFilter = searchParams.get('name') ?? ''
  // display_id only for Product/Service
  const displayIdFilter = searchParams.get('display_id') ?? ''
  // Use 'PRODUCT' as default for the type tab
  const activeTabType: ItemType =
    (searchParams.get('type') as ItemType) ?? 'PRODUCT'
  // critical_stock only for Product
  // const criticalStockFilter = searchParams.get('critical_stock') === 'true'

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createDialogType, setCreateDialogType] = useState<ItemType>('PRODUCT')
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false)

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
                product: p, // Adaptador para ItemTableRow
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
                service: s, // Adaptador para ItemTableRow
              })) ?? [],
            meta: res.data?.meta ?? {
              pageIndex: 1,
              perPage: 10,
              totalCount: 0,
            },
          }
        } else {
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
                supply: s, // Adaptador para ItemTableRow
              })) ?? [],
            meta: res.data?.meta ?? {
              pageIndex: 1,
              perPage: 10,
              totalCount: 0,
            },
          }
        }
      } catch (error) {
        // Interceptor already handles logging and returns safe structure,
        // but we add a local catch for extra safety in mapping.
        return { items: [], meta: { pageIndex: 1, perPage: 10, totalCount: 0 } }
      }
    },
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
      state.set('page', '1') // Reset page on tab change
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
          description="Gerencie seus produtos, serviços e insumos."
        >
          <Button
            onClick={() => handleOpenCreateDialog(activeTabType)}
            className="h-10 w-auto rounded-md bg-primary px-4 py-2 text-primary-foreground shadow-lg hover:bg-primary/90"
          >
            <Plus className="mr-2 h-5 w-5" />
            <span className="hidden sm:inline">
              {activeTabType === 'PRODUCT'
                ? 'Novo Produto'
                : activeTabType === 'SERVICE'
                  ? 'Novo Serviço'
                  : 'Novo Insumo'}
            </span>
            <span className="sm:hidden">Novo</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsDeptDialogOpen(true)}
            className="h-10 w-auto rounded-md px-4 py-2 shadow-sm"
          >
            Gerenciar Departamentos
          </Button>

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <ProductItemDialog
              initialType={createDialogType}
              onSuccess={() => setIsCreateDialogOpen(false)}
            />
          </Dialog>

          <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
            <PrintDepartmentsDialog />
          </Dialog>
        </PageHeader>

        <Tabs
          value={activeTabType}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="w-full">
            <TabsTrigger value="PRODUCT" className="flex-1">
              <ShoppingBasket className="mr-2 h-4 w-4" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="SERVICE" className="flex-1">
              <Hammer className="mr-2 h-4 w-4" />
              Serviços
            </TabsTrigger>
            <TabsTrigger value="SUPPLY" className="flex-1">
              <UtensilsCrossed className="mr-2 h-4 w-4" />
              Insumos
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <ItemsTableFilters />

        <div
          className={`space-y-4 px-2 transition-opacity duration-200 ${isFetching && !isLoading ? 'pointer-events-none opacity-60' : 'opacity-100'} `}
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
                        <TableHead className="w-[140px] text-[12px] font-black uppercase tracking-widest text-slate-700">
                          Preço Sugerido
                        </TableHead>
                        <TableHead className="hidden text-[11px] font-bold uppercase tracking-widest text-slate-500 md:table-cell">
                          Código de Barras
                        </TableHead>
                      </>
                    )}
                    {activeTabType === 'SERVICE' && (
                      <>
                        <TableHead className="hidden text-[11px] font-bold uppercase tracking-widest text-slate-500 sm:table-cell">
                          Tempo Estimado
                        </TableHead>
                        <TableHead className="w-[140px] text-[11px] font-bold uppercase tracking-widest text-slate-500">
                          Preço
                        </TableHead>
                      </>
                    )}
                    {activeTabType === 'SUPPLY' && (
                      <>
                        <TableHead className="w-[120px] text-center text-[11px] font-bold uppercase tracking-widest text-slate-500">
                          Estoque Dispo.
                        </TableHead>
                        <TableHead className="w-[140px] text-[11px] font-bold uppercase tracking-widest text-slate-500">
                          Custo Médio
                        </TableHead>
                        <TableHead className="hidden text-[11px] font-bold uppercase tracking-widest text-slate-500 sm:table-cell">
                          Unidade
                        </TableHead>
                      </>
                    )}
                    <TableHead className="w-[80px] pr-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableSkeleton />
                  ) : (
                    <>
                      {result.items.map((item: any) => (
                        <ItemTableRow
                          key={item.id}
                          item={item as any}
                          activeTabType={activeTabType}
                        />
                      ))}
                      {result.items.length === 0 && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={6} className="py-10 text-center">
                            <EmptyState
                              title="Nenhum item encontrado"
                              description={`Não encontramos nenhum ${activeTabType.toLowerCase()} cadastrado com os filtros aplicados.`}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Pagination
              onPageChange={handlePaginate}
              onPerPageChange={(val) => {
                setSearchParams((state) => {
                  state.set('per_page', val)
                  state.set('page', '1')
                  return state
                })
              }}
              pageIndex={pageIndex}
              totalCount={result.meta.totalCount}
              perPage={result.meta.perPage}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
