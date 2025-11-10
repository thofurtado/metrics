// components/items/index.tsx
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { getItemsManagement } from '@/api/get-items-management' // ← NOVA API DEDICADA
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

import { ItemTableRow } from './item-table-row'
import { ItemsTableFilters } from './item-table-filters'

export function Items() {
    const [searchParams, setSearchParams] = useSearchParams()

    const name = searchParams.get('name')
    const type = searchParams.get('type')
    const active = searchParams.get('active')

    const pageIndex = z.coerce
        .number()
        .transform((page) => page - 1)
        .parse(searchParams.get('page') ?? '1')

    // ✅ USA NOVA API DEDICADA
    const { data: result } = useQuery({
        queryKey: ['items-management', pageIndex, name, type, active],
        queryFn: () =>
            getItemsManagement({
                page: pageIndex,
                name,
                type: type === 'all' ? null : type,
                active: active === 'all' ? null : active === 'true',
            }),
        refetchOnWindowFocus: 'always',
    })

    function handlePaginate(pageIndex: number) {
        setSearchParams((state) => {
            state.set('page', (pageIndex + 1).toString())
            return state
        })
    }

    return (
        <>
            <Helmet title="Produtos & Serviços" />
            <div className="flex flex-col gap-4 font-gaba">
                <div className="flex items-center justify-between">
                    <h1 className="font-merienda text-2xl font-bold tracking-tight text-minsk-900 sm:text-3xl lg:text-4xl">
                        Produtos & Serviços
                    </h1>

                    <Button
                        onClick={() => {/* navegar para criar item */ }}
                        className="bg-vida-loca-500 hover:bg-vida-loca-600 dark:bg-vida-loca-500 dark:hover:bg-vida-loca-400"
                        size="sm"
                    >
                        <span className="hidden sm:inline">Novo</span>
                        <Plus className="h-4 w-4 sm:ml-1" />
                    </Button>
                </div>

                <div className="space-y-2.5">
                    <ItemsTableFilters />

                    <div className="overflow-x-auto rounded-md border">
                        <div className="min-w-[600px]">
                            <Table>
                                <TableHeader>
                                    <TableRow className="text-base">
                                        <TableHead className="w-[48px] rounded-tl-md bg-minsk-200 text-minsk-950"></TableHead>
                                        <TableHead className="bg-minsk-200 text-minsk-950">
                                            Nome
                                        </TableHead>
                                        <TableHead className="hidden w-[100px] bg-minsk-200 text-minsk-950 sm:table-cell">
                                            Tipo
                                        </TableHead>
                                        <TableHead className="bg-minsk-200 text-center text-minsk-950">
                                            Preço
                                        </TableHead>
                                        <TableHead className="hidden bg-minsk-200 text-minsk-950 sm:table-cell">
                                            Custo
                                        </TableHead>
                                        <TableHead className="hidden w-[100px] bg-minsk-200 text-minsk-950 sm:table-cell">
                                            Estoque
                                        </TableHead>
                                        <TableHead className="hidden w-[100px] bg-minsk-200 text-minsk-950 sm:table-cell">
                                            Status
                                        </TableHead>
                                        <TableHead className="w-[60px] rounded-tr-md bg-minsk-200 sm:w-[100px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {result &&
                                        result.data.items.map((item) => {
                                            return (
                                                <ItemTableRow
                                                    key={item.id}
                                                    item={item}
                                                />
                                            )
                                        })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {result && (
                        <Pagination
                            onPageChange={handlePaginate}
                            pageIndex={result.data.pagination.pageIndex}
                            totalCount={result.data.pagination.totalCount}
                            perPage={result.data.pagination.perPage}
                        />
                    )}
                </div>
            </div>
        </>
    )
}