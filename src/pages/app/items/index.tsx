import { useQuery } from '@tanstack/react-query'
import { Loader2, Plus } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { useState } from 'react'

import { getItems } from '@/api/get-items'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
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

export function Items() {
    const [searchParams, setSearchParams] = useSearchParams()

    // Parse filters from URL (1-based page)
    const pageIndex = z.coerce.number().parse(searchParams.get('page') ?? '1')
    const nameFilter = searchParams.get('name') ?? ''
    const displayIdFilter = searchParams.get('display_id') ?? ''
    const typeFilter = searchParams.get('type') ?? 'all'
    const criticalStockFilter = searchParams.get('critical_stock') === 'true'

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

    const { data: result, isFetching } = useQuery({
        queryKey: ['items', pageIndex, nameFilter, displayIdFilter, typeFilter, criticalStockFilter],
        queryFn: ({ signal }) => getItems({
            signal,
            pageIndex, // keep it 1-based as the API seems to expect it (or handles it)
            name: nameFilter || null,
            display_id: displayIdFilter ? Number(displayIdFilter) : null,
            is_product: typeFilter === 'all' ? null : (typeFilter === 'product'),
            below_min_stock: criticalStockFilter
        }),
    })

    function handlePaginate(newPageIndex: number) {
        setSearchParams((state) => {
            state.set('page', newPageIndex.toString())
            return state
        })
    }

    const isProductMode = typeFilter === 'product'
    const pageTitle = isProductMode ? 'Produtos' : 'Mercadorias'
    const buttonLabel = isProductMode ? 'Novo Produto' : 'Nova Mercadoria'

    return (
        <>
            <Helmet title={pageTitle} />
            <div className="flex flex-col gap-4 font-gaba">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {isFetching && (
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        )}
                        <h1 className="font-merienda text-2xl sm:text-4xl font-bold tracking-tight text-minsk-900">
                            {pageTitle}
                        </h1>
                    </div>

                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="mr-2 h-4 w-4" />
                                {buttonLabel}
                            </Button>
                        </DialogTrigger>
                        <ProductItemDialog onSuccess={() => setIsCreateDialogOpen(false)} />
                    </Dialog>
                </div>

                <ItemsTableFilters />

                <div className={`flex flex-col gap-4 transition-opacity duration-200 ${isFetching ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
                    <div className="rounded-md border bg-white shadow-sm overflow-x-auto">
                        <Table className="min-w-[600px]">
                            <TableHeader>
                                <TableRow className="bg-minsk-100 hover:bg-minsk-100">
                                    <TableHead className="w-[100px] text-minsk-950 font-bold">ID</TableHead>
                                    <TableHead className="text-minsk-950 font-bold">Tipo</TableHead>
                                    <TableHead className="text-minsk-950 font-bold">Nome</TableHead>
                                    <TableHead className="text-minsk-950 font-bold text-center">Estoque</TableHead>
                                    <TableHead className="text-minsk-950 font-bold">Preço</TableHead>
                                    <TableHead className="text-minsk-950 font-bold text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {result?.data.items.map((item) => (
                                    <ItemTableRow key={item.id} item={item as any} />
                                ))}
                                {result && result.data.items.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                            Nenhuma mercadoria encontrada.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {result && (
                        <Pagination
                            onPageChange={handlePaginate}
                            pageIndex={result.data.meta.pageIndex}
                            totalCount={result.data.meta.totalCount}
                            perPage={result.data.meta.perPage}
                        />
                    )}
                </div>
            </div>
        </>
    )
}