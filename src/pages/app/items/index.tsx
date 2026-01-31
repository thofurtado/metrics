import { useQuery } from '@tanstack/react-query'
import { Plus, Package, Hammer, Syringe } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { useState } from 'react'

import { getItems } from '@/api/get-items'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// Define the possible item types for tabs
type ItemType = 'PRODUCT' | 'SERVICE' | 'SUPPLY'

export function Items() {
    const [searchParams, setSearchParams] = useSearchParams()

    // Parse filters from URL (1-based page)
    const pageIndex = z.coerce.number().parse(searchParams.get('page') ?? '1')
    const nameFilter = searchParams.get('name') ?? ''
    const displayIdFilter = searchParams.get('display_id') ?? ''
    // Use 'PRODUCT' as default for the type tab
    const activeTabType: ItemType = (searchParams.get('type') as ItemType) ?? 'PRODUCT'
    const criticalStockFilter = searchParams.get('critical_stock') === 'true'

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [createDialogType, setCreateDialogType] = useState<ItemType>('PRODUCT')

    const { data: result, isFetching } = useQuery({
        queryKey: ['items', activeTabType, pageIndex, nameFilter, displayIdFilter, criticalStockFilter],
        queryFn: ({ signal }) => getItems({
            signal,
            pageIndex,
            name: nameFilter || null,
            display_id: displayIdFilter ? Number(displayIdFilter) : null,
            type: activeTabType,
            below_min_stock: criticalStockFilter
        }),
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
        <>
            <Helmet title="Mercadorias" />
            <div className="flex flex-col gap-6">
                <PageHeader title="Mercadorias" description="Gerencie seus produtos, serviços e insumos.">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                aria-label="Criar Novo"
                                className="h-10 w-10 sm:h-auto sm:w-auto sm:px-4 sm:py-2 rounded-full sm:rounded-md bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
                            >
                                <Plus className="h-5 w-5 sm:mr-2" />
                                <span className="hidden sm:inline">Novo Item</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="end">
                            <div className="grid gap-1">
                                <Button variant="ghost" className="justify-start font-normal" onClick={() => handleOpenCreateDialog('PRODUCT')}>
                                    <Package className="mr-2 h-4 w-4" />
                                    Produto
                                </Button>
                                <Button variant="ghost" className="justify-start font-normal" onClick={() => handleOpenCreateDialog('SERVICE')}>
                                    <Hammer className="mr-2 h-4 w-4" />
                                    Serviço
                                </Button>
                                <Button variant="ghost" className="justify-start font-normal" onClick={() => handleOpenCreateDialog('SUPPLY')}>
                                    <Syringe className="mr-2 h-4 w-4" />
                                    Insumo
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>

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

                <div className={`space-y-4 transition-opacity duration-200 ${isFetching ? 'opacity-60 pointer-events-none' : 'opacity-100'} `}>
                    <div className="rounded-md border bg-card shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table className="w-full">
                                <TableHeader>
                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                        {(activeTabType === 'PRODUCT' || activeTabType === 'SERVICE') && (
                                            <TableHead className="w-[80px] hidden sm:table-cell text-muted-foreground font-semibold">ID</TableHead>
                                        )}
                                        <TableHead className="text-muted-foreground font-semibold">Nome</TableHead>

                                        {activeTabType === 'PRODUCT' && (
                                            <>
                                                <TableHead className="text-muted-foreground font-semibold text-center w-[100px]">Estoque</TableHead>
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
                                    {result?.data.items.map((item) => (
                                        <ItemTableRow key={item.id} item={item as any} activeTabType={activeTabType} />
                                    ))}
                                    {result && result.data.items.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                                Nenhum item encontrado.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {result && (
                        <div className="flex justify-end">
                            <Pagination
                                onPageChange={handlePaginate}
                                pageIndex={result.data.meta.pageIndex}
                                totalCount={result.data.meta.totalCount}
                                perPage={result.data.meta.perPage}
                            />
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}