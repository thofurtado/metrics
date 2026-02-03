import { useQuery } from '@tanstack/react-query'
import { Plus, Package, Hammer, Syringe } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { useState } from 'react'

import { getProducts } from '@/api/get-products'
import { getServices } from '@/api/get-services'
import { getSupplies } from '@/api/get-supplies'

import { EmptyState } from '@/components/empty-state'
import { ErrorBoundary } from '@/components/error-boundary'
import { TableSkeleton } from '@/components/table-skeleton'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Pagination } from '@/components/pagination'

import { ItemsTableFilters } from './item-table-filters'
import { ItemTableRow } from './item-table-row'
import { ProductItemDialog } from './product-item-dialog'
import { PageHeader } from '@/components/page-header'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/custom-tabs'

// Define the possible item types for tabs
type ItemType = 'PRODUCT' | 'SERVICE' | 'SUPPLY'

export function Items() {
    const [searchParams, setSearchParams] = useSearchParams()

    // Parse filters from URL (1-based page)
    const pageIndex = z.coerce.number().parse(searchParams.get('page') ?? '1')
    const nameFilter = searchParams.get('name') ?? ''
    // display_id only for Product/Service
    const displayIdFilter = searchParams.get('display_id') ?? ''
    // Use 'PRODUCT' as default for the type tab
    const activeTabType: ItemType = (searchParams.get('type') as ItemType) ?? 'PRODUCT'
    // critical_stock only for Product
    // const criticalStockFilter = searchParams.get('critical_stock') === 'true'

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [createDialogType, setCreateDialogType] = useState<ItemType>('PRODUCT')

    const { data: result = { items: [], meta: { pageIndex: 1, perPage: 10, totalCount: 0 } }, isFetching, isLoading } = useQuery({
        queryKey: ['items', activeTabType, pageIndex, nameFilter, displayIdFilter],
        queryFn: async ({ signal }) => {
            try {
                if (activeTabType === 'PRODUCT') {
                    const res = await getProducts({
                        signal, pageIndex, query: nameFilter,
                    })
                    return {
                        items: res.data?.products?.map((p: any) => ({ ...p, type: 'PRODUCT' })) ?? [],
                        meta: res.data?.meta ?? { pageIndex: 1, perPage: 10, totalCount: 0 }
                    }
                } else if (activeTabType === 'SERVICE') {
                    const res = await getServices({ signal, pageIndex, query: nameFilter })
                    return {
                        items: res.data?.services?.map((s: any) => ({ ...s, type: 'SERVICE' })) ?? [],
                        meta: res.data?.meta ?? { pageIndex: 1, perPage: 10, totalCount: 0 }
                    }
                } else {
                    const res = await getSupplies({ signal, pageIndex, query: nameFilter })
                    return {
                        items: res.data?.supplies?.map((s: any) => ({ ...s, type: 'SUPPLY' })) ?? [],
                        meta: res.data?.meta ?? { pageIndex: 1, perPage: 10, totalCount: 0 }
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
            state.set('page', newPageIndex.toString())
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
                <PageHeader title="Mercadorias" description="Gerencie seus produtos, serviços e insumos.">
                    <Button
                        onClick={() => handleOpenCreateDialog(activeTabType)}
                        className="h-10 w-auto px-4 py-2 rounded-md bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        <span className="hidden sm:inline">
                            {activeTabType === 'PRODUCT' ? 'Novo Produto' :
                                activeTabType === 'SERVICE' ? 'Novo Serviço' : 'Novo Insumo'}
                        </span>
                        <span className="sm:hidden">Novo</span>
                    </Button>

                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <ProductItemDialog initialType={createDialogType} onSuccess={() => setIsCreateDialogOpen(false)} />
                    </Dialog>
                </PageHeader>

                <Tabs value={activeTabType} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="w-full">
                        <TabsTrigger value="PRODUCT" className="flex-1">
                            <Package className="mr-2 h-4 w-4" />
                            Produtos
                        </TabsTrigger>
                        <TabsTrigger value="SERVICE" className="flex-1">
                            <Hammer className="mr-2 h-4 w-4" />
                            Serviços
                        </TabsTrigger>
                        <TabsTrigger value="SUPPLY" className="flex-1">
                            <Syringe className="mr-2 h-4 w-4" />
                            Insumos
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <ItemsTableFilters />

                <div className={`space-y-4 transition-opacity duration-200 ${isFetching && !isLoading ? 'opacity-60 pointer-events-none' : 'opacity-100'} `}>
                    <div className="rounded-md border bg-card shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table className="w-full">
                                <TableHeader>
                                    <TableRow className="bg-muted/50 hover:bg-muted/50 text-base">
                                        {(activeTabType === 'PRODUCT' || activeTabType === 'SERVICE') && (
                                            <TableHead className="w-[80px] hidden sm:table-cell text-muted-foreground font-semibold">ID</TableHead>
                                        )}
                                        <TableHead className="text-muted-foreground font-semibold">Nome</TableHead>

                                        {activeTabType === 'PRODUCT' && (
                                            <>
                                                <TableHead className="text-muted-foreground font-semibold text-center w-[100px]">Estoque</TableHead>
                                                <TableHead className="text-muted-foreground font-semibold w-[120px]">Custo</TableHead>
                                                <TableHead className="text-muted-foreground font-semibold w-[120px]">Preço</TableHead>
                                                <TableHead className="text-muted-foreground font-semibold hidden md:table-cell">Barras</TableHead>
                                            </>
                                        )}
                                        {activeTabType === 'SERVICE' && (
                                            <>
                                                <TableHead className="text-muted-foreground font-semibold hidden sm:table-cell">Tempo Est.</TableHead>
                                                <TableHead className="text-muted-foreground font-semibold w-[120px]">Preço</TableHead>
                                            </>
                                        )}
                                        {activeTabType === 'SUPPLY' && (
                                            <>
                                                <TableHead className="text-muted-foreground font-semibold text-center w-[100px]">Estoque</TableHead>
                                                <TableHead className="text-muted-foreground font-semibold w-[120px]">Custo</TableHead>
                                                <TableHead className="text-muted-foreground font-semibold hidden sm:table-cell">Unidade</TableHead>
                                            </>
                                        )}
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableSkeleton />
                                    ) : (
                                        <>
                                            {result.items.map((item: any) => (
                                                <ItemTableRow key={item.id} item={item as any} activeTabType={activeTabType} />
                                            ))}
                                            {result.items.length === 0 && (
                                                <TableRow className="hover:bg-transparent">
                                                    <TableCell colSpan={6} className="text-center py-10">
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

                    <div className="flex justify-end">
                        <Pagination
                            onPageChange={handlePaginate}
                            pageIndex={result.meta.pageIndex}
                            totalCount={result.meta.totalCount}
                            perPage={result.meta.perPage}
                        />
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    )
}
